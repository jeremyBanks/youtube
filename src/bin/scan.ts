import { parseArgs } from "@std/cli";
import { channelMetadata, playlistVideos, setAuthMode } from "../client.ts";
import type { Scan, Video } from "../storage.ts";
import { mapOptional, upsert } from "../common.ts";
import { openVideoStorage } from "../storage.ts";
import { openScanStorage } from "../storage.ts";
import { getScanConfig } from "../config.ts";

if (import.meta.main) {
  await main();
}

/** Command-line entry point. */
export async function main() {
  const args = parseArgs(Deno.args, {
    string: ["auth-url"],
    boolean: ["headless", "incremental-only"],
    default: {
      headless: false,
      "incremental-only": false,
    },
  });

  // Set authentication mode based on command-line arguments
  if (args.headless) {
    setAuthMode({ mode: "print-url-and-exit" });
  } else if (args["auth-url"]) {
    setAuthMode({ mode: "complete-with-url", redirectUrl: args["auth-url"] });
  }

  const scans = await openScanStorage();
  const videos = await openVideoStorage();

  for (const config of await getScanConfig()) {
    let { channelHandle } = config;

    const { channelId, handle } = await channelMetadata(channelHandle);

    channelHandle = handle ?? channelHandle;

    const lastScan = scans.find((scan) => scan.channelId === channelId);
    const lastCompleteScan = scans.find((scan) =>
      scan.channelId === channelId && scan.scannedTo === null
    );

    const scannedAt = new Date();

    // A windowed scan reaches back a fixed window rather than only to the last
    // scan. Deletion is detected by noticing that a video we already know about
    // is no longer listed, and that check only covers videos published at or
    // after stopAt, so an incremental scan can only ever spot deletions among
    // videos published since the previous run. This tier catches deletions
    // further back without paying for a complete scan every time.
    const recentWindowStart = config.recentWindowStart === undefined
      ? undefined
      : new Date(config.recentWindowStart.epochMilliseconds);
    // Any earlier scan that reached at least as far back as this window counts,
    // whether it was complete (scannedTo === null) or another windowed scan.
    const lastWindowDeepScan = recentWindowStart === undefined
      ? undefined
      : scans.find((scan) =>
        scan.channelId === channelId &&
        (scan.scannedTo === null || scan.scannedTo <= recentWindowStart)
      );
    const recentScanDue = config.maxRecentAge !== undefined &&
      recentWindowStart !== undefined &&
      (!lastWindowDeepScan ||
        new Date(config.maxRecentAge.epochMilliseconds) >
          lastWindowDeepScan.scannedAt);

    let stopAt: Date;

    if (args["incremental-only"]) {
      // Incremental-only mode: skip channels never scanned, only scan back to last scan
      if (!lastScan) {
        console.info(
          `Skipping ${channelHandle} (never scanned, use without --incremental-only for initial scan)`,
        );
        continue;
      }
      if (
        new Date(config.maxIncrementalAge.epochMilliseconds) <=
          lastScan.scannedAt
      ) {
        continue; // Skip if incremental scan not needed yet
      }
      stopAt = lastScan.scannedAt;
    } else if (
      !lastCompleteScan || !lastScan ||
      (new Date(config.maxCompleteAge.epochMilliseconds) >
        lastCompleteScan.scannedAt)
    ) {
      stopAt = new Date("2000-01-01");
    } else if (recentScanDue) {
      stopAt = recentWindowStart!;
    } else if (
      new Date(config.maxIncrementalAge.epochMilliseconds) > lastScan!.scannedAt
    ) {
      stopAt = lastScan.scannedAt;
    } else {
      continue;
    }

    console.info(`Scanning ${channelHandle} back to ${stopAt}...`);

    const deletedIds: Set<string> = new Set();
    for (const video of videos) {
      if (video.channelId === channelId && video.publishedAt >= stopAt) {
        deletedIds.add(video.videoId);
      }
    }

    const publicPlaylistId = `UU${channelId.slice(2)}`;
    let publicVideosExhaustive = true;
    for await (
      const { entry, video } of playlistVideos(publicPlaylistId, {
        getDetails: true,
      })
    ) {
      const record: Video = {
        channelId: entry.snippet?.channelId!,
        publishedAt: new Date(entry.snippet?.publishedAt!),
        uploadedAt: mapOptional(
          video?.snippet?.publishedAt ?? undefined,
          (d) => new Date(d),
        ),
        title: entry.snippet?.title!,
        videoId: entry.snippet?.resourceId?.videoId!,
        duration: mapOptional(
          video?.contentDetails?.duration,
          Temporal.Duration.from,
        )?.total("seconds")!,
        regionsAllowed: video?.contentDetails?.regionRestriction?.allowed ??
          undefined,
        regionsBlocked: video?.contentDetails?.regionRestriction?.blocked ??
          undefined,
      };

      deletedIds.delete(record.videoId);

      if (record.publishedAt >= stopAt) {
        upsert(videos, record, (a, b) => a.videoId === b.videoId);
      } else {
        publicVideosExhaustive = false;
        break;
      }
    }

    const membersPlaylistId = `UUMO${channelId.slice(2)}`;
    let membersVideosExhaustive = true;
    try {
      for await (
        const { entry, video } of playlistVideos(membersPlaylistId, {
          getDetails: true,
        })
      ) {
        const record: Video = {
          channelId: entry.snippet?.channelId!,
          membersOnly: true,
          publishedAt: new Date(entry.snippet?.publishedAt!),
          uploadedAt: mapOptional(
            video?.snippet?.publishedAt ?? undefined,
            (d) => new Date(d),
          ),
          title: entry.snippet?.title!,
          videoId: entry.snippet?.resourceId?.videoId!,
          duration: mapOptional(
            video?.contentDetails?.duration,
            Temporal.Duration.from,
          )?.total("seconds")!,
          regionsAllowed: video?.contentDetails?.regionRestriction?.allowed ??
            undefined,
          regionsBlocked: video?.contentDetails?.regionRestriction?.blocked ??
            undefined,
        };

        deletedIds.delete(record.videoId);

        if (record.publishedAt >= stopAt) {
          upsert(videos, record, (a, b) => a.videoId === b.videoId);
        } else {
          membersVideosExhaustive = false;
          break;
        }
      }
    } catch (response: unknown) {
      if (
        typeof response === "object" && response !== null &&
        "errors" in response &&
        Array.isArray(response.errors) &&
        response.errors[0]?.reason === "playlistNotFound"
      ) {
        // that's okay. no members-only videos for this channel.
      } else {
        throw response;
      }
    }

    for (const videoId of deletedIds) {
      videos.find((video) => video.videoId === videoId)!.removedBefore ??=
        scannedAt;
    }

    const scan: Scan = {
      channelId,
      channelHandle,
      scannedAt,
      scannedTo: publicVideosExhaustive && membersVideosExhaustive
        ? null
        : stopAt,
    };

    scans.push(scan);
  }
}
