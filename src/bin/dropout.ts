import { parseArgs } from "@std/cli";
import { delay } from "@std/async";
import {
  openDropoutCollectionStorage,
  openDropoutStorage,
} from "../storage.ts";
import { getDropoutConfig } from "../config.ts";
import { mapOptional, retryWithBackoff } from "../common.ts";

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
 * Returns a test for whether a record arrived after the index was first
 * built, which is what "new content" means here.
 *
 * The whole catalogue is discovered in a single run — one `now` for the
 * whole sitemap pass — so every bootstrapped record shares one exact
 * firstSeen, and anything later than that earliest value appeared
 * afterwards. That avoids a tunable age threshold, and it degrades
 * correctly on the first run, where nothing is newer than the bootstrap
 * and the ordering falls through to the usual priorities.
 */
export function newArrivals<T extends { firstSeen: Date }>(
  records: Array<T>,
): (record: T) => boolean {
  let bootstrap = Infinity;
  for (const record of records) {
    bootstrap = Math.min(bootstrap, record.firstSeen.getTime());
  }
  return (record) => record.firstSeen.getTime() > bootstrap;
}

/**
 * Lifts the `window.Page = {...}` blob a page declares about itself and
 * returns its PROPERTIES. Brace-counted rather than regexed, since the
 * object nests. Returns undefined rather than throwing on anything
 * unexpected: this is a bonus source, never a required one.
 */
function parsePageProperties(
  html: string,
): Record<string, unknown> | undefined {
  const start = html.indexOf("window.Page = {");
  if (start === -1) {
    return undefined;
  }
  const from = html.indexOf("{", start);
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = from; i < html.length; i += 1) {
    const c = html[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (c === "\\") {
        escaped = true;
      } else if (c === '"') {
        inString = false;
      }
      continue;
    }
    if (c === '"') {
      inString = true;
    } else if (c === "{") {
      depth += 1;
    } else if (c === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          const parsed = JSON.parse(html.slice(from, i + 1));
          return parsed?.PROPERTIES ?? undefined;
        } catch {
          return undefined;
        }
      }
    }
  }
  return undefined;
}

/** Every string taken off a page goes through here, so that decoding is
 * the default rather than something each new field has to remember. */
function text(raw: string): string {
  return decodeEntities(raw).trim();
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
  url?: string;
  showTitle?: string;
  showSlug?: string;
  description?: string;
  tags?: Array<string>;
  itemId?: number;
  collectionId?: number;
  upNextIds?: Array<number>;
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
  // The canonical url names the collection and season for an item that
  // lives in one ("/mice-murder/season:1/videos/<slug>"). A standalone
  // trailer has neither, and its url is just "/videos/<slug>".
  const url = html.match(/<meta property="og:url" content="([^"]+)"/);
  if (url) {
    out.url = decodeEntities(url[1]);
  }
  const description = html.match(
    /<meta property="og:description" content="([^"]*)"/,
  );
  if (description?.[1]) {
    out.description = text(description[1]);
  }
  // The series link gives the show's display name and its slug together,
  // which is what lets a collection be named rather than guessed at.
  const series = html.match(
    /series-title[^>]*>\s*<a href="\/([a-z0-9-]+)"[^>]*>([^<]+)</,
  );
  if (series) {
    out.showSlug = series[1];
    out.showTitle ??= text(series[2]);
  }
  const tags = [
    ...html.matchAll(
      /data-meta-field-name="tags" data-meta-field-value="([^"]+)"/g,
    ),
  ].map((m) => text(m[1]));
  if (tags.length) {
    out.tags = [...new Set(tags)];
  }
  // The page states its own identity in a JSON blob. Nothing in the visible
  // markup does, and the embed urls are a trap: when logged out the player
  // is loaded with the show's *trailer*, so its id is not this item's.
  const page = parsePageProperties(html);
  if (typeof page?.VIDEO_ID === "number") {
    out.itemId = page.VIDEO_ID;
  }
  if (typeof page?.COLLECTION_ID === "number") {
    out.collectionId = page.COLLECTION_ID;
  }
  const parent = (page?.CANONICAL_COLLECTION as
    | { parent?: { name?: string } }
    | undefined)?.parent;
  if (typeof parent?.name === "string") {
    out.showTitle = text(parent.name);
  }
  const upNext = [...html.matchAll(/data-item-id="(\d+)"/g)].map((m) =>
    Number(m[1])
  );
  if (upNext.length) {
    out.upNextIds = [...new Set(upNext)];
  }
  return out;
}

