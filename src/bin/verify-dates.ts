import { parseArgs } from "@std/cli";
import { z } from "zod";
import * as yaml from "../yaml.ts";
import { DropoutCollection, DropoutEpisode } from "../storage.ts";
import { getDropoutConfig, getSeasonsCuration } from "../config.ts";
import { candidatesFor, entryTitle, showPrefixes } from "../dropout-link.ts";
import { normalizeTitle } from "../common.ts";
import {
  BULK_CATALOGUE,
  BULK_MEMBERS,
  type DateSource,
  type Evidence,
  expectedDate,
  pacificDate,
} from "../release-date.ts";

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Only the two fields this report reads; the files hold far more. */
const UploadDate = z.object({
  videoId: z.string(),
  publishedAt: z.date().optional(),
}).passthrough();

const TvdbDates = z.record(
  z.string(),
  z.record(z.string(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
);

/**
 * TheTVDB's dates, keyed by normalised title, for the shows that have a
 * table in data/tvdb-dates.yaml. A title that matches only loosely is taken
 * when it is the one such match, and refused when it lands more than 400
 * days from the curated date, which is the wrong episode sharing a phrase.
 */
function tvdbLookup(
  tables: Record<string, Record<string, string>>,
): (show: string, title: string, near?: string) => string | undefined {
  const normalised = new Map<string, Map<string, string>>();
  for (const [show, table] of Object.entries(tables)) {
    const m = new Map<string, string>();
    for (const [title, date] of Object.entries(table)) {
      m.set(normalizeTitle(title), date);
    }
    normalised.set(show, m);
  }
  return (show, title, near) => {
    const table = normalised.get(show);
    if (!table) return undefined;
    const wanted = normalizeTitle(title);
    let date = table.get(wanted);
    if (!date && wanted) {
      const loose = [...table.entries()].filter(([k]) =>
        k.includes(wanted) || wanted.includes(k)
      );
      if (loose.length === 1) date = loose[0][1];
    }
    if (date && near) {
      const days = Math.abs(Date.parse(date) - Date.parse(near)) / 86_400_000;
      if (days > 400) return undefined;
    }
    return date;
  };
}

function ids(entry: Record<string, unknown>, fields: Array<string>) {
  const out: Array<string> = [];
  for (const field of fields) {
    const v = entry[field];
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) {
      out.push(...v.filter((x) => typeof x === "string"));
    }
  }
  return out;
}

/**
 * Command-line entry point. Works out what `published:` should be for every
 * curated entry, from Dropout's release date, TheTVDB, the audio-only page
 * and the YouTube uploads, and reports every entry that disagrees with its
 * expectation. `src/release-date.ts` holds the ranking; `dates.md` the
 * reasons. Reads only; never writes anything.
 */
export async function main() {
  const args = parseArgs(Deno.args, {
    boolean: ["unmatched", "sources"],
    string: ["show"],
  });

  const config = await getDropoutConfig();
  const curation = await getSeasonsCuration();
  // Plain reads of the data files, deliberately not the storage openers: this
  // report must be able to run alongside an active scan without registering
  // its own dump-on-exit handlers over the same files.
  const episodes = DropoutEpisode.array().parse(
    await yaml.load("./data/dropout.yaml"),
  );
  const collections = DropoutCollection.array().parse(
    await yaml.load("./data/dropout-collections.yaml"),
  );
  const uploads = new Map<string, string>();
  for (
    const row of UploadDate.array().parse([
      ...await yaml.loadShards("./data/videos"),
      ...await yaml.load("./data/resolved-videos.yaml").catch(() => []),
    ])
  ) {
    if (row.publishedAt && !uploads.has(row.videoId)) {
      uploads.set(row.videoId, pacificDate(row.publishedAt));
    }
  }
  const tvdb = tvdbLookup(
    TvdbDates.parse(
      (await yaml.load("./data/tvdb-dates.yaml").catch(() => [{}]))[0] ?? {},
    ),
  );

  const prefixesFor = showPrefixes(collections, config.shows);
  const bySlug = new Map(episodes.map((e) => [e.slug, e]));
  const scraped = episodes.filter((e) => e.scrapedAt && e.releaseDate);

  // A release date shared by this many pages is the day a show reached the
  // platform, not the day anything aired.
  const perDate = new Map<string, number>();
  for (const e of episodes) {
    if (e.releaseDate && !e.slug.endsWith("-audio-only")) {
      perDate.set(e.releaseDate, (perDate.get(e.releaseDate) ?? 0) + 1);
    }
  }
  const bulkCatalogue = (date: string) =>
    (perDate.get(date) ?? 0) >= BULK_CATALOGUE;

  const earliest = (list: Array<string>) =>
    list.map((id) => uploads.get(id)).filter((d): d is string => !!d).sort()[0];

  let compared = 0;
  let agreements = 0;
  const mismatches: Array<string> = [];
  const ambiguous: Array<string> = [];
  const unmatched: Array<string> = [];
  const badSlugs: Array<string> = [];
  const sources = new Map<DateSource | "none", number>();

  for (const doc of curation) {
    if (args.show && doc.show !== args.show) {
      continue;
    }
    const prefixes = prefixesFor(doc.show);
    const where = doc.season ? `${doc.show} / ${doc.season}` : doc.show;

    // Members uploads made as one batch date a backfill, not a release.
    const memberDates = new Map<string, number>();
    const memberDateOf = new Map<unknown, string | undefined>();
    for (const video of doc.videos) {
      const d = earliest(ids(video, ["members"]));
      memberDateOf.set(video, d);
      if (d) memberDates.set(d, (memberDates.get(d) ?? 0) + 1);
    }

    for (const video of doc.videos) {
      const named = entryTitle(video);
      if (!named || !video.published) {
        continue;
      }
      const label = `${where}: ${named.title}`;
      const curated = isoDate(video.published);

      let match: DropoutEpisode | undefined;
      if (video.dropout) {
        match = bySlug.get(video.dropout);
        if (!match) {
          badSlugs.push(`${label} -> dropout: ${video.dropout} (no such slug)`);
          continue;
        }
      } else if (prefixes?.length) {
        const candidates = candidatesFor(scraped, prefixes, named.title);
        if (candidates.length > 1) {
          ambiguous.push(
            `${label} matches ${candidates.length}: ` +
              candidates.map((c) => c.slug).join(", "),
          );
          continue;
        }
        match = candidates[0];
      }

      const evidence: Evidence = { curated };
      const override = match && config.releaseDates[match.slug];
      if (override) {
        evidence.catalogue = { date: override, source: "override" };
      } else if (match?.releaseDate && !bulkCatalogue(match.releaseDate)) {
        evidence.catalogue = { date: match.releaseDate, source: "dropout" };
      } else {
        const t = tvdb(doc.show, named.title, curated);
        if (t) evidence.catalogue = { date: t, source: "tvdb" };
      }
      const audio = match && bySlug.get(`${match.slug}-audio-only`);
      if (audio?.releaseDate) evidence.audio = audio.releaseDate;
      evidence.public = earliest(
        ids(video, ["public", "public copy", "public parts"]),
      );
      const members = memberDateOf.get(video);
      if (members && (memberDates.get(members) ?? 0) < BULK_MEMBERS) {
        evidence.members = members;
      }

      const expected = expectedDate(evidence);
      if (!evidence.catalogue) {
        const why = match
          ? `slug ${match.slug} has no release date`
          : "no Dropout page or TVDB entry";
        unmatched.push(
          `${label} (${why}; rests on ${expected?.source ?? "nothing"})`,
        );
      }
      const source = expected?.source ?? "none";
      sources.set(source, (sources.get(source) ?? 0) + 1);
      if (!expected) continue;

      compared += 1;
      if (expected.date === curated) {
        agreements += 1;
      } else {
        const days = Math.round(
          (Date.parse(`${curated}T00:00:00Z`) -
            Date.parse(`${expected.date}T00:00:00Z`)) / 86_400_000,
        );
        mismatches.push(
          `${label}\n    curated ${curated}, expected ${expected.date} ` +
            `(${days > 0 ? "+" : ""}${days}d, ${expected.source}` +
            `${match ? `, ${match.slug}` : ""})`,
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
    console.info(`\n${unmatched.length} entries with no catalogue date:`);
    for (const line of unmatched) {
      console.info(`  ${line}`);
    }
  }
  if (args.sources) {
    console.info(`\nWhere each date comes from:`);
    for (
      const [source, n] of [...sources.entries()].sort((a, b) => b[1] - a[1])
    ) {
      console.info(`  ${String(n).padStart(5)} ${source}`);
    }
  }

  console.info(
    `\n${compared} entries compared: ${agreements} agree, ` +
      `${mismatches.length} differ. ${ambiguous.length} ambiguous, ` +
      `${badSlugs.length} dangling slugs, ${unmatched.length} without a ` +
      `catalogue date` +
      (args.unmatched ? "." : " (list with --unmatched; --sources counts)."),
  );
}

if (import.meta.main) {
  await main();
}
