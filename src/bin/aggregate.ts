import { getAggregateConfig } from "../config.ts";
import { openPlaylistsStorage, openVideoStorage } from "../storage.ts";

if (import.meta.main) {
  await main();
}

async function main() {
  const aggregateConfig = await getAggregateConfig();

  const videos = await openVideoStorage();
  const playlists = await openPlaylistsStorage();

  console.log(aggregateConfig);
}
