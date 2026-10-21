# Proposal: adopt Dropout's release date where it is earlier

**Status: applied 2026-10-21, with the changes described under "The 2026-10-21
batch" in `dates.md`.** The tables below are the proposal as written.

`published:` in the curation is our best understanding of each video's original
release, and it is what chronology uses. `deno task verify-dates` compares it
with the release date scraped from watch.dropout.tv. This is a plan for the
cases where Dropout's date is the earlier one, which mostly means our date came
from a later YouTube upload.

## The numbers

`verify-dates` reported 543 mismatches (run 2026-10-20).

- **Dropout is later in 308.** Our date is already the earlier one, so this
  proposal leaves them alone. By show: Dimension 20 147, Fatal Decision 49,
  Breaking News 44, Adventuring Academy 23, Game Changer 16, Dirty Laundry 13,
  Erotic Book Club 7, Um, Actually 5, Very Important People 1, Smartypants 1,
  Make Some Noise 1, Toonout 1.
- **Dropout is earlier in 235.** Of those, 186 differ by under a week and 9 by
  more than a month.

Each of these was tested against the entries either side of it in the same
season, using the new dates throughout, since playlist order is file order:

- **209 adopt cleanly.** The new date still sits between its neighbours.
- **13 are animations.** These are placed inside the season they depict, so they
  are out of date order by design, and moving the date changes nothing about
  where they sit.
- **13 need a decision.** Adopting the date alone would put an entry before the
  one in front of it, or after the one behind it.

## Proposal

1. Apply the 209 clean ones and the 13 animations as one reviewed batch, one
   commit, with nothing else in it.
2. Settle the review cases one by one. They are listed below with the neighbour
   each one would cross.
3. Leave every case where Dropout's date is later.

`dates.md` lists entries known to carry the wrong date, including the one where
Dropout itself is wrong (Toonout 14). Those stay as they are whatever this table
says.

## Needs a decision

Four are an episode 1 whose trailer or teaser is dated later than Dropout's
episode 1. The trailer's date is probably the wrong one there, so the fix is
likely both or neither. The others are small gaps that cross a neighbour, plus
two large ones that look like re-upload dates: The Unsleeping City episode 7,
and the Um, Actually Simpsons special.

