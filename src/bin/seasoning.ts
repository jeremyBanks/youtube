import { parseArgs } from "@std/cli";
import { getSeasonsCuration } from "../config.ts";
import { getVideoDetails } from "../client.ts";
import {
  openChannelStorage,
  openVideoStorage,
  type Video,
} from "../storage.ts";

if (import.meta.main) {
  await main();
}

async function main() {
  const args = parseArgs(Deno.args, {
    string: ["channel", "since", "limit"],
    boolean: ["no-fetch", "help"],
    default: { channel: undefined, since: undefined, limit: undefined },
  });

  if (args.help) {
    console.log(`Usage: deno task curate [options]

Options:
  --channel=HANDLE   Filter to specific channel (e.g., --channel=dropout)
  --since=DATE       Only show videos published after this date (e.g., --since=2024-01-01)
  --limit=N          Limit number of videos (default: no limit)
  --no-fetch         Skip fetching descriptions from YouTube API
  --help             Show this help message

Output is designed to give Claude all context needed to suggest categorizations.
`);
    Deno.exit(0);
  }

  const limit = args.limit ? parseInt(args.limit, 10) : undefined;
  const channelFilter = args.channel?.toLowerCase();
  const sinceFilter = args.since ? new Date(args.since) : undefined;
  const skipFetch = args["no-fetch"];

  const seasons = await getSeasonsCuration();
  const allVideos = await openVideoStorage();
  const channels = await openChannelStorage();

  // Build channel lookup maps
  const channelHandleById = new Map(
    channels.map((ch) => [ch.channelId, ch.handle]),
  );
  const channelIdByHandle = new Map(
    channels.map((ch) => [ch.handle?.toLowerCase(), ch.channelId]),
  );
  const channelNameById = new Map(
    channels.map((ch) => [ch.channelId, ch.name]),
  );

  // Extract all video IDs already in seasons.yaml
  const curatedVideoIds = new Set<string>();
  for (const season of seasons) {
    for (const video of season.videos) {
      const ids = [
        video.members,
        video["removed members"],
        video["members deleted"],
        video.public,
        video["public compilation"],
        video["public copy"],
        video.paid,
      ].filter((id): id is string => typeof id === "string");

      const publicParts = video["public parts"];
      if (publicParts) {
        if (Array.isArray(publicParts)) {
          ids.push(...publicParts);
        } else {
          ids.push(publicParts);
        }
      }
      const deletedPublicParts = video["deleted public parts"];
      if (deletedPublicParts) {
        if (Array.isArray(deletedPublicParts)) {
          ids.push(...deletedPublicParts);
        } else {
          ids.push(deletedPublicParts);
        }
      }

      for (const id of ids) {
        curatedVideoIds.add(id);
      }
    }
  }

  // Filter to target channel if specified
  let targetChannelId: string | undefined;
  if (channelFilter) {
    targetChannelId = channelIdByHandle.get(channelFilter);
    if (!targetChannelId) {
      console.error(`Unknown channel: ${channelFilter}`);
      console.error(
        "Available channels:",
        [...channelIdByHandle.keys()].filter(Boolean).sort().join(", "),
      );
      Deno.exit(1);
    }
  }

  // Find uncurated videos
  let uncuratedVideos = allVideos.filter((video) => {
    if (curatedVideoIds.has(video.videoId)) return false;
    if (video.removedBefore) return false;
    if (targetChannelId && video.channelId !== targetChannelId) return false;
    if (sinceFilter && video.publishedAt < sinceFilter) return false;
    return true;
  });

  // Sort by publish date (newest first)
  uncuratedVideos.sort(
    (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime(),
  );

  // Apply limit if specified
  if (limit) {
    uncuratedVideos = uncuratedVideos.slice(0, limit);
  }

  if (uncuratedVideos.length === 0) {
    console.log("No uncurated videos found matching the criteria.");
    return;
  }

  // ==========================================================================
  // OUTPUT SECTION 1: Existing Season Structure (for Claude's context)
  // ==========================================================================
  console.log(`# ============================================================`);
  console.log(`# EXISTING SEASON STRUCTURE`);
  console.log(`# This shows what shows/seasons exist and example video titles`);
  console.log(`# ============================================================`);
  console.log(``);

  // Group seasons by show
  const showSeasons = new Map<string, typeof seasons>();
  for (const season of seasons) {
    const show = season.show;
    const existing = showSeasons.get(show) ?? [];
    existing.push(season);
    showSeasons.set(show, existing);
  }

  for (const [show, showSeasonList] of showSeasons) {
    console.log(`## ${show}`);
    console.log(``);

    for (const season of showSeasonList) {
      const seasonName = season.season ?? "(main show videos)";
      const cast = season.cast ? ` [cast: ${season.cast}]` : "";
      const world = season.world ? ` [world: ${season.world}]` : "";
      const live = season.live ? " [live]" : "";

      console.log(`### ${seasonName}${cast}${world}${live}`);

      // Show a few example video titles to establish patterns
      const examples = season.videos.slice(0, 5);
      for (const video of examples) {
        const type = video.trailer
          ? "trailer"
          : video.episode
          ? "episode"
          : video.special
          ? "special"
          : video.bts
          ? "bts"
          : video.animation
          ? "animation"
          : video.external
          ? "external"
          : "unknown";
        const title = video.trailer ??
          video.episode ??
          video.special ??
          video.bts ??
          video.animation ??
          video.external ??
          "?";
        console.log(`  - ${type}: "${title}"`);
      }
      if (season.videos.length > 5) {
        console.log(`  - ... and ${season.videos.length - 5} more videos`);
      }
      console.log(``);
    }
  }

  // ==========================================================================
  // OUTPUT SECTION 2: Uncurated Videos
  // ==========================================================================
  console.log(`# ============================================================`);
  console.log(`# UNCURATED VIDEOS`);
  console.log(`# Total: ${uncuratedVideos.length} videos need categorization`);
  if (channelFilter) console.log(`# Channel filter: ${channelFilter}`);
  if (sinceFilter) {
    console.log(`# Since: ${sinceFilter.toISOString().split("T")[0]}`);
  }
  console.log(`# ============================================================`);
  console.log(``);

  // Fetch descriptions if not skipped
  let details = new Map<string, { description: string; tags?: string[] }>();
  if (!skipFetch) {
    console.error(
      `Fetching descriptions for ${uncuratedVideos.length} videos...`,
    );
    const videoIds = uncuratedVideos.map((v) => v.videoId);
    details = await getVideoDetails(videoIds);
  }

  // Group by channel for organized output
  const videosByChannel = new Map<string, Video[]>();
  for (const video of uncuratedVideos) {
    const channelVideos = videosByChannel.get(video.channelId) ?? [];
    channelVideos.push(video);
    videosByChannel.set(video.channelId, channelVideos);
  }

  for (const [channelId, videos] of videosByChannel) {
    const handle = channelHandleById.get(channelId) ?? channelId;
    const name = channelNameById.get(channelId) ?? handle;

    console.log(`## Channel: ${name} (@${handle})`);
    console.log(`## ${videos.length} uncurated video(s)`);
    console.log(``);

    for (const video of videos) {
      const detail = details.get(video.videoId);
      const description = detail?.description ?? "";

      console.log(`- videoId: ${video.videoId}`);
      console.log(`  title: "${escapeYamlString(video.title)}"`);
      console.log(
        `  published: ${video.publishedAt.toISOString().split("T")[0]}`,
      );
      console.log(`  duration: ${formatDuration(video.duration)}`);
      if (video.membersOnly) {
        console.log(`  membersOnly: true`);
      }
      if (description) {
        // Include full description for Claude to analyze
        const descLines = description.split("\n").map((line) => `    ${line}`)
          .join("\n");
        console.log(`  description: |`);
        console.log(descLines);
      }
      console.log(``);
    }
  }

  // ==========================================================================
  // OUTPUT SECTION 3: Instructions for Claude
  // ==========================================================================
  console.log(`# ============================================================`);
  console.log(`# INSTRUCTIONS FOR CATEGORIZATION`);
  console.log(`# ============================================================`);
  console.log(`#`);
  console.log(`# For each uncurated video above, determine:`);
  console.log(`# 1. Which show it belongs to (based on title/description)`);
  console.log(`# 2. Which season (if applicable)`);
  console.log(`# 3. The video type: episode, trailer, bts, special, animation`);
  console.log(`# 4. The proper title (clean up numbering if needed)`);
  console.log(`#`);
  console.log(`# Output format for each video (YAML to add to seasons.yaml):`);
  console.log(`#`);
  console.log(`#   - episode: "1. Episode Title"`);
  console.log(
    `#     public: VIDEO_ID  # or 'members: VIDEO_ID' if membersOnly`,
  );
  console.log(`#     published: 2024-01-15`);
  console.log(`#`);
  console.log(`# Videos that don't fit any existing show/season should be`);
  console.log(`# flagged for manual review or skipped.`);
  console.log(`# ============================================================`);
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

function escapeYamlString(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
