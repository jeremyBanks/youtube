/**
 * Reading a stored video record out of a YouTube video resource.
 *
 * Three places used to build these records by hand — the channel scan's public
 * pass, its members pass, and `resolve` — from the same API response, and they
 * drifted, as three copies of anything do. `resolve` fetched
 * `contentDetails` and then dropped the region restrictions it contained, so a
 * video that went on to be blocked worldwide could never be noticed by the one
 * command whose job is asking the API about videos a scan cannot see.
 *
 * So the mapping lives here, once. A field added to `videoDetails` is captured
 * by every caller, which is the only arrangement that stays true.
 */

import type * as googleapis from "googleapis";

import { mapOptional } from "./common.ts";
import type { Video } from "./storage.ts";

/**
 * The parts every caller asks for.
 *
 * Quota on `videos.list` is charged per call, not per part, so this is free:
 * eleven parts cost exactly what one does. `statistics` is deliberately absent
 * — view and like counts change every day on every video, and storing them
 * would rewrite all twenty thousand records on every scan and leave the daily
 * commit diff unreadable. `fileDetails`, `processingDetails` and `suggestions`
 * are owner-only and answer 403 for anybody else's video, which would fail the
 * whole request.
 */
export const VIDEO_PARTS = ["snippet", "contentDetails", "status", "player"];

/**
 * The height to request an embed at, which fixes the width the aspect ratio
 * implies. 720 makes a 16:9 video 1280 wide, which is the value
 * `DEFAULT_EMBED_SIZE` below assumes; changing this would change what counts
 * as a default and invalidate every stored `embedSize`.
 */
export const EMBED_MAX_HEIGHT = 720;

/**
 * The embed size of an ordinary 16:9 video, which is not worth storing.
 *
 * Exactly this string, and nothing near it. 72 videos come back 1281x720 and
 * one 1278x720, which are 16:9 to within a rounding error, and they are stored
 * anyway. Rounding them in would be normalising away the only evidence we have
 * that they are odd, and the oddities are the point -- see `embedSizeOf`.
 */
const DEFAULT_EMBED_SIZE = `1280x${EMBED_MAX_HEIGHT}`;

/**
 * The fields of a video record that come from the video resource rather than
 * from the playlist entry that led us to it.
 *
 * `duration` is optional here and required on `Video`, because a details fetch
 * can come back empty; the scan asserts it, having no record to write without
 * one.
 */
export type VideoDetails =
  & Pick<
    Video,
    | "uploadedAt"
    | "regionsAllowed"
    | "regionsBlocked"
    | "ageRestricted"
    | "embeddable"
    | "uploadStatus"
    | "liveBroadcast"
    | "madeForKids"
    | "licensedContent"
    | "embedSize"
  >
  & { duration?: number };

/**
 * What the API says about a video, in the shape we store.
 *
 * Every field is written only when it differs from the overwhelmingly common
 * value, the same way `regionsBlocked` always has: 93% of the videos we hold
 * are `licensedContent`, all of them are `processed`, and none are made for
 * kids, so recording those would be twenty thousand lines saying nothing. The
 * schema comments name each default.
 *
 * The cost of that economy is that an absent field means either "the default"
 * or "captured before this field existed", and only a complete re-scan tells
 * the two apart. That is the same bargain `uploadedAt` made, and it is now at
 * 99.7% coverage.
 *
 * Returns every field undefined for a video the API declined to serve, so that
 * a caller merging this into an existing record does not have to special-case
 * the absence — but callers must not merge it, since clearing a record's
 * details because a lookup failed is not something a failed lookup licenses.
 */
export function videoDetails(
  video: googleapis.youtube_v3.Schema$Video | undefined,
): VideoDetails {
  const embedSize = embedSizeOf(video?.player?.embedHtml);
  return {
    uploadedAt: mapOptional(
      video?.snippet?.publishedAt ?? undefined,
      (d) => new Date(d),
    ),
    duration: mapOptional(
      video?.contentDetails?.duration,
      Temporal.Duration.from,
    )?.total("seconds"),
    regionsAllowed: video?.contentDetails?.regionRestriction?.allowed ??
      undefined,
    regionsBlocked: video?.contentDetails?.regionRestriction?.blocked ??
      undefined,
    ageRestricted:
      video?.contentDetails?.contentRating?.ytRating === "ytAgeRestricted"
        ? true
        : undefined,
    embeddable: video?.status?.embeddable === false ? false : undefined,
    uploadStatus: video?.status?.uploadStatus === "processed"
      ? undefined
      : video?.status?.uploadStatus ?? undefined,
    liveBroadcast: video?.snippet?.liveBroadcastContent === "none"
      ? undefined
      : video?.snippet?.liveBroadcastContent ?? undefined,
    madeForKids: video?.status?.madeForKids === true ? true : undefined,
    licensedContent: video?.contentDetails?.licensedContent === false
      ? false
      : undefined,
    embedSize: embedSize === DEFAULT_EMBED_SIZE ? undefined : embedSize,
  };
}

/**
 * The pixel size of the embed iframe, as `WIDTHxHEIGHT`.
 *
 * This is the only place the API reveals a video's shape. There is no aspect
 * ratio field and no shorts flag: `contentDetails.dimension` is `2d` or `3d`,
 * meaning stereoscopy, and reports `2d` for a vertical Short and a widescreen
 * episode alike. Asking for the embed at a fixed height turns the shape into a
 * width, which is how a vertical Short (405x720) is told from the horizontal
 * cut of the same trailer (1280x720) — a distinction the curation records as
 * `public short` and has until now had to check by hand.
 *
 * Stored as the literal pair rather than a `vertical` flag, because the
 * measurements are the evidence and a flag is a reading of it. There are 24
 * distinct sizes across the catalogue and the tail is not noise: it sorts by
 * channel, which is what an artefact of a particular era or encoder looks
 * like. All 71 videos at 1308x720 are LoadingReadyRun's, as are 29 of the 30
 * at 981x720 and both at 1704x720; the 45 perfectly square ones are Critical
 * Role's and Dropout's; the 4 at 853x720 are all Drawfee's. Even among the
 * vertical Shorts the width varies -- 404, 405, 406, 408, 432, 540.
 *
 * **Do not round these to the nearest standard ratio.** The anomaly is the
 * finding. A boolean, or a normalised aspect, would erase exactly the thing
 * worth having.
 */
export function embedSizeOf(embedHtml: string | null | undefined) {
  const match = /width="(\d+)" height="(\d+)"/.exec(embedHtml ?? "");
  return match ? `${match[1]}x${match[2]}` : undefined;
}
