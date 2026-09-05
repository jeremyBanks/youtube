# YouTube Playlist Curation Project

This project manages curated YouTube playlists for Dropout content (Dimension
20, Game Changer, Um Actually, etc.).

## When the user asks to "update"

If the user says update, refresh, sync, synchronize, catch up, or anything else
that vague, they mean the whole pipeline: find out what is new on YouTube and
Dropout, file it in the curation, and push the playlists live. Do not ask which
part they meant — run the sequence below and report what changed at each step.
The work is the same every time; only the curation step needs judgement.

**First pull.** A GitHub Action commits to `trunk` daily, nominally at 11:13 UTC
though GitHub often runs it hours late, so the remote is usually ahead.
`git checkout trunk && git pull origin trunk` before anything else, or the scans
will fight with bot commits at push time.

**Then scan, in either order.** `deno task scan` reads the YouTube channels in
`config/scan.toml` into `data/videos.yaml`; it needs `YOUTUBE_API_KEY` in `.env`
and can exhaust the daily quota on a complete scan, in which case it fails
loudly and is safe to resume the next day. `deno task scan-dropout` updates
`data/dropout.yaml` and `data/dropout-collections.yaml` from watch.dropout.tv;
it needs no credentials but waits 12 seconds between requests, so its runtime is
simply the budget times twelve seconds — about thirteen minutes at the
configured default, and `--budget=N` for a bulk backfill. Commit the data
changes on their own before curating, so that a scraping result is never
entangled with an editorial decision.

**Then curate, which is the part that needs a person.** List the videos that no
curation entry accounts for:

```bash
deno task curate --channel=dropout,dimension20show --since=2026-01-01
```

Add them to `curation/seasons.yaml` by hand, following the numbering conventions
below, and check season and episode names against the Dimension 20 wiki or
watch.dropout.tv rather than guessing from YouTube titles.
`deno task verify-dates` cross-checks the `published:` dates you just wrote
against the official Dropout release dates. New shows need a playlist definition
in `config/aggregate.toml`.

**Then publish.** `deno task aggregate` regenerates `data/playlists.yaml`; read
the diff, since it is the last chance to catch a mistake before it reaches
subscribers. `deno task publish --dry-run` fetches the live playlists and
reports the real diff — the videos it would add, the entries it would remove —
without changing anything, and needs no OAuth since it only reads.
`deno task publish` applies it (`--create-missing` for new playlists); that does
need OAuth, and writes to a channel with real subscribers, so never publish a
diff you have not read.

**Then push to `trunk`.** If everything above succeeded, commit and push
directly to `trunk` — this is routine catalogue maintenance, not a change that
wants review. If any step failed, push what did succeed (scan data is always
worth keeping, since a video pulled between scans is unrecoverable) and say
plainly which steps did not run.

## Before concluding something is absent

Three times in one session a search that could not have found a thing was
reported as evidence the thing did not exist. Each time the claim was wrong, and
twice it was published or committed before anyone asked how we knew.

- **Lonely and Horny** was written off as "not on YouTube" on the strength of a
  search across `data/`, when the Jake and Amir channel — the one channel likely
  to carry it — was not being scanned at all.
- **"No tests exist"**, from globbing `*_test.ts` and `*.test.ts`. The suite is
  `test.ts` in the repo root, 617 lines and 28 cases.
- **See Plum Run "was pulled from watch.dropout.tv"**, from a count grouped by
  `showTitle`. It is on the site, and that sentence reached the published
  playlist description on a channel with real subscribers.

So: before writing down that something is missing, say what query was run and
why that query would have found it if it were there. If that sentence cannot be
written, the finding is "not looked for", which is a different claim.

**`showTitle` is the specific trap.** 443 of the 3,601 records in
`data/dropout.yaml` do not carry one — every Precious Plum and See Plum Run
record, 9 Unsleeping City, Ultramechatron's web series, Dirty Laundry's season
69, 94 trailers, and the old CH web series generally. `gaps.md` has listed this
since it was written. Group by `collection` with the collection's title as the
fallback, the way `curation`'s linker does, which leaves 4 records unattributed
rather than 443. **A zero in a `showTitle` grouping means nothing.**

