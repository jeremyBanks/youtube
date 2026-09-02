import { parseArgs } from "@std/cli";
import { delay } from "@std/async";
import { upsert } from "../common.ts";
import { videosById } from "../client.ts";
import { videoDetails } from "../video.ts";
import {
  openChannelPlaylistStorage,
  openResolvedVideoStorage,
} from "../storage.ts";
import { getSeasonsCuration } from "../config.ts";
import { openVideoStorage } from "../storage.ts";
import type { ResolvedVideo, Video } from "../storage.ts";
import { DAY_MS, isDue } from "../schedule.ts";

/** How long to leave an id alone, by what the last lookup concluded. */
const INTERVAL_DAYS = {
  /** public, yet absent from its channel's uploads: should not happen, watch it */
  delisted: 21,
  unlisted: 28,
  private: 42,
  /** deletion does not undo itself, but a verdict is not sworn to forever */
  deleted: 350,
  /** nothing has classified it yet */
  unknown: 21,
} as const;

/** Requests a scheduled run may spend, unless told otherwise. */
const DEFAULT_BUDGET = 16;

/**
 * How long to wait between oEmbed requests. It is not the Data API, it costs
 * no quota, and we are using it for something it was not published for, so it
 * gets the same politeness the Dropout scraper gets.
 */
const OEMBED_DELAY_MS = 2000;

type Known = Pick<Video, "resolvedAt" | "privacyStatus" | "absence">;

/** What the last lookup concluded, from whichever file holds this id. */
export function intervalFor(known: Known | undefined): number {
  if (known?.absence === "deleted") return INTERVAL_DAYS.deleted * DAY_MS;
  if (known?.absence === "private") return INTERVAL_DAYS.private * DAY_MS;
  if (known?.privacyStatus === "unlisted") {
    return INTERVAL_DAYS.unlisted * DAY_MS;
  }
  if (known?.privacyStatus === "public") {
    return INTERVAL_DAYS.delisted * DAY_MS;
  }
  return INTERVAL_DAYS.unknown * DAY_MS;
}

/**
 * Whether a video still exists, and if not, why not.
 *
 * `videos.list` cannot tell a private video from a deleted one: it omits both,
 * with no error and no reason, and `commentThreads` and `captions` answer
 * `videoNotFound` for both as well. oEmbed does distinguish them, so it is
 * what settles an id the Data API declined to serve.
 *
 * Returns undefined when no verdict was reached — a network failure, a
 * timeout, a 5xx — which is not evidence about the video and must not be
 * recorded as if it were.
 */
export async function oembedVerdict(
  videoId: string,
): Promise<"exists" | "private" | "deleted" | undefined> {
  const url = `https://www.youtube.com/oembed?url=${
    encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)
  }&format=json`;
  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    console.warn(`  ${videoId}: oembed request failed (${error})`);
    return undefined;
  }
  await response.body?.cancel();
  if (response.status === 200) return "exists";
  if (response.status === 401 || response.status === 403) return "private";
  if (response.status === 404) return "deleted";
  console.warn(`  ${videoId}: oembed answered ${response.status}, no verdict`);
  return undefined;
}

/** Every curation field that names a video id. */
const ID_FIELDS = [
  "members",
  "public",
  "paid",
  "public copy",
  "public short",
  "public compilation",
  "public parts",
  "removed public parts",
  "removed members",
] as const;

if (import.meta.main) {
  await main();
}

/**
 * Every video id the curation names, in document order.
 */
function curatedVideoIds(
  curation: Awaited<ReturnType<typeof getSeasonsCuration>>,
): Array<string> {
  const ids: Array<string> = [];
  for (const doc of curation) {
    for (const video of doc.videos) {
      for (const field of ID_FIELDS) {
        const value = (video as Record<string, unknown>)[field];
        for (const id of [value].flat()) {
          if (typeof id === "string" && !ids.includes(id)) {
            ids.push(id);
          }
        }
      }
    }
  }
  return ids;
}

/**
 * Command-line entry point. Looks up specific video ids and records what
 * the API says about them, for ids the curation names on channels we do
 * not scan. Writes only data/resolved-videos.yaml, so it can never be
 * mistaken for, or interfere with, a channel scan.
 *
 *   deno task resolve --ids=abc123,def456
 *   deno task resolve --unknown        # everything curated but unscanned
 */
