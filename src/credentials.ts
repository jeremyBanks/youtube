/**
 * What the tasks say when a credential is missing.
 *
 * They used to say almost nothing. `truthy(Deno.env.get("YOUTUBE_API_KEY"))`
 * threw a TypeError that named the value it did not have -- "attempted to
 * unwrap falsey value (undefined)" -- so a machine without a key failed with a
 * stack trace through `getClientAndKey` and no indication that a Google Cloud
 * console page is the thing that fixes it. On a fresh checkout, or a fresh
 * container, that is the first thing anybody hits.
 *
 * So the message names the variable, says which tasks need it and which do
 * not, and carries the two console links that actually produce a key. It is
 * also the message the agent relays: the human is the only one who can open a
 * browser, and the instructions have to survive being copied out of a
 * terminal and pasted into a chat.
 */

/**
 * The Google Cloud project the credentials live in.
 *
 * Hardcoded because this repository publishes to one channel and has exactly
 * one project behind it, and a default that is right is worth more here than
 * a setting nobody would ever change. `GOOGLE_CLOUD_PROJECT` overrides it for
 * anybody running a fork.
 */
export const project = () =>
  Deno.env.get("GOOGLE_CLOUD_PROJECT") || "jeremy-ca";

/**
 * The YouTube Data API's own credentials page, scoped to the project.
 *
 * The generic console.cloud.google.com/apis/credentials lands on whichever
 * project the browser last had selected, which for anybody with more than one
 * is a page showing the wrong keys and no sign that it is the wrong page.
 * This URL names both the API and the project, so it opens on the keys that
 * this repository actually uses, and its "Create credentials" is already
 * scoped to the YouTube Data API.
 */
export const credentialsUrl = () =>
  "https://console.cloud.google.com/apis/api/youtube.googleapis.com/credentials" +
  `?project=${project()}`;

/** Where the YouTube Data API is switched on, if it ever gets switched off. */
export const enableApiUrl = () =>
  "https://console.cloud.google.com/apis/library/youtube.googleapis.com" +
  `?project=${project()}`;

/** Where the OAuth consent screen is configured, once per project. */
export const consentUrl = () =>
  "https://console.cloud.google.com/apis/credentials/consent" +
  `?project=${project()}`;

/**
 * The redirect the OAuth flow uses.
 *
 * A "Desktop app" client accepts any loopback port without registering one; a
 * "Web application" client accepts only what has been listed, so that type
 * needs this exact string.
 */
export const REDIRECT_URI = "http://localhost:8783";

export type CredentialName =
  | "YOUTUBE_API_KEY"
  | "YOUTUBE_CLIENT_ID"
  | "YOUTUBE_CLIENT_SECRET";

/** Thrown when a credential is absent, carrying the advice as its message. */
export class MissingCredentials extends Error {
  readonly missing: ReadonlyArray<CredentialName>;

  constructor(missing: ReadonlyArray<CredentialName>) {
    super(missingCredentialsMessage(missing));
    this.name = "MissingCredentials";
    this.missing = missing;
  }
}

/**
 * Wraps prose to 78 columns, leaving indented lines exactly as written.
 *
 * Hand-laid line breaks do not survive substitution: "Only publish needs
 * ${these}" was wrapped for the plural and ran nine columns long whenever a
 * single credential was missing. Indented lines are the URLs and the .env
 * lines, which have to stay on one line to be copied.
 */
function wrap(text: string, columns = 78): string {
  return text.split("\n").flatMap((line) => {
    if (line.startsWith(" ") || line.length <= columns) return [line];
    const out: Array<string> = [];
    let current = "";
    for (const word of line.split(" ")) {
      if (current && `${current} ${word}`.length > columns) {
        out.push(current);
        current = word;
      } else {
        current = current ? `${current} ${word}` : word;
      }
    }
    if (current) out.push(current);
    return out;
  }).join("\n");
}

const apiKeyAdvice = () =>
  wrap(`\
YOUTUBE_API_KEY is not set, and everything that reads YouTube needs it: scan, resolve, curate, and publish -- publish --dry-run included, since it reads the live playlists to work out the diff.

Open this, the YouTube Data API's own credentials page in the ${project()} project:

  ${credentialsUrl()}

The key is probably already there under "API keys" -- copy it. If it is not, "Create credentials" on that page makes one, already scoped to this API. If the page says the API is disabled, enable it here first:

  ${enableApiUrl()}

Restricting the key is optional, but if you restrict it, restrict it to the YouTube Data API v3 and nothing else or the scans will start failing.

The key reads public data only -- it cannot change a playlist -- so it is the only credential the scans ever need.`);

const oauthAdvice = (names: ReadonlyArray<string>) =>
  wrap(`\
${list(names)} ${names.length > 1 ? "are" : "is"} not set. Only publish needs ${
    names.length > 1 ? "these" : "this"
  }, because publish is the one task that writes to YouTube. Everything else runs on the API key alone.

They are on the same page as the key:

  ${credentialsUrl()}

under "OAuth 2.0 Client IDs". If there is no client there, "Create credentials" then "OAuth client ID" makes one; application type "Desktop app" is simplest, and a "Web application" client instead needs ${REDIRECT_URI} listed as an authorised redirect URI, which is where the flow sends you back. A consent screen has to exist first, once per project:

  ${consentUrl()}

Then authorise once with: deno task publish --headless`);

const storeAdvice = (missing: ReadonlyArray<CredentialName>) =>
  wrap(`\
Put ${
    missing.length > 1 ? "them" : "it"
  } in .env in the repository root, which is gitignored:

${missing.map((name) => `  ${name}=...`).join("\n")}

The browser step cannot be done from here, so a human has to do this part.`);

function list(names: ReadonlyArray<string>): string {
  if (names.length <= 1) return names.join("");
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

/** The advice for a set of missing credentials, as printed to stderr. */
export function missingCredentialsMessage(
  missing: ReadonlyArray<CredentialName>,
): string {
  const wanted = new Set(missing);
  const sections: Array<string> = [];

  if (wanted.has("YOUTUBE_API_KEY")) sections.push(apiKeyAdvice());

  const oauth = (["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET"] as const)
    .filter((name) => wanted.has(name));
  if (oauth.length) sections.push(oauthAdvice(oauth));

  sections.push(storeAdvice(missing));

  return sections.join("\n\n");
}

/**
 * The named credentials, or a `MissingCredentials` naming all that are absent.
 *
 * All of them: reporting the first and stopping would send somebody to the
 * console for the API key, then back again for the OAuth client.
 */
export function requireCredentials<
  const T extends ReadonlyArray<
    CredentialName
  >,
>(
  ...names: T
): Record<T[number], string> {
  const found = {} as Record<CredentialName, string>;
  const missing: Array<CredentialName> = [];
  for (const name of names) {
    const value = Deno.env.get(name);
    if (value) found[name] = value;
    else missing.push(name);
  }
  if (missing.length) throw new MissingCredentials(missing);
  return found;
}

/**
 * Runs a task, reporting absent credentials as advice rather than a stack.
 *
 * The trace is noise here: nothing in it is wrong, and the one useful line --
 * go and make a key -- is not in it at all.
 */
export async function runMain(main: () => Promise<unknown>): Promise<void> {
  try {
    await main();
  } catch (error) {
    if (error instanceof MissingCredentials) {
      console.error(`\n${error.message}\n`);
      Deno.exit(1);
    }
    throw error;
  }
}
