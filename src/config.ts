import * as toml from "@std/toml";
import * as yaml from "./yaml.ts";

import z from "npm:zod";
import { VideoId } from "./storage.ts";

const Duration = z.string().regex(
  /^P(\d+Y)?(\d+M)?(\d+D)?(T(\d+H)?(\d+M)?(\d+S)?)?$/,
);

const ScanConfigToml = z.record(
  z.string(),
  z.object({
    "incremental-interval": Duration,
    "complete-interval": Duration,
  })
    .strict(),
);

type ScanConfig = Array<{
  channelHandle: string;
  maxIncrementalAge?: Temporal.Instant;
  maxCompleteAge: Temporal.Instant;
}>;

let scanConfig: undefined | Promise<ScanConfig> = undefined;

export async function getScanConfig(): Promise<ScanConfig> {
  return await (scanConfig ??= (async () => {
    const text = await Deno.readTextFile("./config/scan.toml");
    const parsed = ScanConfigToml.parse(toml.parse(text));
    const config: ScanConfig = [];
    const now = Temporal.Now.instant();
    for (const [channelHandle, channelConfig] of Object.entries(parsed)) {
      config.push({
        channelHandle,
        maxIncrementalAge: now.toZonedDateTimeISO("UTC").subtract(
          channelConfig["incremental-interval"],
        ).toInstant(),
        maxCompleteAge: now.toZonedDateTimeISO("UTC").subtract(
          channelConfig["complete-interval"],
        ).toInstant(),
      });
    }
    return config;
  })());
}

const AggregateConfigToml = z.record(
  z.string(),
  z.object({
    name: z.string(),
    description: z.string(),
    show: z.string().array().or(z.string()).optional(),
    type: z.string().array().or(z.string()).optional(),
    world: z.string().array().or(z.string()).optional(),
    cast: z.string().array().or(z.string()).optional(),
    season: z.string().array().or(z.string()).optional(),
    free: z.boolean().optional(),
    skip: z.boolean().optional(),
  })
    .strict(),
);
type AggregateConfig = Array<{
  playlistId: string;
  name: string;
  description: string;
  shows?: Array<string>;
  types?: Array<string>;
  worlds?: Array<string>;
  seasons?: Array<string>;
  casts?: Array<string>;
  free?: boolean;
  skip?: boolean;
}>;

let aggregateConfig: undefined | Promise<AggregateConfig> = undefined;
export async function getAggregateConfig(): Promise<AggregateConfig> {
  return await (aggregateConfig ??= (async () => {
    const text = await Deno.readTextFile("./config/aggregate.toml");
    const parsed = AggregateConfigToml.parse(toml.parse(text));
    const config: AggregateConfig = [];
    for (const [playlistId, aggregateConfig] of Object.entries(parsed)) {
      if (aggregateConfig.skip) {
        continue;
      }
      config.push({
        playlistId,
        name: aggregateConfig.name,
        description: aggregateConfig.description,
        shows: aggregateConfig.show
          ? [aggregateConfig.show].flat(2)
          : undefined,
        types: aggregateConfig.type
          ? [aggregateConfig.type].flat(2)
          : undefined,
        casts: aggregateConfig.cast
          ? [aggregateConfig.cast].flat(2)
          : undefined,
        worlds: aggregateConfig.world
          ? [aggregateConfig.world].flat(2)
          : undefined,
        seasons: aggregateConfig.season
          ? [aggregateConfig.season].flat(2)
          : undefined,
        free: aggregateConfig.free,
        skip: aggregateConfig.skip,
      });
    }
    return config;
  })());
}

const SeasonsCurationYaml = z.array(
  z.object({
    show: z.string(),
    season: z.string().optional(),
    cast: z.string().optional(),
    world: z.string().optional(),
    videos: z.array(
      z.object({
        published: z.date(),
        trailer: z.string().optional(),
        episode: z.string().optional(),
        special: z.string().optional(),
        bts: z.string().optional(),
        animation: z.string().optional(),
        external: z.string().optional(),
        members: VideoId.optional(),
        "removed members": VideoId.optional(),
        "members deleted": VideoId.optional(),
        public: VideoId.optional(),
        "public compilation": VideoId.optional(),
        "public copy": VideoId.optional(),
        "public parts": VideoId.or(VideoId.array()).optional(),
        "deleted public parts": VideoId.or(VideoId.array()).optional(),
      }).strict(),
    ),
  }).strict(),
);
type SeasonsCuration = z.TypeOf<typeof SeasonsCurationYaml>;

let seasonsCuration: undefined | Promise<SeasonsCuration> = undefined;
export async function getSeasonsCuration(): Promise<SeasonsCuration> {
  return await (seasonsCuration ??= (async () => {
    const parsed = SeasonsCurationYaml.parse(
      await yaml.load("./curation/seasons.yaml"),
    );
    return parsed;
  })());
}
