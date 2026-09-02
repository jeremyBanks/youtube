import { open } from "./yaml.ts";

import z from "zod";

/** YouTube video ID */
export const VideoId = z.string().regex(/^[0-9A-Za-z_\-]{11}$/);
export type VideoId = z.TypeOf<typeof VideoId>;

/** YouTube channel ID, including the leading `UC`. */
export const ChannelId = z.string().regex(/^UC[0-9A-Za-z_\-]{22}$/);
export type ChannelId = z.TypeOf<typeof ChannelId>;

/** Date-time */
export const DateTime = z.date();
export type DateTime = z.TypeOf<typeof DateTime>;

/** Duration in seconds */
export const Duration = z.number().positive().finite();
export type Duration = z.TypeOf<typeof Duration>;

/** YouTube channel metadata */
export const Channel = z.object({
  /** The channel's name. This corresponds to `title` in the API. */
  name: z.string(),
  /** The channel's handle, excluding the leading `@`. This corresponds to `customUrl` in the API. */
  handle: z.string().optional(),
  /** The channel's creation datetime. This corresponds to `publishedAt` in the API. */
  createdAt: DateTime,
  /** The channel's ID, including the leading `UC`. */
  channelId: ChannelId,
  /** The datetime at which this metadata was last refreshed. */
  refreshedAt: DateTime,
  /** The channel's count of publicly-visible videos. */
  videoCount: z.number(),
  /** The channel's subscriber count, to three digits of precision. */
  subscriberCount: z.number(),
  /** The channel's total view count, if visible. */
  viewCount: z.number(),
});
export type Channel = z.TypeOf<typeof Channel>;

let channelStorage:
  | undefined
  | Promise<Array<Channel>> = undefined;

export const openChannelStorage = () =>
  channelStorage ??= open("data/channels.yaml", Channel, ["createdAt"]);

/** YouTube video metadata as captured by a scan. */
export const Video = z.object({
  videoId: VideoId,
  channelId: ChannelId,
  publishedAt: DateTime,
  /**
   * When the video file itself went live on YouTube
   * (video.snippet.publishedAt). Distinct from `publishedAt` above, which is
   * the playlist-add time: for public videos the two are identical, and for
   * members videos the playlist-add time is the better proxy for the original
   * release, so it stays the primary field. This one is captured as
   * additional metadata and is not currently used by anything.
   */
  uploadedAt: z.date().optional(),
  /**
   * The date at which this video stopped appearing in the channel's uploads
   * playlist. Removed, not deleted: an unlisted video leaves the listing in
   * exactly the same way a destroyed one does, so a scan alone cannot tell
   * them apart. `deno task resolve --due` asks the API directly and records
   * what it learns in the fields below.
   */
  removedBefore: z.date().optional(),
  /** When a direct lookup last asked the API about this id. */
  resolvedAt: z.date().optional(),
  /**
   * What that lookup was told: `public` or `unlisted`. Set together with
   * `resolvedAt`; a `resolvedAt` with no `privacyStatus` means the API served
   * nothing, and `absence` below says what we made of that.
   */
  privacyStatus: z.string().optional(),
  /**
   * Why the API served nothing, when it served nothing. `videos.list` omits a
   * private video and a deleted one identically, so this comes from oEmbed,
   * which answers 403 for the first and 404 for the second. `unknown` is for
   * an id nothing has managed to classify: a lookup that has not run, or one
   * whose request failed.
   */
  absence: z.enum(["private", "deleted", "unknown"]).optional(),
  title: z.string().min(1),
  duration: z.number(),
  membersOnly: z.literal(true).optional(),
  /** Region codes where this video is allowed. If absent, it's allowed in all regions. */
  regionsAllowed: z.string().array().optional(),
  /** Region codes where this video is blocked. If absent, it's blocked in no regions. */
  regionsBlocked: z.string().array().optional(),
  /**
   * Age-restricted, from `contentDetails.contentRating.ytRating`. Absent means
   * it is not. Another half-hidden state, like a worldwide block: the video is
   * listed and served in full, and most of the audience cannot watch it.
   */
  ageRestricted: z.literal(true).optional(),
  /** `status.embeddable`. Absent means it can be embedded, as almost all can. */
  embeddable: z.literal(false).optional(),
  /**
   * `status.uploadStatus`, when it is not `processed`. The other values
   * include `rejected` and `deleted`, which is absence evidence the API gives
   * away on a part we already request.
   */
  uploadStatus: z.string().optional(),
  /** `snippet.liveBroadcastContent`, when it is not `none`: `live`, `upcoming`. */
  liveBroadcast: z.string().optional(),
  /** `status.madeForKids`. Absent means not; nothing we hold is. */
  madeForKids: z.literal(true).optional(),
  /**
   * `contentDetails.licensedContent`, when false. Absent means licensed, which
   * 93% of what we hold is — and not evenly: five of the smaller Dropout show
   * channels are at zero, so this clusters rather than scatters.
   */
  licensedContent: z.literal(false).optional(),
  /**
   * The embed iframe's `WIDTHxHEIGHT` at `maxHeight=720`, when it is not the
   * 16:9 `1280x720`. The API has no aspect ratio and no shorts flag, so this
   * is the only thing that distinguishes a vertical Short (405x720) from the
   * horizontal cut of the same trailer. See `src/video.ts`.
   */
  embedSize: z.string().optional(),
});
export type Video = z.TypeOf<typeof Video>;

