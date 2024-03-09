import { sortBy } from "@std/collections";

import { dump, load } from "../yaml.ts";
import { getClientAuthAndKey } from "../client.ts";
import { Channel, openChannelStorage, Scan, Video } from "../storage.ts";
import { logDeep, mapOptional, only, tryCatch, upsert } from "../common.ts";
import { unwrap } from "../common.ts";
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

/** Retrieves the metadata for a given channel. */
async function channelMetadata(handle: string): Promise<Channel> {
  const { youtube, auth } = await getClientAuthAndKey();

  const channels = await openChannelStorage();

  // Unfortunately, the API converts handles to lowercase even if the URLs and UI use mixed-case,
  // so we need to normalize to that for case matching.
  handle = handle.toLowerCase().replace(/^(https?:\/\/youtube\.com\/)?@/, "")
    .replace(/\?si=\w+$/, "");

  const existing = channels.find((channel) => channel.handle === handle);

  if (existing) {
    return Channel.parse(existing);
  }

  const refreshedAt = new Date();

  const result = await youtube.channels.list({
    auth,
    forHandle: handle,
    part: [
      "brandingSettings",
      "contentDetails",
      "contentOwnerDetails",
      "id",
      "localizations",
      "snippet",
      "statistics",
      "status",
      "topicDetails",
    ],
  });

  const resultData = only(result.data.items!);

  const retrieved = Channel.parse(
    {
      channelId: resultData.id!,
      name: resultData.snippet!.title!,
      createdAt: new Date(resultData.snippet!.publishedAt!),
      handle: resultData.snippet!.customUrl!.replace(/^@/, ""),
      refreshedAt,
      videoCount: Number(unwrap(resultData.statistics!.videoCount)),
      subscriberCount: Number(unwrap(
        resultData.statistics?.subscriberCount,
      )),
      viewCount: Number(unwrap(resultData.statistics?.viewCount)),
    } satisfies Channel,
  );

  channels.push(retrieved);

  return retrieved;
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

async function* playlistVideos(playlistId: string) {
  const { youtube, auth, key } = await getClientAuthAndKey();

  let pageToken: string | undefined = undefined;

  do {
    const response = await youtube.playlistItems.list({
      playlistId,
      part: ["snippet", "contentDetails"],
      key,
      maxResults: 50,
      pageToken,
    });

    yield* response.data.items ?? [];

    // This cast is neccessary due to a TypeScript limitation that breaks the inference
    // of `response` above if we don't explicitly type this, but it's still easier to
    // type this than to type that.
    // https://github.com/microsoft/TypeScript/issues/36687#issuecomment-593660244
    pageToken = (response.data.nextPageToken ?? undefined) as
      | string
      | undefined;
  } while (pageToken);
}
