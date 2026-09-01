import { parseArgs } from "@std/cli";
import type { youtube_v3 } from "googleapis";
import { channelMetadata, getClientAndKey } from "../client.ts";
import { mapOptional } from "../common.ts";
import type { ChannelPlaylist, ChannelPlaylistEntry } from "../storage.ts";
import { openChannelPlaylistStorage } from "../storage.ts";
import { getScanConfig } from "../config.ts";
import { openChannelStorage } from "../storage.ts";
import { DAY_MS, durationMs, isDue } from "../schedule.ts";

/** How often to re-read a channel's list of playlists. */
const LISTING_INTERVAL = "PT4M";

/**
 * How soon to re-read a playlist's contents, given how long it has been
 * quiet: a quarter of that, so an active playlist is read often and a dormant
 * one drifts towards being read about once a year.
 *
 * The floor exists for manual runs, where the workflow's daily cadence is not
 * doing the limiting. The ceiling is generous because dormancy is cheap to
 * tolerate here: a playlist waking up changes its itemCount, and that is
 * noticed exactly, on the next listing, without the interval having to guess.
 */
const QUIET_DIVISOR = 4;
const MIN_CONTENTS_INTERVAL = durationMs("PT4M");
const MAX_CONTENTS_INTERVAL = 350 * DAY_MS;

export function contentsInterval(lastChangedAt: Date, now: Date): number {
  const quiet = Math.max(0, now.getTime() - lastChangedAt.getTime());
  return Math.min(
    MAX_CONTENTS_INTERVAL,
    Math.max(MIN_CONTENTS_INTERVAL, quiet / QUIET_DIVISOR),
  );
}

/**
 * When this playlist last visibly changed, for a record written before the
 * field existed. The newest thing that happened to it: an entry arriving, an
 * entry going, or failing both, its own creation. Without this every playlist
 * would look freshly changed on the first run and earn the shortest interval,
 * which is the opposite of the intent.
 */
export function inferLastChanged(playlist: ChannelPlaylist): Date {
  const stamps: Array<number> = [];
  for (const entry of playlist.entries ?? []) {
    stamps.push(entry.addedAt.getTime());
    if (entry.removedBefore) stamps.push(entry.removedBefore.getTime());
  }
  if (stamps.length) {
    return new Date(Math.max(...stamps));
  }
  // Only when there is nothing to go on. `firstSeen` in particular is when we
  // first looked at the playlist, not when the playlist last changed; letting
  // it into the comparison above would date every playlist to the day we
  // started scanning and hand a list untouched since 2013 the same interval as
  // one that changed this morning.
  return playlist.createdAt ?? playlist.firstSeen;
}

/** The live entries, as a string, for spotting that a merge changed something. */
function shape(entries: Array<ChannelPlaylistEntry> | undefined): string {
  return (entries ?? [])
    .map((e) => `${e.videoId}:${e.removedBefore ? "-" : "+"}`)
    .join(",");
}

if (import.meta.main) {
  await main();
}

