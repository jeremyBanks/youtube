import { parseArgs } from "@std/cli";
import * as yaml from "../yaml.ts";
import { DropoutCollection, DropoutEpisode } from "../storage.ts";
import { getDropoutConfig, getSeasonsCuration } from "../config.ts";

if (import.meta.main) {
  await main();
}

/**
 * Reduces a title to a form that survives the differences between our
 * curation titles and Dropout's og:title values: episode-number prefixes,
 * punctuation, ampersands, and casing.
 */
export function normalizeTitle(title: string): string {
  return title
    .replace(/^\d+[ab]?\.\s*/, "") // "101. Title" / "7a. Title" prefixes
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Dropout re-lists episodes under aggregate collections, which are never a
 * show's home and would match a show's name misleadingly.
 */
function isAggregate(slug: string): boolean {
  return /complete-(series|experience)/.test(slug) ||
    slug === "dip-your-toe-in" || slug === "dropout-24-7";
}

/** The curated titles are spread across per-type fields; takes the one set. */
function entryTitle(
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

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Command-line entry point. Cross-references curated `published:` dates
 * against the official release dates scraped from watch.dropout.tv, and
 * reports every disagreement. Reads only; never writes anything.
 */
export async function main() {
  const args = parseArgs(Deno.args, {
    boolean: ["unmatched"],
    string: ["show"],
  });

  const config = await getDropoutConfig();
  const curation = await getSeasonsCuration();
  // A plain read of the data file, deliberately not openDropoutStorage():
  // this report must be able to run alongside an active scan without
  // registering its own dump-on-exit handlers over the same file.
  const episodes = DropoutEpisode.array().parse(
    await yaml.load("./data/dropout.yaml"),
  );
  const collections = DropoutCollection.array().parse(
    await yaml.load("./data/dropout-collections.yaml"),
  );

  // Most shows name themselves: the collection's own display name matches
  // the curation's, so the mapping derives rather than being maintained by
  // hand. config/dropout.toml is left for the cases that cannot derive — a
  // show like Dropout Presents that has no collection of its own, or a name
  // that simply differs — and always wins where it is set.
  const derived = new Map<string, Array<string>>();
  for (const collection of collections) {
    if (!collection.title || isAggregate(collection.slug)) {
      continue;
    }
    const key = normalizeTitle(collection.title);
    derived.set(key, [...(derived.get(key) ?? []), collection.slug]);
  }

  const bySlug = new Map(episodes.map((e) => [e.slug, e]));
  const scraped = episodes.filter((e) => e.scrapedAt && e.releaseDate);

  let compared = 0;
  let agreements = 0;
  const mismatches: Array<string> = [];
  const ambiguous: Array<string> = [];
  const unmatched: Array<string> = [];
  const badSlugs: Array<string> = [];

  for (const doc of curation) {
    if (args.show && doc.show !== args.show) {
      continue;
    }
    const prefixes = config.shows[doc.show] ??
      derived.get(normalizeTitle(doc.show));
    const where = doc.season ? `${doc.show} / ${doc.season}` : doc.show;

    for (const video of doc.videos) {
      const named = entryTitle(video);
      if (!named || !video.published) {
        continue;
      }
      const label = `${where}: ${named.title}`;

      let match: DropoutEpisode | undefined;
      if (video.dropout) {
        match = bySlug.get(video.dropout);
        if (!match) {
          badSlugs.push(`${label} -> dropout: ${video.dropout} (no such slug)`);
          continue;
        }
        if (!match.releaseDate) {
          unmatched.push(`${label} (slug ${video.dropout} not yet scraped)`);
          continue;
        }
      } else {
        if (!prefixes?.length) {
          continue; // show has no collection mapping; nothing to say
        }
        const wanted = normalizeTitle(named.title);
        const candidates = scraped.filter((e) =>
          prefixes.some((p) => e.collection.startsWith(p)) && e.title &&
          normalizeTitle(e.title) === wanted
        );
        if (candidates.length > 1) {
          ambiguous.push(
            `${label} matches ${candidates.length}: ` +
              candidates.map((c) => c.slug).join(", "),
          );
          continue;
        }
        if (candidates.length === 0) {
          unmatched.push(label);
          continue;
        }
        match = candidates[0];
      }

      compared += 1;
      const official = isoDate(match.releaseDate!);
      const curated = isoDate(video.published);
      if (official === curated) {
        agreements += 1;
      } else {
        const days = Math.round(
          (video.published.getTime() - match.releaseDate!.getTime()) /
            86_400_000,
        );
        mismatches.push(
          `${label}\n    curated ${curated}, official ${official} ` +
            `(${days > 0 ? "+" : ""}${days}d, ${match.slug})`,
        );
      }
    }
  }

  if (mismatches.length) {
    console.info(`\n${mismatches.length} date mismatches:`);
    for (const line of mismatches) {
      console.info(`  ${line}`);
    }
  }
  if (ambiguous.length) {
    console.info(`\n${ambiguous.length} ambiguous title matches:`);
    for (const line of ambiguous) {
      console.info(`  ${line}`);
    }
  }
  if (badSlugs.length) {
    console.info(`\n${badSlugs.length} dangling dropout: slugs:`);
    for (const line of badSlugs) {
      console.info(`  ${line}`);
    }
  }
  if (args.unmatched && unmatched.length) {
    console.info(`\n${unmatched.length} entries with no scraped match:`);
    for (const line of unmatched) {
      console.info(`  ${line}`);
    }
  }

  console.info(
    `\n${compared} entries compared: ${agreements} agree, ` +
      `${mismatches.length} differ. ${ambiguous.length} ambiguous, ` +
      `${badSlugs.length} dangling slugs, ${unmatched.length} unmatched` +
      (args.unmatched ? "." : " (list with --unmatched)."),
  );
}
