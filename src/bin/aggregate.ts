import { upsert } from "../common.ts";
import { getAggregateConfig, getSeasonsCuration } from "../config.ts";
import * as yaml from "../yaml.ts";
import { normalizeTitle } from "../common.ts";
import { DropoutCollection, DropoutEpisode } from "../storage.ts";
import {
  openPlaylistsStorage,
  openResolvedVideoStorage,
  openVideoStorage,
} from "../storage.ts";

/** YouTube's own cap on a playlist description. */
const DESCRIPTION_LIMIT = 5000;

/**
 * Appends the covered collections to a description, one url per line after
 * a blank line, dropping links from the end rather than exceeding YouTube's
 * limit and having the update rejected.
 */
function withDropoutLinks(
  description: string,
  urls: Array<string>,
): string {
  // The templates end in a newline of their own; trim it so the links are
  // separated by exactly one blank line rather than two.
  const body = description.replace(/\s+$/, "");
  let kept = [...urls];
  while (kept.length) {
    const combined = `${body}\n\n${kept.join("\n")}`;
    if (combined.length <= DESCRIPTION_LIMIT) {
      return combined;
    }
    kept = kept.slice(0, -1);
  }
  return description;
}

/** The subset of a curation entry needed to join it to Dropout's index. */
type CuratedEntry = {
  dropout?: string;
  episode?: string;
  special?: string;
  trailer?: string;
  bts?: string;
  animation?: string;
};

/**
 * Every Dropout collection this playlist covers completely, as urls, with
 * any collection that is a subset of another dropped so only the largest
 * remain. A collection counts only when every one of its episodes has been
 * scraped and is present in the playlist: a partial match would misleadingly
 * promise the whole show.
 */
function coveredCollectionUrls(
  included: Array<CuratedEntry>,
  episodesByCollection: Map<string, Array<DropoutEpisode>>,
): Array<string> {
  const titles = new Set<string>();
  const slugs = new Set<string>();
  for (const entry of included) {
    if (entry.dropout) {
      slugs.add(entry.dropout);
    }
    const title = entry.episode ?? entry.special ?? entry.trailer ??
      entry.bts ?? entry.animation;
    if (title) {
      titles.add(normalizeTitle(title));
    }
  }

  const covered = new Map<string, Set<string>>();
  for (const [slug, episodes] of episodesByCollection) {
    if (episodes.length === 0 || episodes.some((e) => !e.title)) {
      continue; // never scraped in full, so coverage cannot be judged
    }
    // Dropout re-publishes some shows under a "-new" twin of the same slug -
    // game-changer-new, um-actually-new - carrying the same episodes under
    // the same display name. Never link one when the original exists: the
    // subset filter would only drop it if both happened to be covered with
    // identical sets, and a link should not depend on that coincidence.
    if (slug.endsWith("-new") && episodesByCollection.has(slug.slice(0, -4))) {
      continue;
    }
    const all = episodes.every((e) =>
      slugs.has(e.slug) || titles.has(normalizeTitle(e.title!))
    );
    if (all) {
      covered.set(slug, new Set(episodes.map((e) => e.slug)));
    }
  }

  const maximal = [...covered].filter(([slug, episodes]) =>
    ![...covered].some(([other, otherEpisodes]) =>
      other !== slug &&
      [...episodes].every((e) => otherEpisodes.has(e)) &&
      (episodes.size < otherEpisodes.size ||
        // Identical collections do exist — Dropout carries game-changer and
        // game-changer-new, make-some-noise and make-some-noise-new — so on
        // an exact tie keep the shorter name, which is the canonical one,
        // falling back to alphabetical for a genuine draw.
        (episodes.size === otherEpisodes.size &&
          (other.length < slug.length ||
            (other.length === slug.length && other < slug))))
    )
  );
  return maximal.map(([slug]) => `https://watch.dropout.tv/${slug}`).sort();
}

if (import.meta.main) {
  await main();
}

