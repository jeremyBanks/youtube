/**
 * Proposes `dropout:` links for curated entries that have none, with the
 * evidence for each, and writes only what has been accepted.
 *
 * A title match is a lead, not a verdict. An earlier pass took a unique title
 * match as proof and wrote 31 wrong links -- behind-the-scenes companions
 * taking their episode's slug, and Make Some Noise's later "Cut for Time"
 * entries taking season 1's -- because a title is the weakest thing the two
 * catalogues share. So every proposal carries the independent signals that can
 * corroborate or kill it, and this reports by default: `--write` applies only
 * what `--accept` or `--min-coverage` names.
 */

import { parseArgs } from "@std/cli";
import * as yaml from "../yaml.ts";
import { DropoutCollection, DropoutEpisode, Video } from "../storage.ts";
import { getDropoutConfig, getSeasonsCuration } from "../config.ts";
import { candidatesFor, entryTitle, showPrefixes } from "../dropout-link.ts";

const STOP = new Set(
  ("a an and are as at be but by for from get has have he her his how i in is " +
    "it its me my new no not of on or our out she so than that the their them " +
    "then there these they this to up us was we were what when which who will " +
    "with you your dropout com http https www tv watch subscribe channel " +
    "membership video videos episode episodes full season")
    .split(" "),
);

function words(text: string): Set<string> {
  return new Set(
    text.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/)
      .filter((w) => w.length > 3 && !STOP.has(w)),
  );
}

/**
 * How much of the Dropout synopsis reappears in the YouTube description.
 *
 * Dropout writes one line; YouTube carries that line plus a slab of
 * promotional boilerplate, so coverage of the synopsis is the signal and
 * similarity in both directions is not. Undefined when either side is too
 * short to say anything, which is honest where a zero would not be.
 */
function synopsisCoverage(
  synopsis: string | undefined,
  description: string | undefined,
): number | undefined {
  if (!synopsis || !description) return undefined;
  const a = words(synopsis);
  const b = words(description);
  if (a.size < 3) return undefined;
  let hit = 0;
  for (const w of a) if (b.has(w)) hit += 1;
  return hit / a.size;
}

export async function main() {
  const args = parseArgs(Deno.args, {
    boolean: ["write"],
    string: ["show", "accept", "min-coverage"],
  });

  const config = await getDropoutConfig();
  const curation = await getSeasonsCuration();
  const episodes = DropoutEpisode.array().parse(
    await yaml.load("./data/dropout.yaml"),
  );
  const collections = DropoutCollection.array().parse(
    await yaml.load("./data/dropout-collections.yaml"),
  );
  const videos = Video.array().parse(await yaml.loadShards("./data/videos"));
  const descriptionOf = new Map(
    videos.map((v) => [v.videoId, v.description] as const),
  );

  const prefixesFor = showPrefixes(collections, config.shows);
  const titled = episodes.filter((e) => e.title);

  // A slug already linked from this show cannot be proposed again: that is
  // exactly how a bts entry took its episode's link last time.
  const claimed = new Map<string, Set<string>>();
  for (const doc of curation) {
    const set = claimed.get(doc.show) ?? new Set<string>();
    for (const video of doc.videos) {
      if (video.dropout) set.add(video.dropout);
    }
    claimed.set(doc.show, set);
  }

  const accepted = new Set((args.accept ?? "").split(",").filter(Boolean));
  const minCoverage = Number(args["min-coverage"] ?? "NaN");

  type Proposal = {
    show: string;
    season: string;
    type: string;
    title: string;
    slug: string;
    sn: string;
    en: string;
    days: string;
    coverage: string;
  };
  const proposals: Array<Proposal> = [];

  for (const doc of curation) {
    if (args.show && doc.show !== args.show) continue;
    const prefixes = prefixesFor(doc.show);
    if (!prefixes?.length) continue;

    for (const video of doc.videos) {
      if (video.dropout) continue;
      const named = entryTitle(video);
      if (!named) continue;
      const ids = [video.public, video.members].filter((x) =>
        typeof x === "string"
      ) as Array<string>;
      if (!ids.length) continue;

      const candidates = candidatesFor(titled, prefixes, named.title)
        .filter((c) => !claimed.get(doc.show)?.has(c.slug));
      if (candidates.length !== 1) continue;
      const match = candidates[0];

      const days = video.published && match.releaseDate
        ? Math.round(
          (video.published.getTime() - new Date(match.releaseDate).getTime()) /
            86_400_000,
        )
        : undefined;
      const coverage = Math.max(
        ...ids.map((id) =>
          synopsisCoverage(match.description, descriptionOf.get(id)) ?? -1
        ),
      );

      proposals.push({
        show: doc.show,
        season: doc.season ?? "",
        type: named.type,
        title: named.title,
        slug: match.slug,
        sn: match.seasonNumber?.toString() ?? "",
        en: match.episodeNumber?.toString() ?? "",
        days: days === undefined ? "" : String(days),
        coverage: coverage < 0 ? "" : coverage.toFixed(2),
      });
    }
  }

  if (!args.write) {
    for (const p of proposals) {
      console.log(
        [
          (p.coverage === "" ? "?" : p.coverage).padStart(5),
          (p.days === "" ? "" : `${p.days}d`).padStart(7),
          `S${p.sn}E${p.en}`.padEnd(7),
          p.type.padEnd(9),
          `${p.show}${p.season ? ` / ${p.season}` : ""}`.slice(0, 32).padEnd(
            32,
          ),
          p.title.slice(0, 42).padEnd(42),
          p.slug,
        ].join(" "),
      );
    }
    const strong = proposals.filter((p) => Number(p.coverage) >= 0.6).length;
    console.log(
      `\n${proposals.length} proposals; ${strong} with synopsis coverage at ` +
        `least 0.60. Nothing written.`,
    );
    return;
  }

  const wanted = new Map<string, string>();
  for (const p of proposals) {
    const ok = accepted.has(p.slug) ||
      (!Number.isNaN(minCoverage) && Number(p.coverage) >= minCoverage);
    if (ok) wanted.set(`${p.show} ${p.title}`, p.slug);
  }
  if (!wanted.size) {
    console.error("--write needs --accept or --min-coverage; nothing matched.");
    Deno.exitCode = 1;
    return;
  }

  const path = "./curation/seasons.yaml";
  const lines = (await Deno.readTextFile(path)).split("\n");
  const entry = /^ {2}- (\w+): +(.*)$/;
  const out: Array<string> = [];
  let show: string | undefined;
  let written = 0;
  for (const line of lines) {
    const s = /^show: +(.*)$/.exec(line);
    if (s) show = s[1].trim().replace(/^"|"$/g, "");
    out.push(line);
    const e = entry.exec(line);
    if (e && show) {
      const title = e[2].trim().replace(/^["']|["']$/g, "");
      const slug = wanted.get(`${show} ${title}`);
      if (slug) {
        out.push(`    dropout: ${slug}`);
        wanted.delete(`${show} ${title}`);
        written += 1;
      }
    }
  }
  await Deno.writeTextFile(path, out.join("\n"));
  console.log(`wrote ${written} links`);
}

// At the bottom: the top-level await runs on import, and the module scope
// above it is not initialised yet if this sits at the top.
if (import.meta.main) {
  await main();
}