/** Reads a value only when it says something, so blanks are never stored. */
function present(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Turns one playlistItems entry into a record of everything it says.
 *
 * Nothing is withheld for being redundant with `data/videos.yaml`. That
 * file only ever holds what a channel lists publicly, so for a private,
 * unlisted or foreign video the entry is the only record obtainable, and
 * deciding what to keep by consulting another file would discard exactly
 * the entries worth having.
 */
export function entryFrom(
  item: youtube_v3.Schema$PlaylistItem,
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
  // Where the video actually lives, whenever that is not the channel whose
  // playlist this is. A show channel's playlists point mostly at videos
  // hosted on the main one, so this is often set; that is a fact about the
  // entry and worth recording plainly, rather than being made conditional
  // on what another file happens to know. An owner outside the channels we
  // scan is what a collaboration looks like from here, which nothing on the
  // video or channel resource will tell us.
  return {
    videoId,
    position: item.snippet?.position ?? 0,
    addedAt: new Date(addedAt),
    videoPublishedAt: mapOptional(
      item.contentDetails?.videoPublishedAt ?? undefined,
      (d) => new Date(d),
    ),
    privacyStatus,
    // Recorded plainly, even when it is the channel whose playlist this
    // is. An owner outside the channels we scan is what a collaboration
    // looks like from here, and nothing on the video or channel resource
    // reports one at all.
    ownerChannelId: owner,
    ownerChannelTitle: present(item.snippet?.videoOwnerChannelTitle),
    title,
    description: present(item.snippet?.description),
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
  const channels = await openChannelStorage();
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
    const channel = channels.find((c) => c.channelId === channelId);

    // Playlists whose item count moved since we last looked. YouTube reports
    // the count in the cheap listing, so it says which of the expensive
    // per-playlist reads are actually worth making.
    const countChanged = new Set<string>();

    const listingDue = isDue(
      `${channelId}:playlist-listing`,
      channel?.playlistsListedAt,
      durationMs(LISTING_INTERVAL),
      now,
    );

    const seen = new Set<string>();
    let added = 0;
    if (listingDue) {
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
        const before = [
          playlist.title,
          playlist.description,
          playlist.privacyStatus,
          playlist.itemCount,
        ].join("\u0000");
        const previousCount = playlist.itemCount;
        playlist.channelId = channelId;
        playlist.title = present(found.snippet?.title);
        playlist.description = present(found.snippet?.description);
        playlist.privacyStatus = present(found.status?.privacyStatus);
        playlist.itemCount = found.contentDetails?.itemCount ?? undefined;
        playlist.createdAt = mapOptional(
          found.snippet?.publishedAt ?? undefined,
          (d) => new Date(d),
        );
        const after = [
          playlist.title,
          playlist.description,
          playlist.privacyStatus,
          playlist.itemCount,
        ].join("\u0000");
        if (before !== after) {
          playlist.lastChangedAt = now;
        }
        if (
          previousCount !== undefined && previousCount !== playlist.itemCount
        ) {
          countChanged.add(playlist.playlistId);
        }
      }
      if (channel) {
        channel.playlistsListedAt = now;
      }
    }

    const mine = playlists.filter((p) => p.channelId === channelId);
    if (listingDue && seen.size === 0 && mine.length > 0) {
      // The empty-response trap: a listing that returns nothing is far more
      // likely a bad fetch than a channel deleting every playlist at once.
      throw new Error(
        `${handle} listed no playlists while ${mine.length} are on record; ` +
          `refusing to mark them delisted`,
      );
    }

    // Anything on record for this channel but absent from the listing is
    // either unlisted or gone, and those deserve different answers. Only
    // meaningful when a listing actually happened; a skipped one saw nothing.
    let delisted = 0;
    let removed = 0;
    for (const playlist of listingDue ? mine : []) {
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

    // Delisted playlists are still scanned; only removed ones are dropped.
    let read = 0;
    let changed = 0;
    for (const playlist of mine) {
      if (playlist.removedBefore) {
        continue;
      }
      const lastChanged = playlist.lastChangedAt ?? inferLastChanged(playlist);
      if (
        !countChanged.has(playlist.playlistId) &&
        !isDue(
          playlist.playlistId,
          playlist.scrapedAt,
          contentsInterval(lastChanged, now),
          now,
        )
      ) {
        continue;
      }
      const observed: Array<ChannelPlaylistEntry> = [];
      for await (const item of playlistEntries(playlist.playlistId)) {
        const entry = entryFrom(item);
        if (entry) {
          observed.push(entry);
        }
      }
      const before = shape(playlist.entries);
      playlist.entries = mergeEntries(playlist.entries ?? [], observed, now);
      if (shape(playlist.entries) !== before) {
        playlist.lastChangedAt = now;
        changed += 1;
      }
      playlist.scrapedAt = new Date();
      read += 1;
    }

    console.info(
      `${handle}: ${
        listingDue ? `${seen.size} listed, ${added} new, ` : "listing not due, "
      }` +
        `${delisted} newly delisted, ${removed} newly removed, ` +
        `${read} of ${mine.length} playlists read, ${changed} changed.`,
    );
  }
}
