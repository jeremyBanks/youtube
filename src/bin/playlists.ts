import { parseArgs } from "@std/cli";
import type { youtube_v3 } from "googleapis";
import { channelMetadata, getClientAndKey } from "../client.ts";
import { mapOptional } from "../common.ts";
import type { ChannelPlaylist, ChannelPlaylistEntry } from "../storage.ts";
import { openChannelPlaylistStorage, openVideoStorage } from "../storage.ts";
import { getScanConfig } from "../config.ts";

if (import.meta.main) {
  await main();
}

/** Reads a value only when it says something, so blanks are never stored. */
function present(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Turns one playlistItems entry into a record, keeping only what the video
 * resource does not already tell us.
 */
export function entryFrom(
  item: youtube_v3.Schema$PlaylistItem,
  playlistChannelId: string,
  video: { title?: string; channelId?: string } | undefined,
): ChannelPlaylistEntry | undefined {
  const videoId = item.contentDetails?.videoId ?? item.snippet?.resourceId
    ?.videoId;
  const addedAt = item.snippet?.publishedAt;
  if (!videoId || !addedAt) {
    return undefined;
  }
  const owner = present(item.snippet?.videoOwnerChannelId);
  const title = present(item.snippet?.title);
  const privacyStatus = present(item.status?.privacyStatus);
  // Where the video actually lives, but only when that is not already
  // known: a show channel's playlists point almost entirely at videos
  // hosted on the main channel, and repeating what videos.yaml already
  // records would be two thirds of this file for nothing. What survives
  // is the genuinely new part - an unlisted video we cannot otherwise
  // see, or a video owned outside the channels we scan, which is what a
  // collaboration looks like from here.
  const foreignOwner = owner && owner !== playlistChannelId &&
      owner !== video?.channelId
    ? owner
    : undefined;
  return {
    videoId,
    position: item.snippet?.position ?? 0,
    addedAt: new Date(addedAt),
    videoPublishedAt: mapOptional(
      item.contentDetails?.videoPublishedAt ?? undefined,
      (d) => new Date(d),
    ),
    privacyStatus,
    ownerChannelId: foreignOwner,
    ownerChannelTitle: foreignOwner
      ? present(item.snippet?.videoOwnerChannelTitle)
      : undefined,
    // The API repeats the video's own title in every entry, so it is kept
    // only when it says something we do not have: an unlisted video, which
    // never appears in a channel's uploads and so is invisible to the
    // scan, or a title that differs from the one we hold. A private video
    // is skipped, since its "Private video" placeholder is no title at all
    // and privacyStatus already records the fact.
    title: privacyStatus !== "private" && title && title !== video?.title
      ? title
      : undefined,
    startAt: present(item.contentDetails?.startAt),
    endAt: present(item.contentDetails?.endAt),
    note: present(item.contentDetails?.note),
  };
}

/**
 * Merges freshly observed entries over the stored ones.
 *
 * Living entries take the order the playlist has now. Entries that have
 * gone are kept, marked with when they went, and left where they were: each
 * is anchored behind whichever entry preceded it last time we looked, so a
 * removal reads in place rather than being swept to the end. Their recorded
 * position is left as last seen and is not renumbered, since it describes
 * where they were, not where they are.
 *
 * `removedBefore` here means removed *from this playlist*. Whether the video
 * still exists is a separate question, answered by `data/videos.yaml`.
 */
export function mergeEntries(
  stored: Array<ChannelPlaylistEntry>,
  observed: Array<ChannelPlaylistEntry>,
  now: Date,
): Array<ChannelPlaylistEntry> {
  const living = new Set(observed.map((e) => e.videoId));
  const ordered = [...observed].sort((a, b) => a.position - b.position);
  const indexOf = new Map(ordered.map((entry, i) => [entry.videoId, i]));

  // Group the departed by the living entry they last followed; -1 means
  // they were at the front.
  const following = new Map<number, Array<ChannelPlaylistEntry>>();
  let anchor = -1;
  for (const entry of stored) {
    if (living.has(entry.videoId)) {
      anchor = indexOf.get(entry.videoId) ?? anchor;
      continue;
    }
    const departed = { ...entry, removedBefore: entry.removedBefore ?? now };
    following.set(anchor, [...(following.get(anchor) ?? []), departed]);
  }

  const merged = [...(following.get(-1) ?? [])];
  for (const [i, entry] of ordered.entries()) {
    merged.push(entry, ...(following.get(i) ?? []));
  }
  return merged;
}

/** Pages through every playlist a channel lists publicly. */
async function* channelPlaylists(channelId: string) {
  const { youtube, key } = await getClientAndKey();
  let pageToken: string | undefined = undefined;
  do {
    console.debug(`youtube.playlists.list channelId: ${channelId}`);
    const response: { data: youtube_v3.Schema$PlaylistListResponse } =
      await youtube.playlists.list({
        channelId,
        part: ["snippet", "status", "contentDetails"],
        key,
        maxResults: 50,
        pageToken,
      });
    for (const playlist of response.data.items ?? []) {
      yield playlist;
    }
    pageToken = response.data.nextPageToken ?? undefined;
  } while (pageToken);
}

/** Pages through one playlist's entries. */
async function* playlistEntries(playlistId: string) {
  const { youtube, key } = await getClientAndKey();
  let pageToken: string | undefined = undefined;
  do {
    console.debug(`youtube.playlistItems.list ${playlistId}`);
    const response: { data: youtube_v3.Schema$PlaylistItemListResponse } =
      await youtube.playlistItems.list({
        playlistId,
        part: ["snippet", "contentDetails", "status"],
        key,
        maxResults: 50,
        pageToken,
      });
    for (const item of response.data.items ?? []) {
      yield item;
    }
    pageToken = response.data.nextPageToken ?? undefined;
  } while (pageToken);
}

/** True when a playlist can still be fetched by id, unlisted or not. */
async function stillExists(playlistId: string): Promise<boolean> {
  const { youtube, key } = await getClientAndKey();
  const response = await youtube.playlists.list({
    id: [playlistId],
    part: ["snippet"],
    key,
  });
  return (response.data.items?.length ?? 0) > 0;
}

/**
 * Command-line entry point. Records the playlists of the channels we
 * actively track, as they are, so that their membership can be compared
 * against our curation. Writes only data/channel-playlists.yaml.
 *
 *   deno task scan-playlists
 *   deno task scan-playlists --channel=umactually
 */
export async function main() {
  const args = parseArgs(Deno.args, { string: ["channel"] });
  const only = args.channel?.split(",").map((c) => c.trim().toLowerCase());

  const playlists = await openChannelPlaylistStorage();
  // Only to tell what an entry adds over what we already hold; never
  // written to.
  const videos = new Map(
    (await openVideoStorage()).map((
      v,
    ) => [v.videoId, { title: v.title, channelId: v.channelId }]),
  );
  const now = new Date();

  // A channel we actively track is one with a recent-window configured;
  // the parked ones have no cadence and are never scanned at all.
  const tracked = (await getScanConfig()).filter((c) =>
    c.recentWindowStart !== undefined
  );

  for (const config of tracked) {
    const handle = config.channelHandle;
    if (only && !only.includes(handle.toLowerCase())) {
      continue;
    }
    const { channelId } = await channelMetadata(handle);

    const seen = new Set<string>();
    let added = 0;
    for await (const found of channelPlaylists(channelId)) {
      if (!found.id) {
        continue;
      }
      seen.add(found.id);
      let playlist = playlists.find((p) => p.playlistId === found.id);
      if (!playlist) {
        playlist = {
          playlistId: found.id,
          channelId,
          firstSeen: now,
        } as ChannelPlaylist;
        playlists.push(playlist);
        added += 1;
      }
      playlist.channelId = channelId;
      playlist.title = present(found.snippet?.title);
      playlist.description = present(found.snippet?.description);
      playlist.privacyStatus = present(found.status?.privacyStatus);
      playlist.itemCount = found.contentDetails?.itemCount ?? undefined;
      playlist.createdAt = mapOptional(
        found.snippet?.publishedAt ?? undefined,
        (d) => new Date(d),
      );
    }

    const mine = playlists.filter((p) => p.channelId === channelId);
    if (seen.size === 0 && mine.length > 0) {
      // The empty-response trap: a listing that returns nothing is far more
      // likely a bad fetch than a channel deleting every playlist at once.
      throw new Error(
        `${handle} listed no playlists while ${mine.length} are on record; ` +
          `refusing to mark them delisted`,
      );
    }

    // Anything on record for this channel but absent from the listing is
    // either unlisted or gone, and those deserve different answers.
    let delisted = 0;
    let removed = 0;
    for (const playlist of mine) {
      if (seen.has(playlist.playlistId) || playlist.removedBefore) {
        continue;
      }
      if (await stillExists(playlist.playlistId)) {
        if (!playlist.delistedBefore) {
          playlist.delistedBefore = now;
          delisted += 1;
        }
      } else {
        playlist.removedBefore ??= now;
        removed += 1;
      }
    }

    console.info(
      `${handle}: ${seen.size} listed, ${added} new, ` +
        `${delisted} newly delisted, ${removed} newly removed.`,
    );

    // Delisted playlists are still scanned; only removed ones are dropped.
    for (const playlist of mine) {
      if (playlist.removedBefore) {
        continue;
      }
      const observed: Array<ChannelPlaylistEntry> = [];
      for await (const item of playlistEntries(playlist.playlistId)) {
        const entry = entryFrom(
          item,
          channelId,
          videos.get(
            item.contentDetails?.videoId ??
              item.snippet?.resourceId?.videoId ?? "",
          ),
        );
        if (entry) {
          observed.push(entry);
        }
      }
      playlist.entries = mergeEntries(playlist.entries ?? [], observed, now);
      playlist.scrapedAt = new Date();
    }
  }
}
