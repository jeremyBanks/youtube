// deno-lint-ignore-file no-explicit-any
import * as yaml from "https://deno.land/std@0.198.0/yaml/mod.ts";
import { JsonValue } from "https://deno.land/std@0.198.0/json/mod.ts";
import { join as pathJoin } from "https://deno.land/std@0.201.0/path/mod.ts";

export const load = (path: string): Array<JsonValue> =>
  yaml.parseAll(Deno.readTextFileSync(path), {
    schema: yaml.JSON_SCHEMA,
  }) as Array<JsonValue>;

export const dump = (path: string, items: Array<JsonValue>) =>
  Deno.writeTextFileSync(
    path,
    items
      .map((x) =>
        yaml
          .stringify(x as any, {
            noCompatMode: true,
            noArrayIndent: true,
            lineWidth: -1,
            schema: yaml.JSON_SCHEMA,
          })
          .replaceAll("\n- ", "\n\n- ")
      )
      .join("\n---\n\n")
  );

const extension = ".yaml";

export const loadDirectory = async (
  path: string
): Promise<Record<string, JsonValue>> => {
  const contents: Record<string, JsonValue> = {};

  for await (const entry of Deno.readDir(path)) {
    if (entry.isFile && entry.name.endsWith(extension)) {
      contents[entry.name.slice(0, -extension.length)] = yaml.parse(
        await Deno.readTextFile(pathJoin(path, entry.name)),
        {
          schema: yaml.JSON_SCHEMA,
        }
      ) as JsonValue;
    }
  }

  return contents;
};

export const dumpDirectory = async (
  path: string,
  data: Record<string, JsonValue>
): Promise<void> => {
  const removedNames = [];
  for await (const entry of Deno.readDir(path)) {
    if (entry.isFile && entry.name.endsWith(extension)) {
      const name = entry.name.slice(0, -extension.length);
      if (data[name] === undefined) {
        removedNames.push(name);
      }
    }
  }

  for (const [name, value] of Object.entries(data)) {
    await dump(pathJoin(path, name + extension), [value]);
  }

  for (const name of removedNames) {
    await Deno.remove(pathJoin(path, name + extension));
  }
};
