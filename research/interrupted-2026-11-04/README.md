# Interrupted on 2026-11-04: a review that was closed, not paused

On 2026-11-04 a coherence pass was started and then cut off when the model quota
ran out. The owner then **narrowed the scope on purpose**. The full review is
not to be resumed just because quota is available again. This folder keeps what
was in flight so that a specific piece can be picked up if someone asks for it.

## What landed (fe3d39d and after)

- `src/order.ts`: aggregate prints `order:` lines for entries filed out of
  release order, with three conventions excused (see CLAUDE.md).
- An `animation:` entry is published only where a playlist's `type` names it.
- Singular nouns for counts of one.
- `premiered:` on an entry, checked by `verify-dates`; nothing uses it yet.

## What did not, and where its state is

- **Order review** of the 38 adjacent inversions in 21 docs (`inversions.json`,
  made by the script logic in `src/order.ts`). Two docs were judged; their
  verdicts are in `order-verdicts.json`, unverified (the skeptic pass never ran)
  and **not applied**:
  - Escape from the Bloodkeep: the Behind the Scenes is dated by a 2019-09-10
    members backfill; probably released about 2019-06-11, which would make the
    file order right.
  - Fantasy High (Chapter 1): the four Extra Credit recaps sit beside the
    episodes they recap on purpose (commit 17e4c5e) and want a comment saying
    so; their dates look like their free uploads, and TheTVDB plus Dropout item
    ids suggest 2019-08-28, 09-04, 09-11 and 09-18.
- **Research** never returned: Don't Hug Me I'm Scared's Channel 4 dates and
  what "HARK!" is; Critical Role live-stream dates for EXU Calamity, Downfall,
  Divergence and Campaign 4; the Hertzfeldt films' premieres; which episode each
  unfiled Game Changer Animated and Dimension 20 Animated short depicts. The
  prompts used are in `review-workflow.js.txt` (the `RESEARCH` table).
- **Copy sweep** (`copy-sweep.txt`): free uploads on another channel that may
  duplicate a curated `public`. Unreviewed; most hits are noise (This Week on
  Dropout against same-week promos, shingle matches on boilerplate).
