import { getAggregateConfig } from "../config.ts";
import { openPlaylistsStorage } from "../storage.ts";
import { playlistMetadata, playlistVideos } from "../client.ts";

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

    for await (const { entry } of playlistVideos(config.playlistId)) {
      const title = entry.snippet?.title! ?? "unknown";
      videos[entry.contentDetails?.videoId!] = title;
    }

    playlists.push({
      name: meta.snippet?.title!,
      description: meta.snippet?.description!,
      playlistId: config.playlistId,
      videos,
    });
  }
}
