import { parseArgs } from "@std/cli";
import { mapOptional, upsert } from "../common.ts";
import { videosById } from "../client.ts";
import { openResolvedVideoStorage } from "../storage.ts";
import { getSeasonsCuration } from "../config.ts";
import { openVideoStorage } from "../storage.ts";

/** Every curation field that names a video id. */
const ID_FIELDS = [
  "members",
  "public",
  "paid",
  "public copy",
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
  let wanted = (args.ids ?? "").split(",").map((id) => id.trim()).filter(
    Boolean,
  );

  if (args.unknown) {
    // Everything the curation names that no channel scan has ever seen.
    const scanned = new Set((await openVideoStorage()).map((v) => v.videoId));
    const already = new Set(resolved.map((v) => v.videoId));
    for (const id of curatedVideoIds(await getSeasonsCuration())) {
      if (!scanned.has(id) && !already.has(id) && !wanted.includes(id)) {
        wanted.push(id);
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

  for (const videoId of wanted) {
    const video = found.get(videoId);
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
      resolvedAt: now,
    }, (a, b) => a.videoId === b.videoId);
    console.info(
      `  ${videoId}: ${video.snippet?.title} ` +
        `(${video.snippet?.channelTitle})`,
    );
  }
}
