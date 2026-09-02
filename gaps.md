# Where the catalogues disagree

What is on watch.dropout.tv and not on YouTube, what is on YouTube and not on
watch.dropout.tv, and how far either answer can be trusted. A companion to
`dates.md`, which does the same for release dates.

Investigated 2026-09-02. The numbers are a snapshot; the method and its limits
are the durable part.

## The method, and why it is only ever approximate

The two catalogues share no identifiers. `data/dropout.yaml` holds slugs and
item ids from watch.dropout.tv; `data/videos/` holds YouTube video ids. Nothing
links them but the title, and the titles are written by different people for
different purposes.

So both directions are a normalised title match: strip a trailing
`| Show | Ep. N`, strip bracketed suffixes like `[Full Episode]` and
`- Cocktail Recipes`, fold `&` to `and`, drop articles, lowercase, collapse
punctuation. Where an exact match fails, a token-overlap score (Jaccard, on
non-stopword tokens) finds titles that are close.

**The false-positive rate is the headline caveat.** Measured against
hand-verified answers:

- Dropout to YouTube, exact match: **20 of 22 candidates were wrong** — they
  existed on YouTube under a different title.
- YouTube to Dropout, exact match, 10 minutes and over: **34 of 235 were
  wrong**, about 14%, caught by the fuzzy pass.
- Below 10 minutes the rate is **unmeasured**, and is probably worse, since a
  short title carries fewer tokens to match on.

Every count below is therefore an upper bound on the real disagreement.

Titles diverge more than seems reasonable. Real examples, all the same video:

| Dropout                                  | YouTube                                        |
| ---------------------------------------- | ---------------------------------------------- |
| Slammed Down, Big-Style                  | Slam Down, Big-Style                           |
| The Yellow M&M Is the Funniest Guy Alive | ...Funniest Guy Ever                           |
| Fantasy High LIVE in Brooklyn            | Dimension 20 Live                              |
| Brennan's Exit (Extended Cut)            | Why I'm Leaving Dropout (Extended Cut)         |
| Raising the Stakes (with Brian Murphy)   | ...(with Brian Murphy) _FANTASY HIGH SPOILERS_ |

**What does work, when a candidate needs settling: the description.** Dropout
writes the same one-line synopsis on a members upload and on its free re-cut,
and that synopsis usually names the guests. It resolved four ambiguous
re-uploads outright where runtime had put two of them against the wrong episode.
Runtime alone is useless — 2,011 uncurated videos share an exact duration with a
curated one.

## Direction 1: on Dropout, not on YouTube

3,598 Dropout entries. 312 `[Audio Only]` variants excluded, as those exist on
Dropout by design and never on YouTube. **3,131 compared; 580 with no YouTube
title match.**

Almost all of it is the CollegeHumor back catalogue, which predates the YouTube
channels we scan:

| count  | what                                                                                                                                                                                                                                  |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 231    | entries with no `showTitle` — old web series: All Nighters (29), Very Mary Kate (38), Yay or Nay (20), Precious Plum (13), Hello My Name Is (12), Full Benefits (10), Camp (8), Bearshark (6), POV (6), CH Live (5), plus 24 trailers |
| 156    | Hardly Working                                                                                                                                                                                                                        |
| 71     | CH Shorts                                                                                                                                                                                                                             |
| 26     | TablePop                                                                                                                                                                                                                              |
| 18     | Troopers: The Web Series                                                                                                                                                                                                              |
| 10     | Hot Date: The Web Series                                                                                                                                                                                                              |
| 9      | Um, Actually: The Web Series                                                                                                                                                                                                          |
| 6 each | Heist Night, Don't Hug Me I'm Scared, The sCHining                                                                                                                                                                                    |
| 4 each | Cartoon Hell, Um Actually, CH Does the Purge                                                                                                                                                                                          |

**Verified genuinely absent from every channel we scan — two things:**

1. **Breaking News S3E9, "A Report From the CollegeHumor Office"** —
   <https://watch.dropout.tv/breaking-news-no-laugh-newsroom/season:3/videos/a-report-from-the-collegehumor-office>.
   Our Breaking News Season 3 skips from 8 to 10. Multiple searches found
   nothing.
2. **The six original Don't Hug Me I'm Scared web shorts** — CREATIVITY, TIME,
   LOVE, COMPUTERS, FOOD, DREAMS. On YouTube, but on the DHMIS channel, which is
   not one we scan. Dropout's own channel carries only the 2026 series.

