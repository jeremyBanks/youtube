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
        } else if (episode["public parts"]) {
          videoIds.push(...episode["public parts"]);
        } else if (episode.members) {
          if (!config.free) {
            videoIds.push(episode.members);
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

    let description = config.description;
    description = description.replace(
      "${D20_PLUG}",
      "Dimension 20 is an Actual Play TTRPG series from @Dropout, featuring original campaigns of Dungeons and Dragons and other tabletop role-playing systems.",
    );
    description = description.replace(
      "${HOURS}",
      String(Math.floor(durationSeconds / 60 / 60)),
    );

    playlists.push({
      name: config.name,
      description: description,
      playlistId: config.playlistId,
      videos: Object.fromEntries(
        videoIds.map((id) => [id, videosById.get(id)?.title ?? "unknown"]),
      ),
    });
  }
}
