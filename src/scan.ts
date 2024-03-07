import { sortBy } from "@std/collections";

import { dump, load } from "./yaml.ts";
import { getClientAuthAndKey } from "./client.ts";
import { Channel, Scan, Video } from "./stored_types.ts";
import { logDeep, mapOptional, only, tryCatch } from "./common.ts";
import { unwrap } from "./common.ts";

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
    logDeep(await channelMetadata(handle));
  }
}

/** Retrieves the metadata for a given channel. */
async function channelMetadata(handle: string): Promise<Channel> {
  const { youtube, auth } = await getClientAuthAndKey();

  let channels = tryCatch(() => load("data/channels.yaml"), () => []).map((c) =>
    Channel.parse(c)
  );

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

  dump(
    "./data/channels.yaml",
    sortBy(channels, (channel) => channel.createdAt),
  );

  return retrieved;
}

/** Retrieves video metadata for a given channel. */
async function scanChannel(handle: string) {
  let scans = tryCatch(() => load("data/scans.yaml"), () => []).map((s) =>
    Scan.parse(s)
  );

  const channel = await channelMetadata(handle);

  const stopAt = new Date("2024-01-01");

  const scannedAt = new Date();

  let scan = Scan.parse(
    {
      scannedAt,
      channelId: channel.channelId,
      stopAt,
      completion: "incomplete",
    } satisfies Scan,
  );

  scans.unshift(scan);

  let pageToken: undefined | string = undefined;

  // Set time range (inclusive lower bound)
  // Insert new scan as incomplete
  // Load existing videos in that range
  // Fetch members only videos in that range
  // Fetch public videos in that range
  // Subtract fetched videos from loaded videos to identify non listed videos
  // Fetch non listed videos by ID to determine whether they’re removed (deleted/private) or unlisted
  // Replace loaded videos with new video data, with members and unlisted videos marked as such, implicitly removing removed videos from storage. Mark all videos with the current scan id.
  // Mark scan as completed

  // This doesn’t actually make use of scans ids for partial completion, though. Need to extend logic for that

  // If we ignore unlisted then we can do members and public in parallel by timestamp in order so that even if it’s interrupted we can still mark it as complete back to a know time. Or we could be less efficient with our handling of unlisted videos and fetch them immediate after they’ve missed to accommodate that too.

  // Oh, right: the official API doesn't let you know if something is a members-only video. And other limitations too. Google neglects all their products so much. Can it even see members-only videos? I think so, but I guess we'll have to see...
  // Okay, but we can use the associated members-only playlist (see UUMOPDXXXJj9nax0fr0Wfc048g) to find members-only videos specifically... and this even works if we aren't authenticated! Okay! That's a very good workaround!
  // And unlike the very-similar UUMF playlist, this one also includes unlisted videos! Like ndTplebrzs8! Weird! Okay, they're not delisted, they're live streams? As are listed in the UUMV playlist. weird but okay. So we'll use UU (all public videos + shorts + live) and UUMO (all members only videos + shorts(?) + live)
  // I guess to make this sensible we may want to separate out discovery of video IDs from fetching their details. But maybe the API doesn't even make that make sense. We'll see!
  // I guess we need to confirm whether the API even works with these playlists.

  dump(
    "./data/scans.yaml",
    sortBy(scans, (scan) => (scan as Scan).scannedAt, { order: "desc" }),
  );
}

async function* playlistVideos(playlistId: string) {
  const { youtube, auth, key } = await getClientAuthAndKey();

  let pageToken: string | undefined = undefined;

  do {
    const response = await youtube.playlistItems.list({
      playlistId,
      part: ["snippet"],
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
