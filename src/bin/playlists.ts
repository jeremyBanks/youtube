// deno-lint-ignore-file no-explicit-any
import yaml from "../yaml.ts";
import { youtubei, replaceVideos } from "../youtube.ts";

const catalogueData = yaml.load("catalogue.yaml");
const campaignData = yaml.load("campaigns.yaml") as Array<{
  season: string;
  from: "Dimension 20";
  debut: string;
  cast?: string;
  world?: string;
  videos: Array<{
    trailer?: string;
    episode?: string;
    animate?: string;
    insight?: string;
    special?: string;
    public?: string;
    members?: string;
  }>;
}>;
const playlistSpecs = yaml.load("playlists.yaml") as Array<{
  name: string;
  id?: string;
  description: string;
  include: {
    from: "Dimension 20";
    world?: string;
    cast?: string;
    season?: string | Array<string>;
    type: Array<"episode" | "special" | "trailer" | "insight" | "animate">;
    version: Array<"public" | "members">;
  };
}>;
let playlistMd = "# Playlists\n\n";

for (const playlist of playlistSpecs) {
  if (!playlist.id) {
    break;
  }

  playlistMd += `## [${playlist.name}](https://www.youtube.com/playlist?list=${
    playlist.id
  })

> ${playlist.description.trim().replaceAll("\n", "\n> ")}

`;

  let videos: Array<{
    id: string;
    title: string;
  }> = [];

  for (const campaign of campaignData) {
    for (const video of campaign.videos) {
      // TODO: support "public parts"

      const type = video.animate
        ? "animate"
        : video.episode
        ? "episode"
        : video.special
        ? "special"
        : video.insight
        ? "insight"
        : video.trailer
        ? "trailer"
        : (() => {
            throw new Error("unreachable");
          })();
      const title =
        video.episode ??
        video.animate ??
        video.special ??
        video.insight ??
        video.trailer ??
        (() => {
          throw new Error("unreachable");
        })();
      const url = video.public ?? video.members ?? "error";
      const id = url.replace("https://youtu.be/", "");

      if (
        playlist.include.season &&
        !(playlist.include.season.includes
          ? playlist.include.season.includes(campaign.season)
          : playlist.include.season == campaign.season)
      ) {
        continue;
      }

      if (playlist.include.world && playlist.include.world != campaign.world) {
        continue;
      }

      if (playlist.include.cast && playlist.include.cast != campaign.cast) {
        continue;
      }

      if (!playlist.include.type.includes(type)) {
        continue;
      }

      if (!playlist.include.version.includes("members") && !video.public) {
        continue;
      }

      videos.push({ id, title });
    }
  }

  for (const video of videos) {
    playlistMd += `- [${video.title}](https://www.youtube.com/watch?v=${video.id}&list=${playlist.id})\n`;
  }

  playlistMd += "\n";

  await replaceVideos(
    playlist.id,
    videos.map((v) => v.id)
  );
}

console.log(playlistMd);
Deno.writeTextFileSync("playlists.md", playlistMd);
