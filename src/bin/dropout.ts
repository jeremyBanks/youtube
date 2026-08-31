import { parseArgs } from "@std/cli";
import { delay } from "@std/async";
import { openDropoutStorage } from "../storage.ts";
import { getDropoutConfig } from "../config.ts";

const BASE = "https://watch.dropout.tv";
const USER_AGENT =
  "jeb-youtube-catalogue (+https://github.com/jeremyBanks/youtube)";

if (import.meta.main) {
  await main();
}

/**
 * One sitemap entry: which collections list this item, and its lastmod.
 */
export type SitemapItem = {
  collections: Array<string>;
  lastmod?: Date;
};

/**
 * Extracts every `/{collection}/videos/{slug}` entry from the sitemap,
 * grouped by the item slug. Slugs are unique site-wide; the same item is
 * listed under each collection that contains it.
 */
export function parseSitemap(xml: string): Map<string, SitemapItem> {
  const items = new Map<string, SitemapItem>();
  for (
    const block of xml.matchAll(
      /<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]+)<\/lastmod>)?/g,
    )
  ) {
    const m = block[1].match(
      /^https:\/\/watch\.dropout\.tv\/([a-z0-9-]+)\/videos\/([a-z0-9-]+)$/,
    );
    if (!m) {
      continue;
    }
    const [, collection, slug] = m;
    const item = items.get(slug) ?? { collections: [] };
    item.collections.push(collection);
    if (block[2]) {
      const lastmod = new Date(block[2]);
      if (!isNaN(lastmod.getTime())) {
        item.lastmod = item.lastmod && item.lastmod > lastmod
          ? item.lastmod
          : lastmod;
      }
    }
    items.set(slug, item);
  }
  for (const item of items.values()) {
    item.collections.sort();
  }
  return items;
}

/**
 * Aggregate collections re-list episodes that already live under their own
 * show, so they never count as an item's home.
 */
function isAggregate(collection: string): boolean {
  return /complete-(series|experience)/.test(collection) ||
    collection === "dip-your-toe-in" ||
    collection === "dropout-24-7";
}

/**
 * Picks the collection an item canonically belongs to: a per-season
 * collection if there is one, otherwise the shortest non-aggregate slug,
 * otherwise the shortest of whatever is left.
 */
export function canonicalCollection(collections: Array<string>): string {
  const byLength = (a: string, b: string) =>
    a.length - b.length || a.localeCompare(b);
  const seasons = collections
    .filter((c) => !isAggregate(c) && /-season-\d+$/.test(c))
    .sort(byLength);
  if (seasons.length) {
    return seasons[0];
  }
  const plain = collections.filter((c) => !isAggregate(c)).sort(byLength);
  if (plain.length) {
    return plain[0];
  }
  return [...collections].sort(byLength)[0];
}

/**
 * Undoes the HTML escaping in page metadata. og:title carries entities
 * (`&amp;`, `&#39;`) that would otherwise be stored verbatim and defeat any
 * comparison against a curated title.
 */
function decodeEntities(text: string): string {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };
  return text.replace(
    /&(?:#(\d+)|#[xX]([0-9a-fA-F]+)|([a-zA-Z]+));/g,
    (whole, dec, hex, name) => {
      if (dec) return String.fromCodePoint(Number(dec));
      if (hex) return String.fromCodePoint(parseInt(hex, 16));
      return named[name] ?? whole;
    },
  );
}

/**
 * Pulls the release date, season/episode numbers, and title out of an
 * episode page. Every field is optional: trailers have no episode number,
 * and a page that fails to parse just yields nothing.
 */
export function parseEpisodePage(html: string): {
  title?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  releaseDate?: Date;
} {
  const out: ReturnType<typeof parseEpisodePage> = {};
  const date = html.match(
    /data-meta-field-name="release_dates" data-meta-field-value="(\d{4}-\d{2}-\d{2})"/,
  );
  if (date) {
    out.releaseDate = new Date(date[1]);
  }
  const se = html.match(/Season (\d+), Episode (\d+)/);
  if (se) {
    out.seasonNumber = Number(se[1]);
    out.episodeNumber = Number(se[2]);
  }
  const title = html.match(/<meta property="og:title" content="([^"]+)"/);
  if (title) {
    // Titles arrive with a trailing site/season decoration, in more than one
    // shape: plain episodes end " - Season 1 - Dropout", while Adventuring
    // Party names the campaign it discusses, as
    // "A Bouquet of Teeth - Season 22: All About \"Gladlands\"".
    out.title = decodeEntities(title[1])
      .replace(/ - Season \d+: .*$/, "")
      .replace(/ - Season \d+ - Dropout$/, "")
      .replace(/ - Dropout$/, "")
      .trim();
  }
  return out;
}

/**
 * A polite fetch: waits the configured delay first, identifies itself,
 * reuses one session cookie for the whole run (what a browser would do,
 * rather than minting a session per request), and treats any rate limiting
 * or denial as a reason to stop the run entirely rather than push through.
 */
