import { getAggregateConfig } from "../config.ts";
import { openPlaylistsStorage } from "../storage.ts";
import { playlistMetadata, playlistVideos } from "../client.ts";
import { logDeep } from "../common.ts";

if (import.meta.main) {
  await main();
}

async function main() {
  const aggregateConfig = await getAggregateConfig();

  const playlists = await openPlaylistsStorage();
  playlists.length = 0;

  for (const config of aggregateConfig) {
    const videos: Record<string, string> = {};

    const meta = await playlistMetadata(config.playlistId);
    let duration = 0;

    for await (const { entry, video } of playlistVideos(config.playlistId)) {
      videos[entry.contentDetails?.videoId!] = `${entry.snippet?.title!} (${
        Temporal.Duration.from(video?.contentDetails?.duration ?? "PT0M")
          .seconds
      }s)`;
    }

    playlists.push({
      name: meta.snippet?.title!,
      description: meta.snippet?.description!,
      playlistId: config.playlistId,
      videos,
    });
  }
}
