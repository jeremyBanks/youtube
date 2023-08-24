import { raise } from "../common.ts";
import yaml from "../yaml.ts";
import { replaceVideos } from "../youtube.ts";

const _catalogueData = yaml.load("catalogue.yaml");
const campaignData = yaml.load("campaigns.yaml") as Array<{
  season: string;
  from: "Dimension 20";
  debut: string;
  cast?: string;
  world?: string;
  videos: Array<{
    trailer?: string;
    episode?: string;
    animation?: string;
    bts?: string;
    special?: string;
    public?: string;
    "public parts"?: Array<string>;
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
    type: Array<"episode" | "special" | "trailer" | "bts" | "animation">;
    version: Array<"public" | "members">;
  };
}>;
let playlistMd =
  "# [Playlists](https://www.youtube.com/@actualplaylists/playlists?view=1)\n\n";

for (const playlist of playlistSpecs) {
  if (!playlist.id) {
    break;
  }

  playlistMd += `## [${playlist.name}](https://www.youtube.com/playlist?list=${
    playlist.id
  })

> ${playlist.description.trim().replaceAll("\n", "\n> ")}

`;

  const videos: Array<{
    id: string;
    title: string;
  }> = [];

  for (const campaign of campaignData) {
    for (const video of campaign.videos) {
      const type = video.animation
        ? "animation"
        : video.episode
        ? "episode"
        : video.special
        ? "special"
        : video.bts
        ? "bts"
        : video.trailer
        ? "trailer"
        : raise("missing type for", video);
      const title =
        video.episode ??
        video.animation ??
        video.special ??
        video.bts ??
        video.trailer ??
        raise("missing title for", video);
      const url =
        video.public ??
        video["public parts"] ??
        video.members ??
        raise("missing video for", video);

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

      if (playlist.include.from && playlist.include.from != campaign.from) {
        continue;
      }

      if (playlist.include.type && !playlist.include.type.includes(type)) {
        continue;
      }

      if (
        playlist.include.version &&
        !playlist.include.version.includes("members") &&
        !(video.public || video["public parts"])
      ) {
        continue;
      }

      if (typeof url == "string") {
        const id = url.replace("https://youtu.be/", "");
        videos.push({ id, title });
      } else {
        for (const one_url of url) {
          const id = one_url.replace("https://youtu.be/", "");
          videos.push({ id, title });
        }
      }
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