## Tests

`deno task test` runs `test.ts`: 28 cases covering the sitemap and episode-page
parsers, title normalisation, the playlist diff, and storage flushing on an
aborted run. They take under a second.

`deno task check` runs it, along with the type check, the linter and the
formatter, and the GitHub Action runs `deno task check` and nothing else. One
gate, so CI and a local run cannot disagree about what passing means.

They used to. CI ran the tests but never type-checked; `deno task check`
type-checked but never ran the tests. Each gate was incomplete in the direction
the other covered, and the suite was invisible locally -- invisible enough to be
reported as not existing.

## Project Structure

```
curation/seasons.yaml          # Source of truth: shows, seasons, episodes
config/aggregate.toml          # Which playlists to generate, and their content
config/scan.toml               # YouTube channels and their scan cadences
config/dropout.toml            # Dropout scan budget, politeness, show mapping
data/videos.yaml, data/videos/ # Scraped YouTube video metadata
data/channels.yaml             # Channel metadata
data/scans.yaml                # Scan sessions: what each run covered
data/playlists.yaml            # Generated; don't edit directly
data/dropout.yaml              # Scraped watch.dropout.tv episodes
data/dropout-collections.yaml  # Scraped watch.dropout.tv shows/collections
data/resolved-videos.yaml      # Videos looked up by id, off channels we scan
data/channel-playlists.yaml    # Scraped playlists of the channels we scan
dates.md                       # Findings on where episode dates come from
src/bin/                       # One file per task
```

Every task: `scan`, `scan-dropout`, `curate`, `aggregate`, `publish`,
`verify-dates`, `resolve`, `check`. Two not covered elsewhere in this file:

- `deno task scan --window=P96D` scans every actively-tracked channel back that
  far regardless of cadence. For backfilling a newly-captured field, where the
  scheduled tiers would otherwise skip a recently-scanned channel.
- `deno task resolve --ids=a,b,c` (or `--unknown`) looks up video ids directly,
  50 per request. It never _creates_ a `data/videos.yaml` record — one fetched
  by id has no playlist-add time and takes no part in removal detection, so
  those go to `data/resolved-videos.yaml`. It does _annotate_ a record a scan
  already made, with `resolvedAt` and `privacyStatus`.

  `--due` sweeps three sets on a cadence: ids the curation names that no scan
  has seen, ids appearing in a scanned channel's playlists, and **every video a
  scan marked `removedBefore`**. That last one matters because `removedBefore`
  only ever meant "stopped appearing in the channel's uploads playlist", and an
  unlisted video leaves that listing exactly as a deleted one does.

  Two requests settle it. `videos.list` reports `public` or `unlisted` for
  anything still served; it omits a private video and a deleted one identically,
  so what it will not serve goes to YouTube's oEmbed endpoint, which answers 200
  for a video that exists, 403 for private and 404 for deleted. That verdict is
  stored as `absence`, one of `private`, `deleted` or `unknown`, and only ever
  when a real HTTP response came back — a timeout is not evidence about a video.

  `removedBefore` is never cleared, because the video did leave the listing.
  `privacyStatus` and `absence` beside it say why. The first run found 53 of 122
  supposedly-removed videos alive and merely unlisted, and later that 63 of 69
  believed deleted were only private.

  Intervals depend on the last verdict: 21 days for a public video absent from
  its uploads feed, 28 unlisted, 42 private, 350 deleted. `--ids=` overrides all
  of it, which is how a wrong verdict is corrected.

## Workflow

### Finding uncurated videos

```bash
deno task curate --channel=dropout,dimension20show --since=2024-01-01
```

This shows videos in `data/videos.yaml` that aren't yet in
`curation/seasons.yaml`.

### Adding content

1. Edit `curation/seasons.yaml` to add new shows/seasons/episodes
2. Run `deno task aggregate` to regenerate `data/playlists.yaml`
3. Run `deno task publish` to push changes to YouTube

### Creating new playlists

