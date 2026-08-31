Deno.permissions.request({ name: "read", path: "xxx://///example///\\" });

// The yaml storage suppresses Deno's default crash on an unhandled rejection so
// that in-memory data still reaches disk instead of being lost. That suppression
// used to swallow the failure as well: a run that aborted partway still exited
// 0, so an aborted publish looked exactly like a successful one. This asserts
// the process still reports failure, and that the flush to disk still happens.
Deno.test("an aborted run flushes storage and still exits non-zero", async () => {
  const repo = new URL(".", import.meta.url);
  const dir = await Deno.makeTempDir();
  try {
    const out = `${dir}/out.yaml`;
    const script = `${dir}/abort.ts`;
    await Deno.writeTextFile(
      script,
      [
        `import { z } from "zod";`,
        `import * as yaml from "${new URL("src/yaml.ts", repo).href}";`,
        `const rows = await yaml.open(${
          JSON.stringify(out)
        }, z.object({ a: z.number() }));`,
        `rows.push({ a: 1 });`,
        `throw new Error("simulated mid-run failure");`,
      ].join("\n"),
    );

    const { code } = await new Deno.Command(Deno.execPath(), {
      args: [
        "run",
        "--quiet",
        "--config",
        new URL("deno.jsonc", repo).pathname,
        "--allow-read",
        "--allow-write",
        "--allow-env",
        script,
      ],
      stdout: "null",
      stderr: "null",
    }).output();

    if (code !== 1) {
      throw new Error(`expected exit code 1 from an aborted run, got ${code}`);
    }

    // The whole point of suppressing the crash is that the data survives.
    const written = await Deno.readTextFile(out);
    if (!written.includes("a:")) {
      throw new Error(`storage was not flushed before exit, got: ${written}`);
    }
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
