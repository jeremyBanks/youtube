import { upsert } from "../common.ts";
import { getAggregateConfig, getSeasonsCuration } from "../config.ts";
import { openPlaylistsStorage, openVideoStorage } from "../storage.ts";

if (import.meta.main) {
  await main();
}

async function main() {
  const aggregateConfig = await getAggregateConfig();

  const seasons = await getSeasonsCuration();

  const allVideos = await openVideoStorage();
  const playlists = await openPlaylistsStorage();

  const videosById = new Map(allVideos.map((video) => [video.videoId, video]));

  playlists.length = 0;

  for (const config of aggregateConfig) {
    if (config.skip) {
      continue;
    }

    const videoIds: Array<string> = [];

    let seasonCount = 0;
    let episodeCount = 0;
    let extrasCount = 0;

    for (const season of seasons) {
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
        if (episode.public) {
          videoIds.push(episode.public);
          if (episode.episode || episode.special) {
            episodeCount += 1;
          } else {
            extrasCount += 1;
          }
        } else if (episode["public parts"]) {
          videoIds.push(...episode["public parts"]);
          if (episode.episode || episode.special) {
            episodeCount += 1;
          } else {
            extrasCount += 1;
          }
        } else if (episode.members) {
          if (!config.free) {
            videoIds.push(episode.members);
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
      const videoDetails = videosById.get(videoId);
      if (videoDetails) {
        videos[videoId] = videoDetails.title!;
        durationSeconds += videoDetails.duration;
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
        "Free videos are used when available, but others require a @Dropout membership on YouTube.",
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
        "${SEASONS}",
        String(seasonCount),
      ).replaceAll(
        "${ALL_EPISODES}",
        extrasCount > 0
          ? `All ${episodeCount} Episodes and ${extrasCount} Extras`
          : `All ${episodeCount} Episodes`,
      ).replaceAll(
        "${ALL_SEASONS}",
        seasonCount > 1
          ? `All ${seasonCount} Seasons`
          : extrasCount > 0
          ? `All ${episodeCount} Episodes and ${extrasCount} Extras`
          : `All ${episodeCount} Episodes`,
      )
        .replaceAll(/\b1 Extras\b/g, "1 Extra")
        .replaceAll(/\b1 Episodes\b/g, "1 Episode")
        .replaceAll(/\b1 Seasons\b/g, "1 Season");

    upsert(playlists, {
      name: applyTemplates(config.name),
      description: applyTemplates(config.description ?? ""),
      playlistId: config.playlistId,
      videos: Object.fromEntries(
        videoIds.map((id) => [id, videosById.get(id)?.title ?? "unknown"]),
      ),
    }, (record) => record.playlistId === config.playlistId);
  }
}
