Tools for maintaining curated YouTube playlists of Dropout content.

`curation/seasons.yaml` is the hand-written source of truth: which videos belong
to which show and season, and which ids are the free, members-only, and
superseded versions of each. Everything in `data/` is generated, either scraped
from YouTube or derived from the curation.

## Setup

Only `YOUTUBE_API_KEY` is needed to scan. Publishing additionally needs
`YOUTUBE_CLIENT_ID` and `YOUTUBE_CLIENT_SECRET`, since writing to playlists
requires OAuth. Put them in `.env` (see `.env.example`) or in the environment.

## Tasks

- [x] `deno task scan` (`deno run @jeb/youtube/scan`) scans the contents of
      YouTube channels as specified in `config/scan.toml` to update
      `data/videos.yaml`, a list of videos with timestamps, durations, and
      members-only status. It also updates `data/channels.yaml`, a list of
      channels with handles and some stats, and `data/scans.yaml`, a list of
      scan sessions and what data they included, but those are just to support
      the scanning operation and aren't intended to be useful on their own (e.g.
      the channels stats may never be updated). This only requires a YouTube API
      key, since it reads public data, so it does not authenticate and can run
      unattended.

      Each channel in `config/scan.toml` sets its own cadence, at three depths:
      `incremental-interval` reaches back only to the previous scan,
      `recent-interval` and `recent-window` periodically reach back a fixed
      window, and `complete-interval` reaches back to the beginning. Depth
      matters because a video is only known to be gone if a scan looks far
      enough back to miss it. `--window=P96D` overrides all of that and scans
      every actively-tracked channel back that far regardless of cadence,
      which is how a newly-captured field gets backfilled over recent videos
      when the scheduled tiers would otherwise skip a channel scanned before
      the field existed.

- [x] `deno task aggregate` (`deno run @jeb/youtube/aggregate`) uses the
      contents of `curation/seasons.yaml` and `config/aggregate.toml` to
      generate an updated list of videos that should be included in each
      playlist, saving the generated results in `data/playlists.yaml`. This is
      purely local: no API key and no network.

- [x] `deno task publish` (`deno run @jeb/youtube/publish`) takes the playlist
      videos and descriptions in `data/playlists.yaml` and publishes them to the
      specified playlist IDs on YouTube. This requires YouTube API client
      identifiers and keys to be set in `.env` as described in `.env.example`,
      and requires the user to interactively authenticate with a YouTube account
      that has owns or at least has write permissions for the specified
      playlists. Note that editing playlists can be an expensive operation in
      terms of YouTube API quota, so large changes may not be possible to finish
      at once, and this operation may need to be executed repeatedly over
      multiple days.

      `--dry-run` fetches each playlist's live contents and reports the same
      diff a real run would act on — naming the videos it would add and the
      entries it would remove — then stops before changing anything. It needs
      no OAuth, since it only reads.
      `--playlist=NAME` limits it to one playlist, and `--create-missing`
      creates playlists whose config key is still a `todo-` placeholder,
      writing the real id back into `config/aggregate.toml`.

- [x] `deno task curate` (`deno run @jeb/youtube/curate`) lists scanned videos
      that aren't yet accounted for in `curation/seasons.yaml`, so they can be
      categorised by hand. Filters with `--channel`, `--since` and `--limit`;
      `--no-fetch` skips fetching descriptions.

- [x] `deno task scan-dropout` (`deno run @jeb/youtube/scan-dropout`) indexes
      watch.dropout.tv itself into `data/dropout.yaml`. The site's sitemap
      enumerates every episode in one request, so existence and deletion
      detection are cheap; official release dates only appear on individual
      episode pages, which are fetched 12 seconds apart under a per-run budget
      (`config/dropout.toml`), once ever per episode. `--budget=N` overrides the
      cap and `--only=REGEX` restricts a run to matching slugs or collections.
      Needs no credentials.

- [x] `deno task verify-dates` (`deno run @jeb/youtube/verify-dates`)
      cross-references the `published:` dates in `curation/seasons.yaml` against
      the official release dates in `data/dropout.yaml` and reports every
      disagreement. Matching uses an explicit `dropout: <slug>` field on a
      curation entry when present, otherwise a normalised-title match within the
      show's collection (mapped in `config/dropout.toml`); anything ambiguous or
      unmatched is listed rather than guessed. It reads only and never writes.

- [ ] `deno task scan-playlists` would take the playlist IDs specified in
      `config/aggregate.toml`, fetch their current descriptions and contents
      from the YouTube API, and update `data/playlists.yaml` with that
      information. Typically, we publish from that file instead of scanning into
      it, so this isn't meant as part of the typical workflow. Rather, it's only
      meant to help compare the actual contents with the intended ones. Not yet
      implemented.

## Automation

`.github/workflows/scan.yaml` runs `deno task scan` weekly and commits the
result. It needs one repository secret, `YOUTUBE_API_KEY`.

`.github/workflows/scan-dropout.yaml` runs `deno task scan-dropout` about two
hours after it, and needs no secrets at all. Both are scheduled early on Sunday
UTC, so a week's changes arrive together in one quiet window. Each run also
chips away at the back catalogue of unfetched release dates until it converges.

The point of scanning on a schedule is capture rather than currency: a video
that is posted and pulled between scans leaves no trace, and no later scan can
recover it. Curating and publishing remain manual.