1. Add playlist definition to `config/aggregate.toml` with
   `[todo-playlist-name]`
2. Run `deno task aggregate`
3. Run `deno task publish --create-missing` to create on YouTube and update
   config with real ID

## Episode Numbering Conventions

**Season-prefixed numbering** (101, 201, 301, etc.) for:

- Game Changer
- Um, Actually
- Make Some Noise
- Dirty Laundry
- Very Important People
- Smartypants
- Gastronauts
- Adventuring Party (uses 1801, 1901, 2001 for seasons 18, 19, 20)
- Adventuring Academy
- Breaking News
- Play It By Ear
- Nobody Asked, Parlor Room, Crowd Control (newer game shows)

**Simple numbering** (1, 2, 3, etc.) for:

- Dimension 20 campaigns (each campaign is its own "season")
- Fatal Decision (short-form series)

**The animated shorts are not a show.** Dropout numbers "Dimension 20 Animated"
and "Game Changer Animated" as runs of their own, but they are animations of
moments from the parent show, so the only place one belongs is as an
`animation:` entry inside the season it depicts — never as a `show:` or a
`season:` of its own, and never in a playlist of its own.

## Spin-offs and Crossovers

Several shows began as a Game Changer episode, and Game Changer keeps returning
to their formats afterwards. Both belong in the spin-off's playlist as well as
Game Changer's — the same video ids appear in both entries, which is intended —
but they are filed differently, because one came before the show existed and the
other did not.

**Precursors** aired before the spin-off launched. They go in a doc with **no
`season:` key at all**, placed before Season 1, with entries numbered `001.` and
titled `<Game Changer title> on Game Changer`:

```yaml
---
show: Crowd Control
videos:
  - episode: 001. Crowd Control on Game Changer
    dropout: crowd-control
    members: yHJ42w2Gllk
    published: 2025-03-10
```

Dirty Laundry, Play It By Ear, Crowd Control and Make Some Noise all have one.
The missing `season:` is load-bearing: `aggregate` counts a doc as a season only
when that key is present, so a precursor would otherwise inflate the show's
season count in its published description. **Nothing uses a `Season 0` label** —
Make Some Noise did until it was found to be claiming five seasons when it has
four.

**Later crossovers** are Game Changer episodes in the spin-off's format after it
launched, so they are not precursors. The default is to place one as a
`special:` at its air date inside whichever season doc precedes it, which is
where `Noise Some Makes on Game Changer` sits, after the Make Some Noise season
4 finale.

Play It By Ear is the exception, by choice:
`A Game Most Changed on Game
Changer` is numbered `002.` in the precursor doc
rather than left at the end of season 1. It is out of date order there and that
is the point — the show has exactly two Game Changer crossovers and keeping them
together at the front reads better than stranding the second one behind a season
finale. Do the same for another show only if asked; the default above is still
the default. Playlist order is file order, so position in the file is what
places them.

Um, Actually's season-less doc is the same container used for a different
reason: its nine pre-Dropout CollegeHumor episodes, which likewise should not
count as a season.

Finding these is manual. A crossover is only obvious from the format, and the
title need not mention the show at all, so treat the list above as known cases
rather than a complete one.

## seasons.yaml Structure

```yaml
---
show: Dimension 20
season: Fantasy High (Chapter 1) # Optional - campaign name for D20
cast: Intrepid Heroes # Optional - for D20 cast designation
world: Spyre # Optional - for D20 shared universes
live: true # Optional - for live shows
videos:
  - trailer: "Fantasy High Trailer"
    public: VIDEO_ID # Free on YouTube
    members: VIDEO_ID # Dropout members version
    published: 2024-01-15
  - episode: "1. The Beginning Begins"
    public: VIDEO_ID
    members: VIDEO_ID
    published: 2024-01-22
  - bts: "Behind the Scenes Title" # Behind-the-scenes content
    members: VIDEO_ID
    published: 2024-01-23
```

### Video Type Fields

