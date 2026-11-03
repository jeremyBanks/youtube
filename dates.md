# Where episode dates come from

`published:` in `curation/seasons.yaml` is the first day a video could be
watched, anywhere, in Pacific time. This file says which evidence decides it,
how the sources disagree, and where each one is wrong. The rule itself lives in
`src/release-date.ts`; `deno task verify-dates` applies it to every entry and
reports the ones that disagree with their evidence.

Reviewed in full on 2026-11-03, when 462 dates were corrected. The findings
below are from that review; `research/date-review-2026-11.md` has the method.

## The rule

Evidence is ranked, and the highest rank that exists decides:

1. **A catalogue date**: the release date somebody published. Dropout's own page
   (`data/dropout.yaml`), or TheTVDB where Dropout's page carries none
   (`data/tvdb-dates.yaml`), or a hand override where Dropout's page is wrong
   (`[release-dates]` in `config/dropout.toml`).
2. **An earlier public YouTube upload** beats the catalogue. A public upload is
   a real publication; the CollegeHumor-era shows reached YouTube before Dropout
   listed them, and there Dropout's date is the day the platform got the video.
3. **The audio-only page** on Dropout is released with or after the video. It
   bounds the date from above, so a catalogue date later than it is wrong, and
   where there is no catalogue date it replaces a date that was only ever the
   members upload.
4. **The members upload** is used only when nothing else exists, and is never
   trusted over the curated date.
5. **Without a catalogue date, a date only moves earlier.** A re-upload in 2024
   says nothing about a release in 2012.

Two things are ignored outright. A Dropout date shared by eight or more pages is
the day a show reached the platform, not the day anything aired: Fatal
Decision's 49 episodes all carry 2025-07-18. A members-upload date shared by
five or more entries of a season is a backfill batch: all of Cartoon Hell went
up on 2019-09-13.

## Why the members upload is the wrong source

Most wrong dates came from one mistake: taking a members video's YouTube
timestamp for its release. For a members-only video that timestamp is the
**upload**, and the video never becomes public, so nothing on YouTube records
when members could first see it.

Dropout schedules uploads ahead. Measured against Dropout's release dates:

- **Days to weeks early, routinely.** Crown of Candy's episodes were uploaded 1
  to 5 weeks before they aired; Adventuring Academy season 2 went up in batches
  of four; Breaking News season 3 in three batches between January and June for
  a weekly run from March to August; Dirty Laundry season 5 exactly 21 days
  early, every episode; Game Changer season 7 months early.
- **Years late for the back catalogue.** Fantasy High's first episodes reached
  the members playlist 1,139 days after their release. The CollegeHumor-era
  shows were all backfilled in September 2019.
- **Two or three days early is the normal case** for 2020-2022: Friday uploads
  for a Monday release, Wednesday for Friday. The ±1 day cases are the same
  thing plus the UTC date rolling over at 16:00 Pacific.

None of this is visible from the timestamp itself, which is why the rule refuses
it whenever anything better exists.

## What each source is good for

| source          | what it is                       | reliability                                                       |
| --------------- | -------------------------------- | ----------------------------------------------------------------- |
| Dropout page    | the release Dropout scheduled    | right for everything Dropout released first; see exceptions below |
| TheTVDB         | fan catalogue                    | right in cadence; sometimes a day late (UTC); some placeholders   |
| public upload   | a real publication               | right where it is the earliest; a re-upload where it is not       |
| audio-only page | released with or after the video | an upper bound; equals the video's date in 239 of 252 cases       |
| members upload  | an upload                        | wrong in either direction by days to years                        |

TheTVDB's tables were transcribed by hand for thirteen shows and checked against
each show's weekly cadence before use. See Plum Run's are placeholders (every
episode 2018-01-01) and were left out.

## Where Dropout itself is wrong

Four pages carry a date that the show's own cadence and a second source
contradict. These are the `[release-dates]` overrides, with the evidence beside
each:

- **Toonout 14, "Young Spencer Goes to School"**: Dropout says 2026-09-08, the
  same day as episode 13; the show runs fortnightly and YouTube published it on
  09-22.
- **Um, Actually 306 and 307**: Dropout files the Simpsons special at 02-22 and
  Zelda at 05-02, two slots of a fortnightly Saturday run swapped. IMDb and
  TheTVDB put the Simpsons special in mid-April.
- **Adventuring Academy 105**: Dropout says 02-19, a Tuesday off the fortnightly
  Wednesday run; TheTVDB and the free upload say 03-06.

Dropout's episode numbering is a separate matter and is sometimes not release
order (Um, Actually season 3, Breaking News season 3). The curation's numbers
are Dropout's; the dates are the releases; the two need not agree.

## What rests on nothing better

Run `deno task verify-dates --unmatched` for the live list. As of the review:

- **Fatal Decision** (49): Dropout's dates are a bulk add and the members
  uploads are one batch. The curated dates, five a week from 2024-11-11, are the
  show's original run as shorts and could not be checked against a catalogue.
- **The CollegeHumor-era shows with no TheTVDB table**: Um, Actually seasons 1
  and 2 (hand-entered; season 2 was confirmed against TheTVDB), See Plum Run,
  Kingpin Katie's shorts, the Unlisted doc.
- **Entries with no Dropout page and no public upload**: a handful of talkbacks
  and behind-the-scenes extras dated by their members upload, which for those is
  usually within a day or two of the release.
- **Four dates set by cadence**, each with a comment in the curation saying why:
  Unsleeping City 2 episode 8, Adventuring Academy 304, Breaking News 304 and
  318, and The Seven's episode 2 talkback.

## What playlist order has to do with it

Nothing, except in one playlist. Order is file order, so `published:` is
documentation everywhere but the `chronological` playlist (Dropout in
Quarantine), which sorts by it. Correcting the dates re-sorted 58 of its
entries.

Where a season's file order was found to contradict its dates, the file was
fixed rather than the dates: Crown of Candy's second-half talkbacks sat before
their own episodes, unlike the first half's, and Starstruck's post-season
talkback sat in the middle of the season. Animations are placed inside the
season they depict and are out of date order by design.

## History

- **2026-10-21**: 264 dates moved to Dropout's where it was earlier
  (`research/dropout-date-adoption.md`). The rule then was that an earlier date
  of ours stood, on the theory that the CollegeHumor-era shows aired on YouTube
  first. That was true of those shows and wrong as a rule: for a members-only
  video our earlier date was the upload, and whole seasons from 2020 onward were
  weeks early.
- **2026-11-03**: the review above. 290 dates from Dropout's pages, 172 from
  TheTVDB; three entries with public and members ids swapped; the rule moved
  into `verify-dates`.
