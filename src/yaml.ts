import * as z from "npm:zod";
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

  const root = await load(path).then(arraySchema.parse, () => []);

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
    await dump(path, arraySchema.parse(root));

    if (shardKey) {
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
        await dump(path.replace(".yaml", `/${name}.yaml`), items);
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
    event.preventDefault();

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
        .replaceAll("\n- ", "\n\n- ")
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