- `episode`: Main episode content
- `trailer`: Promotional trailers
- `bts`: Behind-the-scenes content
- `special`: Special episodes (holiday specials, etc.)
- `animation`: Animated content
- `external`: Content on other channels

### Video ID Fields

- `public`: Free version on YouTube
- `members`: Dropout members-only version
- `paid`: Paid/rental version
- `public copy`: Re-uploaded public version
- `public short`: The vertical cut uploaded alongside a trailer for Shorts —
  same content and length, 405x720 rather than 1280x720. Recorded, never
  published. Which is which is now stored: `embedSize` on the video record, see
  below. Dropout's own playlists list only the horizontal one.
- `public compilation`: Compilation including this content
- `public parts`: Array of video IDs for split episodes
- `removed members`: Members version(s) no longer available (one id, or a list)
- `removed public parts`: Split-episode parts that have since gone

**"Removed" is not "deleted".** Everything the scan observes is removal: a video
stopped appearing in a listing, an entry left a playlist. That is all a listing
can tell us, and an unlisted video leaves one exactly as a destroyed one does.
The word `deleted` is reserved for the one place we can prove it —
`absence: deleted`, from a 404 at the oEmbed endpoint on a direct lookup by id.

### What a video record stores

`src/video.ts` reads a stored video out of a YouTube video resource, and every
caller goes through it — the scan's public pass, its members pass, and
`resolve`. It used to be three hand-written copies, which drifted: `resolve`
fetched `contentDetails` and threw away the region restrictions in it.

Beyond the obvious `title`, `duration`, `publishedAt` and `uploadedAt`:

- `regionsAllowed` / `regionsBlocked` — where it can be watched. Two videos are
  blocked in all 249 regions, which is a state worth naming: **listed, served in
  full, and watchable by nobody**. It is the mirror of unlisted, and nothing in
  the metadata announces it but the length of that array. Both forms occur — one
  video uses `allowed` with 246 entries rather than `blocked` with 3 — so a
  check that reads only one of them is wrong.
- `ageRestricted`, `embeddable` — the same kind of half-hidden state, and about
  as rare: 2 age-restricted and 1 unembeddable out of 21,539.
- `uploadStatus` — omitted at `processed`. Its other values include `rejected`
  and `deleted`.
- `liveBroadcast` — omitted at `none`.
- `madeForKids`, `licensedContent` — omitted at their defaults.
  `licensedContent` is 93% true and clusters by channel rather than scattering:
  five of the smaller Dropout show channels are at zero.
- `embedSize` — the embed iframe's `WIDTHxHEIGHT` at `maxHeight=720`, omitted at
  the 16:9 `1280x720`. **The API has no aspect ratio and no shorts flag.**
  `contentDetails.dimension` is stereoscopy — it reports `2d` for a vertical
  Short and a widescreen episode alike. Fixing the embed height turns the shape
  into a width, which is what tells a 405x720 Short from the 1280x720 cut of the
  same trailer. Stored as the measurement, not a `vertical` flag, and **the
  anomalies are kept, never rounded to the nearest standard ratio**. There are
  24 distinct sizes and the tail sorts by channel, which is what an artefact of
  a particular era or encoder looks like: all 71 at 1308x720 are
  LoadingReadyRun's, as are 29 of the 30 at 981x720; the 45 square ones are
  Critical Role's and Dropout's. 72 videos report 1281x720, 16:9 to within a
  rounding error, and are stored anyway — only exactly `1280x720` is omitted.

**A field is written only when it differs from the overwhelmingly common
value.** The cost is that an absent field means either the default or "captured
before the field existed", and only a complete re-scan separates them — the
bargain `uploadedAt` made, now at 99.7%.

**`statistics` is deliberately not captured.** View and like counts change daily
on every video, so storing them would rewrite the whole file on every scan and
leave the commit history unreadable. Quota is charged per call and not per part,
so the restraint is about the diff, not the budget.

**The scan merges rather than replaces.** `upsert` swapped the whole record, so
a scan re-seeing a video erased `resolvedAt`, `privacyStatus` and `absence`,
which only `resolve` writes. `upsertMerge` leaves fields the update does not
mention alone.