async function main() {
  const aggregateConfig = await getAggregateConfig();

  const seasons = await getSeasonsCuration();

  const allVideos = await openVideoStorage();
  const playlists = await openPlaylistsStorage();

  const videosById = new Map(allVideos.map((video) => [video.videoId, video]));

  // Ids looked up directly, for videos on channels we do not scan — a public
  // copy on a guest's own channel, say. These only ever fill gaps: a scanned
  // record always wins, since it carries the richer metadata.
  // Dropout's own catalogue, read plainly rather than opened as storage:
  // aggregate must never write to the scan's files.
  const dropoutEpisodes = DropoutEpisode.array().parse(
    await yaml.load("./data/dropout.yaml"),
  ).filter((episode) => !episode.removedBefore);
  const dropoutCollections = DropoutCollection.array().parse(
    await yaml.load("./data/dropout-collections.yaml"),
  ).filter((collection) => !collection.removedBefore);
  // Collections are named at show level; an episode lists the season-level
  // slugs it appears under, so a season belongs to its show.
  const episodesByCollection = new Map<string, Array<DropoutEpisode>>();
  for (const collection of dropoutCollections) {
    const season = `${collection.slug}-season-`;
    episodesByCollection.set(
      collection.slug,
      dropoutEpisodes.filter((episode) =>
        episode.collections.some((c) =>
          c === collection.slug || c.startsWith(season)
        )
      ),
    );
  }

  const resolvedById = new Map(
    (await openResolvedVideoStorage())
      .filter((video) => !video.missing)
      .map((video) => [video.videoId, video]),
  );
  const detailsFor = (
    videoId: string,
  ): { title?: string; duration?: number } | undefined =>
    videosById.get(videoId) ?? resolvedById.get(videoId);

  playlists.length = 0;

  for (const config of aggregateConfig) {
    if (config.skip) {
      continue;
    }

    const videoIds: Array<string> = [];
    // The curation entries this playlist actually took, for working out
    // which Dropout collections it covers in full.
    const included: Array<CuratedEntry> = [];

    let seasonCount = 0;
    let episodeCount = 0;
    let extrasCount = 0;
    let freeCount = 0;
    let membersCount = 0;
    let paidCount = 0;

    for (const season of seasons) {
      // ATTEMPTING THIS EXPOSES DATA ERRORS
      // THis should be a separate script cleaning up seasons.yaml in-place, not here!
      // season.videos?.sort((left, right) => {
      //   return (+(left?.published ?? 0) - +(right?.published ?? 0));
      // });

      if (
        config.shows && !(season.show && config.shows.includes(season.show))
      ) {
        continue;
      }
      if (
        config.seasons &&
        !(season.season && config.seasons.includes(season.season))
      ) {
        continue;
      }
      if (
        config.casts && !(season.cast && config.casts.includes(season.cast))
      ) {
        continue;
      }
      if (
        config.worlds && !(season.world && config.worlds.includes(season.world))
      ) {
        continue;
      }
      if (
        config.live !== undefined && season.live !== config.live
      ) {
        continue;
      }

      if (season.season) {
        seasonCount += 1;
      }

      for (const episode of season.videos) {
        if (
          config.types &&
          config.types.filter((type) =>
              Object.prototype.hasOwnProperty.call(episode, type)
            )
              .length ===
            0
        ) {
          continue;
        }
        if (
          config.talkback !== undefined &&
          (episode.talkback ?? false) !== config.talkback
        ) {
          continue;
        }
        if (episode.public) {
          videoIds.push(episode.public);
          included.push(episode);
          freeCount += 1;
          if (episode.episode || episode.special) {
            episodeCount += 1;
          } else {
            extrasCount += 1;
          }
        } else if (episode["public parts"]) {
          freeCount += 1;
          videoIds.push(...episode["public parts"]);
          included.push(episode);
          if (episode.episode || episode.special) {
            episodeCount += 1;
          } else {
            extrasCount += 1;
          }
        } else if (episode.members) {
          if (!config.free) {
            videoIds.push(episode.members);
            included.push(episode);
            membersCount += 1;
            if (episode.episode || episode.special) {
              episodeCount += 1;
            } else {
              extrasCount += 1;
            }
          }
        } else if (episode.paid) {
          if (!config.free) {
            videoIds.push(episode.paid);
            included.push(episode);
            paidCount += 1;
            if (episode.episode || episode.special) {
              episodeCount += 1;
            } else {
              extrasCount += 1;
            }
          }
        } else {
          console.error(`no video ID specified for ${JSON.stringify(episode)}`);
        }
      }
    }

    const videos: Record<string, string> = {};
    let durationSeconds = 0;

    if (videoIds.length === 0) {
      console.error(`empty playlist: ${config.playlistId} ${config.name}`);
    }

    for (const videoId of videoIds) {
      const videoDetails = detailsFor(videoId);
      if (videoDetails?.title) {
        videos[videoId] = videoDetails.title;
        durationSeconds += videoDetails.duration ?? 0;
      } else {
        videos[videoId] = "unknown";
        console.error(
          `unknown video in playlist: ${videoId} in empty playlist: ${config.playlistId} ${config.name}`,
        );
      }
    }

    const applyTemplates = (s: string) =>
      s.replaceAll(
        "${D20_PLUG}",
        "Dimension 20 is an Actual Play TTRPG series from Dropout, featuring original campaigns of Dungeons and Dragons and other tabletop role-playing systems.",
      ).replaceAll(
        "${MAYBE_MEMBERS_ONLY}",
        "${FREE} videos are free and ${MEMBERS} require a @Dropout channel membership on YouTube.",
      ).replaceAll(
        "${HOURS}",
        String(Math.floor(durationSeconds / 60 / 60)),
      ).replaceAll(
        "${EPISODES}",
        String(episodeCount),
      ).replaceAll(
        "${EXTRAS}",
        String(extrasCount),
      ).replaceAll(
        "${FREE}",
        String(freeCount),
      ).replaceAll(
        "${MEMBERS}",
        String(membersCount),
      ).replaceAll(
        "${PAID}",
        String(paidCount),
      ).replaceAll(
        "${SEASONS}",
        String(seasonCount),
      ).replaceAll(
        "${ALL_EPISODES}",
        "All Episodes and Extras",
      ).replaceAll(
        "${ALL_SEASONS}",
        "All Episodes and Extras",
      )
        .replaceAll(/\b1 Extras\b/g, "1 Extra")
        .replaceAll(/\b1 Episodes\b/g, "1 Episode")
        .replaceAll(/\b1 Seasons\b/g, "1 Season")
        .replaceAll(/\b1 Videos\b/g, "1 Video")
        .replaceAll(/\b1 videos\b/g, "1 video")
        .replaceAll(/\b1 Video are\b/g, "1 Video is")
        .replaceAll(/\b1 video are\b/g, "1 video is")
        .replaceAll(/\b1 require \b/g, "1 requires ");

    upsert(playlists, {
      name: applyTemplates(config.name),
      description: withDropoutLinks(
        applyTemplates(config.description ?? ""),
        coveredCollectionUrls(included, episodesByCollection),
      ),
      playlistId: config.playlistId,
      unlisted: config.unlisted,
      videos: Object.fromEntries(
        videoIds.map((id) => [id, detailsFor(id)?.title ?? "unknown"]),
      ),
    }, (record) => record.playlistId === config.playlistId);
  }
}
