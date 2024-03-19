import { open } from "./yaml.ts";

import z from "npm:zod";

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
  /** The date at which this video was observed to have been removed. */
  removedBefore: z.date().optional(),
  title: z.string().min(1),
  duration: z.number(),
  membersOnly: z.literal(true).optional(),
  viewCount: z.number().optional(),
  likeCount: z.number().optional(),
  commentCount: z.number().optional(),
  /** Region codes where this video is allowed. If absent, it's allowed in all regions. */
  regionsAllowed: z.string().array().optional(),
  /** Region codes where this video is blocked. If absent, it's blocked in no regions. */
  regionsBlocked: z.string().array().optional(),
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

export const Playlist = z.object({
  name: z.string(),
  description: z.string(),
  playlistId: z.string(),
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
