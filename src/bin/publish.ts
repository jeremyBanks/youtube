import { parseArgs } from "@std/cli";
import { createPlaylist, updatePlaylist } from "../client.ts";
import { openPlaylistsStorage } from "../storage.ts";

if (import.meta.main) {
  await main();
}

async function persistPlaylistId(
  oldKey: string,
  newId: string,
): Promise<void> {
  const configPath = "./config/aggregate.toml";
  const content = await Deno.readTextFile(configPath);

  // Replace [todo-something] with [PLnewid]
  const pattern = new RegExp(`^\\[${escapeRegExp(oldKey)}\\]`, "m");
  const newContent = content.replace(pattern, `[${newId}]`);

  if (newContent === content) {
    throw new Error(
      `Failed to update config: could not find [${oldKey}] in ${configPath}`,
    );
  }

  await Deno.writeTextFile(configPath, newContent);
  console.info(`Updated ${configPath}: [${oldKey}] -> [${newId}]`);
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function main() {
  const args = parseArgs(Deno.args, {
    boolean: ["create-missing"],
    default: { "create-missing": false },
  });

  const createMissing = args["create-missing"];
  const playlists = await openPlaylistsStorage();

  for (const playlist of playlists) {
    const isTodoPlaylist = playlist.playlistId?.startsWith("todo-");
    const needsCreation = !playlist.playlistId || isTodoPlaylist;

    if (needsCreation) {
      if (!createMissing) {
        console.info(`Skipping ${playlist.name} (no playlist ID)`);
        continue;
      }

      console.info(`Creating playlist: ${playlist.name}`);
      const newPlaylistId = await createPlaylist(
        playlist.name,
        playlist.description,
      );
      console.info(`Created playlist: ${newPlaylistId}`);

      if (isTodoPlaylist) {
        await persistPlaylistId(playlist.playlistId!, newPlaylistId);
      }

      // Update in memory for the publish step
      playlist.playlistId = newPlaylistId;
    }

    console.info(`Publishing ${playlist.name} (${playlist.playlistId})`);

    const videoIds = Object.keys(playlist.videos);

    await updatePlaylist(
      playlist.playlistId!,
      playlist.name,
      playlist.description,
      videoIds,
    );
  }
}
