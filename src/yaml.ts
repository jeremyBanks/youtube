import * as z from "zod";
import * as yaml from "@std/yaml";
import { delay } from "@std/async";
import { dirname } from "@std/path";

const ArrayOfRecords = z.array(z.record(z.string(), z.unknown()));

/**
 * Opens an array of objects from a multi-document YAML file path,
 * automatically writing changes back to disk periodically and before
 * the process exits. The array will never be garbage-collected.
 */
export const open = async <
  Schema extends z.ZodTypeAny,
  SortKey extends string & keyof z.TypeOf<Schema>,
>(
  path: string,
  schema: Schema,
  sortKeys?: Array<SortKey | `-${SortKey}`>,
  shardKey?: (item: z.TypeOf<Schema>) => Promise<string>,
): Promise<Array<z.TypeOf<Schema>>> => {
  const arraySchema = schema.array();

  // With a shardKey the directory beside `path` is the storage, not the file:
  // every `<path-without-.yaml>/*.yaml` is read and the single file is never
  // written. data/videos.yaml was 11 MB before it held descriptions and would
  // have been thirty after; split by channel each piece is a size a diff can
  // be read at, and every record now carries the channelId that decides which
  // piece it belongs to. Ids looked up off a channel we do not scan live in
  // data/resolved-videos.yaml, so nothing is left without a home.
  const shardDir = path.replace(/\.yaml$/, "");
  const root: Array<z.TypeOf<Schema>> = shardKey
    ? arraySchema.parse(await loadShards(shardDir))
    : await load(path).then(arraySchema.parse, () => []);

  const dumpThis = async () => {
    if (sortKeys) {
      for (const sortKey of sortKeys.toReversed()) {
        if (!sortKey.startsWith("-")) {
          root.sort((a, b) => {
            if (a[sortKey] < b[sortKey]) {
              return -1;
            } else if (a[sortKey] > b[sortKey]) {
              return +1;
            } else {
              return 0;
            }
          });
        } else {
          const reverseKey = sortKey.slice(1);
          root.sort((a, b) => {
            if (a[reverseKey] > b[reverseKey]) {
              return -1;
            } else if (a[reverseKey] < b[reverseKey]) {
              return +1;
            } else {
              return 0;
            }
          });
        }
      }
    }
    if (!shardKey) {
      await dump(path, arraySchema.parse(root));
      return;
    }

    const shards: Map<string, Array<z.TypeOf<Schema>>> = new Map();
    for (const item of root) {
      const key = await shardKey(item);
      if (shards.has(key)) {
        shards.get(key)!.push(item);
      } else {
        shards.set(key, [item]);
      }
    }
    for (const [name, items] of shards) {
      await dump(`${shardDir}/${name}.yaml`, arraySchema.parse(items));
    }
    // A shard whose last record has gone must go with it. Nothing removed
    // stale shards before, so a purged channel's file sat there holding the
    // records the purge had just taken out of the main file -- which is only
    // survivable while the main file is the one that counts, and it no
    // longer is.
    for await (const entry of Deno.readDir(shardDir)) {
      if (!entry.isFile || !entry.name.endsWith(".yaml")) continue;
      if (!shards.has(entry.name.slice(0, -".yaml".length))) {
        await Deno.remove(`${shardDir}/${entry.name}`);
      }
    }
  };

  const onBeforeUnload = (event: Event) => {
    event.preventDefault();

    console.debug(`Dumping ${path} before clean shutdown.`);
    dumpThis();
  };
  addEventListener("beforeunload", onBeforeUnload, { once: true });

  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    // Suppressing the default crash is what lets the in-memory data reach disk
    // instead of being lost, but on its own it also swallows the failure: the
    // process goes on to exit 0, so an aborted run looks like a successful one.
    // Setting the exit code rather than calling Deno.exit keeps that guarantee
    // while still letting every storage's handler finish flushing first.
    event.preventDefault();
    Deno.exitCode = 1;

    console.error(
      `Dumping ${path} before shutdown due to unhandled error:`,
      event.reason,
    );
    dumpThis();
  };
  addEventListener("unhandledrejection", onUnhandledRejection, { once: true });

  (async () => {
    while (true) {
      console.debug(`Dumping ${path} periodically.`);
      await dumpThis();

      await delay(128_000, {
        persistent: false,
      });
    }
  })();

  return root;
};

/**
 * Loads every shard in a directory, as one array.
 *
 * A missing directory is an empty storage, the same way a missing file is:
 * that is what makes a fresh clone and a first run work without a special
 * case.
 */
export const loadShards = async (dir: string) => {
  const items: Array<unknown> = [];
  let names: Array<string>;
  try {
    names = [];
    for await (const entry of Deno.readDir(dir)) {
      if (entry.isFile && entry.name.endsWith(".yaml")) names.push(entry.name);
    }
  } catch {
    return [];
  }
  for (const name of names.sort()) {
    items.push(...(await load(`${dir}/${name}`).catch(() => [])));
  }
  return items;
};

/** Loads an array of objects from a multi-document YAML file path. */
export const load = async (
  path: string,
): Promise<Array<Record<string, unknown>>> =>
  ArrayOfRecords.parse(
    yaml.parseAll(await Deno.readTextFile(path), {
      schema: yaml.DEFAULT_SCHEMA,
    }),
  );

/** Dumps an array of objects from a multi-document YAML file path. */
export const dump = async (
  path: string,
  items: Array<Record<string, unknown>>,
) => {
  let data = items
    .map((x) =>
      yaml
        .stringify(x, {
          noCompatMode: true,
          noArrayIndent: true,
          lineWidth: -1,
          schema: yaml.DEFAULT_SCHEMA,
          skipInvalid: true,
        })
    )
    .join("\n---\n\n");

  let maxLeadingKeyLength = 0;
  for (const leadingKey of data.matchAll(/^\w+: \S/mg)) {
    if (leadingKey[0].length > maxLeadingKeyLength) {
      maxLeadingKeyLength = leadingKey[0].length;
    }
  }

  data = data.replaceAll(
    /^\w+: \S/mg,
    (leadingKey) =>
      leadingKey.slice(0, -1).padEnd(maxLeadingKeyLength - 1) +
      leadingKey.slice(-1),
  );

  await Deno.mkdir(dirname(path), {
    recursive: true,
  });

  await Deno.writeTextFile(
    path,
    data,
  );
};
