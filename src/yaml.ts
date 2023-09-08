// deno-lint-ignore-file no-explicit-any
import * as yaml from "https://deno.land/std@0.198.0/yaml/mod.ts";
import { JsonValue } from "https://deno.land/std@0.198.0/json/mod.ts";

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

export default { dump, load };
