/**
 * Whether each doc of the curation lists its entries in release order.
 *
 * Playlist order is file order, and the rule for the file is release order
 * by `published:`, with three exceptions that are each a convention rather
 * than an accident:
 *
 * - A trailer may stand ahead of what it trails whatever its date. A season's
 *   opening trailers lead it even when they went up after the premiere, as
 *   Fantasy High's did, and a trailer for one special sits right before it.
 * - Episodes keep Dropout's episode order even where that is not release
 *   order. The number is Dropout's, the date is the release, and the two need
 *   not agree: Breaking News season 2 aired its odd episodes first.
 * - An `animation:` sits beside the moment it depicts, years out of order by
 *   design, and takes no part in the check.
 *
 * Everything else that is out of order is a mistake in the file or a wrong
 * date, and the 2026-11-04 pass found 38 of them in 21 docs -- cast
 * behind-the-scenes sets filed after the finale, a season's whole run of
 * talkbacks appended at the end, a post-season talkback placed before the one
 * dated a day earlier. Report-only, like `filing`: the fix is an edit.
 */

export type OrderedEntry = {
  episode?: string;
  special?: string;
  trailer?: string;
  bts?: string;
  animation?: string;
  external?: string;
  published?: Date;
};

const kindOf = (entry: OrderedEntry) =>
  entry.episode !== undefined
    ? "episode"
    : entry.special !== undefined
    ? "special"
    : entry.trailer !== undefined
    ? "trailer"
    : entry.animation !== undefined
    ? "animation"
    : entry.external !== undefined
    ? "external"
    : "bts";

const titleOf = (entry: OrderedEntry) =>
  entry.episode ?? entry.special ?? entry.trailer ?? entry.bts ??
    entry.animation ?? entry.external ?? "?";

/** The leading number of "206. Yes or No", or undefined where there is none. */
export const episodeNumber = (title: string): number | undefined => {
  const match = /^(\d+)\./.exec(title);
  return match ? Number(match[1]) : undefined;
};

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

export function orderProblems(
  docs: Array<{ where: string; videos: Array<OrderedEntry> }>,
): Array<string> {
  const problems: Array<string> = [];
  for (const { where, videos } of docs) {
    const entries = videos.filter((entry) => kindOf(entry) !== "animation");
    for (let i = 1; i < entries.length; i += 1) {
      const before = entries[i - 1];
      const after = entries[i];
      if (!before.published || !after.published) continue;
      if (+after.published >= +before.published) continue;
      if (kindOf(before) === "trailer") continue;
      const numbered = kindOf(before) !== "bts" && kindOf(after) !== "bts" &&
        kindOf(before) !== "external" && kindOf(after) !== "external";
      if (numbered) {
        const left = episodeNumber(titleOf(before));
        const right = episodeNumber(titleOf(after));
        if (left !== undefined && right !== undefined && right > left) {
          continue;
        }
      }
      problems.push(
        `${where}: "${titleOf(after)}" (${isoDate(after.published)}) is ` +
          `filed after "${titleOf(before)}" (${isoDate(before.published)})`,
      );
    }
  }
  return problems;
}
