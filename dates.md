# Where episode dates come from, and how far apart they are

Findings from cross-referencing `curation/seasons.yaml` against the scraped
watch.dropout.tv index. **Tentative**: measured while the Dropout scrape was
about 70% complete (2,456 of 3,594 episode pages), over 1,128 comparable
entries. The proportions should hold, but the counts will grow.

## What `published:` is meant to be

The first date an episode was available to viewers, in Pacific time.

With a single-digit number of exceptions, a YouTube members video and the
Dropout release are **simultaneous** — not staggered. So for anything recent,
either source answers the question. The free YouTube release comes later and is
never the answer when a members release exists.

## What it actually is

Mostly the raw UTC date of the members video's playlist-add:

| our `published:` equals          | share |
| -------------------------------- | ----- |
| UTC date of members playlist-add | 77%   |
| Pacific date of the same         | 72%   |
| Dropout's official release date  | 58%   |

That is the mechanical origin of most small disagreements. A release at 16:00
Pacific is already the next day in UTC, and 279 members videos land in the
00:00–07:00 UTC window where that flip happens.

Converting to Pacific is more correct but only moves agreement with Dropout from
58% to 61%. Worth knowing; not worth calling a fix.

## Neither source is right everywhere

Two opposite regimes, which is why no single rule works:

- **Current content** — members and Dropout release together, so the YouTube
  playlist-add is a good proxy once converted to Pacific.
- **Back catalogue** — the material existed on Dropout, or on CollegeHumor, long
  before it reached the YouTube members playlist. `1. The Beginning
  Begins`
  was added to YouTube **1,139 days** after its Dropout release. Here the
  YouTube timestamp is meaningless and Dropout's is the answer.

There is a third case running the other way: 212 entries where ours is _earlier_
than Dropout's, concentrated in the CollegeHumor-era shows (Breaking News,
median −3 days; Adventuring Academy, median −5.5). That material aired on
YouTube first, so Dropout's "release date" looks like a platform-add date.
**Ours is probably the correct one there.**

## The disagreements, by kind

Of 460 disagreements:

| distance     | episodes | extras | reading                                     |
| ------------ | -------- | ------ | ------------------------------------------- |
| ±1 day       | 127      | 63     | timezone artifact of the UTC derivation     |
| ±2–3 days    | 30       | 36     | mostly deliberate ordering nudges           |
| 4–30 days    | 88       | 61     | mixed; back-catalogue lag and genuine drift |
| over 30 days | 40       | 1      | the one class that is plainly wrong         |

The asymmetry in the last row is the tell: extras do not drift by months, but an
episode does when its date was taken from the free re-release.

## The actionable set

Only **nine** entries have a curated date more than 30 days _later_ than the
official one, and each is the free-re-release error — the members video sits
within days or weeks of Dropout's date while ours is a year or more out:

| entry                             | curated    | official   |
| --------------------------------- | ---------- | ---------- |
| 402. Like My Coffee               | 2023-05-10 | 2021-11-15 |
| 1. A Heaping Helping of Trouble   | 2021-11-16 | 2020-09-16 |
| 7. We Need to Talk About Pete     | 2020-10-16 | 2019-08-20 |
| 401. Sam Says                     | 2022-10-19 | 2021-11-01 |
| 1. The Fall of New York City      | 2021-10-26 | 2020-11-11 |
| 1. It Was a Dark and Stormy Night | 2021-08-24 | 2021-04-07 |
| 1. The Club Fair                  | 2022-03-08 | 2021-11-10 |
| 1. Party of Seven                 | 2021-09-21 | 2021-08-18 |
| 1. Down For The Count             | 2022-06-28 | 2022-06-08 |

Not yet applied.

## What not to touch

- The ±2–3 day band. Some dates were adjusted deliberately to control ordering,
  and cannot be told from errors by inspection.
- Um, Actually's episode numbering. Dropout was internally inconsistent between
  its public, members and site listings; the curated order was worked out by
  hand and is deliberate.
- Anything where ours is earlier than Dropout's, absent a specific reason.

None of this affects what subscribers see: playlist order is file order, so
`published:` is documentation rather than behaviour.
