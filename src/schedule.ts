/**
 * Deciding when something is due to be looked at again.
 *
 * Every repeating scan in this project — a channel's tiers, a playlist's
 * contents, a video id — asks the same question: enough time has passed since
 * we last looked at this, hasn't it? A bare interval answers it badly, because
 * things looked at together stay looked at together forever. Scan a dozen
 * channels in one afternoon and, a month later, all dozen fall due on the same
 * day and one run pays for all of them.
 *
 * So the interval is jittered. Not randomly: a random offset would make a
 * command answer differently on a re-run, which is intolerable for something
 * whose whole job is to be re-runnable. It is derived instead from the key and
 * the moment we last looked, which makes it deterministic while still spreading
 * the load, and which re-rolls each cycle so nothing is stuck at an unlucky
 * offset for good.
 */

/**
 * FNV-1a, 32-bit. Small, synchronous and dependency-free, which is what
 * matters here: `crypto.subtle.digest` is deterministic too, but it is async,
 * and making the due-check async would spread `await` through every caller for
 * the sake of a stronger hash than a scheduling jitter could ever need.
 */
function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** A deterministic value in [0, 1) from a string. */
function unit(seed: string): number {
  return fnv1a(seed) / 0x100000000;
}

/** How far the jitter may move an interval, either way. */
export const SPREAD = 0.25;

/**
 * The factor to multiply an interval by, in [1 - spread, 1 + spread].
 *
 * The mean of two independent draws rather than one, so the distribution is
 * triangular: most keys land near their nominal interval and the extremes are
 * rare, which spreads a crowd without moving anything very far.
 *
 * `lastAttempt` is part of the seed, not just the key. Seeding on the key
 * alone would give each key one offset for its entire life, which spreads a
 * crowd once and then holds it in that arrangement; including the timestamp
 * re-rolls the offset every cycle while keeping any single decision
 * reproducible.
 */
export function jitterFactor(
  key: string,
  lastAttempt: Date | undefined,
  spread = SPREAD,
): number {
  const seed = `${key}|${lastAttempt?.toISOString() ?? ""}`;
  // The two draws are distinguished at the front of the string, not the end.
  // FNV-1a folds each byte in and then multiplies, so a difference in the last
  // byte survives only one multiply and leaves the two hashes a near-constant
  // distance apart — averaging them would then just shift a single uniform
  // rather than producing a triangular one. A difference in the first byte is
  // carried through every subsequent multiply and decorrelates them properly.
  const mean = (unit(`a|${seed}`) + unit(`b|${seed}`)) / 2;
  return 1 + (mean - 0.5) * 2 * spread;
}

/**
 * Whether enough time has passed to look at `key` again.
 *
 * Never having looked counts as overdue, which is what makes a newly
 * discovered channel, playlist or video id get picked up on the next run
 * without a special case anywhere.
 *
 * Takes `now` rather than reading the clock, so it can be tested without
 * mocking time — the same reason `mergeEntries` and `newArrivals` take theirs.
 */
export function isDue(
  key: string,
  lastAttempt: Date | undefined,
  intervalMs: number,
  now: Date,
  spread = SPREAD,
): boolean {
  if (!lastAttempt) {
    return true;
  }
  const effective = intervalMs * jitterFactor(key, lastAttempt, spread);
  return now.getTime() - lastAttempt.getTime() >= effective;
}

/**
 * An ISO 8601 duration as milliseconds, for the intervals that come from
 * config as strings. Safe for the day, hour and minute durations this project
 * uses; years, months and weeks would need a reference point to resolve.
 */
export function durationMs(iso: string): number {
  return Temporal.Duration.from(iso).total({ unit: "millisecond" });
}

/** Milliseconds in a day, for the intervals expressed as a number of them. */
export const DAY_MS = 86_400_000;
