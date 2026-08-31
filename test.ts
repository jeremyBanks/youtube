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
import {
  canonicalCollection,
  parseEpisodePage,
  parseSitemap,
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
  if (got.releaseDate?.toISOString().slice(0, 10) !== "2026-01-07") {
    throw new Error(String(got.releaseDate));
  }
});

Deno.test("normalizeTitle strips numbering, punctuation, and case", async () => {
  const { normalizeTitle } = await import("./src/bin/verify-dates.ts");
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
