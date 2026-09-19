import * as yaml from "../src/yaml.ts";
import { DropoutEpisode } from "../src/storage.ts";
const eps = DropoutEpisode.array().parse(await yaml.load("./data/dropout.yaml"));
const ap = eps.filter((e) => (e.collection ?? "").startsWith("adventuring-party"));
const cols = new Map<string, number>();
for (const e of ap) cols.set(e.collection!, (cols.get(e.collection!) ?? 0) + 1);
console.log("adventuring-party collections:", [...cols].slice(-6).map(([c,n])=>`${c}=${n}`).join(" "));
console.log("\nnewest adventuring-party episodes:");
for (const e of ap.sort((a,b)=>String(a.releaseDate)<String(b.releaseDate)?-1:1).slice(-6)) {
  console.log(`  ${(e.collection??"").padEnd(30)} S${e.seasonNumber}E${e.episodeNumber} ${String(e.releaseDate).slice(0,10)} ${e.slug.padEnd(28)} ${e.title}`);
}
console.log("\ntoy-o / toylight talkback search:");
for (const e of eps.filter((e) => /toy-o|boyo/i.test(e.title ?? "") || /toy-o|boyo/i.test(e.slug))) {
  console.log(`  ${e.collection} S${e.seasonNumber}E${e.episodeNumber} ${e.releaseDate} ${e.slug} | ${e.title}`);
}