export async function main() {
  const args = parseArgs(Deno.args, {
    string: ["ids", "budget"],
    boolean: ["unknown", "due"],
  });

  const resolved = await openResolvedVideoStorage();
  const scannedVideos = await openVideoStorage();
  const now = new Date();
  let spend = Number(args.budget ?? DEFAULT_BUDGET);

  const scannedById = new Map(scannedVideos.map((v) => [v.videoId, v]));
  const resolvedById = new Map(resolved.map((v) => [v.videoId, v]));
  const knownFor = (id: string): Known | undefined =>
    scannedById.get(id) ?? resolvedById.get(id);

  let wanted = (args.ids ?? "").split(",").map((id) => id.trim()).filter(
    Boolean,
  );
  // An id named outright is looked up whatever its interval or verdict says,
  // which is how a wrong `gone` is corrected by hand.
  const explicit = new Set(wanted);

  if (args.unknown || args.due) {
    const candidates: Array<string> = [];
    const consider = (id: string) => {
      if (!candidates.includes(id)) candidates.push(id);
    };
    const scanned = new Set(scannedVideos.map((v) => v.videoId));

    // Ids the curation names that no channel scan has ever seen.
    for (const id of curatedVideoIds(await getSeasonsCuration())) {
      if (!scanned.has(id)) consider(id);
    }
    // Ids appearing only in a playlist. This is how a video hosted elsewhere,
    // or one unlisted and so absent from every uploads feed, gets a record.
    for (const playlist of await openChannelPlaylistStorage()) {
      for (const entry of playlist.entries ?? []) {
        // A live entry saying `private` is already the answer, and a better
        // one than a lookup could give: the playlist scan refreshes it daily
        // where an id lookup would ask every six weeks. Provisional -- worth
        // revisiting if we ever want the transition timed more finely.
        if (entry.privacyStatus === "private") continue;
        if (!scanned.has(entry.videoId)) consider(entry.videoId);
      }
    }
    // And videos a scan gave up on, or already knows are not public.
    // `removedBefore` only ever meant the video stopped appearing in its
    // channel's uploads playlist, which an unlisted video does exactly as a
    // deleted one does.
    for (const video of scannedVideos) {
      if (video.removedBefore) consider(video.videoId);
      else if (video.privacyStatus && video.privacyStatus !== "public") {
        consider(video.videoId);
      }
    }

    let held = 0;
    for (const id of candidates) {
      if (explicit.has(id)) continue;
      const known = knownFor(id);
      if (args.due && !isDue(id, known?.resolvedAt, intervalFor(known), now)) {
        held += 1;
        continue;
      }
      wanted.push(id);
    }
    console.info(
      `${candidates.length} candidates, ${held} not yet due, ` +
        `${wanted.length} to look up.`,
    );
  }

  wanted = [...new Set(wanted)];
  if (wanted.length === 0) {
    console.info("Nothing to resolve.");
    return;
  }

  // Fifty ids to a request, so the budget goes a long way here; it is the
  // oEmbed pass below, one id at a time and paced, that it really governs.
  const affordable = wanted.slice(0, Math.max(0, spend) * 50);
  if (affordable.length < wanted.length) {
    console.info(
      `Budget covers ${affordable.length} of ${wanted.length}; the rest keep.`,
    );
  }
  spend -= Math.ceil(affordable.length / 50);

  console.info(`Looking up ${affordable.length} video ids...`);
  const found = await videosById(affordable);

  let revived = 0;
  let unserved = 0;

  const record = (
    videoId: string,
    privacyStatus: string | undefined,
    absence: Video["absence"],
  ) => {
    const video = found.get(videoId);
    const scanned = scannedById.get(videoId);
    if (scanned) {
      scanned.resolvedAt = now;
      scanned.privacyStatus = privacyStatus;
      scanned.absence = absence;
      // Only when the API served the video. A lookup that came back empty
      // says nothing about its duration or its restrictions, and merging the
      // empty details would erase what the last scan saw.
      if (video) Object.assign(scanned, videoDetails(video));
      return;
    }
    upsert(resolved, {
      ...videoDetails(video),
      videoId,
      channelId: video?.snippet?.channelId ?? undefined,
      channelTitle: video?.snippet?.channelTitle ?? undefined,
      title: video?.snippet?.title ?? undefined,
      privacyStatus,
      absence,
      missing: video ? undefined : true,
      resolvedAt: now,
    } as ResolvedVideo, (a, b) => a.videoId === b.videoId);
  };

  const toClassify: Array<string> = [];
  for (const videoId of affordable) {
    const video = found.get(videoId);
    if (video) {
      const privacyStatus = video.status?.privacyStatus ?? undefined;
      const scanned = scannedById.get(videoId);
      if (scanned?.removedBefore) revived += 1;
      record(videoId, privacyStatus, undefined);
      console.info(
        `  ${videoId}: ${privacyStatus ?? "?"} - ${video.snippet?.title}`,
      );
      continue;
    }
    // The API omits private and deleted videos alike; oEmbed says which.
    unserved += 1;
    toClassify.push(videoId);
  }

  let classified = 0;
  for (const videoId of toClassify) {
    if (spend <= 0) break;
    spend -= 1;
    const verdict = await oembedVerdict(videoId);
    if (verdict === undefined) {
      // No answer is not an answer. Leaving the previous state and its
      // timestamp alone is what stops a network blip writing a video off.
      continue;
    }
    classified += 1;
    if (verdict === "exists") {
      // Served by oEmbed but not by videos.list, which should not happen;
      // record the attempt and say nothing we cannot support.
      record(videoId, undefined, "unknown");
      console.info(`  ${videoId}: oembed says it exists, the API disagrees`);
    } else {
      record(videoId, undefined, verdict);
      console.info(`  ${videoId}: ${verdict}`);
    }
    if (spend > 0) await delay(OEMBED_DELAY_MS);
  }

  console.info(
    `\n${affordable.length} looked up: ${affordable.length - unserved} served` +
      `${revived ? `, ${revived} of them previously written off` : ""}; ` +
      `${unserved} not served, ${classified} of those classified.`,
  );
}
