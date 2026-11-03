# The 2026-11-03 review of every curated date

A full pass over `curation/seasons.yaml`: 2,202 entries, every `published:`
checked against every source we hold or could reach. 462 dates changed, three
entries had their public and members ids swapped, nine titles were wrong, and
two seasons had entries filed out of order. The rule the review settled on is in
`src/release-date.ts` and `dates.md`; this is the record of how it was reached
and what it could not settle.

## What was wrong, and why

`verify-dates` reported 322 disagreements with Dropout's release dates going in,
and the earlier rule (`dropout-date-adoption.md`) had left 308 of them alone
because our date was the earlier one. Laying the evidence side by side per
season showed the earlier date was almost always the **members upload**:

| season                      | our dates                  | Dropout's dates            |
| --------------------------- | -------------------------- | -------------------------- |
| A Crown of Candy            | 1-5 weeks early, irregular | weekly Wednesdays          |
| Game Changer 7              | weekly from February       | fortnightly from April     |
| Breaking News 3             | three batches, Jan-Jun     | weekly Mondays, Mar-Aug    |
| Adventuring Academy 2       | batches of four            | weekly Mondays             |
| Dirty Laundry 5             | exactly 21 days early      | fortnightly Tuesdays       |
| Mice and Murder, UC2, Seven | 1-3 weeks early            | weekly, talkback day after |

A members-only video never becomes public, so its YouTube timestamp is the
upload and nothing else. Dropout's cadences were regular in every season
checked, and the Adventuring Party talkbacks fell the day after each episode on
Dropout's dates and before or on the episode on ours. That settled it.

The reverse error, a date taken from a free re-release years later, was the one
the October batch had fixed, and only Toonout 14's exception remained.

## How each decision was made

1. For every entry, collect: Dropout's release date (ignoring dates shared by 8+
   pages, which are platform adds), the audio-only page's date, the earliest
   Pacific date of any public upload, and the earliest of any members upload
   (ignoring dates shared by 5+ entries of the season).
2. Propose a date by the rule in `dates.md`, and list every season's changes
   with all the evidence beside each.
3. Read each season's list before applying it. Anything the rule got wrong
   became a rule change, not a hand edit: the "never later without a catalogue"
   clause came from Badman's 2024 re-uploads and Um, Actually season 1's 2020
   ones; the audio-page clause from Starstruck 10 and Tiny Heist 6; the
   title-match distance guard from an Um, Actually LIVE! special matching the
   wrong year's.
4. Where Dropout's page had no date and the show was CollegeHumor-era, fetch
   TheTVDB's season tables, check them against the show's cadence, and
   transcribe them into `data/tvdb-dates.yaml`. Thirteen shows, 200 dates.
5. Where no source existed and the season's cadence left exactly one slot, fill
   it by hand with a comment saying so. Five entries.
6. Check the result for file-order contradictions (a talkback before the episode
   it discusses, dated after it) and fix the order, not the date.

Outside sources used: TheTVDB for Cartoon Hell, Total Forgiveness, WTF 101, The
Rank Room, Gods of Food, Kingpin Katie, Paranoia, Troopers (2019),
Ultramechatron, Breaking News 2, Um Actually 2 and 3, TablePop and Adventuring
Academy 1; IMDb for the Um, Actually Simpsons special. The Dimension 20 wiki
refuses requests from this container (403), so Dropout's own pages and its
audio-only pages carried the Dimension 20 seasons.

## Found along the way

- Breaking News 303 had its public and members ids the wrong way round; so did
  two Fantasy High Junior Year extras, which were therefore in the free
  playlists while being members-only.
- Play It By Ear 208 and 210 were titled `XXX`. Six other titles disagreed with
  the video itself (Aelwyn, Cool Kids, a Chupacabra, Cis-her, the 1973 Yankee
  Marriage Swap, two Erotic Book Club subtitles).
- Crown of Candy filed its last eight talkbacks before their episodes and its
  first nine after; Starstruck's post-season talkback sat after episode 8.
- 31 trailers and specials had Dropout pages they were not linked to.
- Breaking News S3E9, reported absent in `gaps.md`, has a public upload.
- TablePop 22 "Minions" is on Dropout and has no upload on any channel we scan;
  the season's gap is real.

## What is still uncertain

Listed so nobody re-derives it. `deno task verify-dates --unmatched` prints the
live set.

- **Fatal Decision**: the curated dates (five shorts a week from 2024-11-11) are
  plausible for the show's original run and unverifiable from anything we hold;
  Dropout and the members playlist both carry a bulk 2025-07-18.
- **Um, Actually season 1**: hand-entered 2018 dates, weekly Thursdays, with
  101-103 all around Dropout's launch week. No catalogue checked them.
- **Um, Actually 301 and 308**: no Dropout date; the fortnightly Saturday run
  suggests 01-25 and 05-02 against the curated 01-31 and 05-04, but TheTVDB
  gives 02-01 and 05-05, so neither was changed.
- **Um, Actually 303**: Dropout says 02-15, a week after 302 on a fortnightly
  run; TheTVDB says 02-22. Dropout's date was kept.
- **Erotic Book Club 209**: no Dropout date and no regular cadence to fill from;
  carries its members upload, 2020-11-12.
- **TablePop's MEGADUNGEON LIVE!**: not on TheTVDB; carries members uploads that
  look like a weekly run.
- **The Don Hertzfeldt Collection**: every film carries 2026-08-04, the day the
  collection reached Dropout, which is what `published:` means for us but is not
  when any film was first seen.
- **Trailers dated after their episode 1** (Fantasy High, Bloodkeep, Game
  Changer 1, Um Actually 2): the YouTube trailer really went up after the
  Dropout premiere. The dates are right and the file order is editorial.