let videoStorage:
  | undefined
  | Promise<Array<Video>> = undefined;

export const openVideoStorage = () =>
  videoStorage ??= open("data/videos.yaml", Video, [
    "publishedAt",
  ], async (video) => {
    const channels = await openChannelStorage();
    const handle = channels.find((channel) =>
      channel.channelId === video.channelId
    )?.handle;
    return handle ?? video.channelId;
  });

/** A scan of a channel for new content */
export const Scan = z.object({
  /** the channel ID being scanned */
  channelId: ChannelId,
  /** the channel handle being scanned */
  channelHandle: z.string().optional(),
  /** the timestamp at which this scan initiated. assumed to uniquely identify this scan */
  scannedAt: z.date(),
  /** what is the minimum timestamp this scan included? undefined if it exhausted all videos. */
  scannedTo: z.date().nullable(),
});
export type Scan = z.TypeOf<typeof Scan>;

let scanStorage:
  | undefined
  | Promise<Array<Scan>> = undefined;

export const openScanStorage = () =>
  scanStorage ??= open("data/scans.yaml", Scan, ["channelId", "-scannedAt"]);

/**
 * A video looked up directly by id rather than seen while listing a
 * channel, for ids that appear in the curation but on channels we do not
 * scan — a public copy on a guest's own channel, say.
 *
 * Deliberately its own file, never data/videos.yaml. A scanned record
 * carries a playlist-add timestamp and participates in removal detection
 * by being absent from a listing; neither is true here, and mixing the two
 * would corrupt both. Nothing in the scan reads or writes this.
 */
export const ResolvedVideo = z.object({
  videoId: VideoId,
  /** the channel that hosts it, which we may not scan at all */
  channelId: z.string().optional(),
  channelTitle: z.string().optional(),
  title: z.string().optional(),
  /** when the file went live; there is no playlist-add time to have */
  uploadedAt: z.date().optional(),
  duration: z.number().optional(),
  /** when this lookup was made */
  resolvedAt: DateTime,
  /** what the API says it is: `public` or `unlisted` */
  privacyStatus: z.string().optional(),
  /**
   * Why the API served nothing, when it served nothing. `videos.list` omits a
   * private video and a deleted one identically, so this comes from oEmbed,
   * which answers 403 for the first and 404 for the second. `unknown` is for
   * an id nothing has managed to classify: a lookup that has not run, or one
   * whose request failed.
   */
  absence: z.enum(["private", "deleted", "unknown"]).optional(),
  /** set when the API returned nothing: deleted, private, or never valid */
  missing: z.boolean().optional(),
  /** Region codes where this video is allowed. If absent, it's allowed in all regions. */
  regionsAllowed: z.string().array().optional(),
  /** Region codes where this video is blocked. If absent, it's blocked in no regions. */
  regionsBlocked: z.string().array().optional(),
  /**
   * Age-restricted, from `contentDetails.contentRating.ytRating`. Absent means
   * it is not. Another half-hidden state, like a worldwide block: the video is
   * listed and served in full, and most of the audience cannot watch it.
   */
  ageRestricted: z.literal(true).optional(),
  /** `status.embeddable`. Absent means it can be embedded, as almost all can. */
  embeddable: z.literal(false).optional(),
  /**
   * `status.uploadStatus`, when it is not `processed`. The other values
   * include `rejected` and `deleted`, which is absence evidence the API gives
   * away on a part we already request.
   */
  uploadStatus: z.string().optional(),
  /** `snippet.liveBroadcastContent`, when it is not `none`: `live`, `upcoming`. */
  liveBroadcast: z.string().optional(),
  /** `status.madeForKids`. Absent means not; nothing we hold is. */
  madeForKids: z.literal(true).optional(),
  /**
   * `contentDetails.licensedContent`, when false. Absent means licensed, which
   * 93% of what we hold is — and not evenly: five of the smaller Dropout show
   * channels are at zero, so this clusters rather than scatters.
   */
  licensedContent: z.literal(false).optional(),
  /**
   * The embed iframe's `WIDTHxHEIGHT` at `maxHeight=720`, when it is not the
   * 16:9 `1280x720`. The API has no aspect ratio and no shorts flag, so this
   * is the only thing that distinguishes a vertical Short (405x720) from the
   * horizontal cut of the same trailer. See `src/video.ts`.
   */
  embedSize: z.string().optional(),
});
export type ResolvedVideo = z.TypeOf<typeof ResolvedVideo>;

