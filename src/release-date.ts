/**
 * What `published:` in the curation should be, from the evidence we hold.
 *
 * `published:` is the first day a video could be watched, anywhere. The
 * sources disagree in predictable ways, and this is the one place that
 * ranks them. `dates.md` has the measurements behind each rule.
 *
 * - A **catalogue** date is a release date someone published: Dropout's own
 *   page, TheTVDB where Dropout's page carries none, or a hand override where
 *   Dropout's page is wrong. It is the answer whenever it exists.
 * - A **public** YouTube upload is a real publication, so one that predates the
 *   catalogue wins: the CollegeHumor-era shows went to YouTube first.
 * - The **audio-only** page on Dropout is released with or after the video, so
 *   it bounds the date from above and is adopted where it is the earliest word.
 * - A **members** upload is not a release. Dropout schedules uploads days to
 *   weeks ahead, and backfills whole seasons years late, so the date it carries
 *   can be wrong in either direction. It is used only when nothing else exists.
 * - A date is never moved later on upload evidence alone: a re-upload in 2024
 *   says nothing about a release in 2012.
 */

export type DateSource =
  | "override"
  | "dropout"
  | "tvdb"
  | "audio"
  | "public"
  | "members"
  | "curated";

export type Evidence = {
  /** the catalogue date, if any, and which catalogue it came from */
  catalogue?: { date: string; source: "override" | "dropout" | "tvdb" };
  /** Dropout's `[Audio Only]` page's release date */
  audio?: string;
  /** earliest Pacific date a public upload went live */
  public?: string;
  /** earliest Pacific date a members upload went live, unless it is a batch */
  members?: string;
  /** what the curation says today */
  curated?: string;
};

export type Expected = { date: string; source: DateSource } | undefined;

/** All plain ISO dates, so string comparison is date comparison. */
export function expectedDate(ev: Evidence): Expected {
  let catalogue = ev.catalogue;
  if (catalogue && ev.audio && ev.audio < catalogue.date) {
    catalogue = { date: ev.audio, source: "audio" as never };
  }
  if (catalogue) {
    if (ev.public && ev.public < catalogue.date) {
      return { date: ev.public, source: "public" };
    }
    return { date: catalogue.date, source: catalogue.source as DateSource };
  }
  // No catalogue: only ever move earlier, since a later upload disproves
  // nothing -- except that a date which is merely the members upload is an
  // artefact, and the audio page's date is a real release.
  if (ev.curated && ev.audio && ev.curated === ev.members) {
    if (!ev.public || ev.audio <= ev.public) {
      return { date: ev.audio, source: "audio" };
    }
  }
  const candidates: Array<{ date: string; source: DateSource }> = [];
  if (ev.curated) candidates.push({ date: ev.curated, source: "curated" });
  if (ev.public) candidates.push({ date: ev.public, source: "public" });
  if (ev.audio) candidates.push({ date: ev.audio, source: "audio" });
  if (!candidates.length && ev.members) {
    return { date: ev.members, source: "members" };
  }
  if (!candidates.length) return undefined;
  candidates.sort((a, b) => a.date.localeCompare(b.date));
  return candidates[0];
}

/**
 * A date shared by this many pages is a platform-add, not a release: Fatal
 * Decision's 49 episodes all carry the day the show reached Dropout.
 */
export const BULK_CATALOGUE = 8;

/**
 * A members-upload date shared by this many entries of one season is a
 * backfill batch, not a release.
 */
export const BULK_MEMBERS = 5;

/** The date in Los Angeles when an instant happened; releases are scheduled there. */
export function pacificDate(instant: Date): string {
  return instant.toLocaleDateString("en-CA", {
    timeZone: "America/Los_Angeles",
  });
}
