/**
 * Whether each curation entry files its ids in the fields they belong in,
 * judged against what the scans saw of the videos themselves.
 *
 * Every one of these was found by hand in the 2026-11-03 review, after
 * passing every other check: a members-only teaser filed as a `public copy`,
 * and a Campaign 4 trailer curated as its vertical upload while the horizontal
 * one of the same length, from the same minute, went unnamed. None of them
 * breaks a playlist, which is why nothing caught them, and all of them leave
 * it carrying the wrong thing or describing it wrongly.
 *
 * Report-only. A finding is a question for a person, and the fix is always an
 * edit to curation/seasons.yaml.
 */

/** The parts of a stored video these checks read. */
export type FiledVideo = {
  videoId: string;
  channelId?: string;
  publishedAt?: Date;
  duration?: number;
  embedSize?: string;
  membersOnly?: true;
};

/** The parts of a curation entry these checks read. */
export type FiledEntry = {
  members?: string;
  public?: string;
  "public copy"?: string;
  "public short"?: string;
};

/** Narrower than it is tall. `embedSize` is omitted at 1280x720. */
export const isVertical = (video: { embedSize?: string }): boolean => {
  const [width, height] = (video.embedSize ?? "1280x720").split("x").map(
    Number,
  );
  return width < height;
};

// A Short and its trailer are one edit at two shapes, so their lengths agree
// to the second or near it. Anything further apart is a cut-down, which is an
// excerpt and not a twin.
const TWIN_SECONDS = 3;
// How close a horizontal upload has to be to a vertical `public`, in length
// and in time, to be named as its probable twin. Dropout and Critical Role
// post both cuts in the same minute; a day is generous.
const SAME_LENGTH_SECONDS = 1;
const SAME_DAY_MS = 24 * 60 * 60 * 1000;

export function filingProblems(
  entries: Array<{ where: string; entry: FiledEntry }>,
  videos: Iterable<FiledVideo>,
  curatedIds: Set<string>,
): Array<string> {
  const byId = new Map<string, FiledVideo>();
  const byChannel = new Map<string, Array<FiledVideo>>();
  for (const video of videos) {
    byId.set(video.videoId, video);
    if (!video.channelId) continue;
    if (!byChannel.has(video.channelId)) byChannel.set(video.channelId, []);
    byChannel.get(video.channelId)!.push(video);
  }

  const problems: Array<string> = [];
  for (const { where, entry } of entries) {
    const members = entry.members && byId.get(entry.members);
    if (members && !members.membersOnly) {
      problems.push(`${where}: members ${entry.members} is a free upload`);
    }
    for (const field of ["public", "public copy"] as const) {
      const video = entry[field] && byId.get(entry[field]!);
      if (video && video.membersOnly) {
        problems.push(`${where}: ${field} ${entry[field]} is members-only`);
      }
    }

    const publicVideo = entry.public ? byId.get(entry.public) : undefined;
    const short = entry["public short"]
      ? byId.get(entry["public short"])
      : undefined;
    if (short && !isVertical(short)) {
      problems.push(
        `${where}: public short ${short.videoId} is not vertical ` +
          `(${short.embedSize ?? "1280x720"})`,
      );
    }
    if (
      short?.duration !== undefined && publicVideo?.duration !== undefined &&
      Math.abs(short.duration - publicVideo.duration) > TWIN_SECONDS
    ) {
      problems.push(
        `${where}: public short ${short.videoId} runs ${short.duration}s ` +
          `against ${publicVideo.duration}s, so it is a cut-down, not a twin`,
      );
    }

    // A vertical `public` is right when nothing else exists, as for a Short
    // made for its own sake. It is wrong when a horizontal cut of the same
    // thing went up beside it, because that is the one to watch.
    if (
      publicVideo && isVertical(publicVideo) &&
      publicVideo.channelId && publicVideo.publishedAt &&
      publicVideo.duration !== undefined
    ) {
      for (const other of byChannel.get(publicVideo.channelId) ?? []) {
        if (
          other.videoId !== publicVideo.videoId &&
          !curatedIds.has(other.videoId) && !isVertical(other) &&
          !other.membersOnly && other.duration !== undefined &&
          other.publishedAt &&
          Math.abs(other.duration - publicVideo.duration) <=
            SAME_LENGTH_SECONDS &&
          Math.abs(+other.publishedAt - +publicVideo.publishedAt) <=
            SAME_DAY_MS
        ) {
          problems.push(
            `${where}: public ${publicVideo.videoId} is vertical, and ` +
              `${other.videoId} is a horizontal upload of the same length ` +
              `from the same day that nothing names`,
          );
        }
      }
    }
  }
  return problems;
}