/**
 * Removes a trailing " - <collection name>" from an episode title.
 *
 * Pages decorate og:title in more than one way. Most append the season and
 * the site ("Title - Season 1 - Dropout"), which parseEpisodePage strips on
 * its own, but some append the collection's display name instead, with no
 * season and nothing else to recognise it by: "Get Your Act Together with
 * Hank Green - Hank Green: Pissing Out Cancer". Only the catalogue of
 * collection names can tell that apart from a title that genuinely contains
 * a dash, so this is applied by the scan rather than by the parser.
 */
export function stripCollectionSuffix(
  title: string,
  collectionTitles: Set<string>,
): string {
  for (const name of collectionTitles) {
    const suffix = ` - ${name}`;
    if (title.length > suffix.length && title.endsWith(suffix)) {
      return title.slice(0, -suffix.length).trim();
    }
  }
  return title;
}

/**
 * Pulls a collection's display name, synopsis, artwork, season list and
 * episode ordering off its page. The ordering is the part the sitemap
 * cannot give: it lists membership, but not sequence.
 */
export function parseCollectionPage(html: string): {
  title?: string;
  description?: string;
  seasons?: Array<number>;
  episodes?: Array<string>;
  itemIds?: Array<number>;
} {
  const out: ReturnType<typeof parseCollectionPage> = {};
  const title = html.match(/<meta property="og:title" content="([^"]+)"/);
  if (title) {
    out.title = text(title[1]).replace(/ - Dropout$/, "").trim();
  }
  const description = html.match(
    /<meta property="og:description" content="([^"]*)"/,
  );
  if (description?.[1]) {
    out.description = text(description[1]);
  }
  const seasons = [
    ...new Set(
      [...html.matchAll(/season:(\d+)/g)].map((m) => Number(m[1])),
    ),
  ].sort((a, b) => a - b);
  if (seasons.length) {
    out.seasons = seasons;
  }
  // Each grid entry carries its numeric id and its link together, so the
  // two lists stay aligned and in the order the page presents them. Loose
  // "/videos/<slug>" matches would also pick up hero and promo links from
  // elsewhere on the page, which is why this reads the grid items.
  const episodes: Array<string> = [];
  const itemIds: Array<number> = [];
  for (
    const m of html.matchAll(
      /data-item-id="(\d+)"[\s\S]{0,1200}?\/videos\/([a-z0-9][a-z0-9-]*)/g,
    )
  ) {
    if (!episodes.includes(m[2])) {
      episodes.push(m[2]);
      itemIds.push(Number(m[1]));
    }
  }
  if (episodes.length) {
    out.episodes = episodes;
    out.itemIds = itemIds;
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
  // Only the fetch itself is retried, and fetch rejects on network failure
  // alone: an HTTP status, including a refusal, resolves normally and is
  // dealt with below. So a dropped connection is ridden out while a 429 is
  // still never retried. Without this a single reset ends a long run.
  const response = await retryWithBackoff(
    () =>
      fetch(url, {
        headers: {
          "user-agent": USER_AGENT,
          ...(state.cookie ? { cookie: state.cookie } : {}),
        },
      }),
    {
      maxRetries: 4,
      initialDelayMs: 30_000,
      onRetry: (attempt, error) =>
        console.warn(
          `  network error on ${url} (attempt ${attempt}): ${error}`,
        ),
    },
  );
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
    boolean: ["collections", "complete-collections"],
  });
  const budget = args.budget ? Number(args.budget) : config.budget;
  // Restrict the detail pass to slugs or collections matching a pattern.
  // For targeted fetches and for verifying known answers.
  const only = args.only ? new RegExp(args.only) : undefined;

  const episodes = await openDropoutStorage();
  const collections = await openDropoutCollectionStorage();
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
  const tier = (collection: string) => {
    const i = config.priority.findIndex((p) => collection.startsWith(p));
    return i === -1 ? config.priority.length : i;
  };

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

  // The sitemap names every collection too, as the first path segment of
  // each item url, so the collection index costs nothing extra. Those are
  // season-level slugs, though, and a season slug is not a page: fetching
  // "mice-murder-season-1" lands on the subscription wall. The show-level
  // slug is, so the season suffix comes off and the seasons collapse into
  // the one page that actually exists.
  const sizes = new Map<string, number>();
  for (const item of current.values()) {
    for (const collection of item.collections) {
      const show = collection.replace(/-season-\d+$/, "");
      sizes.set(show, (sizes.get(show) ?? 0) + 1);
    }
  }
  let newCollections = 0;
  for (const [slug, size] of sizes) {
    const existing = collections.find((c) => c.slug === slug);
    if (existing) {
      existing.size = size;
    } else {
      collections.push({ slug, size, firstSeen: now });
      newCollections += 1;
    }
  }
  let goneCollections = 0;
  for (const collection of collections) {
    if (!sizes.has(collection.slug) && !collection.removedBefore) {
      collection.removedBefore = now;
      goneCollections += 1;
    }
  }
  console.info(
    `Collections: ${sizes.size}; ${newCollections} new, ` +
      `${goneCollections} newly removed.`,
  );

  // -- collection pass: the small, high-value layer, so it runs first --

  const newCollection = newArrivals(collections);
  const collectionQueue = collections
    .filter((c) => !c.scrapedAt && !c.removedBefore)
    .filter((c) => !only || only.test(c.slug))
    .sort((a, b) =>
      Number(newCollection(b)) - Number(newCollection(a)) ||
      tier(a.slug) - tier(b.slug) || (b.size ?? 0) - (a.size ?? 0) ||
      a.slug.localeCompare(b.slug)
    );
  console.info(
    `${collectionQueue.length} collections lack details; ` +
      `fetching up to ${budget}.`,
  );
  let collectionsScraped = 0;
  for (const collection of collectionQueue.slice(0, budget)) {
    const page = await politeFetch(`${BASE}/${collection.slug}`, state);
    if (!page.ok) {
      console.warn(`  skipping ${collection.slug}: HTTP ${page.status}`);
      await page.body?.cancel();
      continue;
    }
    const details = parseCollectionPage(await page.text());
    if (details.title === "Dropout Subscription") {
      // Not a collection page: the site answers with the subscription wall
      // for a slug that has no page. Record the visit so it is not fetched
      // again, but keep the wall's title and blurb out of the data.
      console.warn(`  ${collection.slug} has no collection page`);
      collection.scrapedAt = new Date();
      continue;
    }
    collection.title = details.title ?? collection.title;
    collection.description = details.description ?? collection.description;
    collection.seasons = details.seasons ?? collection.seasons;
    collection.episodes = details.episodes ?? collection.episodes;
    collection.itemIds = details.itemIds ?? collection.itemIds;
    collection.scrapedAt = new Date();
    collectionsScraped += 1;
    console.info(
      `  ${collectionsScraped}/${
        Math.min(budget, collectionQueue.length)
      } ${collection.slug}: ${details.title ?? "?"} ` +
        `(${details.episodes?.length ?? 0} listed)`,
    );
  }
  if (args.collections) {
    const left = collections.filter((c) => !c.scrapedAt && !c.removedBefore);
    console.info(
      `Done: ${collectionsScraped} collections scraped, ${left.length} remaining.`,
    );
    return;
  }

  // -- detail pass: write-once, budgeted, new arrivals then priority --

  // Anything discovered since the index was built goes first, whatever show
  // it belongs to. Without this, priority tiers decide everything, and a new
  // episode of a show outside the priority list queues behind the entire
  // unscraped back catalogue - months of waiting at a daily budget.
  const newEpisode = newArrivals(episodes);
  // Finishing whole collections rather than spreading a budget thinly
  // across many. Coverage is all-or-nothing per collection — a description
  // links a collection only when every episode of it is present — so a
  // budget spread evenly can leave dozens of collections nearly done and
  // nothing to show. Most recently updated first, then smallest first, so
  // the cheapest recent wins land soonest.
  const completionRank = new Map<string, number>();
  if (args["complete-collections"]) {
    const ranked = collections
      .filter((c) => !c.removedBefore)
      .map((c) => {
        const season = `${c.slug}-season-`;
        const members = episodes.filter((e) =>
          !e.removedBefore &&
          e.collections.some((x) => x === c.slug || x.startsWith(season))
        );
        const lastmod = Math.max(
          0,
          ...members.map((e) => e.lastmod?.getTime() ?? 0),
        );
        return { slug: c.slug, season, members, lastmod };
      })
      .filter((c) => c.members.some((e) => !e.scrapedAt || !e.url))
      .sort((a, b) =>
        b.lastmod - a.lastmod || a.members.length - b.members.length ||
        a.slug.localeCompare(b.slug)
      );
    for (const [rank, collection] of ranked.entries()) {
      for (const episode of collection.members) {
        const seen = completionRank.get(episode.slug);
        if (seen === undefined || rank < seen) {
          completionRank.set(episode.slug, rank);
        }
      }
    }
  }

  const collectionTitles = new Set(
    collections.map((c) => c.title).filter((t): t is string => !!t),
  );
  const episodeBudget = Math.max(0, budget - collectionsScraped);
  const queue = episodes
    // `url` is set by every successful parse, so its absence marks a record
    // scraped before the richer fields existed, and requeues it.
    .filter((e) => (!e.scrapedAt || !e.url) && !e.removedBefore)
    .filter((e) =>
      !only || only.test(e.slug) || only.test(e.collection) ||
      e.collections.some((c) => only.test(c))
    )
    .sort((a, b) =>
      Number(newEpisode(b)) - Number(newEpisode(a)) ||
      (completionRank.get(a.slug) ?? Infinity) -
        (completionRank.get(b.slug) ?? Infinity) ||
      tier(a.collection) - tier(b.collection) ||
      (b.lastmod?.getTime() ?? 0) - (a.lastmod?.getTime() ?? 0) ||
      a.slug.localeCompare(b.slug)
    );

  console.info(
    `${queue.length} items lack details; fetching up to ${episodeBudget}.`,
  );
  let scraped = 0;
  for (const episode of queue.slice(0, episodeBudget)) {
    const url = `${BASE}/videos/${episode.slug}`;
    const page = await politeFetch(url, state);
    if (!page.ok) {
      console.warn(`  skipping ${episode.slug}: HTTP ${page.status}`);
      await page.body?.cancel();
      continue;
    }
    const details = parseEpisodePage(await page.text());
    episode.title = mapOptional(
      details.title,
      (t) => stripCollectionSuffix(t, collectionTitles),
    ) ?? episode.title;
    episode.seasonNumber = details.seasonNumber ?? episode.seasonNumber;
    episode.episodeNumber = details.episodeNumber ?? episode.episodeNumber;
    episode.releaseDate = details.releaseDate ?? episode.releaseDate;
    episode.url = details.url ?? episode.url;
    episode.showTitle = details.showTitle ?? episode.showTitle;
    episode.showSlug = details.showSlug ?? episode.showSlug;
    episode.description = details.description ?? episode.description;
    episode.tags = details.tags ?? episode.tags;
    episode.itemId = details.itemId ?? episode.itemId;
    episode.collectionId = details.collectionId ?? episode.collectionId;
    episode.upNextIds = details.upNextIds ?? episode.upNextIds;
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
    episodes.filter((e) => (!e.scrapedAt || !e.url) && !e.removedBefore).length;
  console.info(
    `Done: ${scraped} scraped this run, ${remaining} remaining.`,
  );
}