let resolvedVideoStorage:
  | undefined
  | Promise<Array<ResolvedVideo>> = undefined;

export const openResolvedVideoStorage = () =>
  resolvedVideoStorage ??= open(
    "data/resolved-videos.yaml",
    ResolvedVideo,
    ["videoId"],
  );

/**
 * One entry in a channel's playlist, as YouTube reports it.
 *
 * Optional fields are written only when they hold something, but nothing is
 * withheld for being redundant with `data/videos.yaml`: that file holds only
 * what a channel lists publicly, so for a private, unlisted or foreign video
 * the entry is the only record there is.
 */
export const ChannelPlaylistEntry = z.object({
  videoId: VideoId,
  /** where it sits in the playlist, as ordered by YouTube */
  position: z.number().int(),
  /** when it was added to this playlist */
  addedAt: z.date(),
  /** the video's own publish time; the same quantity as Video.uploadedAt */
  videoPublishedAt: z.date().optional(),
  /** how a private or deleted video shows up inside a playlist */
  privacyStatus: z.string().optional(),
  /**
   * Set only when the video belongs to some other channel, which is what a
   * collaboration looks like from here. Nothing on the video resource
   * itself reports one.
   */
  ownerChannelId: z.string().optional(),
  ownerChannelTitle: z.string().optional(),
  /**
   * The entry's own title and description. For a private, unlisted or
   * foreign video this is the only record of either that we can obtain.
   */
  title: z.string().optional(),
  description: z.string().optional(),
  /**
   * Legacy: a playlist could once clip a video and annotate an entry.
   * Nothing sets these now, so a value found is a historical artifact.
   * `note` is documented as visible only to a playlist's owner.
   */
  startAt: z.string().optional(),
  endAt: z.string().optional(),
  note: z.string().optional(),
  /** when this entry was first observed missing from the playlist */
  removedBefore: z.date().optional(),
});
export type ChannelPlaylistEntry = z.TypeOf<typeof ChannelPlaylistEntry>;

/**
 * A playlist belonging to a channel we scan, observed rather than
 * generated. Distinct from `Playlist`, which is what we intend to publish.
 *
 * Dropout organises its channels differently from us on purpose — separate
 * "Full Episodes" playlists, Adventuring Party on its own channel, no
 * free and members-only interleaving — so this is useful for comparing
 * membership, never structure.
 */
export const ChannelPlaylist = z.object({
  playlistId: z.string().min(1),
  channelId: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  privacyStatus: z.string().optional(),
  /** YouTube's own count, which can disagree with the entries we see */
  itemCount: z.number().int().optional(),
  /** when the playlist was created; it never changes */
  createdAt: z.date().optional(),
  entries: ChannelPlaylistEntry.array().optional(),
  firstSeen: DateTime,
  /** when this playlist's contents were last read in full */
  scrapedAt: z.date().optional(),
  /**
   * When a pass last saw this playlist differ from what we held: an entry
   * added or gone, or the title, description, privacy or item count changed.
   * How long ago that was sets how soon it is worth reading again — a
   * playlist nobody has touched in four years does not need weekly attention.
   */
  lastChangedAt: z.date().optional(),
  /**
   * When the playlist first stopped appearing in its channel's listing
   * while still being fetchable by id: unlisted or private rather than
   * gone. Such playlists keep being scanned.
   */
  delistedBefore: z.date().optional(),
  /** when the playlist first stopped being fetchable at all */
  removedBefore: z.date().optional(),
});
export type ChannelPlaylist = z.TypeOf<typeof ChannelPlaylist>;

let channelPlaylistStorage:
  | undefined
  | Promise<Array<ChannelPlaylist>> = undefined;

export const openChannelPlaylistStorage = () =>
  channelPlaylistStorage ??= open(
    "data/channel-playlists.yaml",
    ChannelPlaylist,
    ["playlistId"],
  );

export const Playlist = z.object({
  name: z.string(),
  description: z.string(),
  playlistId: z.string().nullable(),
  /** kept up to date, but not shown on the channel or in search */
  unlisted: z.boolean().optional(),
  videos: z.record(VideoId, z.string()),
});
export type Playlist = z.TypeOf<typeof Playlist>;

let playlistStorage:
  | undefined
  | Promise<Array<Playlist>> = undefined;

