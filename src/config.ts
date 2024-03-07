import * as toml from "@std/toml";

import z from "npm:zod";

const ScanTime = z.union([
  // zero time
  z.literal("never"),
  // unlimited time
  z.literal("forever"),
  // ISO 8601 date and optionally time
  z.string().regex(/^\d{4}\-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?Z?$/),
  // ISO 8601 duration, typically representing an offset back from the current time
  z.string().regex(/^P(\d+Y)?(\d+M)?(\d+D)?(T(\d+H)?(\d+M)?(\d+S)?)?$/),
]);

const ChannelConfig = z.object({
  "min-interval": ScanTime,
  "scan-all-since": ScanTime,
  "scan-stale-since": ScanTime,
  "stale-after": ScanTime,
}).strict();

type ScanConfig = Record<string, {
  /** don't scan if we've already completed a scan since this time */
  minInterval?: Temporal.Instant;
  /** scans all videos since this instant */
  scanAllSince: Temporal.Instant;
  /** scan videos since this instant if they're stale or missing */
  scanStaleSince: Temporal.Instant;
  /** consider results stale if they're from before this instant */
  staleAfter: Temporal.Instant;
}>;

let scanConfig: undefined | Promise<ScanConfig> = undefined;

async function getScanConfig(): Promise<ScanConfig> {
  return await (scanConfig ??= (async () => {
    const text = await Deno.readTextFile("./config/scan.toml");
    const parsed = toml.parse(text);
    console.log({ parsed });
    // TODO: parse and merge config into this
    return parsed as unknown as ScanConfig;
  })());
}

console.log(await getScanConfig());
