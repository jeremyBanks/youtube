import * as yaml from "../src/yaml.ts";
import { Video } from "../src/storage.ts";
const videos = Video.array().parse(await yaml.loadShards("./data/videos"));
for (const id of ["kStwcIffMdE", "gd9qzhVjoDI", "xQZcb9FOSvM"]) {
  const v = videos.find((x) => x.videoId === id)!;
  const weekly = (v.description ?? "").toLowerCase().includes("this week on dropout");
  console.log(`${id} ${v.duration}s members=${!!v.membersOnly} published ${v.publishedAt.toISOString()} uploaded ${v.uploadedAt?.toISOString()} removedBefore=${v.removedBefore ?? "no"}${weekly ? " WEEKLY-SHORT" : ""}`);
  console.log(`   ${v.title}`);
  console.log(`   desc: ${(v.description ?? "").split("\n")[0].slice(0, 100)}`);
}
console.log("\n=== Dropout's own playlists holding either id ===");
const pls = await yaml.load("./data/channel-playlists.yaml") as Array<any>;
for (const p of pls) {
  const hits = (p.entries ?? []).filter((e: any) => ["kStwcIffMdE", "gd9qzhVjoDI"].includes(e.videoId));
  if (!hits.length) continue;
  console.log(`\n${p.playlistId} | ${p.title} | itemCount ${p.itemCount}`);
  for (const e of hits) {
    console.log(`   pos ${e.position} ${e.videoId} added ${String(e.addedAt).slice(0,10)} ${e.removedBefore ? "REMOVED " + String(e.removedBefore).slice(0,10) : ""}`);
  }
}
