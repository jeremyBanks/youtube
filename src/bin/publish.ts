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
    boolean: ["create-missing", "help", "dry-run"],
    string: ["playlist"],
    default: { "create-missing": false, "dry-run": false },
  });

  if (args.help) {
    console.log(`Usage: deno task publish [options]

Options:
  --playlist=NAME    Only publish a specific playlist (by name or ID)
  --create-missing   Create playlists that have no ID or start with 'todo-'
  --dry-run          Show what would be done without making changes
  --help             Show this help message
`);
    Deno.exit(0);
  }

  const createMissing = args["create-missing"];
  const dryRun = args["dry-run"];
  const playlistFilter = args.playlist?.toLowerCase();
  const allPlaylists = await openPlaylistsStorage();

  // Filter to specific playlist if requested
  const playlists = playlistFilter
    ? allPlaylists.filter(
      (p) =>
        p.name.toLowerCase().includes(playlistFilter) ||
        p.playlistId?.toLowerCase().includes(playlistFilter),
    )
    : allPlaylists;

  if (playlistFilter && playlists.length === 0) {
    console.error(`No playlist found matching: ${args.playlist}`);
    console.error("Available playlists:");
    for (const p of allPlaylists) {
      console.error(`  - ${p.name} (${p.playlistId ?? "no ID"})`);
    }
    Deno.exit(1);
  }

  if (playlistFilter) {
    console.info(
      `Filtered to ${playlists.length} playlist(s) matching "${args.playlist}"`,
    );
  }

  for (const playlist of playlists) {
    const isTodoPlaylist = playlist.playlistId?.startsWith("todo-");
    const needsCreation = !playlist.playlistId || isTodoPlaylist;

    if (needsCreation) {
      if (!createMissing) {
        console.info(`Skipping ${playlist.name} (no playlist ID)`);
        continue;
      }

      if (dryRun) {
        console.info(`[DRY RUN] Would create playlist: ${playlist.name}`);
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

    const videoIds = Object.keys(playlist.videos);

    console.info(
      `${dryRun ? "[DRY RUN] Checking" : "Publishing"} ${playlist.name} ` +
        `(${playlist.playlistId})`,
    );

    await updatePlaylist(
      playlist.playlistId!,
      playlist.name,
      playlist.description,
      videoIds,
      { dryRun, unlisted: playlist.unlisted ?? false },
    );
  }
}
