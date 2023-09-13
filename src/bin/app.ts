// deno-lint-ignore-file no-unused-vars
import { App } from "../app.ts";

const { positional, named } = (() => {
  const positional: Array<string> = [];
  const named: Record<string, string> = {};

  for (let argument of Deno.args) {
    if (argument.startsWith("--")) {
      argument = argument.slice(2);
      const equalsIndex = argument.indexOf("=");

      let name = equalsIndex > -1 ? argument.slice(0, equalsIndex) : argument;
      name = name.replace(
        /([a-z])\-([a-z])/g,
        (_, a, b) => a + b.toUpperCase()
      );

      const value = equalsIndex > -1 ? argument.slice(equalsIndex + 1) : name;
      named[name] = value;
    } else {
      positional.push(argument);
    }
  }

  return {
    positional,
    named,
  };
})();

const actualPlaylists = new App();

if (positional.length === 0) {
  console.error("ERROR: no subcommand specified");
  Deno.exit(1);
}

const method = positional.shift()!;

const args = [named, ...positional];

if (args.length === 1 && Object.keys(named).length === 0) {
  args.pop();
}

const src = `actualPlaylists.${method}(${args
  .map((x) => JSON.stringify(x, null, 2))
  .join(", ")})`;
console.log(
  `%c> %c${src.replaceAll("\n", "\n  ")}`,
  "color: grey",
  "color: default"
);

try {
  const before = Date.now();
  const result = await (actualPlaylists as any)[method](...args);
  const duration = Date.now() - before;

  if (result !== undefined) {
    console.log("%c=", "color: green", result);
  } else {
    console.log(`%c= done in ${duration}ms`, "color: green");
  }
  Deno.exit(0);
} catch (error) {
  console.log("%c!", "color: red", error);
  Deno.exit(1);
}
