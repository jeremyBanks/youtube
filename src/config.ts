import * as toml from "@std/toml";
import * as yaml from "./yaml.ts";

import z from "zod";
import { VideoId } from "./storage.ts";

const Duration = z.string().regex(
  /^P(\d+Y)?(\d+M)?(\d+D)?(T(\d+H)?(\d+M)?(\d+S)?)?$/,
);

const ScanConfigToml = z.record(
  z.string(),
  z.object({
    "incremental-interval": Duration,
    // How often to scan back a fixed window, and how far back that reaches.
    // Optional, and only meaningful together.
    "recent-interval": Duration.optional(),
    "recent-window": Duration.optional(),
    "complete-interval": Duration,
  })
    .strict()
    .refine(
      (c) =>
        (c["recent-interval"] === undefined) ===
          (c["recent-window"] === undefined),
      { message: "recent-interval and recent-window must be set together" },
    ),
);

type ScanConfig = Array<{
  channelHandle: string;
  /**
   * The three cadences, as ISO durations rather than as the instants this
   * used to derive. A jittered due-check needs the duration and the last
   * attempt, so it can offset each channel differently; and a derived
   * `now - interval` was fixed at the moment the config was first read, which
   * goes stale during a run long enough to matter.
   */
  incrementalInterval: string;
  recentInterval?: string;
  completeInterval: string;
  /**
   * How far back a windowed scan reaches. Not a cadence — it is the boundary
   * such a scan stops at — and doubles as the flag for whether a channel is
   * tracked at all.
   */
  recentWindowStart?: Temporal.Instant;
}>;

let scanConfig: undefined | Promise<ScanConfig> = undefined;

export async function getScanConfig(): Promise<ScanConfig> {
  return await (scanConfig ??= (async () => {
    const text = await Deno.readTextFile("./config/scan.toml");
    const parsed = ScanConfigToml.parse(toml.parse(text));
    const config: ScanConfig = [];
    const now = Temporal.Now.instant();
    for (const [channelHandle, channelConfig] of Object.entries(parsed)) {
      const recentInterval = channelConfig["recent-interval"];
      const recentWindow = channelConfig["recent-window"];
      config.push({
        channelHandle,
        incrementalInterval: channelConfig["incremental-interval"],
        recentInterval,
        completeInterval: channelConfig["complete-interval"],
        recentWindowStart: recentWindow
          ? now.toZonedDateTimeISO("UTC").subtract(recentWindow).toInstant()
          : undefined,
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
    live: z.boolean().optional(),
    free: z.boolean().optional(),
    talkback: z.boolean().optional(),
    /** publish it as unlisted rather than public, but keep updating it */
    unlisted: z.boolean().optional(),
    skip: z.boolean().optional(),
  })
    .strict(),
);
type AggregateConfig = Array<{
  playlistId: string | null;
  name: string;
  description: string;
  shows?: Array<string>;
  types?: Array<string>;
  worlds?: Array<string>;
  seasons?: Array<string>;
  casts?: Array<string>;
  live?: boolean;
  free?: boolean;
  talkback?: boolean;
  unlisted?: boolean;
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
      // Allow empty string or special markers to indicate no playlist ID
      const normalizedPlaylistId =
        (!playlistId || playlistId === "null" || playlistId === "none")
          ? null
          : playlistId;

      config.push({
        playlistId: normalizedPlaylistId,
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
        live: aggregateConfig.live,
        free: aggregateConfig.free,
        talkback: aggregateConfig.talkback,
        unlisted: aggregateConfig.unlisted,
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
    live: z.boolean().optional(),
    videos: z.array(
      z.object({
        published: z.date().optional(), // XXX: should this be optional?
        // Marks an Adventuring Party talkback. These live as `bts` entries
        // interleaved into the campaign they accompany, which makes them
        // indistinguishable from any other extra; this flag is what lets a
        // playlist select them without disturbing that placement.
        talkback: z.boolean().optional(),
        // Explicitly links this entry to a watch.dropout.tv episode slug,
        // for verify-dates cross-referencing when title matching can't.
        dropout: z.string().optional(),
        trailer: z.string().optional(),
        episode: z.string().optional(),
        special: z.string().optional(),
        bts: z.string().optional(),
        animation: z.string().optional(),
        external: z.string().optional(),
        members: VideoId.optional(),
        "removed members": VideoId.or(VideoId.array()).optional(),
        public: VideoId.optional(),
        "public compilation": VideoId.optional(),
        "public copy": VideoId.optional(),
        // The vertical cut Dropout uploads alongside some trailers for
        // Shorts: same content, same length, 405x720 instead of 1280x720.
        // Recorded so it is not mistaken for a missing video, and never
        // published, since the horizontal upload is the one to watch.
        "public short": VideoId.optional(),
        "public parts": VideoId.or(VideoId.array()).optional(),
        "deleted public parts": VideoId.or(VideoId.array()).optional(),
        paid: VideoId.optional(),
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

const DropoutConfigToml = z.object({
  "delay-seconds": z.number().positive(),
  "budget": z.number().int().positive(),
  /** collection-slug prefixes whose episode details are fetched first */
  "priority": z.string().array().optional(),
  /**
   * curation show name -> collection-slug prefix(es), for cross-referencing.
   * A list, because a show is not always one collection: Dropout Presents
   * files each special under its own collection, and Mice and Murder is a
   * Dimension 20 campaign that does not sit under the dimension-20 prefix.
   */
  "shows": z.record(z.string(), z.string().or(z.string().array())).optional(),
}).strict();

export type DropoutConfig = {
  delaySeconds: number;
  budget: number;
  priority: Array<string>;
  shows: Record<string, Array<string>>;
};

let dropoutConfig: undefined | Promise<DropoutConfig> = undefined;
export async function getDropoutConfig(): Promise<DropoutConfig> {
  return await (dropoutConfig ??= (async () => {
    const text = await Deno.readTextFile("./config/dropout.toml");
    const parsed = DropoutConfigToml.parse(toml.parse(text));
    return {
      delaySeconds: parsed["delay-seconds"],
      budget: parsed["budget"],
      priority: parsed["priority"] ?? [],
      shows: Object.fromEntries(
        Object.entries(parsed["shows"] ?? {}).map((
          [show, prefixes],
        ) => [show, [prefixes].flat()]),
      ),
    };
  })());
}