export const openPlaylistsStorage = () =>
  playlistStorage ??= open("data/playlists.yaml", Playlist);

export const openActualPlaylistsStorage = () =>
  playlistStorage ??= open("data/actual-playlists.yaml", Playlist);

/** An item on watch.dropout.tv, indexed from the sitemap. */
/**
 * A date with no time of day, which is what Dropout publishes: its pages
 * carry `2026-01-07` and nothing finer.
 *
 * Held as a string rather than a Date for two reasons. A Date would claim a
 * precision we were never given, and something would eventually render it in
 * local time and land on the previous day, since UTC midnight is the
 * afternoon before in California. And YAML itself parses a bare `2026-01-07`
 * straight back into a Date at UTC midnight - which is exactly how this field
 * became an instant in the first place - so only a quoted string survives the
 * round trip intact.
 *
 * The old Date form is still accepted so existing records load, but only
 * after asserting it is exactly midnight UTC. Anything else would mean a real
 * time of day had been recorded, which this field never had, and is worth
 * failing over rather than silently truncating.
 */
export const PlainDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(
  z.date().transform((value, ctx) => {
    if (
      value.getUTCHours() || value.getUTCMinutes() ||
      value.getUTCSeconds() || value.getUTCMilliseconds()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          `${value.toISOString()} carries a time of day; expected a date`,
      });
      return z.NEVER;
    }
    return value.toISOString().slice(0, 10);
  }),
);
export type PlainDate = z.TypeOf<typeof PlainDate>;

export const DropoutEpisode = z.object({
  /** the item's URL slug, unique across the site */
  slug: z.string().min(1),
  /** the collection it canonically belongs to */
  collection: z.string().min(1),
  /** every collection the sitemap lists it under */
  collections: z.string().array(),
  /** the sitemap's lastmod; a cheap recency proxy until details are fetched */
  lastmod: z.date().optional(),
  title: z.string().optional(),
  seasonNumber: z.number().int().optional(),
  episodeNumber: z.number().int().optional(),
  /** the official release date shown on the episode page */
  releaseDate: PlainDate.optional(),
  /** the page's own canonical url; for an episode in a collection this
   * carries the collection and season, which the sitemap cannot */
  url: z.string().optional(),
  /** the show's display name and slug, from the series link on the page */
  showTitle: z.string().optional(),
  showSlug: z.string().optional(),
  /** the one-line synopsis */
  description: z.string().optional(),
  /** Dropout's own genre tags */
  tags: z.string().array().optional(),
  /** the numeric VHX id of this item, from the player config */
  itemId: z.number().int().optional(),
  /** the numeric VHX id of the collection the player was given */
  collectionId: z.number().int().optional(),
  /** numeric ids of the items offered as up next, in the order shown */
  upNextIds: z.number().int().array().optional(),
  /** when this slug first appeared in the sitemap */
  firstSeen: DateTime,
  /** when the episode page was fetched for details */
  scrapedAt: z.date().optional(),
  /** when this slug was first observed missing from the sitemap */
  removedBefore: z.date().optional(),
});
export type DropoutEpisode = z.TypeOf<typeof DropoutEpisode>;

/**
 * One collection (a show, a season, or one of Dropout's aggregate
 * groupings). Collection pages are the cheap layer: 366 of them against
 * 3,594 episodes, and they carry the show's display name, synopsis and
 * artwork, plus its episode list in running order.
 */
export const DropoutCollection = z.object({
  /** the collection's URL slug */
  slug: z.string().min(1),
  /** display name, e.g. "Dimension 20: Mice & Murder" */
  title: z.string().optional(),
  /** the show synopsis */
  description: z.string().optional(),
  /** season numbers the page links to */
  seasons: z.number().int().array().optional(),
  /** episode slugs in the order the page lists them */
  episodes: z.string().array().optional(),
  /** numeric VHX ids of the listed items */
  itemIds: z.number().int().array().optional(),
  /** how many sitemap entries name this collection */
  size: z.number().int().optional(),
  firstSeen: DateTime,
  scrapedAt: z.date().optional(),
  removedBefore: z.date().optional(),
});
export type DropoutCollection = z.TypeOf<typeof DropoutCollection>;

let dropoutCollectionStorage:
  | undefined
  | Promise<Array<DropoutCollection>> = undefined;

export const openDropoutCollectionStorage = () =>
  dropoutCollectionStorage ??= open(
    "data/dropout-collections.yaml",
    DropoutCollection,
    ["slug"],
  );

let dropoutStorage:
  | undefined
  | Promise<Array<DropoutEpisode>> = undefined;

export const openDropoutStorage = () =>
  dropoutStorage ??= open("data/dropout.yaml", DropoutEpisode, ["slug"]);
