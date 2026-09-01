Deno.permissions.request({ name: "read", path: "xxx://///example///\\" });

// The yaml storage suppresses Deno's default crash on an unhandled rejection so
// that in-memory data still reaches disk instead of being lost. That suppression
// used to swallow the failure as well: a run that aborted partway still exited
// 0, so an aborted publish looked exactly like a successful one. This asserts
// the process still reports failure, and that the flush to disk still happens.
Deno.test("an aborted run flushes storage and still exits non-zero", async () => {
  const repo = new URL(".", import.meta.url);
  const dir = await Deno.makeTempDir();
  try {
    const out = `${dir}/out.yaml`;
    const script = `${dir}/abort.ts`;
    await Deno.writeTextFile(
      script,
      [
        `import { z } from "zod";`,
        `import * as yaml from "${new URL("src/yaml.ts", repo).href}";`,
        `const rows = await yaml.open(${
          JSON.stringify(out)
        }, z.object({ a: z.number() }));`,
        `rows.push({ a: 1 });`,
        `throw new Error("simulated mid-run failure");`,
      ].join("\n"),
    );

    const { code } = await new Deno.Command(Deno.execPath(), {
      args: [
        "run",
        "--quiet",
        "--config",
        new URL("deno.jsonc", repo).pathname,
        "--allow-read",
        "--allow-write",
        "--allow-env",
        script,
      ],
      stdout: "null",
      stderr: "null",
    }).output();

    if (code !== 1) {
      throw new Error(`expected exit code 1 from an aborted run, got ${code}`);
    }

    // The whole point of suppressing the crash is that the data survives.
    const written = await Deno.readTextFile(out);
    if (!written.includes("a:")) {
      throw new Error(`storage was not flushed before exit, got: ${written}`);
    }
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

// The Dropout sitemap and episode-page parsers, against captured fixtures.
// The suite must stay offline, so these are literal excerpts of real pages.
import { entryFrom, mergeEntries } from "./src/bin/playlists.ts";
import {
  canonicalCollection,
  newArrivals,
  parseCollectionPage,
  parseEpisodePage,
  parseSitemap,
  stripCollectionSuffix,
} from "./src/bin/dropout.ts";

Deno.test("parseSitemap groups collections by slug and keeps lastmod", () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>https://watch.dropout.tv/browse</loc><lastmod>2015-11-10</lastmod></url>
<url>
  <loc>https://watch.dropout.tv/dimension-20-gladlands-season-1/videos/welcome-to-the-wastes</loc>
  <lastmod>2026-01-08</lastmod>
</url>
<url>
  <loc>https://watch.dropout.tv/dip-your-toe-in/videos/welcome-to-the-wastes</loc>
</url>
<url>
  <loc>https://watch.dropout.tv/game-changer/videos/sam-says</loc>
  <lastmod>2021-11-01</lastmod>
</url>
</urlset>`;
  const items = parseSitemap(xml);
  if (items.size !== 2) throw new Error(`expected 2 items, got ${items.size}`);
  const wastes = items.get("welcome-to-the-wastes")!;
  if (
    wastes.collections.join(",") !==
      "dimension-20-gladlands-season-1,dip-your-toe-in"
  ) {
    throw new Error(`collections: ${wastes.collections}`);
  }
  if (wastes.lastmod?.toISOString().slice(0, 10) !== "2026-01-08") {
    throw new Error(`lastmod: ${wastes.lastmod}`);
  }
});

Deno.test("canonicalCollection prefers per-season over aggregates", () => {
  const got = canonicalCollection([
    "dimension-20-the-complete-series-season-28",
    "dimension-20-gladlands-the-complete-experience",
    "dip-your-toe-in",
    "dimension-20-gladlands-season-1",
  ]);
  if (got !== "dimension-20-gladlands-season-1") throw new Error(got);
  const bare = canonicalCollection(["game-changer", "dip-your-toe-in"]);
  if (bare !== "game-changer") throw new Error(bare);
});

Deno.test("parseEpisodePage extracts date, numbering, and title", () => {
  const html =
    `<meta property="og:title" content="Welcome to the Wastes - Season 1 - Dropout">
<a href=".../season:1">Season 1, Episode 1</a> &bull;
<a class="meta-data-link" data-similar-items-site="36348"
   data-meta-field-name="release_dates" data-meta-field-value="2026-01-07">07-Jan-2026</a>`;
  const got = parseEpisodePage(html);
  if (got.title !== "Welcome to the Wastes") throw new Error(got.title);
  if (got.seasonNumber !== 1 || got.episodeNumber !== 1) {
    throw new Error(`${got.seasonNumber}/${got.episodeNumber}`);
  }
  if (got.releaseDate !== "2026-01-07") {
    throw new Error(String(got.releaseDate));
  }
});

Deno.test("normalizeTitle strips numbering, punctuation, and case", async () => {
  const { normalizeTitle } = await import("./src/common.ts");
  if (normalizeTitle("101. The Beginning Begins") !== "the beginning begins") {
    throw new Error(normalizeTitle("101. The Beginning Begins"));
  }
  if (normalizeTitle("7a. Piss & Vinegar!") !== "piss and vinegar") {
    throw new Error(normalizeTitle("7a. Piss & Vinegar!"));
  }
  if (
    normalizeTitle("Don't Say It...") !== normalizeTitle("don t say it")
  ) {
    throw new Error("apostrophe/ellipsis normalization diverged");
  }
});

Deno.test("parseEpisodePage decodes entities and strips season decoration", () => {
  const ap = parseEpisodePage(
    `<meta property="og:title" content="A Bouquet of Teeth - Season 22: All About &quot;Gladlands&quot; - Dropout">`,
  );
  if (ap.title !== "A Bouquet of Teeth") throw new Error(ap.title);
  const amp = parseEpisodePage(
    `<meta property="og:title" content="Fireside Chat with Brennan &amp; Friends (Part 1) - Season 2 - Dropout">`,
  );
  if (amp.title !== "Fireside Chat with Brennan & Friends (Part 1)") {
    throw new Error(amp.title);
  }
  const apos = parseEpisodePage(
    `<meta property="og:title" content="Boys&#39; Night! (Roll20Con) - Dropout">`,
  );
  if (apos.title !== "Boys' Night! (Roll20Con)") throw new Error(apos.title);
});

Deno.test("parseCollectionPage pairs grid ids with slugs in order", () => {
  const html =
    `<meta property="og:title" content="Dimension 20: Mice &amp; Murder - Dropout">
<meta property="og:description" content="A deadly mystery.">
<a href="/mice-murder/season:1">Season 1</a>
<li class="js-collection-item collection-item-1443748" data-item-id="1443748">
  <a href="https://watch.dropout.tv/mice-murder/season:1/videos/it-was-a-dark-and-stormy-night">
<li class="js-collection-item collection-item-1422414" data-item-id="1422414">
  <a href="https://watch.dropout.tv/mice-murder/season:1/videos/a-scandal-in-britannia">`;
  const got = parseCollectionPage(html);
  if (got.title !== "Dimension 20: Mice & Murder") throw new Error(got.title);
  if (got.episodes?.[1] !== "a-scandal-in-britannia") {
    throw new Error(String(got.episodes));
  }
  if (got.itemIds?.[1] !== 1422414) throw new Error(String(got.itemIds));
  if (got.seasons?.[0] !== 1) throw new Error(String(got.seasons));
});

Deno.test("parseEpisodePage takes its own id from window.Page, not the embed", () => {
  const html =
    `<div data-trailer-url="https://embed.vhx.tv/videos/1415566"></div>
<script> window.Page = {"PROPERTIES":{"VIDEO_ID":1443748,"COLLECTION_ID":280925,
"CANONICAL_COLLECTION":{"id":280925,"parent":{"id":278430,"name":"Dimension 20: Mice \\u0026 Murder"}}}}; </script>
<a data-meta-field-name="tags" data-meta-field-value="tabletop rpg">tabletop rpg</a>
<li data-item-id="1422414">`;
  const got = parseEpisodePage(html);
  if (got.itemId !== 1443748) throw new Error(String(got.itemId));
  if (got.collectionId !== 280925) throw new Error(String(got.collectionId));
  if (got.showTitle !== "Dimension 20: Mice & Murder") {
    throw new Error(String(got.showTitle));
  }
  if (got.tags?.[0] !== "tabletop rpg") throw new Error(String(got.tags));
  if (got.upNextIds?.[0] !== 1422414) throw new Error(String(got.upNextIds));
});

Deno.test("newArrivals ignores the bootstrap batch, flags later ones", () => {
  const bootstrap = new Date("2026-08-31T02:00:00Z");
  const later = new Date("2026-09-07T02:00:00Z");
  const records = [
    { slug: "old-a", firstSeen: bootstrap },
    { slug: "old-b", firstSeen: bootstrap },
    { slug: "new-one", firstSeen: later },
  ];
  const isNew = newArrivals(records);
  if (isNew(records[0]) || isNew(records[1])) {
    throw new Error("bootstrap records must not count as new");
  }
  if (!isNew(records[2])) throw new Error("later record must count as new");
  // On a first run everything shares one timestamp, so nothing is "new"
  // and the ordering must fall through to the usual priorities.
  const firstRun = newArrivals(records.slice(0, 2));
  if (firstRun(records[0]) || firstRun(records[1])) {
    throw new Error("a uniform batch must yield no new arrivals");
  }
});

Deno.test("stripCollectionSuffix removes a trailing collection name", () => {
  const names = new Set([
    "Hank Green: Pissing Out Cancer",
    "Dimension 20 Live: Quangle Quest",
  ]);
  const hank = stripCollectionSuffix(
    "Get Your Act Together with Hank Green - Hank Green: Pissing Out Cancer",
    names,
  );
  if (hank !== "Get Your Act Together with Hank Green") throw new Error(hank);
  // Both halves can be the same, and the title must survive rather than empty.
  const same = stripCollectionSuffix(
    "Dimension 20 Live: Quangle Quest - Dimension 20 Live: Quangle Quest",
    names,
  );
  if (same !== "Dimension 20 Live: Quangle Quest") throw new Error(same);
  // A title that merely contains a dash is left alone.
  const plain = stripCollectionSuffix("A Dash - Of Something", names);
  if (plain !== "A Dash - Of Something") throw new Error(plain);
});

Deno.test("entryFrom records everything the entry reports", () => {
  const base = {
    contentDetails: {
      videoId: "abcdefghijk",
      videoPublishedAt: "2026-01-02T03:04:05Z",
    },
    snippet: {
      publishedAt: "2026-02-03T04:05:06Z",
      position: 3,
      title: "An Episode",
      description: "What happens in it.",
      videoOwnerChannelId: "UCsame",
      videoOwnerChannelTitle: "Dropout",
    },
    status: { privacyStatus: "public" },
  };
  const entry = entryFrom(base)!;
  if (entry.videoId !== "abcdefghijk") throw new Error(entry.videoId);
  if (entry.position !== 3) throw new Error(String(entry.position));
  if (entry.privacyStatus !== "public") throw new Error("privacy lost");
  // Nothing is withheld for duplicating what videos.yaml may hold: the
  // owner is recorded even when it is the playlist's own channel.
  if (entry.ownerChannelId !== "UCsame") throw new Error("owner dropped");
  if (entry.title !== "An Episode") throw new Error("title dropped");
  if (entry.description !== "What happens in it.") {
    throw new Error("description dropped");
  }
  if (entry.videoPublishedAt?.getUTCFullYear() !== 2026) {
    throw new Error("videoPublishedAt lost");
  }

  // Blank fields are omitted rather than stored empty.
  const bare = entryFrom({
    contentDetails: { videoId: "abcdefghijk" },
    snippet: { publishedAt: "2026-02-03T04:05:06Z", position: 0, title: " " },
  })!;
  if (bare.title !== undefined) throw new Error("stored a blank title");
  if (bare.description !== undefined) throw new Error("stored a blank desc");

  // An unlisted video never reaches a channel's uploads, so this entry is
  // the only record of it obtainable; a private one keeps its placeholder
  // for the same reason.
  const unlisted = entryFrom({
    ...base,
    status: { privacyStatus: "unlisted" },
  })!;
  if (unlisted.title !== "An Episode") throw new Error("unlisted title lost");
  const priv = entryFrom({
    ...base,
    snippet: { ...base.snippet, title: "Private video" },
    status: { privacyStatus: "private" },
  })!;
  if (priv.title !== "Private video") throw new Error("placeholder dropped");

  // An entry naming no video is not a record at all.
  if (entryFrom({ snippet: { publishedAt: "x" } })) {
    throw new Error("accepted an entry with no video");
  }
});

Deno.test("mergeEntries leaves departed entries where they were", () => {
  const now = new Date("2026-09-01T00:00:00Z");
  const at = (videoId: string, position: number) => ({
    videoId,
    position,
    addedAt: now,
  });
  // a, b, c, d in order; b and d then leave.
  const stored = [
    at("aaaaaaaaaaa", 0),
    at("bbbbbbbbbbb", 1),
    at("ccccccccccc", 2),
    at("ddddddddddd", 3),
  ];
  const observed = [at("ccccccccccc", 1), at("aaaaaaaaaaa", 0)];
  const merged = mergeEntries(stored, observed, now);
  // b stays behind a, d stays behind c, rather than both being swept to
  // the end.
  if (
    merged.map((e) => e.videoId[0]).join("") !== "abcd"
  ) {
    throw new Error(merged.map((e) => e.videoId[0]).join(""));
  }
  if (merged[0].removedBefore || merged[2].removedBefore) {
    throw new Error("a living entry was marked as gone");
  }
  if (merged[1].removedBefore?.getTime() !== now.getTime()) {
    throw new Error("departed entry not marked");
  }
  // Its recorded position describes where it was, and is not renumbered.
  if (merged[1].position !== 1) throw new Error(String(merged[1].position));

  // A later pass must not move an existing mark forward.
  const later = new Date("2026-10-01T00:00:00Z");
  const again = mergeEntries(merged, observed, later);
  if (again[1].removedBefore?.getTime() !== now.getTime()) {
    throw new Error("removal date was overwritten");
  }

  // An entry that led the playlist and then left stays at the front.
  const front = mergeEntries(
    [at("zzzzzzzzzzz", 0), at("aaaaaaaaaaa", 1)],
    [at("aaaaaaaaaaa", 0)],
    now,
  );
  if (front[0].videoId !== "zzzzzzzzzzz") {
    throw new Error(front.map((e) => e.videoId).join(","));
  }
});
