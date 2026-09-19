import * as yaml from "../src/yaml.ts";
import { Video, DropoutEpisode } from "../src/storage.ts";
const videos = Video.array().parse(await yaml.loadShards("./data/videos"));
const eps = DropoutEpisode.array().parse(await yaml.load("./data/dropout.yaml"));
for (const id of ["elycQJIb8EE", "DT3lpVlVgqw", "EzeRMyRU26I"]) {
  const v = videos.find((x) => x.videoId === id)!;
  console.log("=".repeat(70));
  console.log(`${id}  ${v.duration}s  members=${!!v.membersOnly}  published ${v.publishedAt.toISOString()}`);
  console.log(`  ${v.title}`);
  console.log(`  ${(v.description ?? "").split("\n")[0].slice(0, 130)}`);
}
console.log("\n=== Dropout: smartypants s3 latest, adventuring-party s25, toonout ep7 ===");
for (const e of eps.filter((e) =>
  (e.collection ?? "").startsWith("smartypants-season-3") ||
  (e.collection ?? "").startsWith("adventuring-party-season-25") ||
  e.slug === "my-husband"
).sort((a, b) => String(a.releaseDate) < String(b.releaseDate) ? -1 : 1).slice(-12)) {
  console.log(`${(e.collection ?? "").padEnd(30)} S${e.seasonNumber}E${e.episodeNumber} ${String(e.releaseDate).slice(0,10)} ${e.slug.padEnd(34)} ${e.title}`);
}
