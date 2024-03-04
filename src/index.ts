import { getClientAuthAndKey } from "./client.ts";

if (import.meta.main) {
  await main();
}

/** Command-line entry point. */
export async function main() {
  const { youtube, auth, key } = await getClientAuthAndKey();

  const result = await youtube.channels.list({
    auth,
    forHandle: "dropout",
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

  console.log(
    Deno.inspect(result, {
      depth: 8,
      iterableLimit: 32,
      colors: true,
    })
  );

  const scan = `${Date.now()
    .toString(36)
    .replaceAll(/\d/g, "")
    .slice(-3)}${Date.now().toString(36).slice(0, 8)}`;

  const channel = await youtube.channels
    .list({
      auth,
      mine: true,
      part: ["brandingSettings", "id"],
    })
    .then(({ data }) => data.items?.[0]!);

  console.log(
    `Authenticated to channel: ${channel.brandingSettings?.channel?.title} (${channel.id})`
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