### Excerpts are never curated

A clip that is a subset of something we already carry does not belong in a
playlist beside the thing it was cut from. "First N minutes" previews above all
— those are deliberately incomplete — but equally a single moment lifted out of
an episode, or a short promo cut down from a longer trailer. The full version is
the entry; the excerpt is noise. This is why the shorts channels are scanned but
almost never curated.

## Channel Playlists

`deno task scan-playlists` records the playlists of the channels we scan into
`data/channel-playlists.yaml` — observed, unlike `data/playlists.yaml`, which is
what we intend to publish. Scope follows `config/scan.toml`: a channel counts as
tracked when it has a `recent-window`, so the parked ones are excluded without a
second list. `--channel=` restricts a run.

It runs daily in the same GitHub Action as the channel scan, and first: at
roughly 300 quota units against a 10,000-unit day it is cheap, and it sees what
nothing else can, so it should not be the thing that gets skipped when the
channel scan exhausts the quota.

These hold **YouTube video ids**, the same identifiers the curation uses, so
comparing them needs no title matching — unlike the Dropout.tv join, where every
naming difference has to be linked by hand.

**Every field an entry reports is stored, redundant or not**, and the scanner
never consults `data/videos.yaml` to decide. That file holds only what a channel
lists publicly, so a private, unlisted or foreign video is exactly the one it
cannot know about — and exactly the one worth having. Two earlier attempts at
suppressing "redundant" fields both discarded precisely the interesting entries.

What that catches: unlisted videos that appear in no uploads playlist and so are
invisible to `scan`; videos owned by other channels, which is what a
collaboration looks like, and which nothing on the video or channel resource
reports at all; and private videos, where the id, the position and the date it
was added are all that can ever be obtained, the title and description being
fixed placeholders.

Removal is tracked at the playlist level and is not deletion. A departed entry
is kept, marked with when it went, and left where it was, anchored behind
whichever entry preceded it. Delisting is distinct again: a playlist gone from
its channel's listing is re-fetched by id, and if it answers it is recorded as
delisted and still scanned.

`deno task resolve --ids=…` then fetches full metadata for entries naming videos
no scan has seen; private ones the API will not serve.

## Auto-Generated Channel Playlists

YouTube derives several playlists from a channel id by replacing its leading
`UC`. The scan uses two, and needs both: `UU` for public uploads and `UUMO` for
members-only. Probing every one- and two-letter suffix against the Dropout
channel, 702 of them, turned up nine more; a tenth, `UUMS`, is documented
elsewhere and exists in general but not here. Listed so nobody has to probe
again, with the counts from the Dropout channel:

| prefix | contents                  | on @dropout    |
| ------ | ------------------------- | -------------- |
| `UU`   | **public** uploads only   | 3564           |
| `UULF` | public long-form          | 3401           |
| `UUSH` | public shorts             | 138            |
| `UULV` | public live streams       | 25             |
| `UULP` | popular videos            | 200            |
| `UUPS` | popular shorts            | 137            |
| `UUPV` | popular live streams      | 25             |
| `UUMO` | members-only              | 1866           |
| `UUMF` | members-only long-form    | 1862           |
| `UUMV` | members-only live streams | 4              |
| `UUMS` | members-only shorts       | does not exist |

**`UU` is not everything.** It holds only what is public: the 1,866 members
videos in `UUMO` appear in `UU` not at all, so a scan reading `UU` alone would
miss every members upload. `UUMO` is exactly `UUMF` plus `UUMV`.

Everything else is a subset or a ranking of one of those two, so it adds nothing
to a scan that reads both in full. `UUSH` is the only one worth remembering: the
API exposes no shorts flag, so an exact shorts list otherwise has to be guessed
at from duration.

An exhaustive run over all eleven, on `@dropout` and on four smaller channels,
found **no public video hidden from `UU`** — every id in another prefix was
either already in `UU` or a members video from `UUMO`. Going the other way, of
5,485 stored Dropout videos, 55 appear in none of the eleven, and every one of
those is already marked `removedBefore`. So the two-playlist strategy is
complete, and there is no reason to scan the others.

