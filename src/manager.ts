import { Innertube } from "https://cdn.jsdelivr.net/gh/jeremyBanks/YouTube.js@70426e30/deno.ts";

import * as yaml from "https://deno.land/std@0.198.0/yaml/mod.ts";
import * as z from "https://deno.land/x/zod@v3.19.1/mod.ts";

const Season = z
  .object({
    season: z.string(),
    debut: z.date(),
    world: z.union([
      z.literal("Spyre"),
      z.literal("Calorum"),
      z.literal("The Unsleeping City"),
    ]).optional(),
    cast: z.union([
      z.literal("Intrepid"),
      z.literal("Side"),
    ]),
    videos: z.array(
      z.intersection(
        z.object({
          episode: z.string().optional(),
          trailer: z.string().optional(),
          special: z.string().optional(),
          insight: z.string().optional(),
          public: z.string().optional(),
          members: z.string().optional(),
          "public compilation": z.string().optional(),
          "members compilation": z.string().optional(),
          "public parts": z.string().array().optional(),
          "members parts": z.string().array().optional(),
          "public deleted": z.string().optional(),
          "members deleted": z.string().optional(),
        }),
        z.union([
          z.object({
            episode: z.string(),
          }),
          z.object({
            trailer: z.string(),
          }),
          z.object({
            special: z.string(),
          }),
          z.object({
            insight: z.string(),
          }),
        ]),
        z.union([
          z.object({
            public: z.string(),
          }),
          z.object({
            members: z.string(),
          }),
          z.object({
            "public compilation": z.string(),
          }),
          z.object({
            "members compilation": z.string(),
          }),
          z.object({
            "public deleted": z.string(),
          }),
          z.object({
            "members deleted": z.string(),
          }),
        ])
      )
    ),
  })
  .strict();

const docs = yaml.parseAll(
  Deno.readTextFileSync("./dimension-20.yaml")
) as any[];

console.log(
  docs
    .map((x) => JSON.stringify(Season.parse(x), null, 2).replace("\n  ", "\n"))
    .join(" ")
);
console.log();
console.log(
  docs
    .map((x) => yaml.stringify(x, { noCompatMode: true, noArrayIndent: true }))
    .join("---\n")
);

// class YouTubeManager {
//   private conobjector(private youtubei: Innertube) {}

//   async create() {
//     return new YouTubeManager(
//       await Innertube.create({
//         cookie: localStorage.youtubeCookie,
//         retrieve_player: false,
//         fetch: async (a: any, b: any) => {
//           await new Promise((resolve) => setTimeout(resolve, 500));
//           console.log("Fetching", a, b);
//           return await fetch(a, b);
//         },
//       })
//     );
//   }
// }
