import { channelMetadata, playlistVideos } from "../client.ts";
import { Scan, Video } from "../storage.ts";
import { upsert } from "../common.ts";
import { openVideoStorage } from "../storage.ts";
import { openScanStorage } from "../storage.ts";

if (import.meta.main) {
  await main();
}

/** Command-line entry point. */
export async function main() {
  for (
    const handle of [
      "dropout",
      "dimension20show",
      "dimension20shorts",
      "umactually",
      "gamechangershorts",
      "makesomenoisedo",
      "dirtylaundryshorts",
      "veryimportantpeopleshow",
    ]
  ) {
    await scanChannel(handle);
  }
}

/** Retrieves video metadata for a given channel. */
async function scanChannel(handle: string) {
  const scans = await openScanStorage();
  const videos = await openVideoStorage();

  const { channelId } = await channelMetadata(handle);

  const stopAt = new Date("2000-01-01");

  const scannedAt = new Date();

  const publicPlaylistId = `UU${channelId.slice(2)}`;
  let publicVideosExhaustive = true;
  for await (const playlistItem of playlistVideos(publicPlaylistId)) {
    const video: Video = {
      channelId: playlistItem.snippet?.channelId!,
      membersOnly: false,
      publishedAt: new Date(playlistItem.snippet?.publishedAt!),
      title: playlistItem.snippet?.title!,
      videoId: playlistItem.snippet?.resourceId?.videoId!,
    };

    if (stopAt && (video.publishedAt >= stopAt)) {
      upsert(videos, video, (a, b) => a.videoId === b.videoId);
    } else {
      publicVideosExhaustive = false;
      break;
    }
  }

  const membersPlaylistId = `UUMO${channelId.slice(2)}`;
  let membersVideosExhaustive = true;
  try {
    for await (const playlistItem of playlistVideos(membersPlaylistId)) {
      const video: Video = {
        channelId: playlistItem.snippet?.channelId!,
        membersOnly: true,
        publishedAt: new Date(playlistItem.snippet?.publishedAt!),
        title: playlistItem.snippet?.title!,
        videoId: playlistItem.snippet?.resourceId?.videoId!,
      };

      if (stopAt && (video.publishedAt >= stopAt)) {
        upsert(videos, video, (a, b) => a.videoId === b.videoId);
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

  const scan: Scan = {
    scannedAt,
    channelId,
    scannedTo: publicVideosExhaustive && membersVideosExhaustive
      ? null
      : stopAt,
  };

  scans.push(scan);
}
