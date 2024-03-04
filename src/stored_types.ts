/**
 * Zod type definitions for data we store/persist.
 *
 * @module
 */

import z from "npm:zod";

/** YouTube video ID */
export const VideoId = z.string().regex(/^[0-9A-Za-z_\-]{11}$/);
export type VideoId = z.TypeOf<typeof VideoId>;

/** YouTube channel ID */
export const ChannelId = z.string().regex(/^UC[0-9A-Za-z_\-]{22}$/);
export type ChannelId = z.TypeOf<typeof ChannelId>;

/** Duration in seconds */
export const Duration = z.number().positive().finite();
export type Duration = z.TypeOf<typeof Duration>;

/** A scan of a channel for new content */
export const Scan = z.object({
  /** the channel ID being scanned */
  channelId: ChannelId,
  /** the timestamp at which this scan initiated. */
  timestamp: z.date(),
  /** what is the minimum timestamp we're interested in including in this scan? if null, we want to include all videos with no minimum. */
  minTimestamp: z.date().nullable(),
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
  // Oh, right: the official API doesn't let you know if something is a members-only video. And other limitations too. Google neglects all their products so much. Can it even see members-only videos? I think so, but I guess we'll have to see...
  // Okay, but we can use the associated members-only playlist (see UUMOPDXXXJj9nax0fr0Wfc048g) to find members-only videos specifically... and this even works if we aren't authenticated! Okay! That's a very good workaround!
  // And unlike the very-similar UUMF playlist, this one also includes unlisted videos! Like ndTplebrzs8! Weird! Okay, they're not delisted, they're live streams? As are listed in the UUMV playlist. weird but okay. So we'll use UU (all public videos + shorts + live) and UUMO (all members only videos + shorts(?) + live)
  // I guess to make this sensible we may want to separate out discovery of video IDs from fetching their details. But maybe the API doesn't even make that make sense. We'll see!
  // I guess we need to confirm whether the API even works with these playlists.
  membersOnly: z.boolean().default(false),
});
