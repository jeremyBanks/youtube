import { parseArgs } from "@std/cli";
import * as yaml from "../yaml.ts";
import { DropoutCollection, DropoutEpisode } from "../storage.ts";
import { getDropoutConfig, getSeasonsCuration } from "../config.ts";
import { candidatesFor, entryTitle, showPrefixes } from "../dropout-link.ts";

if (import.meta.main) {
  await main();
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

  const prefixesFor = showPrefixes(collections, config.shows);

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
    const prefixes = prefixesFor(doc.show);
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
        const candidates = candidatesFor(scraped, prefixes, named.title);
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
      // Already a plain date; the curated side still needs narrowing.
      const official = match.releaseDate!;
      const curated = isoDate(video.published);
      if (official === curated) {
        agreements += 1;
      } else {
        const days = Math.round(
          (video.published.getTime() - Date.parse(`${official}T00:00:00Z`)) /
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
