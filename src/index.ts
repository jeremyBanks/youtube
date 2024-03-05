import { sortBy } from "@std/collections";

import { dump, load } from "./yaml.ts";
import { getClientAuthAndKey } from "./client.ts";
import { Channel } from "./stored_types.ts";
import { mapOptional, only, tryCatch } from "./common.ts";
import { unwrap } from "./common.ts";

if (import.meta.main) {
  await main();
}

/** Command-line entry point. */
export async function main() {
  const { youtube, auth, key } = await getClientAuthAndKey();

  for (
    const handle of [
      "dropout",
      "dimension20show",
      "dimension20shorts",
      "umactually",
      "gamechangershorts",
      "makesomenoisedo",
      "dirtylaundryshorts",
      "actualplaylists",
    ]
  ) {
    const channel = await channelMetadata(handle);

    console.log(channel);
  }

  return;

  const scan = `${
    Date.now()
      .toString(36)
      .replaceAll(/\d/g, "")
      .slice(-3)
  }${Date.now().toString(36).slice(0, 8)}`;

  const channel = await youtube.channels
    .list({
      auth,
      mine: true,
      part: ["brandingSettings", "id"],
    })
    .then(({ data }) => data.items?.[0]!);

  console.log(
    `Authenticated to channel: ${channel.brandingSettings?.channel?.title} (${channel.id})`,
  );

  let pageToken: undefined | string = undefined;

  const items = await youtube.playlistItems.list({
    playlistId: "UUMVPDXXXJj9nax0fr0Wfc048g",
    part: ["snippet"],
    key,
    maxResults: 50,
    pageToken,
  });

  pageToken = items.data.nextPageToken ?? undefined;

  for (const item of items.data.items!.slice(-2)) {
    // Do we actually want any of these details?
    const details = (
      await youtube.videos.list({
        part: [
          "contentDetails",
          "id",
          "liveStreamingDetails",
          "localizations",
          "player",
          "recordingDetails",
          "snippet",
          "statistics",
          "status",
          "topicDetails",
        ],
        id: [item.snippet?.resourceId?.videoId!],
        key,
      })
    ).data.items![0]!;

    console.log(JSON.stringify({ item, details }, null, 2));
  }
}

/** Retrieves the metadata for a given channel by ID. */
async function channelMetadata(handle: string): Promise<Channel> {
  const { youtube, auth, key } = await getClientAuthAndKey();

  let channels = tryCatch(() => load("data/channels.yaml"), () => []);

  // Unfortunately, the API converts handles to lowercase even if the URLs and UI use mixed-case,
  // so we need to normalize to that for case matching.
  handle = handle.toLowerCase().replace(/^@/, "");

  const existing = channels.find((channel) => channel.handle === handle);

  if (existing) {
    return Channel.parse(existing);
  }

  const refreshed = new Date();

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

  const retrieved: Channel = {
    channelId: resultData.id!,
    name: resultData.snippet!.title!,
    created: new Date(resultData.snippet!.publishedAt!),
    handle: resultData.snippet!.customUrl!.replace(/^@/, ""),
    refreshed,
    videoCount: Number(unwrap(resultData.statistics!.videoCount)),
    subscriberCount: Number(unwrap(
      resultData.statistics?.subscriberCount,
    )),
    viewCount: Number(unwrap(resultData.statistics?.viewCount)),
  };

  channels.push(Channel.parse(retrieved));

  channels = channels.map((c) => Channel.parse(c));

  dump(
    "./data/channels.yaml",
    sortBy(channels, (channel) => (channel as Channel).created),
  );

  return retrieved;
}
