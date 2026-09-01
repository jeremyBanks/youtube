import { parseArgs } from "@std/cli";
import * as yaml from "../yaml.ts";
import { ChannelPlaylist, Video } from "../storage.ts";
import { getSeasonsCuration } from "../config.ts";

/** A link, because an id alone cannot be checked by eye. */
const watch = (videoId: string) => `https://youtu.be/${videoId}`;

/** Every curation field that names a video id. */
const ID_FIELDS = [
  "members",
  "public",
  "paid",
  "public copy",
  "public short",
  "public compilation",
  "public parts",
  "removed public parts",
  "removed members",
] as const;

if (import.meta.main) {
  await main();
}

/**
 * Reduces a YouTube title to the part that identifies the episode. Titles
 * carry a trailing " | Show | Ep. N" that differs between the members and
 * free uploads of the same thing.
 */
export function episodeTitle(title: string): string {
  return title
    .replace(/\s*\|.*$/, "")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Where a video sits in the curation: which document, and where within it.
 * File order is playlist order, so this is our ordering.
 */
function curationOrder(
  curation: Awaited<ReturnType<typeof getSeasonsCuration>>,
): Map<string, number> {
  const order = new Map<string, number>();
  let n = 0;
  for (const doc of curation) {
    for (const video of doc.videos) {
      n += 1;
      for (const field of ID_FIELDS) {
        const value = (video as Record<string, unknown>)[field];
        for (const id of [value].flat()) {
          if (typeof id === "string" && !order.has(id)) {
            order.set(id, n);
          }
        }
      }
    }
  }
  return order;
}

/**
 * Command-line entry point. Compares the playlists Dropout publishes against
 * our curation, three ways, and reports rather than changing anything.
 *
 * None of these is an error on its own. Dropout organises its channels
 * differently from us on purpose — separate free and members playlists,
 * Adventuring Party on its own channel — so a difference is a question,
 * not a fault.
 */
export async function main() {
  const args = parseArgs(Deno.args, {
    string: ["threshold", "tolerance"],
    boolean: ["uncovered", "free", "order"],
  });
  // The free upload of an episode carries a bumper advertising the
  // subscription, so it runs longer than the members one — by up to about
  // two minutes, in a continuous band with no gap in it. It is never
  // meaningfully shorter. So the test is asymmetric: generous about the
  // free version being longer, strict the other way, where a difference
  // means two different episodes whose titles happen to collide.
  const longerBy = Number(args.tolerance ?? "150");
  const shorterBy = 5;
  // Below this share of a playlist being curated, we are looking at a show
  // we do not cover at all, and every entry would be reported as a gap.
  const threshold = Number(args.threshold ?? "0.5");
  const all = !args.uncovered && !args.free && !args.order;

  const curation = await getSeasonsCuration();
  const order = curationOrder(curation);
  const curated = new Set(order.keys());
  const playlists = ChannelPlaylist.array().parse(
    await yaml.load("./data/channel-playlists.yaml"),
  );
  const videos = new Map(
    Video.array().parse(await yaml.load("./data/videos.yaml"))
      .map((v) => [v.videoId, v]),
  );

  if (all || args.uncovered) {
    let count = 0;
    console.info(
      `\nVideos in their playlists that our curation does not name, ` +
        `where we already cover at least ${Math.round(threshold * 100)}%:`,
    );
    for (const playlist of playlists) {
      const live = (playlist.entries ?? []).filter((e) => !e.removedBefore);
      if (live.length === 0) continue;
      const gaps = live.filter((e) => !curated.has(e.videoId));
      if (
        !gaps.length || (live.length - gaps.length) / live.length < threshold
      ) {
        continue;
      }
      console.info(`  ${playlist.title} (${gaps.length} of ${live.length})`);
      for (const gap of gaps) {
        const seconds = videos.get(gap.videoId)?.duration;
        const length = seconds ? `${Math.floor(seconds / 60)}m` : "?";
        console.info(
          `     ${length.padStart(5)}  ${watch(gap.videoId)}  ${
            gap.title ?? ""
          }`,
        );
        count += 1;
      }
    }
    console.info(`  ${count} in total.`);
  }

  if (all || args.free) {
    // A curated entry naming only a members video, where a free upload of
    // the same episode exists and no entry names it. Same title and the
    // same duration to the second is the test; a differing runtime means a
    // different cut and is left for a person.
    const free = new Map<
      string,
      Array<typeof videos extends Map<string, infer V> ? V : never>
    >();
    for (const video of videos.values()) {
      if (video.membersOnly || (video.duration ?? 0) < 600) continue;
      const key = episodeTitle(video.title);
      free.set(key, [...(free.get(key) ?? []), video]);
    }
    console.info(`\nFree versions of members-only entries, not recorded:`);
    let exact = 0;
    let differing = 0;
    for (const doc of curation) {
      for (const video of doc.videos) {
        const entry = video as Record<string, unknown>;
        if (entry.public || typeof entry.members !== "string") continue;
        const members = videos.get(entry.members);
        if (!members) continue;
        for (const candidate of free.get(episodeTitle(members.title)) ?? []) {
          if (curated.has(candidate.videoId)) continue;
          const delta = (candidate.duration ?? 0) - (members.duration ?? 0);
          const title = video.episode ?? video.special ?? video.bts ?? "?";
          if (delta <= longerBy && delta >= -shorterBy) {
            exact += 1;
            console.info(
              `  ${doc.show} / ${doc.season}: ${title}` +
                (delta ? `  (free is ${delta}s longer)` : "") + `\n` +
                `     members ${watch(entry.members)}\n` +
                `     free    ${watch(candidate.videoId)}  ${
                  candidate.publishedAt.toISOString().slice(0, 10)
                }\n` +
                `     public: ${candidate.videoId}`,
            );
          } else {
            differing += 1;
          }
        }
      }
    }
    console.info(
      `  ${exact} where the free version runs no more than ${longerBy}s ` +
        `longer and no more than ${shorterBy}s shorter; ` +
        `${differing} fall outside that and need a person.`,
    );
  }

  if (all || args.order) {
    // Where both list the same videos, they should list them in the same
    // sequence. Ours is file order in curation/seasons.yaml.
    console.info(`\nPlaylists ordering shared videos differently from us:`);
    let count = 0;
    for (const playlist of playlists) {
      const shared = (playlist.entries ?? [])
        .filter((e) => !e.removedBefore && order.has(e.videoId))
        .map((e) => ({ videoId: e.videoId, ours: order.get(e.videoId)! }));
      if (shared.length < 3) continue;
      const inversions: Array<string> = [];
      for (let i = 1; i < shared.length; i += 1) {
        if (shared[i].ours < shared[i - 1].ours) {
          inversions.push(
            `${watch(shared[i - 1].videoId)} then ${watch(shared[i].videoId)}`,
          );
        }
      }
      if (!inversions.length) continue;
      count += 1;
      console.info(
        `  ${playlist.title} (${inversions.length} of ${
          shared.length - 1
        } adjacent pairs out of order)`,
      );
      for (const inversion of inversions.slice(0, 3)) {
        console.info(`     ${inversion}`);
      }
    }
    console.info(`  ${count} playlists disagree.`);
  }
}
