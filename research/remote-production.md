# Remote production research (COVID era and other)

Research only, 2026-10-20. Nothing in `curation/`, `config/`, `src/` or `data/` was changed.
Confidence: **confirmed** = a sourced statement says so; **likely** = strong inference or a single secondary source;
**unknown** = not determined. Episode titles are as curated in `curation/seasons.yaml`.

## Method, and what was searched

- Local: regex `zoom|remote(ly)|from home|quarantin|video chat|socially distan|virtual(ly)|from (their|our) homes|pandemic|covid`
  over `title` + `description` of every record in `data/dropout.yaml` and `data/videos/*.yaml`, limited to 2020-01 → mid-2022.
  This only finds content whose blurb mentions the setup; most remote episodes say nothing, so a miss is **not** evidence of in-studio.
- Local: listed curated releases 2020-03 → 2021-12 per show/season (Dimension 20 x14 seasons, Game Changer S2–S4, Um Actually S3–S5,
  Adventuring Academy S2–S3, Breaking News S3–S5, Make Some Noise, Dirty Laundry, Troopers Animated, Erotic Book Club S2, Play It By Ear).
- Web: WebSearch + WebFetch of Wikipedia (Dimension 20, Game Changer, Um, Actually, Dropout), TheGamer interview, geekpeek review.
  The Dimension 20 fandom wiki returned HTTP 402 to the fetcher and everybodywiki returned 403, so neither was read.

## Confirmed remote

### Dimension 20: Fantasy High (Chapter 2) (Sophomore Year) - finale only
- Remote: `19. Spring Break! I Believe In You! (Part 1)` and `20. Spring Break! I Believe In You! (Part 2)` (curated 2020-04-05 / 04-07).
- Evidence: Wikipedia: the finale "was streamed remotely due to the COVID-19 pandemic". The rest of the season was a live Twitch
  stream ("Dimension 20 LIVE") from the studio, then edited for Dropout - web-streamed, not before an in-person audience.
- Source: https://en.wikipedia.org/wiki/Dimension_20 . Confidence: confirmed (finale); in-studio for eps 1-18: likely (aired Oct 2019 - Mar 2020; not separately sourced).

### Dimension 20: Pirates of Leviathan - whole season
- Wikipedia: "the first campaign to be completely recorded remotely during the COVID-19 pandemic." TheGamer interview (2020-10-09)
  with Brennan Lee Mulligan: the pandemic "forced Dimension 20 to go virtual", varying internet speeds, cast recording from homes.
- Sources: https://en.wikipedia.org/wiki/Dimension_20 ; https://www.thegamer.com/brennan-lee-mulligan-dnd-dimension-20-covid-interview/
- Confidence: confirmed. Applies to all curated entries (trailer + eps 1-6).

### Dimension 20: The Unsleeping City (Chapter 2) - whole season
- Wikipedia: "The remotely-recorded campaign used virtual tabletop Roll20 instead of physical dice, sets and figurines."
  Review: "This entire season was shot remotely and not in the dome because all cast members were in lockdown."
- Local, primary: the YouTube trailer description (`data/videos/dimension20show.yaml`, `The Unsleeping City: Chapter 2 Trailer`, 2020-10-30)
  says "Remotely-shot to keep everyone in the cast and production team as sa[fe]...".
- Sources: https://en.wikipedia.org/wiki/Dimension_20 ; https://geekpeek.blog/dimension-20-the-unsleeping-city-chapter-ii-review/
- Confidence: confirmed (eps 1-18 and trailer; not the 2024 `Gauntlet at the Garden Trailer` filed in this doc).

### Dimension 20: Mice and Murder - whole season, hybrid
- Wikipedia: "Recorded remotely." A search-result guide (not fetched) says Brennan was in the dome and players remote - **unverified**.
- Source: https://en.wikipedia.org/wiki/Dimension_20 . Confidence: confirmed remote; "hybrid" detail likely/unverified.

### Dimension 20 one-shots streamed online (2020)
- RTX @ Home Fantasy High one-shot (2020-09) and Roll20Con one-shot (2020-10-24) were online convention events (Wikipedia tweet ref:
  "The live Fantasy High one-shot from @RTXEvent is now live on @dropout!"). Curated as `College Visit` (2020-09-28) and `Boys' Night` (2020-10-28)
  in Fantasy High (Chapter 2) - mapping by date is **likely**, not confirmed. Remote/web-streamed: likely (both conventions were virtual in 2020).

### Dimension 20's Adventuring Party - Seasons 1-4
- Wikipedia: Adventuring Party began with A Crown of Candy as a live after-show; "The first four seasons were all filmed remotely and aired live"
  (the sentence is ambiguous but sits in the Adventuring Party paragraph). Local corroboration: S1 `I Stan The Protestant Work Ethic!` (2020-07)
  mentions "zoom call shark fins"; S3 `The Lou Show` (2021-03) mentions "Zoom filters".
- Sources: https://en.wikipedia.org/wiki/Dimension_20 ; `data/dropout.yaml`. Confidence: confirmed for S1-S4 (covers Crown of Candy, Pirates, UC2, Mice and Murder talkbacks).
- Later remote talkbacks (non-COVID): S10 `Do Clothes Die?` ("The cast (most of them) join virtually", 2022-09-29) and
  `Schrödinger's Canon` ("meets (virtually)", 2022-10-06); S11 `Gatorade Shampoo` ("Zoom energy", 2022-12-29) - likely remote, from blurbs only.
