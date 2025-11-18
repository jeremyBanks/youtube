import { getAggregateConfig, getSeasonsCuration } from "../config.ts";
import { openPlaylistsStorage, openVideoStorage } from "../storage.ts";

if (import.meta.main) {
  await main();
}

async function main() {
  const _aggregateConfig = await getAggregateConfig();

  const _seasons = await getSeasonsCuration();

  const allVideos = await openVideoStorage();
  const _playlists = await openPlaylistsStorage();

  const _videosById = new Map(allVideos.map((video) => [video.videoId, video]));
}
