import * as yaml from "../src/yaml.ts";
const ids = async (p: string) => {
  const d = await yaml.load(p) as Array<any>;
  const s = new Set<string>();
  for (const x of d) for (const e of x.entries ?? []) s.add(`${x.playlistId}/${e.videoId}`);
  return s;
};
const b = await ids("/tmp/claude-0/-home-user-youtube/79b3bc77-26af-521c-bbb4-dc9519fd343c/scratchpad/b7.yaml");
const a = await ids("./data/channel-playlists.yaml");
console.log(`playlist entries: ${b.size} -> ${a.size}, vanished ${[...b].filter((k)=>!a.has(k)).length}`);
