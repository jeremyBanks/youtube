/**
 * Linking a curated entry to its watch.dropout.tv episode.
 *
 * This lived inside `verify-dates` and was reimplemented, badly, every time
 * something else needed it. The reimplementations kept grouping Dropout
 * episodes by `showTitle`, a field 443 of the 3,601 records do not carry, and
 * kept ignoring `config/dropout.toml`'s `[shows]`, which is the whole reason
 * Dropout Presents -- twelve collections, one per stand-up special, and no
 * collection of its own -- was twice reported as having nothing on the site.
 *
 * So the mapping lives here once. `collection` is the join key, never
 * `showTitle`.
 */

import type { DropoutCollection, DropoutEpisode } from "./storage.ts";
import { normalizeTitle } from "./common.ts";

/**
 * Dropout re-lists episodes under aggregate collections, which are never a
 * show's home and would match a show's name misleadingly.
 */
export function isAggregate(slug: string): boolean {
  return /complete-(series|experience)/.test(slug) ||
    slug === "dip-your-toe-in" || slug === "dropout-24-7";
}

/** The curated titles are spread across per-type fields; takes the one set. */
export function entryTitle(
  entry: Record<string, unknown>,
): { type: string; title: string } | undefined {
  for (const type of ["episode", "trailer", "special", "bts", "animation"]) {
    const title = entry[type];
    if (typeof title === "string") {
      return { type, title };
    }
  }
  return undefined;
}

/**
 * Which collection slugs a curated show's episodes live under.
 *
 * Most shows name themselves: the collection's own display name matches the
 * curation's, so the mapping derives rather than being maintained by hand.
 * `config/dropout.toml` is for the cases that cannot derive -- a show with no
 * collection of its own, or a name that differs -- and always wins.
 */
export function showPrefixes(
  collections: Array<DropoutCollection>,
  configShows: Record<string, Array<string>>,
): (show: string) => Array<string> | undefined {
  const derived = new Map<string, Array<string>>();
  for (const collection of collections) {
    if (!collection.title || isAggregate(collection.slug)) {
      continue;
    }
    const key = normalizeTitle(collection.title);
    derived.set(key, [...(derived.get(key) ?? []), collection.slug]);
  }
  return (show) => configShows[show] ?? derived.get(normalizeTitle(show));
}

/**
 * Every episode under one of `prefixes` whose title matches `title`.
 *
 * More than one is not a match: it is a question for a person, and silently
 * taking the first is how a wrong link gets written.
 */
export function candidatesFor(
  episodes: Array<DropoutEpisode>,
  prefixes: Array<string>,
  title: string,
): Array<DropoutEpisode> {
  const wanted = normalizeTitle(title);
  return episodes.filter((e) =>
    prefixes.some((p) => e.collection.startsWith(p)) && e.title &&
    normalizeTitle(e.title) === wanted
  );
}