Sixteen other candidates were checked individually by agent and all sixteen
existed on YouTube under a different title.

## Direction 2: on YouTube, not on Dropout

12,062 YouTube videos on the seventeen Dropout-family channels. **9,082 have no
Dropout title match.** The full row-level list is a TSV alongside this file's
investigation, not committed; regenerate it from the method above.

| duration | count |
| -------- | ----- |
| under 1m | 3,886 |
| 1-5m     | 4,718 |
| 5-10m    | 229   |
| 10-30m   | 183   |
| 30-60m   | 31    |
| 60m+     | 35    |

By channel: dropout 2,821, dimension20show 1,643, gamechangershorts 1,024,
umactually 596, veryimportantpeopleshow 558, makesomenoisedo 555,
dirtylaundryshorts 531, smartypantsdropout 380, dropoutpresents 228,
gastronautsshow 201, parlorroomshow 184, crowdcontroldo 105, monetsslumberparty
73, thousandairesdo 57, toonoutanimation 53, nobodyaskedshow 50,
dimension20shorts 23.

151 of the 9,082 are in our curation; 8,931 are not.

Narrowing to 10 minutes and over and applying the fuzzy pass leaves **201 with
no plausible counterpart**: 155 uncategorised, 18 live events, 12 clips, 10
compilations, 6 preview excerpts. By era, 71 predate 2019 and 66 are from 2019
alone — more than 2020 through 2023 combined.

## What is worth attention, in order

**1. The 41 we curate that have no Dropout counterpart (list A).** Small, and it
is content we have already decided is worth publishing. Three distinct things
are mixed together in it:

