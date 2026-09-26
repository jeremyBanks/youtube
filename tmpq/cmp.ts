import * as yaml from "../src/yaml.ts";
const ids = async (path: string) => {
  const docs = await yaml.load(path) as Array<any>;
  const out = new Set<string>();
  for (const p of docs) for (const e of p.entries ?? []) out.add(`${p.playlistId}/${e.videoId}`);
  return out;
};
const before = await ids("/tmp/claude-0/-home-user-youtube/79b3bc77-26af-521c-bbb4-dc9519fd343c/scratchpad/b5.yaml");
const after = await ids("./data/channel-playlists.yaml");
const gone = [...before].filter((k) => !after.has(k));
console.log(`before ${before.size}, after ${after.size}, vanished ${gone.length}`);
for (const k of gone) console.log("  " + k);