async function politeFetch(
  url: string,
  state: { cookie?: string; delaySeconds: number },
): Promise<Response> {
  await delay(state.delaySeconds * 1000, { persistent: false });
  const response = await fetch(url, {
    headers: {
      "user-agent": USER_AGENT,
      ...(state.cookie ? { cookie: state.cookie } : {}),
    },
  });
  for (const cookie of response.headers.getSetCookie()) {
    const session = cookie.match(/^(_session=[^;]+)/);
    if (session) {
      state.cookie = session[1];
    }
  }
  if (response.status === 429 || response.status === 403) {
    await response.body?.cancel();
    throw new Error(
      `HTTP ${response.status} from ${url}; aborting the run rather than pushing through`,
    );
  }
  return response;
}

/** Command-line entry point. */
export async function main() {
  const config = await getDropoutConfig();
  const args = parseArgs(Deno.args, {
    string: ["budget", "only"],
  });
  const budget = args.budget ? Number(args.budget) : config.budget;
  // Restrict the detail pass to slugs or collections matching a pattern.
  // For targeted fetches and for verifying known answers.
  const only = args.only ? new RegExp(args.only) : undefined;

  const episodes = await openDropoutStorage();
  const now = new Date();
  const state = {
    cookie: undefined as string | undefined,
    delaySeconds: config.delaySeconds,
  };

  // -- existence pass: one request covers the entire catalogue --

  console.info("Fetching sitemap...");
  const response = await politeFetch(`${BASE}/sitemap.xml`, state);
  if (!response.ok) {
    throw new Error(`sitemap fetch failed: HTTP ${response.status}`);
  }
  const current = parseSitemap(await response.text());
  if (current.size === 0) {
    throw new Error("sitemap parsed to zero items; marking nothing");
  }
  const live = episodes.filter((e) => !e.removedBefore);
  if (live.length > 0 && current.size < live.length * 0.8) {
    // The empty-or-truncated-response trap: a sudden shrink is far more
    // likely a bad fetch than a mass takedown. Mark nothing, fail loudly.
    throw new Error(
      `sitemap shrank to ${current.size} items from ${live.length} known; ` +
        `refusing to mark removals`,
    );
  }

  let added = 0;
  for (const [slug, item] of current) {
    const existing = episodes.find((e) => e.slug === slug);
    if (existing) {
      existing.collections = item.collections;
      existing.collection = canonicalCollection(item.collections);
      existing.lastmod = item.lastmod ?? existing.lastmod;
    } else {
      episodes.push({
        slug,
        collection: canonicalCollection(item.collections),
        collections: item.collections,
        lastmod: item.lastmod,
        firstSeen: now,
      });
      added += 1;
    }
  }
  let removed = 0;
  for (const episode of episodes) {
    if (!current.has(episode.slug) && !episode.removedBefore) {
      episode.removedBefore = now;
      removed += 1;
    }
  }
  console.info(
    `Sitemap: ${current.size} items; ${added} new, ${removed} newly removed.`,
  );

  // -- detail pass: write-once, budgeted, priority first, then recency --

  const tier = (collection: string) => {
    const i = config.priority.findIndex((p) => collection.startsWith(p));
    return i === -1 ? config.priority.length : i;
  };
  const queue = episodes
    .filter((e) => !e.scrapedAt && !e.removedBefore)
    .filter((e) => !only || only.test(e.slug) || only.test(e.collection))
    .sort((a, b) =>
      tier(a.collection) - tier(b.collection) ||
      (b.lastmod?.getTime() ?? 0) - (a.lastmod?.getTime() ?? 0) ||
      a.slug.localeCompare(b.slug)
    );

  console.info(
    `${queue.length} items lack details; fetching up to ${budget}.`,
  );
  let scraped = 0;
  for (const episode of queue.slice(0, budget)) {
    const url = `${BASE}/videos/${episode.slug}`;
    const page = await politeFetch(url, state);
    if (!page.ok) {
      console.warn(`  skipping ${episode.slug}: HTTP ${page.status}`);
      await page.body?.cancel();
      continue;
    }
    const details = parseEpisodePage(await page.text());
    episode.title = details.title ?? episode.title;
    episode.seasonNumber = details.seasonNumber ?? episode.seasonNumber;
    episode.episodeNumber = details.episodeNumber ?? episode.episodeNumber;
    episode.releaseDate = details.releaseDate ?? episode.releaseDate;
    episode.scrapedAt = new Date();
    scraped += 1;
    if (!details.releaseDate) {
      console.warn(`  no release date on ${episode.slug}`);
    }
    console.info(
      `  ${scraped}/${Math.min(budget, queue.length)} ${episode.slug}: ` +
        `${details.releaseDate?.toISOString()?.slice(0, 10) ?? "?"}`,
    );
  }

  const remaining =
    episodes.filter((e) => !e.scrapedAt && !e.removedBefore).length;
  console.info(
    `Done: ${scraped} scraped this run, ${remaining} remaining.`,
  );
}
