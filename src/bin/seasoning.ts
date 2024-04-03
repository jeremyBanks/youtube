import { upsert } from "../common.ts";
import { getAggregateConfig, getSeasonsCuration } from "../config.ts";
import { openPlaylistsStorage, openVideoStorage } from "../storage.ts";
import { sortBy } from "@std/collections";

if (import.meta.main) {
  await main();
}

async function main() {
  const aggregateConfig = await getAggregateConfig();

  const seasons = await getSeasonsCuration();

  const allVideos = await openVideoStorage();
  const playlists = await openPlaylistsStorage();

  const videosById = new Map(allVideos.map((video) => [video.videoId, video]));

}