- Curated mapping of Adventuring Party docs was **not** checked.

### Game Changer - Season 3 (all 15 episodes, 301-315)
- Wikipedia: "The third season of the show was recorded via video conference to comply with lockdown restrictions"; Season 4 returned to studio.
  Cites a Dropout tweet (2020-07-07): "Shooting remotely opens up new possibilities of chaos..." Bossrush on `303. ChangerCon`: contestants mailed props, Zoom call.
- Sources: https://en.wikipedia.org/wiki/Game_Changer_(game_show) ; https://bossrush.net/2025/04/18/six-game-changer-episodes-that-prove-sam-reich-isnt-always-a-batman-villain/
- Confidence: confirmed for the season; per-episode not individually verified. Note `310. The Substitute (Make Some Noise 3)` is a remote MSN-format episode.

### If Google Was a Guy: Quarantine Edition (CH web series)
- Dropout description: "Made entirely from the safety of home"; Parts 1-3 (2020-04-14, 2020-06-08, 2020-12-31) and the full-series compilation (2021-01-27).
- Source: `data/dropout.yaml` (collection `if-google-was-a-guy-1-season-1`, `ch-shorts-season-15`). Confidence: confirmed. Curated mapping not checked.

## Likely remote

### Um, Actually - Season 4 (401-412)
- A search-result listing said every S4 episode was "themed and filmed remotely" (premiere 2020-08-23); that page (everybodywiki) returned 403
  and was not read. Wikipedia's Um, Actually article (first 100k chars) has no mention. The Dropout (streaming service) Wikipedia article says
  the company was "briefly producing these series [Um, Actually, Dimension 20, Game Changer] through online..." (truncated in the result; the
  task brief says it carries "citation needed").
- Sources: https://en.wikipedia.org/wiki/Dropout_(streaming_service) ; https://en.everybodywiki.com/Um,_Actually (unread).
- Confidence: likely. Needs a primary source (episode footage or Dropout post).

### Adventuring Academy - Season 2 (2020-09 → 12)
- `See Me In Six Months (with Aabria Iyengar)` blurb: "talk about remote DMing" - topic, not format. Aired at the height of lockdown.
- Confidence: unknown→likely; no source found on the recording setup.

## Confirmed / likely in-studio (useful negatives)

- **Dimension 20 return to studio:** Wikipedia: May 2021 announcement to "resume production in-person and in-studio, adhering to COVID safety
  guidelines set by SAG-AFTRA" (ref: "Dimension 20 Update: A Safe Return to the Dome", Dropout, 2021-05-24); **Misfits and Magic (Chapter 1)**
  was "the first in-studio after the COVID-19 pandemic". Confirmed. By implication The Seven, Shriek Week, A Starstruck Odyssey are in-studio (likely; not individually checked).
- **Game Changer Season 4:** returned to studio (Wikipedia). Confirmed.
- **Tiny Heist, Escape from the Bloodkeep:** aired Jan-Mar 2020; pre-pandemic production is likely (not sourced).
- **A Crown of Candy:** aired 2020-04-08 → 08-05; no source states when it was filmed. Wikipedia lists it as pre-recorded (not among remote seasons). Likely in-studio pre-lockdown; unconfirmed.
- **Breaking News Season 3:** most curated YouTube dates are 2020-01; Dropout release dates run 2020-04 → 06 but the content (e.g. `309. A Report From the CollegeHumor Office`) reads as in-office. Likely filmed pre-lockdown; unconfirmed.
- **CH sketches Oct 2020** (`Why I'm Voting For Opposite Man`, `What Undecided Voters Look Like To Everyone Else`): "filmed following COVID-19 health and safety protocols" - in person, not remote. Confirmed (Dropout description).

## Not looked for / could not determine

- **Dirty Laundry, Make Some Noise, Very Important People, Total Forgiveness:** one combined search found nothing; not researched per show.
  Make Some Noise's 2021 curated entries are Game Changer crossovers (see GC S3 above). No finding either way.
- **Um, Actually Season 5 (2021), Breaking News Seasons 4-5 (2021), Adventuring Academy S3, Troopers Animated, Erotic Book Club S2, Play It By Ear:** not looked for beyond the local regex.
- **Dimension 20 fandom wiki** season pages: could not be fetched (402).
- **Dropout Presents / other CH web series 2020:** only the regex; If Google Was a Guy was the only hit.
- Green screen compositing: no source found for any season (searched with the D20 remote query).

## Open questions

1. Was Mice and Murder hybrid (Brennan in the dome, players at home)? Needs a primary source.
2. Um, Actually S4 (and early S5): remote or socially-distanced studio? Watch an episode or find Dropout's post.
3. Was A Crown of Candy fully filmed before March 2020?
4. Do `College Visit` / `Boys' Night` correspond to the RTX @ Home / Roll20Con one-shots?
5. Adventuring Party S1-S4: confirm the Wikipedia sentence refers to the talkback, and map to curated docs.
6. Adventuring Academy S2/S3 and Breaking News S4/S5 recording setup.
7. Should "remote" also cover non-COVID cases (Adventuring Party S10/S11 Zoom talkbacks; Fantasy High Sophomore Year as a web stream)?
