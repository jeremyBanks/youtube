import { parseArgs } from "@std/cli";
import { mapOptional, upsert } from "../common.ts";
import { videosById } from "../client.ts";
import {
  openChannelPlaylistStorage,
  openResolvedVideoStorage,
} from "../storage.ts";
import { getSeasonsCuration } from "../config.ts";
import { openVideoStorage } from "../storage.ts";

/** Every curation field that names a video id. */
const ID_FIELDS = [
  "members",
  "public",
  "paid",
  "public copy",
  "public short",
  "public compilation",
  "public parts",
  "deleted public parts",
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
    string: ["ids"],
    boolean: ["unknown"],
  });

  const resolved = await openResolvedVideoStorage();
  const scannedVideos = await openVideoStorage();
  let wanted = (args.ids ?? "").split(",").map((id) => id.trim()).filter(
    Boolean,
  );

  if (args.unknown) {
    // Everything we name that no channel scan has ever seen: ids in the
    // curation, and ids appearing in a scanned channel's playlists. The
    // second is how videos hosted elsewhere and unlisted videos - neither
    // of which reaches a channel's uploads - get a record of their own.
    const scanned = new Set(scannedVideos.map((v) => v.videoId));
    const already = new Set(resolved.map((v) => v.videoId));
    const consider = (id: string) => {
      if (!scanned.has(id) && !already.has(id) && !wanted.includes(id)) {
        wanted.push(id);
      }
    };
    for (const id of curatedVideoIds(await getSeasonsCuration())) {
      consider(id);
    }
    for (const playlist of await openChannelPlaylistStorage()) {
      for (const entry of playlist.entries ?? []) {
        // A private video is one the API will not serve to anyone but its
        // owner, and the playlist entry already says so; asking would only
        // spend quota to be told what we know.
        if (entry.privacyStatus !== "private") {
          consider(entry.videoId);
        }
      }
    }
    // And every video a scan gave up on. `removedBefore` only ever meant
    // that the video stopped appearing in the channel's uploads playlist,
    // and an unlisted video leaves that listing exactly as a deleted one
    // does. Asking by id is the only way to tell the two apart, so a
    // removed video is worth one lookup: either the API serves it, and we
    // learn it was quietly unlisted all along, or it does not, and the
    // removal is confirmed rather than assumed.
    for (const video of scannedVideos) {
      if (video.removedBefore && !wanted.includes(video.videoId)) {
        wanted.push(video.videoId);
      }
    }
  }

  wanted = [...new Set(wanted)];
  if (wanted.length === 0) {
    console.info("Nothing to resolve. Pass --ids=... or --unknown.");
    return;
  }

  console.info(`Looking up ${wanted.length} video ids...`);
  const found = await videosById(wanted);
  const now = new Date();

  let revived = 0;
  let confirmed = 0;

  for (const videoId of wanted) {
    const video = found.get(videoId);
    const privacyStatus = video?.status?.privacyStatus ?? undefined;
    // A video a scan already knows about keeps its own record; this only
    // annotates it with what a direct lookup adds. Nothing here creates a
    // videos.yaml record, which would have no playlist-add time and no part
    // in deletion detection.
    const scanned = scannedVideos.find((v) => v.videoId === videoId);
    if (scanned) {
      scanned.resolvedAt = now;
      scanned.privacyStatus = privacyStatus;
      if (scanned.removedBefore) {
        if (video) {
          revived += 1;
          console.info(
            `  ${videoId}: still there, ${privacyStatus ?? "status unknown"} ` +
              `- ${scanned.title}`,
          );
        } else {
          confirmed += 1;
        }
      }
      continue;
    }

    if (!video) {
      // The API simply omits ids it will not serve, so absence is the only
      // signal that a video is deleted, private, or was never valid.
      console.warn(`  ${videoId}: not available`);
      upsert(
        resolved,
        { videoId, resolvedAt: now, missing: true },
        (a, b) => a.videoId === b.videoId,
      );
      continue;
    }
    upsert(resolved, {
      videoId,
      channelId: video.snippet?.channelId ?? undefined,
      channelTitle: video.snippet?.channelTitle ?? undefined,
      title: video.snippet?.title ?? undefined,
      uploadedAt: mapOptional(
        video.snippet?.publishedAt ?? undefined,
        (d) => new Date(d),
      ),
      duration: mapOptional(
        video.contentDetails?.duration,
        Temporal.Duration.from,
      )?.total("seconds"),
      privacyStatus,
      resolvedAt: now,
    }, (a, b) => a.videoId === b.videoId);
    console.info(
      `  ${videoId}: ${video.snippet?.title} ` +
        `(${video.snippet?.channelTitle})`,
    );
  }

  if (revived || confirmed) {
    console.info(
      `\n${revived + confirmed} videos a scan had marked removed were ` +
        `checked: ${revived} are still served by the API and were never ` +
        `deleted, ${confirmed} are confirmed gone.`,
    );
  }
}
