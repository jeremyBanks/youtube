import { channelMetadata, playlistVideos } from "../client.ts";
import { Scan, Video } from "../storage.ts";
import { mapOptional, upsert } from "../common.ts";
import { openVideoStorage } from "../storage.ts";
import { openScanStorage } from "../storage.ts";
import { getScanConfig } from "../config.ts";

if (import.meta.main) {
  await main();
}

/** Command-line entry point. */
export async function main() {
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

    let stopAt: Date;

    if (
      !lastCompleteScan || !lastScan ||
      (new Date(config.maxCompleteAge.epochMilliseconds) >
        lastCompleteScan.scannedAt)
    ) {
      stopAt = new Date("2000-01-01");
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
    } catch (response) {
      if (
        response?.errors?.[0]?.reason === "playlistNotFound"
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
