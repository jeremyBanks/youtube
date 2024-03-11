import { updatePlaylist } from "../client.ts";
import { openPlaylistsStorage } from "../storage.ts";

if (import.meta.main) {
  await main();
}

async function main() {
  const playlists = await openPlaylistsStorage();

  for (const playlist of playlists) {
    console.info(`Publishing ${playlist.name} (${playlist.playlistId})`);

    const videoIds = Object.keys(playlist.videos);

    await updatePlaylist(
      playlist.playlistId,
      playlist.name,
      playlist.description,
      videoIds,
    );
  }
}
