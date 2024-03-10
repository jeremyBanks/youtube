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

    for await (const entry of playlistVideos(config.playlistId)) {
      videos[entry.contentDetails?.videoId!] = entry.snippet?.title!;
    }

    playlists.push({
      name: meta.snippet?.title!,
      description: meta.snippet?.description!,
      playlistId: config.playlistId,
      videos,
    });
  }
}
