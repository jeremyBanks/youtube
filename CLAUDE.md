# YouTube Playlist Curation Project

This project manages curated YouTube playlists for Dropout content (Dimension
20, Game Changer, Um Actually, etc.).

## When the user asks to "update"

If the user says update, refresh, sync, synchronize, catch up, or anything else
that vague, they mean the whole pipeline: find out what is new on YouTube and
Dropout, file it in the curation, and push the playlists live. Do not ask which
part they meant — run the sequence below and report what changed at each step.
The work is the same every time; only the curation step needs judgement.

**First pull.** Two GitHub Actions commit to `trunk` on their own schedule (both
early Sunday UTC, two hours apart), so the remote is usually ahead.
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
dates.md                       # Findings on where episode dates come from
src/bin/                       # One file per task
```

Every task: `scan`, `scan-dropout`, `curate`, `aggregate`, `publish`,
`verify-dates`, `resolve`, `check`. Two not covered elsewhere in this file:

- `deno task scan --window=P96D` scans every actively-tracked channel back that
  far regardless of cadence. For backfilling a newly-captured field, where the
  scheduled tiers would otherwise skip a recently-scanned channel.
- `deno task resolve --ids=a,b,c` (or `--unknown`) looks up video ids directly,
  50 per request, for ids the curation names on channels we do not scan. Results
  go to `data/resolved-videos.yaml` and never to `data/videos.yaml`, since a
  record fetched by id has no playlist-add time and takes no part in deletion
  detection.

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
- Game Changer Animated, Dimension 20 Animated (no season structure)

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
launched, so they are not precursors and must not sit at the front. They go in
as a `special:` at their air date, inside whichever season doc precedes them —
`Noise Some Makes on Game Changer` after the Make Some Noise season 4 finale,
`A Game Most Changed on Game Changer` after Play It By Ear season 1. Playlist
order is file order, so position in the file is what places them.

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
- `public compilation`: Compilation including this content
- `public parts`: Array of video IDs for split episodes
- `removed members`: Members version(s) no longer available (one id, or a list)

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
