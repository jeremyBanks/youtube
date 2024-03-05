/**
 * Zod type definitions for data we store/persist.
 *
 * @module
 */

import z from "npm:zod";

/** YouTube video ID */
export const VideoId = z.string().regex(/^[0-9A-Za-z_\-]{11}$/);
export type VideoId = z.TypeOf<typeof VideoId>;

/** YouTube channel ID, including the leading `UC`. */
export const ChannelId = z.string().regex(/^UC[0-9A-Za-z_\-]{22}$/);
export type ChannelId = z.TypeOf<typeof ChannelId>;

/** YouTube channel metadata */
export const Channel = z.object({
  /** The channel's name. This corresponds to `title` in the API. */
  name: z.string(),
  /** The channel's handle, excluding the leading `@`. This corresponds to `customUrl` in the API. */
  handle: z.string(),
  /** The channel's creation datetime. This corresponds to `publishedAt` in the API. */
  createdAt: z.date(),
  /** The channel's ID, including the leading `UC`. */
  channelId: ChannelId,
  /** The datetime at which this metadata was last refreshed. */
  refreshedAt: z.date(),
  /** The channel's count of publicly-visible videos. */
  videoCount: z.number(),
  /** The channel's subscriber count, to three digits of precision. */
  subscriberCount: z.number(),
  /** The channel's total view count, if visible. */
  viewCount: z.number(),
});
export type Channel = z.TypeOf<typeof Channel>;

/** Duration in seconds */
export const Duration = z.number().positive().finite();
export type Duration = z.TypeOf<typeof Duration>;

/** A scan of a channel for new content */
export const Scan = z.object({
  /** the timestamp at which this scan initiated. assumed to uniquely identify this scan */
  scannedAt: z.date(),
  /** the channel ID being scanned */
  channelId: ChannelId,
  /** what is the minimum timestamp we're interested in including in this scan? if null, we want to include all videos with no minimum. */
  stopAt: z.date().nullable(),
  /** how was this scan completed? */
  completion: z.union([
    /** the scan was interrupted before completion, or is still in progress */
    z.literal("incomplete"),
    /** the scan completely exhausted the available videos, reaching either the end of the video list, or the end of the specified time range */
    z.literal("exhaustion"),
    /** the scan reached a video that was already captured by a previously completed scan covering at least the same time range */
    z.literal("overlap"),
  ]),
});
export type Scan = z.TypeOf<typeof Scan>;

/** YouTube video metadata as captured by a scan.
 *
 * The channel ID isn't included inline because videos are already stored by channel ID.
 */
export const Video = z.object({
  videoId: VideoId,
  title: z.string().min(1),
  description: z.string(),
  publishedAt: z.date(),
  duration: Duration,
  membersOnly: z.boolean(),
});
export type Video = z.TypeOf<typeof Video>;
