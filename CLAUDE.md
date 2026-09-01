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
daily, 11:13 and 11:41 UTC), so the remote is usually ahead.
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
  by id has no playlist-add time and takes no part in deletion detection, so
  those go to `data/resolved-videos.yaml`. It does _annotate_ a record a scan
  already made, with `resolvedAt` and `privacyStatus`.

  `--unknown` sweeps three sets: ids the curation names that no scan has seen,
  ids appearing in a scanned channel's playlists, and **every video a scan
  marked `removedBefore`**. That last one matters because `removedBefore` only
  ever meant "stopped appearing in the channel's uploads playlist", and an
  unlisted video leaves that listing exactly as a deleted one does. Asking by id
  settles it: the API serves an unlisted video, and serves nothing for a deleted
  one. The first run of this found 53 of 122 supposedly-removed videos alive and
  merely unlisted. `removedBefore` is never cleared — the video did leave the
  listing — but `privacyStatus` alongside it says why.

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
- `public short`: The vertical cut uploaded alongside a trailer for Shorts —
  same content and length, 405x720 rather than 1280x720. Recorded, never
  published. Which is which is checkable: `videos.list?part=player` reports the
  embed dimensions, and Dropout's own playlists list only the horizontal one.
- `public compilation`: Compilation including this content
- `public parts`: Array of video IDs for split episodes
- `removed members`: Members version(s) no longer available (one id, or a list)

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