| Show / season                                  | Entry                                                     | Ours → Dropout                     | Would cross                                                           |
| ---------------------------------------------- | --------------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------- |
| Dimension 20 / Fantasy High (Chapter 1)        | episode: 1. The Beginning Begins                          | 2018-10-09 → **2018-09-26** (13d)  | before `Fantasy High Trailer` (2018-10-02)                            |
| Dimension 20 / The Unsleeping City (Chapter 1) | episode: 7. We Need to Talk About Pete                    | 2020-10-16 → **2019-08-20** (423d) | before `6. The War of Bugs and Rats` (2020-10-09)                     |
| Dimension 20 / A Crown of Candy                | bts: Welcome to Denny's                                   | 2020-05-26 → **2020-05-19** (7d)   | after `7. Escape From the Bulb Creeps` (2020-05-15)                   |
| Dimension 20 / Misfits and Magic (Chapter 1)   | episode: 2. Class Conflict                                | 2021-07-12 → **2021-07-07** (5d)   | after `True Facts About McDonald's Apple Pie` (2021-07-06)            |
| Dimension 20 / A Starstruck Odyssey            | episode: 1. Welcome To The Spacin' Life, Buddy            | 2022-01-25 → **2022-01-12** (13d)  | after `Our Tail Was Not Between Our Legs` (2022-01-11)                |
| Dimension 20 / Coffin Run                      | episode: 1. Down For The Count                            | 2022-06-28 → **2022-06-08** (20d)  | after `All You Need Is Stab` (2022-06-07)                             |
| Um, Actually / Season 3                        | episode: 307. D'oh! Actually: A Special Simpsons Episode  | 2020-04-17 → **2020-02-22** (55d)  | before `306. Zelda, Aquaman, Neopets` (2020-04-03)                    |
| Adventuring Academy / Season 1                 | episode: 105. Being the Mean GM (with Noah Diamond)       | 2019-03-06 → **2019-02-19** (15d)  | before `104. Playing in a Safe Space (with Erika Ishii)` (2019-02-20) |
| Dimension 20 / Fantasy High (Chapter 3)        | bts: The Legendary Rick Perry and the Art of Dimension 20 | 2023-12-21 → **2023-12-20** (1d)   | before `Teenage Rebellion (Theme Song) Music Video` (2024-01-10)      |
| Very Important People / Season 1               | episode: 105. Kepl and Dr. Milk                           | 2024-02-10 → **2024-01-26** (15d)  | before `Marionette Conqui and Zonton de la Doll` (2024-02-02)         |
| Dimension 20 / Misfits and Magic (Chapter 2)   | episode: 11. The Show Goes On                             | 2024-12-05 → **2024-12-04** (1d)   | after `Behind the Scenes: Brennan Lee Mulligan` (2024-09-18)          |
| Game Changer / Season 7                        | bts: Crowd Control                                        | 2025-05-28 → **2025-05-26** (2d)   | after `705. The Drinking Game` (2025-03-17)                           |
| Game Changer / Season 7                        | bts: Why I'm Leaving Dropout (Extended Cut)               | 2025-09-10 → **2025-08-15** (26d)  | before `Samalamadingdong (Brennan's Revenge)` (2025-09-01)            |

## Animations (adopt; placement unaffected)

| Show / season                                  | Entry                                                            | Ours → Dropout          | Days | Dropout slug                                           |
| ---------------------------------------------- | ---------------------------------------------------------------- | ----------------------- | ---- | ------------------------------------------------------ |
| Dimension 20 / Fantasy High (Chapter 1)        | animation: The Price Must Be Paid                                | 2021-11-09 → 2021-11-02 | 7    | `the-price-must-be-paid`                               |
| Dimension 20 / Tiny Heist                      | animation: Rick Diggins Is At Your Service                       | 2021-08-10 → 2021-08-03 | 7    | `rick-diggins-is-at-your-service`                      |
| Dimension 20 / A Crown of Candy                | animation: Where's Your Bulb Now?                                | 2021-12-14 → 2021-12-07 | 7    | `where-s-your-bulb-now`                                |
| Dimension 20 / A Crown of Candy                | animation: Liam Tries to Flirt                                   | 2022-07-12 → 2022-07-05 | 7    | `liam-tries-to-flirt`                                  |
| Dimension 20 / Pirates of Leviathan            | animation: Meet Bob                                              | 2022-01-18 → 2022-01-11 | 7    | `meet-bob`                                             |
| Dimension 20 / The Unsleeping City (Chapter 2) | animation: Cody Sells His Soul                                   | 2021-10-12 → 2021-10-05 | 7    | `cody-sells-his-soul`                                  |
| Dimension 20 / The Unsleeping City (Chapter 2) | animation: Casting Silence                                       | 2022-04-05 → 2022-03-29 | 7    | `casting-silence`                                      |
| Dimension 20 / Mice and Murder                 | animation: Do I Have A Fellow Student of the Stars Here As Well? | 2021-09-07 → 2021-08-31 | 7    | `do-i-have-a-fellow-student-of-the-stars-here-as-well` |
| Dimension 20 / Misfits and Magic (Chapter 1)   | animation: A Drink at the Questing Beast                         | 2022-02-22 → 2022-02-15 | 7    | `a-drink-at-the-questing-beast`                        |
| Dimension 20 / Misfits and Magic (Chapter 1)   | animation: Evan Kelmp Blasts a Kid into the Underworld           | 2022-10-11 → 2022-10-04 | 7    | `evan-kelmp-blasts-a-kid-into-the-underworld`          |
| Dimension 20 / A Starstruck Odyssey            | animation: The Magic of Plug                                     | 2022-06-07 → 2022-05-31 | 7    | `the-magic-of-plug`                                    |
| Dimension 20 / A Starstruck Odyssey            | animation: Gunnie Buys a Maple Cake                              | 2022-08-09 → 2022-08-02 | 7    | `gunnie-buys-a-maple-cake`                             |
| Dimension 20 / A Court of Fey and Flowers      | animation: The Lords of the Wing Spill Their Secrets             | 2022-12-27 → 2022-12-20 | 7    | `the-lords-of-the-wing-spill-their-secrets`            |

## Clean (adopt)

| Show / season                                  | Entry                                                                           | Ours → Dropout          | Days | Dropout slug                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------- | ---- | ----------------------------------------------------------------- |
| Dimension 20 / Fantasy High (Chapter 1)        | episode: 2. Clash of the Corn Cuties                                            | 2018-10-16 → 2018-09-26 | 20   | `clash-of-the-corn-cuties`                                        |
| Dimension 20 / Fantasy High (Chapter 2)        | episode: 13. Hellbound                                                          | 2020-02-10 → 2020-02-05 | 5    | `hellbound`                                                       |
| Dimension 20 / Pirates of Leviathan            | episode: 1. A Heaping Helping of Trouble                                        | 2021-11-16 → 2020-09-16 | 426  | `a-heaping-helping-of-trouble`                                    |
| Dimension 20 / The Unsleeping City (Chapter 2) | episode: 1. The Fall of New York City                                           | 2021-10-26 → 2020-11-11 | 349  | `the-fall-of-new-york-city`                                       |
| Dimension 20 / Mice and Murder                 | episode: 1. It Was a Dark and Stormy Night                                      | 2021-08-24 → 2021-04-07 | 139  | `it-was-a-dark-and-stormy-night`                                  |
| Dimension 20 / Misfits and Magic (Chapter 1)   | episode: 1. The Chosen Ones                                                     | 2021-07-27 → 2021-06-30 | 27   | `the-chosen-ones`                                                 |
| Dimension 20 / Misfits and Magic (Chapter 1)   | special: Holiday Special                                                        | 2021-12-17 → 2021-12-15 | 2    | `misfits-magic-holiday-special`                                   |
| Dimension 20 / The Seven                       | episode: 1. Party of Seven                                                      | 2021-09-21 → 2021-08-18 | 34   | `party-of-seven`                                                  |
| Dimension 20 / The Seven                       | bts: I've Never Been in a Campaign That Is Hornier                              | 2021-09-03 → 2021-08-19 | 15   | `i-ve-never-been-in-a-campaign-that-is-hornier`                   |
| Dimension 20 / The Seven                       | bts: Schrödinger's Double Slit                                                  | 2021-09-08 → 2021-09-02 | 6    | `schrodinger-s-double-slit`                                       |
| Dimension 20 / The Seven                       | bts: Party Fowl                                                                 | 2021-09-10 → 2021-09-09 | 1    | `party-fowl`                                                      |
| Dimension 20 / Shriek Week                     | episode: 1. The Club Fair                                                       | 2022-03-08 → 2021-11-10 | 118  | `the-club-fair`                                                   |
| Dimension 20 / A Court of Fey and Flowers      | episode: 1. A Bloom to Remember                                                 | 2022-08-16 → 2022-08-03 | 13   | `a-bloom-to-remember`                                             |
| Dimension 20 / Neverafter                      | episode: 3. No Place For a Prince or Princess                                   | 2022-12-15 → 2022-12-14 | 1    | `no-place-for-a-prince-or-princess`                               |
| Dimension 20 / Burrow's End                    | episode: 6. Reactor Charlie                                                     | 2023-11-09 → 2023-11-08 | 1    | `reactor-charlie`                                                 |
| Dimension 20 / Burrow's End                    | bts: The Burrito Was Achieved                                                   | 2023-11-10 → 2023-11-09 | 1    | `the-burrito-was-achieved`                                        |
| Dimension 20 / Burrow's End                    | episode: 7. The First Stoats                                                    | 2023-11-16 → 2023-11-15 | 1    | `the-first-stoats`                                                |
| Dimension 20 / Burrow's End                    | bts: If I Had a Nickel                                                          | 2023-11-17 → 2023-11-16 | 1    | `if-i-had-a-nickel`                                               |
| Dimension 20 / Burrow's End                    | episode: 8. Five                                                                | 2023-11-23 → 2023-11-22 | 1    | `five`                                                            |
| Dimension 20 / Burrow's End                    | bts: Everything, Every Stoat, All at Once                                       | 2023-11-24 → 2023-11-23 | 1    | `everything-every-stoat-all-at-once`                              |
| Dimension 20 / Burrow's End                    | episode: 9. Human                                                               | 2023-11-30 → 2023-11-29 | 1    | `human`                                                           |
| Dimension 20 / Burrow's End                    | bts: Hey Girl Hey                                                               | 2023-12-01 → 2023-11-30 | 1    | `hey-girl-hey`                                                    |
| Dimension 20 / Burrow's End                    | episode: 10. Evolution and Revolution                                           | 2023-12-07 → 2023-12-06 | 1    | `evolution-and-revolution`                                        |
| Dimension 20 / Burrow's End                    | bts: Welcome to the Honk Honk Club                                              | 2023-12-08 → 2023-12-07 | 1    | `welcome-to-the-honk-honk-club`                                   |
| Game Changer / Season 3                        | episode: 303. ChangerCon                                                        | 2020-10-30 → 2020-10-16 | 14   | `changercon`                                                      |
| Game Changer / Season 3                        | episode: 307. Jeopardy!                                                         | 2020-12-12 → 2020-12-11 | 1    | `jeopardy`                                                        |
| Game Changer / Season 3                        | episode: 308. Secret Samta                                                      | 2020-12-26 → 2020-12-25 | 1    | `secret-samta`                                                    |
| Game Changer / Season 3                        | episode: 311. Three For the Price of One (A Sponsored Episode 3)                | 2021-02-20 → 2021-02-19 | 1    | `three-for-the-price-of-one`                                      |
| Game Changer / Season 3                        | episode: 314. Tome of Terror                                                    | 2021-04-03 → 2021-04-02 | 1    | `tome-of-terror`                                                  |
| Game Changer / Season 4                        | episode: 401. Sam Says                                                          | 2022-10-19 → 2021-11-01 | 352  | `sam-says`                                                        |
| Game Changer / Season 4                        | episode: 402. Like My Coffee                                                    | 2023-05-10 → 2021-11-15 | 541  | `like-my-coffee`                                                  |
| Game Changer / Season 5                        | bts: Sam Says 2                                                                 | 2022-11-22 → 2022-11-21 | 1    | `behind-the-scenes-of-sam-says-2`                                 |
| Game Changer / Season 5                        | bts: Karaoke Night                                                              | 2022-12-06 → 2022-12-05 | 1    | `behind-the-scenes-of-karaoke-night`                              |
| Game Changer / Season 5                        | bts: Like My Coffee 2                                                           | 2022-12-20 → 2022-12-19 | 1    | `behind-the-scenes-of-like-my-coffee-2`                           |
| Game Changer / Season 5                        | bts: Name a Number                                                              | 2023-01-03 → 2023-01-02 | 1    | `behind-the-scenes-of-name-a-number`                              |
| Game Changer / Season 5                        | bts: A Game Most Changed                                                        | 2023-01-17 → 2023-01-16 | 1    | `behind-the-scenes-of-a-game-most-changed`                        |
| Game Changer / Season 5                        | bts: As A Cucumber                                                              | 2023-01-31 → 2023-01-30 | 1    | `behind-the-scenes-of-as-a-cucumber`                              |
| Game Changer / Season 5                        | bts: The Bachelor                                                               | 2023-02-28 → 2023-02-27 | 1    | `behind-the-scenes-of-the-bachelor`                               |
| Game Changer / Season 6                        | bts: Deja Vu                                                                    | 2024-04-30 → 2024-04-29 | 1    | `behind-the-scenes-of-deja-vu`                                    |
| Make Some Noise / Season 1                     | episode: 108. Brennan's Wario, Wennan Wee Wulligan                              | 2022-09-21 → 2022-09-19 | 2    | `brennan-s-wario-wennan-wee-wulligan`                             |
| Make Some Noise / Season 2                     | episode: 212. How Not to Survive a Bear Encounter                               | 2023-11-07 → 2023-11-06 | 1    | `how-not-to-survive-a-bear-encounter`                             |
| Make Some Noise / Season 2                     | episode: 213. A Love Is Blind Contestant Is Secretly a Horse                    | 2023-11-21 → 2023-11-20 | 1    | `a-love-is-blind-contestant-is-secretly-a-horse`                  |
| Make Some Noise / Season 2                     | episode: 214. "Yes And" By Ed Sheeran and Kelly Clarkson                        | 2023-12-05 → 2023-12-04 | 1    | `yes-and-by-ed-sheeran-and-kelly-clarkson`                        |
| Make Some Noise / Season 2                     | episode: 215. Two Grizzled Fishermen Compare Scar Stories                       | 2023-12-19 → 2023-12-18 | 1    | `two-grizzled-fishermen-compare-scar-stories`                     |
| Make Some Noise / Season 2                     | episode: 216. Cut for Time                                                      | 2024-01-16 → 2024-01-15 | 1    | `make-some-noise-season-2-cut-for-time`                           |
| Play It By Ear / Season 1                      | episode: 105. Space Rocks!                                                      | 2022-11-09 → 2022-11-08 | 1    | `space-rocks`                                                     |
| Um, Actually / Season 3                        | episode: 303. Um, Academy! A Special Cinematic Episode                          | 2020-02-21 → 2020-02-15 | 6    | `um-academy-a-special-cinematic-episode`                          |
| Um, Actually / Season 3                        | episode: 309. Indiana Jones, Futurama, Starship Troopers                        | 2020-05-18 → 2020-05-16 | 2    | `indiana-jones-futurama-starship-troopers`                        |
| Um, Actually / Season 3                        | episode: 312. Monopoly, My Little Pony, The Witcher                             | 2020-07-10 → 2020-06-27 | 13   | `monopoly-my-little-pony-the-witcher`                             |
| Um, Actually / Season 4                        | episode: 401. Muppets & Puppets                                                 | 2020-08-23 → 2020-08-14 | 9    | `muppets-puppets`                                                 |
| Um, Actually / Season 4                        | episode: 405. Dungeons & Dragons All-Stars                                      | 2020-10-11 → 2020-10-09 | 2    | `dungeons-dragons-all-stars`                                      |
| Um, Actually / Season 4                        | episode: 406. Stephen King                                                      | 2020-10-25 → 2020-10-23 | 2    | `stephen-king`                                                    |
| Um, Actually / Season 4                        | episode: 408. Pokémon                                                           | 2020-11-28 → 2020-11-20 | 8    | `pokemon`                                                         |
| Um, Actually / Season 4                        | episode: 410. Magic: The Gathering                                              | 2020-12-19 → 2020-12-18 | 1    | `magic-the-gathering`                                             |
| Um, Actually / Season 5                        | episode: 503. Nicktoons                                                         | 2021-03-13 → 2021-03-12 | 1    | `nicktoons`                                                       |
| Um, Actually / Season 5                        | episode: 507. Dystopias                                                         | 2021-05-08 → 2021-05-07 | 1    | `dystopias`                                                       |
| Um, Actually / Season 5                        | episode: 510. Demiliches, Isengard, I Am Legend                                 | 2021-06-19 → 2021-06-18 | 1    | `demiliches-isengard-i-am-legend`                                 |
| Um, Actually / Season 5                        | episode: 511. Battle of the Mods                                                | 2021-07-03 → 2021-07-02 | 1    | `battle-of-the-mods`                                              |
| Dirty Laundry / Season 2                       | episode: 201. Who Committed Libel Against Reese Witherspoon?                    | 2022-12-07 → 2022-12-06 | 1    | `who-committed-libel-against-reese-witherspoon`                   |
| Dirty Laundry / Season 2                       | episode: 202. Who Used to Sell Drugs?                                           | 2022-12-21 → 2022-12-20 | 1    | `who-used-to-sell-drugs`                                          |
| Dirty Laundry / Season 2                       | episode: 203. Whose Family Van Got Stolen and Blown Up?                         | 2023-01-04 → 2023-01-03 | 1    | `whose-family-van-got-stolen-and-blown-up`                        |
| Dirty Laundry / Season 2                       | episode: 204. Who Had Covid-Compliant Sex?                                      | 2023-01-18 → 2023-01-17 | 1    | `who-had-covid-compliant-sex`                                     |
| Dirty Laundry / Season 2                       | episode: 205. Who Was Almost Institutionalized for Claiming to See Angels?      | 2023-02-01 → 2023-01-31 | 1    | `who-was-almost-institutionalized-for-claiming-to-see-angels`     |
| Dirty Laundry / Season 2                       | episode: 206. Who Threw a Solo Wedding for Themselves?                          | 2023-02-15 → 2023-02-14 | 1    | `who-threw-a-solo-wedding-for-themselves`                         |
| Dirty Laundry / Season 2                       | episode: 207. Who Got Arrested in the Middle of Their English Class?            | 2023-03-01 → 2023-02-28 | 1    | `who-got-arrested-in-the-middle-of-their-english-class`           |
| Dirty Laundry / Season 3                       | episode: 305. Who Watched a Woman Pump Breast Milk While Snorting Cocaine?      | 2023-11-08 → 2023-11-07 | 1    | `who-watched-a-woman-pump-breast-milk-while-snorting-cocaine`     |
| Dirty Laundry / Season 3                       | episode: 306. Who Was Found Naked in a Hallway by a Drug Dealer?                | 2023-11-22 → 2023-11-21 | 1    | `who-was-found-naked-in-a-hallway-by-a-drug-dealer`               |
| Dirty Laundry / Season 3                       | episode: 307. Who Is an Honorary Member at a Sex Club?                          | 2023-12-06 → 2023-12-05 | 1    | `who-is-an-honorary-member-at-a-sex-club`                         |
| Dirty Laundry / Season 3                       | episode: 308. Who Went to a War Criminal's Birthday?                            | 2023-12-20 → 2023-12-19 | 1    | `who-went-to-a-war-criminal-s-birthday`                           |
| Dirty Laundry / Season 3                       | episode: 309. Who Blamed Their Sex Noises on a Videogame?                       | 2024-01-03 → 2024-01-02 | 1    | `who-blamed-their-sex-noises-on-a-videogame`                      |
| Dirty Laundry / Season 3                       | episode: 310. Who Bugged Someone's Car to Catch Them Cheating?                  | 2024-01-17 → 2024-01-16 | 1    | `who-bugged-someone-s-car-to-catch-them-cheating`                 |
| Dirty Laundry / Season 3                       | episode: 311. Who Sent a Mean Email to a Famous Comedian as a Middle Schooler?  | 2024-01-31 → 2024-01-30 | 1    | `who-sent-a-mean-email-to-a-famous-comedian-as-a-middle-schooler` |
| Dirty Laundry / Season 3                       | episode: 312. Who Has an Active Warrant Out For Their Arrest?                   | 2024-02-14 → 2024-02-13 | 1    | `who-has-an-active-warrant-out-for-their-arrest`                  |
| Adventuring Academy / Season 4                 | episode: 403. The Braid of Character, Plot, and World (with Connie Chang)       | 2022-11-16 → 2022-11-15 | 1    | `the-braid-of-character-plot-and-world-with-connie-chang`         |
| Adventuring Academy / Season 4                 | episode: 404. The Mythological Meets the Logistical (with Matthew Mercer)       | 2022-12-02 → 2022-11-29 | 3    | `the-mythological-meets-the-logistical-with-matthew-mercer`       |
| Adventuring Academy / Season 4                 | episode: 405. The New Mr. Peanut (with Lou Wilson)                              | 2022-12-14 → 2022-12-13 | 1    | `the-new-mr-peanut`                                               |
| Adventuring Academy / Season 4                 | episode: 406. Sneak A-Snack (with Sam de Leve)                                  | 2023-02-08 → 2023-02-07 | 1    | `sneak-a-snack-with-sam-de-leve`                                  |
| Adventuring Academy / Season 4                 | episode: 407. Blight, Plants, Birds, and Almonds (with Aabria Iyengar)          | 2023-02-22 → 2023-02-21 | 1    | `blight-plants-birds-and-almonds-with-aabria-iyengar`             |
| Adventuring Academy / Season 4                 | episode: 408. Studying and Training (with Johnny Stanton)                       | 2023-03-09 → 2023-03-07 | 2    | `studying-and-training-with-johnny-stanton`                       |
| Breaking News / Season 5                       | episode: 509. True Facts About Grant Anthony O'Brien (Part 2)                   | 2021-12-15 → 2021-12-10 | 5    | `true-facts-about-grant-anthony-o-brien-part-2`                   |
| Breaking News / Season 6                       | episode: 612. No News Party                                                     | 2023-11-14 → 2023-11-13 | 1    | `no-news-party`                                                   |
| Breaking News / Season 6                       | episode: 613. Make Katie Laugh                                                  | 2023-11-28 → 2023-11-27 | 1    | `make-katie-laugh`                                                |
| Breaking News / Season 6                       | episode: 614. The Wealthiest Man of 1906 Returns                                | 2023-12-12 → 2023-12-11 | 1    | `the-wealthiest-man-of-1906-returns`                              |
| Breaking News / Season 6                       | episode: 615. Puff, Puff, Pass                                                  | 2024-01-03 → 2023-12-25 | 9    | `puff-puff-pass`                                                  |
| Breaking News / Season 6                       | episode: 616. True Facts About Grant Anthony O'Brien (Part 3)                   | 2024-01-09 → 2024-01-08 | 1    | `true-facts-about-grant-anthony-o-brien-part-3`                   |
| Breaking News / Season 6                       | episode: 617. I Want to Play a Game                                             | 2024-01-23 → 2024-01-22 | 1    | `i-want-to-play-a-game`                                           |
| Dimension 20 / Fantasy High (Chapter 3)        | episode: 1. Summer Scaries                                                      | 2024-01-11 → 2024-01-10 | 1    | `summer-scaries`                                                  |
| Dimension 20 / Fantasy High (Chapter 3)        | bts: Yaaath Queen                                                               | 2024-01-12 → 2024-01-11 | 1    | `yaaath-queen`                                                    |
| Dimension 20 / Fantasy High (Chapter 3)        | episode: 2. Summer Breakdown                                                    | 2024-01-18 → 2024-01-17 | 1    | `summer-breakdown`                                                |
| Dimension 20 / Fantasy High (Chapter 3)        | bts: Fs Get Defgrees                                                            | 2024-01-19 → 2024-01-18 | 1    | `fs-get-defgrees`                                                 |
| Dimension 20 / Fantasy High (Chapter 3)        | episode: 3. Not All Who Wanda Are Lost                                          | 2024-01-25 → 2024-01-24 | 1    | `not-all-who-wanda-are-lost`                                      |
| Dimension 20 / Fantasy High (Chapter 3)        | bts: I Wanda'd In                                                               | 2024-01-26 → 2024-01-25 | 1    | `i-wanda-d-in`                                                    |
| Dimension 20 / Fantasy High (Chapter 3)        | episode: 4. Under Pressure                                                      | 2024-02-01 → 2024-01-31 | 1    | `under-pressure`                                                  |
| Dimension 20 / Fantasy High (Chapter 3)        | bts: A Sea of Effluvia                                                          | 2024-02-02 → 2024-02-01 | 1    | `a-sea-of-effluvia`                                               |
| Dimension 20 / Fantasy High (Chapter 3)        | episode: 5. Mall Madness                                                        | 2024-02-08 → 2024-02-07 | 1    | `mall-madness`                                                    |
| Dimension 20 / Fantasy High (Chapter 3)        | bts: Can I Offer You a Nice Shrimp in This Trying Time?                         | 2024-02-09 → 2024-02-08 | 1    | `can-i-offer-you-a-nice-shrimp-in-this-trying-time`               |
| Dimension 20 / Fantasy High (Chapter 3)        | episode: 6. Party Politics                                                      | 2024-02-15 → 2024-02-14 | 1    | `party-politics`                                                  |
| Dimension 20 / Fantasy High (Chapter 3)        | bts: You Are the Chosen None                                                    | 2024-02-16 → 2024-02-15 | 1    | `you-are-the-chosen-none`                                         |
| Dimension 20 / Fantasy High (Chapter 3)        | episode: 7. Stress Tested                                                       | 2024-02-22 → 2024-02-21 | 1    | `stress-tested`                                                   |
| Dimension 20 / Fantasy High (Chapter 3)        | bts: A Negroni and a Bowl of Spinach                                            | 2024-02-23 → 2024-02-22 | 1    | `a-negroni-and-a-bowl-of-spinach`                                 |
| Dimension 20 / Fantasy High (Chapter 3)        | episode: 8. Fracas at the Frostyfaire Folk Festival                             | 2024-02-29 → 2024-02-28 | 1    | `fracas-at-the-frostyfaire-folk-festival`                         |
| Dimension 20 / Fantasy High (Chapter 3)        | bts: I See Your Butt Plug and I Raise You a Fist                                | 2024-03-01 → 2024-02-29 | 1    | `i-see-your-butt-plug-and-i-raise-you-a-fist`                     |
| Dimension 20 / Fantasy High (Chapter 3)        | episode: 9. Vulture Clash                                                       | 2024-03-07 → 2024-03-06 | 1    | `vulture-clash`                                                   |
| Dimension 20 / Fantasy High (Chapter 3)        | bts: Emo People Meet at Panera                                                  | 2024-03-08 → 2024-03-07 | 1    | `emo-people-meet-at-panera`                                       |
| Um, Actually / Season 9                        | episode: 901. Curse of Strahd, The Holocron, Blaseball                          | 2024-02-28 → 2024-02-27 | 1    | `curse-of-strahd-the-holocron-blaseball`                          |
| Very Important People / Season 1               | episode: 102. Denzel                                                            | 2023-12-30 → 2023-12-29 | 1    | `denzel`                                                          |
| Very Important People / Season 1               | episode: 103. Vic's Ex Step-Grandmother                                         | 2024-01-13 → 2024-01-12 | 1    | `vic-s-ex-step-grandmother`                                       |
| Very Important People / Season 1               | bts: Vic's Ex Step-Grandmother                                                  | 2024-01-20 → 2024-01-19 | 1    | `last-looks-vic-s-ex-step-grandmother`                            |
| Very Important People / Season 1               | episode: 104. Marionette Conqui and Zonton de la Doll                           | 2024-01-27 → 2024-01-26 | 1    | `marionette-conqui-and-zonton-de-la-doll`                         |
| Very Important People / Season 1               | bts: Kepl and Dr. Milk                                                          | 2024-02-16 → 2024-02-02 | 14   | `last-looks-kepl-and-dr-milk`                                     |
| Very Important People / Season 1               | episode: 106. Tommy Shriggly                                                    | 2024-02-24 → 2024-02-23 | 1    | `tommy-shriggly`                                                  |
| Very Important People / Season 1               | episode: 107. Professor Avery Goodman                                           | 2024-03-09 → 2024-03-08 | 1    | `professor-avery-goodman`                                         |
| Breaking News / Season 7                       | episode: 707. Sam Reich Launches Burning Sam                                    | 2024-06-26 → 2024-06-25 | 1    | `sam-reich-launches-burning-sam`                                  |
| Smartypants / Season 1                         | episode: 103. Swing Music, Emails, The Moon                                     | 2024-05-24 → 2024-05-23 | 1    | `swing-music-emails-the-moon`                                     |
| Thousandaires / Season 1                       | episode: 103. In This House We Love Mushrooms and Dumpers                       | 2024-06-29 → 2024-06-28 | 1    | `in-this-house-we-love-mushrooms-and-dumpers`                     |
| Dropout Presents / Season 1                    | trailer: Get Your Act Together with Courtney Pauroso                            | 2024-10-07 → 2024-10-04 | 3    | `get-your-act-together-with-courtney-pauroso`                     |
| Dropout Presents / Season 1                    | episode: From Ally to Zacky                                                     | 2024-11-16 → 2024-11-15 | 1    | `from-ally-to-zacky`                                              |
| Dropout Presents / Season 1                    | episode: The Big Team                                                           | 2024-12-17 → 2024-12-16 | 1    | `the-big-team`                                                    |
| Dropout Presents / Season 2                    | episode: Demi Adejuyigbe: Is Going to Do One (1) Backflip                       | 2025-11-20 → 2025-11-19 | 1    | `demi-adejuyigbe-is-going-to-do-one-1-backflip`                   |
| Dropout Presents / Season 2                    | episode: Aparna Nancherla: Hopeful Potato                                       | 2025-12-16 → 2025-12-15 | 1    | `aparna-nancherla-hopeful-potato`                                 |
| Dropout Presents / Season 2                    | episode: Mark Vigeant: The Best Man Show                                        | 2026-02-26 → 2026-02-25 | 1    | `mark-vigeant-the-best-man-show`                                  |
| Make Some Noise / Season 3                     | episode: 307. A Bear Who Just Hibernated Through Like 250 Commitments           | 2024-09-17 → 2024-09-16 | 1    | `a-bear-who-just-hibernated-through-like-250-commitments`         |
| Make Some Noise / Season 3                     | episode: 311. The One Toxic Person in Every Improv 101 Class                    | 2024-11-12 → 2024-11-11 | 1    | `the-one-toxic-person-in-every-improv-101-class`                  |
| Make Some Noise / Season 3                     | episode: 312. A Basketball Player's Far Too Elaborate Free Throw Routine        | 2024-11-26 → 2024-11-25 | 1    | `a-basketball-player-s-far-too-elaborate-free-throw-routine`      |
| Make Some Noise / Season 3                     | episode: 313. An Obituary for Someone Who Definitely Faked Their Own Death      | 2024-12-10 → 2024-12-09 | 1    | `an-obituary-for-someone-who-definitely-faked-their-own-death`    |
| Make Some Noise / Season 3                     | episode: 314. Two 'Wife Guys' Try to Out 'Wife Guy' Each Other                  | 2024-12-24 → 2024-12-23 | 1    | `two-wife-guys-try-to-out-wife-guy-each-other`                    |
| Make Some Noise / Season 3                     | episode: 315. This Dream Is Too Messed Up Even for Freddy Krueger               | 2025-01-07 → 2025-01-06 | 1    | `this-dream-is-too-messed-up-even-for-freddy-krueger`             |
| Make Some Noise / Season 3                     | episode: 316. The Black Version of 'Romeo & Juliet'                             | 2025-01-21 → 2025-01-20 | 1    | `the-black-version-of-romeo-juliet`                               |
| Make Some Noise / Season 3                     | episode: 317. A Singing Telegram Serving You for Property Encroachment          | 2025-02-04 → 2025-02-03 | 1    | `a-singing-telegram-serving-you-for-property-encroachment`        |
| Make Some Noise / Season 3                     | episode: 318. A Date That Is Only Red Flags                                     | 2025-02-18 → 2025-02-17 | 1    | `a-date-that-is-only-red-flags`                                   |
| Make Some Noise / Season 3                     | episode: 319. A Takedown of Billionaires Rihanna, Beyoncé, and Oprah            | 2025-03-04 → 2025-03-03 | 1    | `a-takedown-of-billionaires-rihanna-beyonce-and-oprah`            |
| Monét's Slumber Party / Season 1               | trailer: Monét's Slumber Party Trailer                                          | 2024-06-29 → 2024-06-28 | 1    | `monet-s-slumber-party-trailer`                                   |
| Dirty Laundry / Season 4                       | episode: 407. Whose Suitcase Exploded?                                          | 2024-11-06 → 2024-11-05 | 1    | `whose-suitcase-exploded`                                         |
| Dirty Laundry / Season 4                       | episode: 408. Whose Family Punished Them With a Scary Mask?                     | 2024-11-20 → 2024-11-19 | 1    | `whose-family-punished-them-with-a-scary-mask`                    |
| Dirty Laundry / Season 4                       | episode: 409. Who Almost Went to Jail Because of a Forgetful Woman?             | 2024-12-04 → 2024-12-03 | 1    | `who-almost-went-to-jail-because-of-a-forgetful-woman`            |
| Dirty Laundry / Season 4                       | episode: 410. Who Got Arrested and Detained at Disneyland?                      | 2024-12-18 → 2024-12-17 | 1    | `who-got-arrested-and-detained-at-disneyland`                     |
| Dirty Laundry / Season 4                       | episode: 412. Who Almost Killed Harrison Ford?                                  | 2025-01-15 → 2025-01-14 | 1    | `who-almost-killed-harrison-ford`                                 |
| Gastronauts / Season 1                         | episode: 103. I Find That Very A-Peeling                                        | 2024-11-09 → 2024-11-08 | 1    | `i-find-that-very-a-peeling`                                      |
| Gastronauts / Season 1                         | episode: 104. Tossed Salad and Scrambled Eggs                                   | 2024-11-23 → 2024-11-22 | 1    | `tossed-salad-and-scrambled-eggs`                                 |
| Gastronauts / Season 1                         | episode: 105. Clear Eyes, Mouth Wide, Can't Lose                                | 2024-12-07 → 2024-12-06 | 1    | `clear-eyes-mouth-wide-can-t-lose`                                |
| Gastronauts / Season 1                         | episode: 106. Don't Knock It Till You Drop It                                   | 2024-12-21 → 2024-12-20 | 1    | `don-t-knock-it-till-you-drop-it`                                 |
| Dimension 20 / Misfits and Magic (Chapter 2)   | episode: 7. The Heart of Weugan                                                 | 2024-11-07 → 2024-11-06 | 1    | `the-heart-of-weugan`                                             |
| Dimension 20 / Misfits and Magic (Chapter 2)   | episode: 8. The Man We've Been Waiting For                                      | 2024-11-14 → 2024-11-13 | 1    | `the-man-we-ve-been-waiting-for`                                  |
| Dimension 20 / Misfits and Magic (Chapter 2)   | episode: 9. The Magic of Creation                                               | 2024-11-21 → 2024-11-20 | 1    | `the-magic-of-creation`                                           |
| Dimension 20 / Misfits and Magic (Chapter 2)   | episode: 10. Turducken                                                          | 2024-11-28 → 2024-11-27 | 1    | `turducken`                                                       |
| Very Important People / Season 2               | episode: 201. Zeke Aaron McKinley                                               | 2024-11-08 → 2024-11-07 | 1    | `zeke-aaron-mckinley`                                             |
| Very Important People / Season 2               | episode: 202. Hayes Steele                                                      | 2024-11-23 → 2024-11-21 | 2    | `hayes-steele`                                                    |
| Very Important People / Season 2               | episode: 203. Jukebox                                                           | 2024-12-06 → 2024-12-05 | 1    | `jukebox`                                                         |
| Very Important People / Season 2               | episode: 204. Fourth Witch                                                      | 2024-12-20 → 2024-12-19 | 1    | `fourth-witch`                                                    |
| Very Important People / Season 2               | episode: 205. Barbara and Bill                                                  | 2025-01-03 → 2025-01-02 | 1    | `barbara-and-bill`                                                |
| Very Important People / Season 2               | bts: Barbara and Bill                                                           | 2025-01-13 → 2025-01-03 | 10   | `last-looks-barbara-and-bill`                                     |
| Very Important People / Season 2               | episode: 206. Ta'Tania Jackson                                                  | 2025-01-17 → 2025-01-16 | 1    | `ta-tania-jackson`                                                |
| Very Important People / Season 2               | episode: 207. Phoenix                                                           | 2025-01-31 → 2025-01-30 | 1    | `phoenix`                                                         |
| Very Important People / Season 2               | episode: 208. David Hoyle Jr.                                                   | 2025-02-14 → 2025-02-13 | 1    | `david-hoyle-jr`                                                  |
| Very Important People / Season 2               | episode: 209. Steffi Pops                                                       | 2025-02-28 → 2025-02-27 | 1    | `steffi-pops`                                                     |
| Nobody Asked / Season 1                        | episode: 101. Technically a Tenor, Comedians vs. Pro Athletes, Inflatable Jazz  | 2024-12-20 → 2024-11-29 | 21   | `technically-a-tenor-comedians-vs-pro-athletes-inflatable-jazz`   |
| Nobody Asked / Season 1                        | episode: 102. Paintball Picasso, Comedians vs. Pro Athletes 2, Dissecting the S | 2024-12-20 → 2024-12-13 | 7    | `paintball-picasso-comedians-vs-pro-athletes-2-dissecting-the-s`  |
| Nobody Asked / Season 1                        | episode: 103. Robocopulation, Comedians vs. Pro Athletes 3, Doomsday Wine       | 2025-01-13 → 2024-12-27 | 17   | `robocopulation-comedians-vs-pro-athletes-3-doomsday-wine`        |
| Nobody Asked / Season 1                        | episode: 104. Kink Outside the Box, Data Dash, Monochromo Sapiens               | 2025-01-11 → 2025-01-10 | 1    | `kink-outside-the-box-data-dash-monochromo-sapiens`               |
| Nobody Asked / Season 1                        | episode: 105. Not So Fast, Comedians vs. Pro Athletes 4, Drink in Sync          | 2025-01-25 → 2025-01-24 | 1    | `not-so-fast-comedians-vs-pro-athletes-4-drink-in-sync`           |
| Parlor Room / Season 2                         | episode: 202. Crudites, Crudita, Crudite-ha-ha-ha                               | 2026-04-11 → 2026-04-02 | 9    | `crudites-crudita-crudite-ha-ha-ha`                               |
| Crowd Control / Season 1                       | episode: 105. Writing "Partners"                                                | 2025-11-04 → 2025-11-03 | 1    | `writing-partners`                                                |
| Crowd Control / Season 1                       | episode: 106. Have You Been Bad?                                                | 2025-11-18 → 2025-11-17 | 1    | `have-you-been-bad`                                               |
| Game Changer / Season 7                        | special: Dimension 20: On a Bus (Extended Cut)                                  | 2025-09-10 → 2025-08-15 | 26   | `dimension-20-on-a-bus-extended-cut`                              |
| Dirty Laundry / Season 5                       | episode: 509. Who Won a Stand-Off with a Popstar?                               | 2025-11-05 → 2025-11-04 | 1    | `who-won-a-stand-off-with-a-popstar`                              |
| Dirty Laundry / Season 5                       | episode: 510. Whose Mom Was an Accomplice to Armed Robbery?                     | 2025-11-19 → 2025-11-18 | 1    | `whose-mom-was-an-accomplice-to-armed-robbery`                    |
| Dirty Laundry / Season 5                       | episode: 511. Who Ended a Relationship Using Sorcery?                           | 2025-12-03 → 2025-12-02 | 1    | `who-ended-a-relationship-using-sorcery`                          |
| Dirty Laundry / Season 5                       | episode: 512. Who Joined an Ex on Their Honeymoon?                              | 2025-12-17 → 2025-12-16 | 1    | `who-joined-an-ex-on-their-honeymoon`                             |
| Make Some Noise / Season 4                     | episode: 403. The Sneaky Girl Shuffle                                           | 2025-11-11 → 2025-11-10 | 1    | `the-sneaky-girl-shuffle`                                         |
| Make Some Noise / Season 4                     | episode: 404. Zunk, Junk, and Dunk                                              | 2025-11-25 → 2025-11-24 | 1    | `zunk-junk-and-dunk`                                              |
| Make Some Noise / Season 4                     | episode: 405. Caitlin, Nick, and Geoff Take You to Church                       | 2025-12-09 → 2025-12-08 | 1    | `caitlin-nick-and-geoff-take-you-to-church`                       |
| Make Some Noise / Season 4                     | episode: 406. Josh, Anna, and Jiavani Make a Day Rate                           | 2025-12-23 → 2025-12-22 | 1    | `josh-anna-and-jiavani-make-a-day-rate`                           |
| Make Some Noise / Season 4                     | episode: 407. Ross, Echo, and Corin Try to Recruit You                          | 2026-01-06 → 2026-01-05 | 1    | `ross-echo-and-corin-try-to-recruit-you`                          |
| Make Some Noise / Season 4                     | episode: 408. Jacob, Kurt, and Angela Have Fun with Filters                     | 2026-01-20 → 2026-01-19 | 1    | `jacob-kurt-and-angela-have-fun-with-filters`                     |
| Make Some Noise / Season 4                     | episode: 409. Different Language Office                                         | 2026-02-03 → 2026-02-02 | 1    | `different-language-office`                                       |
| Make Some Noise / Season 4                     | episode: 410. Anna, Geoff, and Jeremy Act Out Kids' Prompts                     | 2026-02-17 → 2026-02-16 | 1    | `anna-geoff-and-jeremy-act-out-kids-prompts`                      |
| Make Some Noise / Season 4                     | episode: 411. Ally, Brennan, and Talia Try to Get Through Lunch                 | 2026-03-03 → 2026-03-02 | 1    | `ally-brennan-and-talia-try-to-get-through-lunch`                 |
| Um, Actually / Season 10                       | episode: 1001. Planet of the Apes, Deadpool, Alien                              | 2025-02-05 → 2025-01-28 | 8    | `planet-of-the-apes-deadpool-alien`                               |
| Um, Actually / Season 10                       | episode: 1002. R2D2, Dennis the Menace, Teenage Mutant Ninja Turtles            | 2025-02-12 → 2025-02-11 | 1    | `r2d2-dennis-the-menace-teenage-mutant-ninja-turtles`             |
| Um, Actually / Season 10                       | episode: 1003. Gilmore Girls, Bratz, Totally Spies                              | 2025-02-26 → 2025-02-25 | 1    | `gilmore-girls-bratz-totally-spies`                               |
| Um, Actually / Season 10                       | episode: 1009. SlayerFest '25                                                   | 2025-05-22 → 2025-05-20 | 2    | `slayerfest-25`                                                   |
| Um, Actually / Season 11                       | episode: 1101. Zig, Garrick, and Thundercat Weeb Out                            | 2026-01-21 → 2026-01-20 | 1    | `zig-garrick-and-thundercat-weeb-out`                             |
| Um, Actually / Season 11                       | episode: 1102. Collectible Card Games                                           | 2026-02-04 → 2026-02-03 | 1    | `collectible-card-games`                                          |
| Um, Actually / Season 11                       | episode: 1103. The Tag Team Episode                                             | 2026-02-18 → 2026-02-17 | 1    | `the-tag-team-episode`                                            |
| Um, Actually / Season 11                       | episode: 1104. Boo, Actually! Volume 2                                          | 2026-03-04 → 2026-03-03 | 1    | `boo-actually-volume-2`                                           |
| Very Important People / Season 3               | episode: 301. Mother Hot Dog                                                    | 2025-12-05 → 2025-12-04 | 1    | `mother-hot-dog`                                                  |
| Very Important People / Season 3               | episode: 302. Boris Tarshkokan                                                  | 2025-12-19 → 2025-12-18 | 1    | `boris-tarshkokan`                                                |
| Very Important People / Season 3               | episode: 303. Archimedes and Ollie                                              | 2026-01-02 → 2026-01-01 | 1    | `archimedes-and-ollie`                                            |
| Very Important People / Season 3               | episode: 304. Fanoli                                                            | 2026-01-16 → 2026-01-15 | 1    | `fanoli`                                                          |
| Very Important People / Season 3               | episode: 305. Sudzo                                                             | 2026-01-30 → 2026-01-29 | 1    | `sudzo`                                                           |
| Very Important People / Season 3               | episode: 306. Zinnia                                                            | 2026-02-13 → 2026-02-12 | 1    | `zinnia`                                                          |
| Very Important People / Season 3               | episode: 307. Oops Lil Fart                                                     | 2026-02-27 → 2026-02-26 | 1    | `oops-lil-fart`                                                   |
| Gastronauts / Season 2                         | trailer: Gastronauts Season 2 Trailer                                           | 2025-08-01 → 2025-07-18 | 14   | `gastronauts-season-2-trailer`                                    |
| Gastronauts / Season 2                         | episode: 207. Business in the Front, Party in the Back                          | 2025-11-08 → 2025-11-07 | 1    | `business-in-the-front-party-in-the-back`                         |
| Gastronauts / Season 2                         | episode: 208. Doggone Good                                                      | 2025-11-22 → 2025-11-21 | 1    | `doggone-good`                                                    |
| Gastronauts / Season 2                         | episode: 209. The World Is Your Beard                                           | 2025-12-06 → 2025-12-05 | 1    | `the-world-is-your-beard`                                         |
| Gastronauts / Season 2                         | episode: 210. Incog-Eato                                                        | 2025-12-20 → 2025-12-19 | 1    | `incog-eato`                                                      |
| Smartypants / Season 2                         | episode: 201. Standardization, Dogs, Procrastination                            | 2025-03-07 → 2025-03-06 | 1    | `standardization-dogs-procrastination`                            |
| Smartypants / Season 2                         | episode: 208. Second Families, Sacagawea, Linda Hamilton                        | 2025-06-17 → 2025-06-12 | 5    | `second-families-sacagawea-linda-hamilton`                        |
| Adventuring Academy / Season 6                 | episode: 606. Be Yourself Everyone Else Is Taken (with Ally Beardsley)          | 2025-11-07 → 2025-11-06 | 1    | `be-yourself-everyone-else-is-taken-with-ally-beardsley`          |
| Adventuring Academy / Season 7                 | episode: 701. Bandaid on a Bowling Ball (with Vic Michaelis)                    | 2026-02-21 → 2026-02-20 | 1    | `bandaid-on-a-bowling-ball-with-vic-michaelis`                    |
| Dimension 20 / On a Bus (Season 1)             | episode: 1. Dimension 20: On a Bus (Extended Cut)                               | 2025-09-10 → 2025-08-15 | 26   | `dimension-20-on-a-bus-extended-cut`                              |
| Dimension 20 / Gladlands                       | episode: 1. Welcome to the Wastes                                               | 2026-01-08 → 2026-01-07 | 1    | `welcome-to-the-wastes`                                           |
| Dimension 20 / Gladlands                       | episode: 2. Fake It Till You Fake It                                            | 2026-01-15 → 2026-01-14 | 1    | `fake-it-till-you-fake-it`                                        |
| Dimension 20 / Gladlands                       | episode: 3. Collabotage                                                         | 2026-01-22 → 2026-01-21 | 1    | `collabotage`                                                     |
| Dimension 20 / Gladlands                       | episode: 4. Poppy Persona Non Grata                                             | 2026-01-29 → 2026-01-28 | 1    | `poppy-persona-non-grata`                                         |
| Dimension 20 / Gladlands                       | episode: 5. A Hugi Minute                                                       | 2026-02-05 → 2026-02-04 | 1    | `a-hugi-minute`                                                   |
| Dimension 20 / Gladlands                       | episode: 6. Good Vibrations                                                     | 2026-02-12 → 2026-02-11 | 1    | `good-vibrations`                                                 |
| Toonout / Season 1                             | episode: 14. Young Spencer Goes to School                                       | 2026-09-22 → 2026-09-08 | 14   | `young-spencer-goes-to-school`                                    |