- free re-uploads under different titles (the VIP "An Interview with a Very
  Important..." set, the Dirty Laundry full episodes) — probably false
  positives, since a synopsis-shaped YouTube title cannot match a
  guest-name-shaped Dropout one;
- split-part episodes, where Dropout has one episode and YouTube has two
  (SantaCon Mutant Melee Pt 1/Pt 2, Unsleeping City #5 Part 1/2) — structurally
  unmatched rather than missing;
- genuinely YouTube-only, which is the interesting residue: the 752-minute
  Fantasy High Binge Compilation, the four "Recapping Fantasy High with..."
  episodes, Dimension 20 Live.

**2. The 18 live events (list B).** A livestream never gets a watch.dropout.tv
page, so this category is permanently YouTube-only. It runs from the 2016
CollegeHumor live experiments through the 248-minute Dimension 20 Bail Fund
stream and the 184-minute Voter Registration Drive. This is Dropout history that
exists in exactly one place.

**3. The 2019 spike (list C).** 66 of the 201 unmatched are from 2019, the
CollegeHumor-to-Dropout transition year. Likely a structural cause rather than
66 separate ones; worth understanding as a batch.

**4. The 8,604 under five minutes, deprioritised.** Believed to be
overwhelmingly `#shorts` and clips. **This is a judgement, not a finding** — a
random sample of 50 would settle it and has not been done.

## The one that proves the point

`BKiox8GK4MI`, "Dimension 20 Update: A Safe Return to the Dome" — Brennan
announcing the return to in-person filming, 141 seconds, 2021-05-21, members
only. Both `dropout.tv` and `watch.dropout.tv` now 404 on it. Dropout deleted
it; the YouTube archive kept it. It is curated, in its own show-level doc.

Our Dropout scrape reads a sitemap, so it sees only what exists now, and its
earliest `firstSeen` is 2026-08-31. **Anything Dropout deleted before that date
is invisible to us and always will be.** From now on `scan-dropout` detects
removals by sitemap diff, so a future deletion is caught — but this video was
only ever recoverable from the YouTube side, which is the argument for the whole
archive in one example.

### A. Curated by us, no Dropout counterpart (41)

| published  | length | channel         | video                                       | title                                                                  |
| ---------- | ------ | --------------- | ------------------------------------------- | ---------------------------------------------------------------------- |
| 2018-10-04 | 23m    | umactually      | [ZsZjFAfJJ3c](https://youtu.be/ZsZjFAfJJ3c) | Um, Actually: Bigger, Longer, and Wronger [Full Episode]               |
| 2018-10-23 | 114m   | dimension20show | [d2r0NBbJcww](https://youtu.be/d2r0NBbJcww) | Rise of the Dead Teens (Ep. 3) \| Fantasy High                         |
| 2018-10-30 | 77m    | dimension20show | [cet2H3L_Xxk](https://youtu.be/cet2H3L_Xxk) | Street Race to the Death (Ep. 4) \| Fantasy High                       |
| 2018-11-20 | 108m   | dimension20show | [Uly8iW-oowE](https://youtu.be/Uly8iW-oowE) | The Pixie and the Mosh Pit (Ep. 5) \| Fantasy High                     |
| 2018-11-27 | 68m    | dimension20show | [LrUbqcBYx6s](https://youtu.be/LrUbqcBYx6s) | Brawl at the Zombie Bar (Ep. 6) \| Fantasy High                        |
| 2019-01-10 | 752m   | dimension20show | [TTC_2ANnmng](https://youtu.be/TTC_2ANnmng) | Fantasy High Binge Compilation (Episodes 1 - 8)                        |
| 2019-02-06 | 60m    | dimension20show | [AY8VqiswElI](https://youtu.be/AY8VqiswElI) | Raising the Stakes (with Brian Murphy) _FANTASY HIGH SPOILERS_         |
| 2019-06-25 | 130m   | dropout         | [-ulIYMA0sqg](https://youtu.be/-ulIYMA0sqg) | Dimension 20 Live                                                      |
| 2019-07-16 | 129m   | dropout         | [gI5nFEZk690](https://youtu.be/gI5nFEZk690) | D&D Meets NYC \| The Unsleeping City [Full Episode]                    |
| 2019-07-23 | 38m    | dropout         | [maA08gz-Ycs](https://youtu.be/maA08gz-Ycs) | SantaCon Mutant Melee (Pt 1)                                           |
| 2019-07-30 | 51m    | dropout         | [vVJaFxHneCY](https://youtu.be/vVJaFxHneCY) | SantaCon Mutant Melee (Pt 2)                                           |
| 2019-08-06 | 65m    | dropout         | [nGWsVXkx09c](https://youtu.be/nGWsVXkx09c) | Offbeat Roommates and Wedding Dates (Ep 3, Pt 1) \| The Unsleeping Cit |
| 2019-08-13 | 48m    | dropout         | [guSpRAI3RyY](https://youtu.be/guSpRAI3RyY) | Our D&D Crew Crashes a Pigeon Wedding \| The Unsleeping City           |
| 2019-09-03 | 57m    | dimension20show | [JscoTxAyOKM](https://youtu.be/JscoTxAyOKM) | A Pixie Wedding (Unsleeping City #5 - Part 1)                          |
| 2019-09-10 | 51m    | dimension20show | [vNpHE6rTz_s](https://youtu.be/vNpHE6rTz_s) | Looking for Lazarus (Unsleeping City #5 - Part 2)                      |
| 2019-09-27 | 64m    | dimension20show | [VPmwamOA7dg](https://youtu.be/VPmwamOA7dg) | Recapping Fantasy High with Emily, Murph, and Michael                  |
| 2019-09-28 | 82m    | dimension20show | [5_zHhugm_28](https://youtu.be/5_zHhugm_28) | Recapping Fantasy High with Rick and Lou                               |
| 2019-10-04 | 77m    | dimension20show | [oqvXsPDhIsY](https://youtu.be/oqvXsPDhIsY) | Recapping Fantasy High with Ally and Zac                               |
| 2019-10-05 | 81m    | dimension20show | [2MIPr_Biw8U](https://youtu.be/2MIPr_Biw8U) | Recapping Fantasy High with Siobhan and Lou                            |
| 2019-11-02 | 24m    | dropout         | [V-6m0jW0X9E](https://youtu.be/V-6m0jW0X9E) | The Sound Impression Challenge \| Game Changer [Full Episode]          |
| 2019-11-14 | 23m    | dimension20show | [VuxPLNb4eA4](https://youtu.be/VuxPLNb4eA4) | How To Prep For DMing a Campaign Session (Adventuring Academy: Office  |
| 2019-11-20 | 20m    | dimension20show | [Pbx-CSwU6rI](https://youtu.be/Pbx-CSwU6rI) | How to Build Compelling Characters                                     |
| 2019-12-04 | 30m    | dimension20show | [7NyGLheozCE](https://youtu.be/7NyGLheozCE) | How To Plan For Encounters                                             |
| 2019-12-18 | 33m    | dimension20show | [GC1Fwjb0mvM](https://youtu.be/GC1Fwjb0mvM) | How To Bring the Party Together (Adventuring Academy: Office Hours)    |
| 2020-03-21 | 25m    | dropout         | [Oc4yXge1T-Y](https://youtu.be/Oc4yXge1T-Y) | Murder Mystery Game Show \| Game Changer [Full Episode]                |
| 2020-11-27 | 136m   | dimension20show | [GRjDgEXTrB0](https://youtu.be/GRjDgEXTrB0) | Faeries and Fathers (Ep. 13) \| The Unsleeping City                    |
| 2022-06-08 | 34m    | dropout         | [xzhhbvUIWEs](https://youtu.be/xzhhbvUIWEs) | Dirty Laundry Ep. 1 [Full Episode] - Sam Reich, Katie Marovitch, Rapha |
| 2023-02-01 | 41m    | dropout         | [7MbEyGRooBU](https://youtu.be/7MbEyGRooBU) | Dirty Laundry Full Episode [Vic Michaelis, Raphael Chestang, Ryan Crea |
| 2024-02-07 | 18m    | dropout         | [l5UW76dMdbE](https://youtu.be/l5UW76dMdbE) | An Interview with a Very Popular European Popstar [Very Important Peop |
| 2024-10-30 | 41m    | dropout         | [vYj9Wso2Tbc](https://youtu.be/vYj9Wso2Tbc) | Can Chefs Make an Entire Meal Out of Butter? \| Gastronauts [Full Epis |
| 2024-12-11 | 21m    | dropout         | [TTuf6dseaXU](https://youtu.be/TTuf6dseaXU) | An Interview with a Very Important Motivational Speaker [Very Importan |
| 2024-12-18 | 10m    | dropout         | [5oNfsCyWo_E](https://youtu.be/5oNfsCyWo_E) | Chris Grace Enters the Dropout-verse \| Dropout Presents: Chris Grace: |
| 2025-02-26 | 20m    | dropout         | [bB1ESv06hkI](https://youtu.be/bB1ESv06hkI) | Getting a Tattoo on Friday the 13th \| Dropout Presents: From Ally to  |
| 2025-05-07 | 30m    | dropout         | [NbgUrPTnaIg](https://youtu.be/NbgUrPTnaIg) | The Roll of a Lifetime \| Dimension 20 Live (Bonus Content)            |
| 2025-05-07 | 11m    | dimension20show | [5NJn2UAbUDM](https://youtu.be/5NJn2UAbUDM) | Behind the Scenes of Dimension 20 Live: Gauntlet at the Garden         |
| 2025-05-14 | 31m    | dropout         | [sKTlEDAuwfY](https://youtu.be/sKTlEDAuwfY) | Comedians Play Wavelength for the First Time \| Parlor Room [Full Epis |
| 2025-05-28 | 22m    | dropout         | [0-4JV7yHgmU](https://youtu.be/0-4JV7yHgmU) | An Interview with a Very Important Almost Billionaire [Very Important  |
| 2025-10-22 | 42m    | dropout         | [0q6VjWbFsik](https://youtu.be/0q6VjWbFsik) | Comedians Meet Voice Acting Royalty \| Crowd Control [Full Episode]    |
| 2026-04-15 | 25m    | dropout         | [fUdDXJw5wok](https://youtu.be/fUdDXJw5wok) | An Interview With a Very Important Bachelor \| Very Important People [ |
| 2026-05-14 | 50m    | dropout         | [zzZ7LEu43j4](https://youtu.be/zzZ7LEu43j4) | We Play The NEW Game Changer: Home Edition Game \| Parlor Room S2      |
| 2026-06-17 | 25m    | dropout         | [VRPaXiznKB8](https://youtu.be/VRPaXiznKB8) | An Interview With a Very Important Lounge Singer \| Very Important Peo |

### B. Live events, no Dropout counterpart (18)

| published  | length | channel         | video                                       | title                                                                  |
| ---------- | ------ | --------------- | ------------------------------------------- | ---------------------------------------------------------------------- |
| 2016-10-27 | 25m    | dropout         | [U7cgeWvLtfQ](https://youtu.be/U7cgeWvLtfQ) | Sports Drink or Body Wash LIVE!                                        |
| 2016-10-31 | 24m    | dropout         | [OZjNl7sPcfQ](https://youtu.be/OZjNl7sPcfQ) | Smoothie of Death (Halloween Edition) LIVE!                            |
| 2016-11-07 | 13m    | dropout         | [98Yx56N0qBA](https://youtu.be/98Yx56N0qBA) | Katie and Her Boyfriend Talk Relationship Advice LIVE! (Part 2)        |
| 2016-11-15 | 18m    | dropout         | [tuPXZ3drlts](https://youtu.be/tuPXZ3drlts) | Jake & Amir: Who Knows Who Better? LIVE!                               |
| 2016-11-17 | 18m    | dropout         | [tZ5sCQYfvZ4](https://youtu.be/tZ5sCQYfvZ4) | Guess Who's 57 LIVE!                                                   |
| 2016-11-30 | 22m    | dropout         | [FED_k2eMwXg](https://youtu.be/FED_k2eMwXg) | What Is This Fried Thing? LIVE!                                        |
| 2016-12-08 | 24m    | dropout         | [WGq4vGQPUig](https://youtu.be/WGq4vGQPUig) | Adam Conover of Adam Ruins Everything Q&A LIVE!                        |
| 2016-12-12 | 14m    | dropout         | [oaGOZF468OY](https://youtu.be/oaGOZF468OY) | Help Us Fire Zac Oyama LIVE!                                           |
| 2016-12-14 | 11m    | dropout         | [_IICxq1xrcA](https://youtu.be/_IICxq1xrcA) | Condiment Russian Roulette LIVE!                                       |
| 2016-12-19 | 13m    | dropout         | [nPvbug_lvyo](https://youtu.be/nPvbug_lvyo) | Roomba Death Match LIVE!                                               |
| 2016-12-24 | 41m    | dropout         | [TCgKB-Zozs8](https://youtu.be/TCgKB-Zozs8) | Holly Jolly Logs Feel Holly Jolly Pain LIVE!                           |
| 2016-12-28 | 18m    | dropout         | [L8komQpC14M](https://youtu.be/L8komQpC14M) | This News Anchor Reads Your Comments As News LIVE!                     |
| 2016-12-30 | 24m    | dropout         | [9MCzn7BByBo](https://youtu.be/9MCzn7BByBo) | This Cowboy Makes Your Comments Into Country Songs LIVE!               |
| 2017-01-06 | 57m    | dropout         | [1v_2RbUztCg](https://youtu.be/1v_2RbUztCg) | Find Zac (He's Streaming From Somewhere in Los Angeles) LIVE!          |
| 2017-01-13 | 27m    | dropout         | [vtusoIw640U](https://youtu.be/vtusoIw640U) | Total Novice: Aerial Silks LIVE!                                       |
| 2017-01-23 | 22m    | dropout         | [Jz4b8NxiT-I](https://youtu.be/Jz4b8NxiT-I) | Who's Five-Foot-Seven? LIVE!                                           |
| 2020-06-04 | 248m   | dimension20show | [OPN3Fr85n-8](https://youtu.be/OPN3Fr85n-8) | The Dropout/Dimension 20 Bail Fund Live Stream - https://bit.ly/dropou |
| 2020-10-03 | 184m   | dropout         | [-ZNfeRnlue4](https://youtu.be/-ZNfeRnlue4) | Voter Registration Drive LIVE!                                         |

### C. 2019, uncurated, 10min+, no Dropout counterpart (47)

| published  | length | channel         | video                                       | title                                                                  |
| ---------- | ------ | --------------- | ------------------------------------------- | ---------------------------------------------------------------------- |
| 2019-01-21 | 61m    | dropout         | [vExm2YhsS-s](https://youtu.be/vExm2YhsS-s) | Little Shop of Hey Now                                                 |
| 2019-01-26 | 14m    | dropout         | [6B6_BuCN-k8](https://youtu.be/6B6_BuCN-k8) | 20,000 Leagues From the Right Answer                                   |
| 2019-01-28 | 31m    | dropout         | [S3uwnSDJ3nA](https://youtu.be/S3uwnSDJ3nA) | Lizzy Yarnold (with Kelsey Djupstrom)                                  |
| 2019-02-02 | 14m    | dropout         | [RnID6enEYXA](https://youtu.be/RnID6enEYXA) | The Miracle of Godzilla Birth                                          |
| 2019-02-09 | 12m    | dropout         | [XmaqkDlKWCI](https://youtu.be/XmaqkDlKWCI) | Who Cares About Heart?                                                 |
| 2019-02-14 | 21m    | dropout         | [wzQDifGMnPE](https://youtu.be/wzQDifGMnPE) | Leeches, Exes, and Loans [Full Episode]                                |
| 2019-02-16 | 11m    | dropout         | [rFMIxhUbMQs](https://youtu.be/rFMIxhUbMQs) | Just Pretend It's a Laser                                              |
| 2019-02-23 | 12m    | dropout         | [Jxws-5cpzn0](https://youtu.be/Jxws-5cpzn0) | Safari on Tatooine                                                     |
| 2019-03-08 | 10m    | dropout         | [5gh71vNiWLs](https://youtu.be/5gh71vNiWLs) | Women Almost Having It All! (Compilation)                              |
| 2019-03-09 | 22m    | dropout         | [vvE7Yuk5lP8](https://youtu.be/vvE7Yuk5lP8) | Artists Draw Rejected Toys                                             |
| 2019-03-16 | 10m    | dropout         | [yArzKJ4oWWw](https://youtu.be/yArzKJ4oWWw) | Blade Runner Is Nerd Homework                                          |
| 2019-03-24 | 10m    | dropout         | [xaabP1SLugE](https://youtu.be/xaabP1SLugE) | This Rapper Is Revolutionizing Ad-Libs                                 |
| 2019-03-30 | 12m    | dropout         | [k_7CidBk4-c](https://youtu.be/k_7CidBk4-c) | Sailor Moon Lost in Translation                                        |
| 2019-04-06 | 12m    | dropout         | [dWiNKgodVrU](https://youtu.be/dWiNKgodVrU) | Kirby the Attorney (Tournament of Champions, Pt 1)                     |
| 2019-04-15 | 11m    | dropout         | [WbH_QVzRgy8](https://youtu.be/WbH_QVzRgy8) | Trooper of the Week [Full Episode]                                     |
| 2019-04-19 | 13m    | dropout         | [3a3r2Wf6AMs](https://youtu.be/3a3r2Wf6AMs) | There Are No Dinosaurs In Alien (Tournament of Champions, Pt 3)        |
| 2019-04-20 | 24m    | dropout         | [ck1JW-_G2Yc](https://youtu.be/ck1JW-_G2Yc) | The Game Where Two People Are Secretly Stoned \| Paranoia              |
| 2019-05-05 | 13m    | dropout         | [iae-iYioLhM](https://youtu.be/iae-iYioLhM) | Heart Nouveau                                                          |
| 2019-05-17 | 28m    | dropout         | [s5_JVmcDK5c](https://youtu.be/s5_JVmcDK5c) | Way Too Stoned on Parents' Weekend                                     |
| 2019-05-24 | 20m    | dropout         | [a0nBDwBFPI4](https://youtu.be/a0nBDwBFPI4) | High In Another Country                                                |
| 2019-05-31 | 23m    | dropout         | [LFB-ZhKAPPw](https://youtu.be/LFB-ZhKAPPw) | A Message From Your Favorite CEOs.                                     |
| 2019-06-01 | 13m    | dropout         | [ZsBCzcGTB_Q](https://youtu.be/ZsBCzcGTB_Q) | Were Clark Kent and Lois Lane Pervs? (Fans vs. Faves Pt. 1)            |
| 2019-06-02 | 10m    | dropout         | [2NLhb31EqJ8](https://youtu.be/2NLhb31EqJ8) | Queen Ship                                                             |
| 2019-06-08 | 13m    | dropout         | [Ii3bvHNWJ20](https://youtu.be/Ii3bvHNWJ20) | What Genie and Abu Have in Common (Fans vs. Faves Pt. 2)               |
| 2019-06-15 | 11m    | dropout         | [pHY8bRPsv6o](https://youtu.be/pHY8bRPsv6o) | I Know Everything About Anime (Fans vs. Faves Pt. 3)                   |
| 2019-06-16 | 10m    | dropout         | [zkszebiJCW8](https://youtu.be/zkszebiJCW8) | Making Boring Holidays Sexy                                            |
| 2019-06-17 | 18m    | dropout         | [MLSsN_kQ_lY](https://youtu.be/MLSsN_kQ_lY) | Praying Mantis Woman \| Kingpin Katie [Full Episode]                   |
| 2019-06-22 | 11m    | dropout         | [a78EBpW4c8Q](https://youtu.be/a78EBpW4c8Q) | Kingdom Hearts Makes Zero Sense (Fans vs. Faves Pt. 4)                 |
| 2019-06-24 | 15m    | dropout         | [cpfwG1Ds_3E](https://youtu.be/cpfwG1Ds_3E) | Katie Gets Dirty \| Kingpin Katie [Full Episode]                       |
| 2019-06-29 | 15m    | dropout         | [eQXc_4SZ__g](https://youtu.be/eQXc_4SZ__g) | High as Hell at Homecoming (GAME)                                      |
| 2019-07-01 | 13m    | dropout         | [zZdk30imQVs](https://youtu.be/zZdk30imQVs) | Katie Hits Rock Bottom \| Kingpin Katie                                |
| 2019-07-06 | 13m    | dropout         | [XmMOFWMJabA](https://youtu.be/XmMOFWMJabA) | Secretly Stoned at Your Job (GAME) \| Paranoia                         |
| 2019-08-10 | 11m    | dropout         | [TK9dRFvm2Fc](https://youtu.be/TK9dRFvm2Fc) | Obi-Wan's Weird Connection to Jon Stewart                              |
| 2019-08-15 | 13m    | dropout         | [SQGlCjzIPCc](https://youtu.be/SQGlCjzIPCc) | Shut Up and Buy This $36 Grilled Cheese                                |
| 2019-08-17 | 12m    | dropout         | [XLVVnzFXKiA](https://youtu.be/XLVVnzFXKiA) | The Game Show of Nerdy Corrections (Harry Potter, Catan and Tetris)    |
| 2019-08-24 | 12m    | dropout         | [P6AaUM_xnUw](https://youtu.be/P6AaUM_xnUw) | The Game Show of Nerdy Corrections (Lord of the Rings, Jurassic Park,  |
| 2019-08-31 | 11m    | dropout         | [HWS5HE26f2s](https://youtu.be/HWS5HE26f2s) | How Much Pokemon Knowledge Do You Have? (ft. Sam Bashor)               |
| 2019-09-13 | 18m    | dropout         | [8DfAEtGhLnc](https://youtu.be/8DfAEtGhLnc) | Fruits vs. Veggies \| Cartoon Hell \| Ep. 3                            |
| 2019-09-14 | 10m    | dropout         | [kmzMsSrpAC0](https://youtu.be/kmzMsSrpAC0) | The Game Show of Nerdy Corrections (Mario, Stranger Things, Stephen Ki |
| 2019-10-07 | 12m    | dropout         | [zfY0U7wM03A](https://youtu.be/zfY0U7wM03A) | Mighty Morphin’ Party Ranger                                           |
| 2019-11-16 | 22m    | dropout         | [7TBCkgJBt4I](https://youtu.be/7TBCkgJBt4I) | Secretly Stoned With Your Grandma \| Paranoia [Full Episode]           |
| 2019-11-30 | 14m    | dropout         | [zYQNLmqahWo](https://youtu.be/zYQNLmqahWo) | History''s Most Doomed Expeditions [Full Episode]                      |
| 2019-12-07 | 20m    | dropout         | [IJKR0O3BfOs](https://youtu.be/IJKR0O3BfOs) | Political Paranoia [Full Episode]                                      |
| 2019-12-08 | 49m    | dropout         | [rvoJXBqLILM](https://youtu.be/rvoJXBqLILM) | Troopers (Full Web Series)                                             |
| 2019-12-22 | 64m    | dropout         | [t-O8hYbieZE](https://youtu.be/t-O8hYbieZE) | The Best CollegeHumor Sketches Ever (of 2019)                          |
| 2019-12-28 | 19m    | dropout         | [dTs1Q2VYYSU](https://youtu.be/dTs1Q2VYYSU) | High for the Holidays [Full Episode]                                   |
| 2019-12-31 | 10m    | dimension20show | [h92NSa3I9rg](https://youtu.be/h92NSa3I9rg) | Start This Video at 11:50PM and You Can Celebrate New Years In the Uns |

## Not investigated

- The 8,604 YouTube videos under five minutes with no Dropout counterpart.
- The false-positive rate below 10 minutes, in either direction.
- Whether the 2019 spike has a single structural cause.
- Dropout runtimes, which would allow a length comparison. The episode pages do
  not publish them: no JSON-LD, no `og:video:duration`, no `MM:SS` or ISO
  duration anywhere in 128KB of HTML, and nothing time-related in the
  `window.Page.PROPERTIES` object the scraper already reads.