**There is no collaborations playlist.** All 702 two-letter prefixes were tried;
only the nine above exist. If one is ever found it uses some other scheme, and
the API itself exposes no collaborator field on either a video or a channel.

## Dropout-Related Channels

Main channels to scan for content:

- `dropout` - Main Dropout channel
- `dimension20show` - Dimension 20 full episodes
- `dimension20shorts` - D20 clips (mostly not curated)
- `gamechangershorts` - Game Changer clips (mostly not curated)
- `umactually` - Um, Actually clips and episodes
- `makesomenoisedo` - Make Some Noise
- `veryimportantpeopleshow` - VIP
- `smartypantsdropout` - Smartypants
- `dirtylaundryshorts` - Dirty Laundry clips

## Common Tasks

### Update with new episodes

```bash
# Find what's missing
deno task curate --channel=dropout,dimension20show --since=2024-10-01 --no-fetch

# Edit seasons.yaml to add missing episodes
# Then regenerate and publish
deno task aggregate
deno task publish
```

### Publish specific playlist only

```bash
deno task publish --playlist="game-changer"
deno task publish --playlist="misfits" --dry-run  # Preview only
```

### Create new show playlist

1. Add to `config/aggregate.toml`:

```toml
[todo-new-show]
name = "New Show (All Episodes and Extras)"
description = "..."
include = [{ show = "New Show" }]
```

2. Run `deno task aggregate && deno task publish --create-missing`

## Dates

Two timestamp fields, with different meanings, both from the YouTube scan:

- `publishedAt` on a video in `data/videos.yaml` is when the video was added to
  the channel's uploads/members playlist. It is the better proxy for the
  original air date and is what `published:` in `curation/seasons.yaml` is based
  on.
- `uploadedAt` is `video.snippet.publishedAt`, when the file itself went live.
  For members videos this can trail the playlist-add by hours to months.
  Captured but not yet used.

Neither is authoritative: **the official release date lives on
watch.dropout.tv** and is scraped into `data/dropout.yaml`.

See `dates.md` for how far apart the sources actually are, which of them to
believe for which era, and the short list of entries known to carry the wrong
date.

```bash
deno task scan-dropout                 # sitemap diff + budgeted detail fetches
deno task scan-dropout --collections   # only the collection layer
deno task scan-dropout --budget=20     # smaller run
deno task scan-dropout --only='^dimension-20'  # restrict detail fetches
deno task verify-dates                 # report curated vs official dates
deno task verify-dates --show="Game Changer" --unmatched
```

`scan-dropout` waits 12 seconds between requests (config/dropout.toml) and
aborts outright on 429/403 — never work around that. It scrapes two layers from
one shared budget, cheapest first: collection pages (~196) for each show's
display name and synopsis, then episode pages (~3,600) for the release date,
description, tags and ids. Fetch the show-level slug, not a season one —
`mice-murder` is a page, `mice-murder-season-1` is the subscription wall.
Progress lives entirely in the committed data: a queue is just the records with
no `scrapedAt`, so a run resumes wherever the last one stopped, and pages are
fetched once ever since release dates never change. `verify-dates` is
report-only; date corrections to `curation/seasons.yaml` are applied by hand as
reviewed batches. Most shows map themselves, since their collection on Dropout
carries the same display name, so `[shows]` in `config/dropout.toml` holds only
the exceptions — a show whose name differs from its collection's, or one with no
collection of its own. When a title match is ambiguous, link the entry
explicitly with `dropout: <episode-slug>`.

## Git Conventions

Use `save` instead of `git commit` for committing changes:

```bash
save -m "Commit message here"
```

This automatically adds the Co-Authored-By tag. Commit frequently to checkpoint
progress.

## Tips

- Run `deno task aggregate` after editing seasons.yaml to verify changes
- The `--no-fetch` flag on curate skips fetching video descriptions (faster)
- Shorts channels have thousands of clips - focus on main channels for episodes
- Check episode counts against Dimension 20 Wiki or Dropout site when adding
  seasons
