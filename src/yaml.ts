import * as z from "zod";
import * as yaml from "@std/yaml";
import { join as pathJoin } from "@std/path";

const ArrayOfRecords = z.array(z.record(z.string(), z.unknown()));

/** Loads an array of objects from a multi-document YAML file path. */
export const load = (path: string): Array<Record<string, unknown>> =>
  ArrayOfRecords.parse(
    yaml.parseAll(Deno.readTextFileSync(path), {
      schema: yaml.DEFAULT_SCHEMA,
    })
  );

/** Dumps an array of objects from a multi-document YAML file path. */
export const dump = (path: string, items: Array<Record<string, unknown>>) =>
  Deno.writeTextFileSync(
    path,
    items
      .map((x) =>
        yaml
          .stringify(x, {
            noCompatMode: true,
            noArrayIndent: true,
            lineWidth: -1,
            schema: yaml.DEFAULT_SCHEMA,
          })
          .replaceAll("\n- ", "\n\n- ")
      )
      .join("\n---\n\n")
  );

const extension = ".yaml";

/** Loads a record of arrays of objects from a directory path of multi-document YAML files. */
export const loadDirectory = async (
  path: string
): Promise<Record<string, Array<Record<string, unknown>>>> => {
  const contents: Record<string, Array<Record<string, unknown>>> = {};

  for await (const entry of Deno.readDir(path)) {
    if (entry.isFile && entry.name.endsWith(extension)) {
      contents[entry.name.slice(0, -extension.length)] = load(
        pathJoin(path, entry.name)
      );
    }
  }

  return contents;
};

/** Dumps a record of arrays of objects from a directory path of multi-document YAML files. */
export const dumpDirectory = async (
  path: string,
  data: Record<string, Array<Record<string, unknown>>>
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
    dump(pathJoin(path, name + extension), value);
  }

  for (const name of removedNames) {
    await Deno.remove(pathJoin(path, name + extension));
  }
};
