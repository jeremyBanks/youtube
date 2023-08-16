import { Innertube } from "https://cdn.jsdelivr.net/gh/jeremyBanks/YouTube.js@70426e30/deno.ts";

import * as yaml from "https://deno.land/std@0.198.0/yaml/mod.ts";

const docs = yaml.parseAll(
  Deno.readTextFileSync("./destinations.yaml")
) as any[];

console.log(
  docs.map((x) => JSON.stringify(x, null, 2).replace("\n  ", "\n")).join(" ")
);
console.log();
console.log(docs.map((x) => yaml.stringify(x)).join("---\n"));

class YouTubeManager {
  private constructor(private youtubei: Innertube) {}

  async create() {
    return new YouTubeManager(
      await Innertube.create({
        cookie: localStorage.youtubeCookie,
        retrieve_player: false,
        fetch: async (a: any, b: any) => {
          await new Promise((resolve) => setTimeout(resolve, 500));
          console.log("Fetching", a, b);
          return await fetch(a, b);
        },
      })
    );
  }
}
