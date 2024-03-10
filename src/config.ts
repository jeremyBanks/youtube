import * as toml from "@std/toml";

import z from "npm:zod";

const Duration = z.string().regex(
  /^P(\d+Y)?(\d+M)?(\d+D)?(T(\d+H)?(\d+M)?(\d+S)?)?$/,
);

const ScanConfigToml = z.record(
  z.string(),
  z.object({
    "min-interval": Duration,
    "scan-all-since": Duration,
    "scan-stale-since": Duration,
    "stale-after": Duration,
  })
    .strict(),
);

type ScanConfig = Array<{
  channelHandle: string;
  /** don't scan if we've already completed a scan since this instant */
  minInterval?: Temporal.Instant;
  /** scans all videos since this instant */
  scanAllSince: Temporal.Instant;
  /** scan videos since this instant if they're stale or missing */
  scanStaleSince: Temporal.Instant;
  /** consider results stale if they're from before this instant */
  staleAfter: Temporal.Instant;
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
        minInterval: now.subtract(channelConfig["min-interval"]),
        scanAllSince: now.subtract(channelConfig["scan-all-since"]),
        scanStaleSince: now.subtract(channelConfig["scan-stale-since"]),
        staleAfter: now.subtract(channelConfig["stale-after"]),
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
      });
    }
    return config;
  })());
}
