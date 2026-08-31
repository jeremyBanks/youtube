import * as googleapis from "googleapis";
import * as dotenv from "@std/dotenv";
import { delay } from "@std/async";

import { retryWithBackoff, spinning, truthy } from "./common.ts";
import { openChannelStorage } from "./storage.ts";
import type { Channel } from "./storage.ts";
import { only } from "./common.ts";
import { unwrap } from "./common.ts";

type Client = {
  youtube: googleapis.youtube_v3.Youtube;
  key: string;
};

type AuthenticatedClient = Client & {
  auth: googleapis.Auth.OAuth2Client;
};

type AuthMode =
  | { mode: "interactive" } // Default: local server on localhost:8783
  | { mode: "print-url-and-exit" } // Print auth URL and exit
  | { mode: "complete-with-url"; redirectUrl: string }; // Complete auth with redirect URL

let authMode: AuthMode = { mode: "interactive" };

export function setAuthMode(mode: AuthMode) {
  authMode = mode;
}

let client:
  | undefined
  | Promise<Client>;

let authenticatedClient:
  | undefined
  | Promise<AuthenticatedClient>;

/**
 * The client and API key, without authenticating.
 *
 * Reads of public data only need the API key, so callers that never touch
 * OAuth should use this: it is the difference between running unattended and
 * requiring a browser. `examplePath: null` disables dotenv's check that every
 * variable in .env.example is set, which would otherwise demand the OAuth
 * credentials even here, along with several that nothing reads at all.
 */
export const getClientAndKey = async (): Promise<Client> => {
  return await (client ??= (async () => {
    await dotenv.load({ export: true, examplePath: null });

    return {
      youtube: googleapis.google.youtube("v3"),
      key: truthy(Deno.env.get("YOUTUBE_API_KEY")),
    };
  })());
};

/** The client, API key, and an authenticated OAuth2 client. Writes need this. */
export const getClientAuthAndKey = async (): Promise<AuthenticatedClient> => {
  return await (authenticatedClient ??= (async () => {
    const { youtube, key } = await getClientAndKey();

    const auth = new googleapis.google.auth.OAuth2({
      clientId: Deno.env.get("YOUTUBE_CLIENT_ID"),
      clientSecret: Deno.env.get("YOUTUBE_CLIENT_SECRET"),
      redirectUri: "http://localhost:8783",
    });

    // Load stored tokens from localStorage if they exist
    if (localStorage.clientAccessToken && localStorage.clientRefreshToken) {
      auth.setCredentials({
        token_type: "Bearer",
        scope: "https://www.googleapis.com/auth/youtube",
        access_token: localStorage.clientAccessToken,
        refresh_token: localStorage.clientRefreshToken,
        expiry_date: localStorage.clientExpiryDate,
      });
    }

    await spinning("authenticating...", async () => {
      if (
        await auth.getAccessToken().then(
          () => false,
          () => true,
        )
      ) {
        const authUrl = auth.generateAuthUrl({
          access_type: "offline",
          scope: "https://www.googleapis.com/auth/youtube",
          redirect_uri: "http://localhost:8783",
        });

        let userAuthCode: string;

        if (authMode.mode === "print-url-and-exit") {
          console.log("\n=== AUTHENTICATION REQUIRED ===");
          console.log("Please open this URL in your browser to authenticate:");
          console.log(authUrl);
          console.log(
            "\nAfter authenticating, you'll be redirected to a URL that won't load.",
          );
          console.log(
            "Copy the full URL from your browser's address bar and run:",
          );
          console.log(`  deno task scan --auth-url="<paste-url-here>"\n`);
          Deno.exit(0);
        } else if (authMode.mode === "complete-with-url") {
          const redirectUrl = authMode.redirectUrl;
          const url = new URL(redirectUrl);
          const code = url.searchParams.get("code");
          if (!code) {
            throw new Error(
              `No authorization code found in URL. Expected URL with ?code=... parameter.\nReceived: ${redirectUrl}`,
            );
          }
          userAuthCode = code;
          console.log(
            "✓ Authorization code received, completing authentication...",
          );
        } else {
          // Interactive mode: local server
          console.log("Please open this URL to authenticate:", authUrl);

          userAuthCode = await new Promise((resolve) => {
            const abort = new AbortController();
            Deno.serve(
              { signal: abort.signal, port: 8783, hostname: "localhost" },
              (request) => {
                const url = new URL(request.url);
                resolve(url.searchParams.get("code")!);
                delay(1024).then(() => abort.abort());
                return new Response(
                  "Got it, thanks! You can close this window.",
                );
              },
            );
          });
        }

        const { tokens } = await auth.getToken(userAuthCode);

        localStorage.clientAccessToken = tokens.access_token;
        localStorage.clientRefreshToken = tokens.refresh_token;
        localStorage.clientExpiryDate = tokens.expiry_date;

        auth.setCredentials({
          token_type: "Bearer",
          scope: "https://www.googleapis.com/auth/youtube",
          access_token: localStorage.clientAccessToken,
          refresh_token: localStorage.clientRefreshToken,
          expiry_date: localStorage.clientExpiryDate,
        });
      }

      auth.on("tokens", (tokens) => {
        console.debug("Updated access tokens:", tokens);
        localStorage.clientAccessToken = tokens.access_token;
        localStorage.clientRefreshToken = tokens.refresh_token;
        localStorage.clientExpiryDate = tokens.expiry_date;

        auth.setCredentials({
          token_type: "Bearer",
          scope: "https://www.googleapis.com/auth/youtube",
          access_token: localStorage.clientAccessToken,
          refresh_token: localStorage.clientRefreshToken,
          expiry_date: localStorage.clientExpiryDate,
        });
      });
    });

    return { youtube, auth, key };
  })());
};

export async function playlistMetadata(playlistId: string) {
  const { youtube, key } = await getClientAndKey();

  console.debug(`youtube.playlists.list...`);
  const response = await youtube.playlists.list({
    id: [playlistId],
    part: ["snippet", "contentDetails", "status"],
    key,
  });

  return only(response.data?.items!);
}

export async function* playlistVideos(playlistId: string, opts: {
  getDetails?: boolean;
} = {}) {
  const { youtube, key } = await getClientAndKey();

  let pageToken: string | undefined = undefined;

  do {
    console.debug(`youtube.playlistItems.list...`);
    const response = await youtube.playlistItems.list({
      playlistId,
      part: ["snippet", "contentDetails"],
      key,
      maxResults: 50,
      pageToken,
    });

    const details: Record<
      string,
      googleapis.youtube_v3.Schema$Video | undefined
    > = {};
    if (opts.getDetails) {
      console.debug(`youtube.videos.list...`);
      const detailResponse = await youtube.videos.list({
        id: response.data.items?.map((item) => item.contentDetails?.videoId!),
        part: ["snippet", "contentDetails", "statistics"],
        key,
        maxResults: 50,
      });
      for (const detailItem of detailResponse.data?.items ?? []) {
        details[detailItem.id!] = detailItem;
      }
    }

    for (const entry of response.data.items ?? []) {
      const video = details[entry.contentDetails?.videoId!];
      yield { entry, video };
    }

    // This cast is neccessary due to a TypeScript limitation that breaks the inference
    // of `response` above if we don't explicitly type this, but it's still easier to
    // type this than to type that.
    // https://github.com/microsoft/TypeScript/issues/36687#issuecomment-593660244
    pageToken = (response.data.nextPageToken ?? undefined) as
      | string
      | undefined;
  } while (pageToken);
}

/** Retrieves the metadata for a given channel. */
export async function channelMetadata(handleOrUrl: string): Promise<Channel> {
  const { youtube, key } = await getClientAndKey();

  const channels = await openChannelStorage();

  // Unfortunately, the API converts handles to lowercase even if the URLs and UI use mixed-case,
  // so we need to normalize to that for case matching.
  handleOrUrl = handleOrUrl.replace(
    /^(https?:\/\/youtube\.com\/)?(\/)?(@)?/,
    "",
  ).replace(/\?si=\w+$/, "");

  let handle: undefined | string;
  let channelId: undefined | string;
  let existing: undefined | Channel;

  if (handleOrUrl.startsWith("channel/")) {
    channelId = handleOrUrl.slice("channel/".length);
    existing = channels.find((channel) => channel.channelId === channelId);
  } else {
    handle = handleOrUrl.toLowerCase();
    existing = channels.find((channel) => channel.handle === handle);
  }

  if (existing) {
    return existing;
  }

  const refreshedAt = new Date();

  let result;

  console.debug(`youtube.channels.list...`);
  if (handle) {
    result = await youtube.channels.list({
      key,
      forHandle: handle,
      part: [
        "brandingSettings",
        "contentDetails",
        "contentOwnerDetails",
        "id",
        "localizations",
        "snippet",
        "statistics",
        "status",
        "topicDetails",
      ],
    });
  } else {
    // XXX: this doesn't work for certain non-user channels like UCbwnaOxVtqUWmeJsdKTlqfg
    result = await youtube.channels.list({
      key,
      id: [channelId!],
      part: [
        "brandingSettings",
        "contentDetails",
        "contentOwnerDetails",
        "id",
        "localizations",
        "snippet",
        "statistics",
        "status",
        "topicDetails",
      ],
    });
  }

  const resultData = only(result.data.items!);

  const retrieved: Channel = {
    channelId: resultData.id!,
    name: resultData.snippet!.title!,
    createdAt: new Date(resultData.snippet!.publishedAt!),
    handle: resultData.snippet!.customUrl!.replace(/^@/, ""),
    refreshedAt,
    videoCount: Number(unwrap(resultData.statistics!.videoCount)),
    subscriberCount: Number(unwrap(
      resultData.statistics?.subscriberCount,
    )),
    viewCount: Number(unwrap(resultData.statistics?.viewCount)),
  };

  channels.push(retrieved);

  return retrieved;
}

export async function createPlaylist(
  title: string,
  description: string,
): Promise<string> {
  const { youtube, auth, key } = await getClientAuthAndKey();

  console.debug(`youtube.playlists.insert title: ${title}`);
  const response = await youtube.playlists.insert({
    auth,
    key,
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title,
        description,
      },
      status: {
        privacyStatus: "public",
      },
    },
  });

  const playlistId = response.data.id;
  if (!playlistId) {
    throw new Error("Failed to create playlist: no ID returned");
  }

  return playlistId;
}

export async function updatePlaylist(
  playlistId: string,
  title: string,
  description: string,
  videoIds: Array<string>,
  { dryRun = false, unlisted = false }: {
    dryRun?: boolean;
    unlisted?: boolean;
  } = {},
) {
  // A dry run reads the live playlist and reports the same diff a real
  // publish would act on, then stops before touching anything. Reads need
  // only the API key, so a dry run works without OAuth.
  const client = dryRun ? undefined : await getClientAuthAndKey();
  const youtube = client?.youtube ?? (await getClientAndKey()).youtube;
  const auth = client?.auth;
  const key = client?.key ?? (await getClientAndKey()).key;

  const existingMetadata = await retryWithBackoff(
    () => playlistMetadata(playlistId),
    {
      maxRetries: 4,
      initialDelayMs: 20000,
      onRetry: (attempt, error) => {
        console.warn(
          `Failed to fetch playlist metadata (attempt ${attempt}): ${error}`,
        );
      },
    },
  );

  const titleChanged = existingMetadata.snippet?.title?.trim() !== title.trim();
  const descriptionChanged =
    existingMetadata.snippet?.description?.trim() !== description?.trim();
  // A playlist we keep updating but do not want listed: same contents, same
  // description, just not shown on the channel or in search.
  const privacyStatus = unlisted ? "unlisted" : "public";
  const privacyChanged = existingMetadata.status?.privacyStatus !==
    privacyStatus;

  if (titleChanged || descriptionChanged || privacyChanged) {
    const what = [
      titleChanged && "title",
      descriptionChanged && "description",
      privacyChanged && `privacy to ${privacyStatus}`,
    ].filter(Boolean).join(", ");
    if (dryRun) {
      console.info(`  would update ${what}`);
    } else {
      console.info(`Updating ${what}.`);

      console.debug(`youtube.playlists.update id: ${playlistId}`);
      // Both parts go every time: playlists.update replaces the parts it is
      // given, so sending snippet alone would drop the privacy we just set,
      // and sending status alone would blank the title.
      await youtube.playlists.update({
        auth,
        key,
        part: ["snippet", "status"],
        requestBody: {
          id: playlistId,
          snippet: {
            title,
            description,
          },
          status: {
            privacyStatus,
          },
        },
      });
    }
  }

  const entryIdsToRemove: Array<string> = [];
  const existingVideoIds: Array<string> = [];
  let lastMatchedVideoIndex = -1;

  for await (const { entry } of playlistVideos(playlistId)) {
    const videoId = unwrap(entry.snippet?.resourceId?.videoId);
    const entryId = unwrap(entry.id);

    const existingIndex = videoIds.indexOf(videoId);
    if (existingIndex > lastMatchedVideoIndex) {
      existingVideoIds.push(videoId);
      lastMatchedVideoIndex = existingIndex;
    } else {
      entryIdsToRemove.push(entryId);
    }
  }

  const missingVideoCount = videoIds.length - existingVideoIds.length;

  console.info(
    `${existingVideoIds.length} entries okay, ${entryIdsToRemove.length} entries to remove, ${missingVideoCount} entries to insert.`,
  );

  if (dryRun) {
    // Name what would change, so a reviewer can judge the diff rather than
    // just count it. Nothing below this point runs.
    for (const videoId of videoIds) {
      if (!existingVideoIds.includes(videoId)) {
        console.info(`  + ${videoId}`);
      }
    }
    for (const entryId of entryIdsToRemove) {
      console.info(`  - entry ${entryId}`);
    }
    return;
  }

  for (const entryId of entryIdsToRemove) {
    console.debug(`youtube.playlistItems.delete id: ${entryId}`);
    try {
      await youtube.playlistItems.delete({
        id: entryId,
        auth,
        key,
      });
    } catch (response: unknown) {
      if (
        typeof response === "object" && response !== null &&
        "errors" in response &&
        Array.isArray(response.errors) &&
        response.errors[0]?.reason === "playlistItemNotFound"
      ) {
        // The entry is already gone. The listing these ids came from is
        // eventually consistent, so it can name an item that no longer exists,
        // and removal is idempotent: the state we wanted is the state we have.
        // Aborting here would strand the playlist half-rebuilt, with some
        // entries removed and no replacements inserted yet. Warn rather than
        // stay silent, so a run where every delete misses is still visible.
        console.warn(
          `playlist entry ${entryId} was already gone; continuing.`,
        );
      } else {
        throw response;
      }
    }
  }

  for (const [position, videoId] of videoIds.entries()) {
    if (existingVideoIds.includes(videoId)) {
      continue;
    } else {
      console.debug(`youtube.playlistItems.insert videoId: ${videoId}`);
      await youtube.playlistItems.insert({
        part: ["snippet"],
        requestBody: {
          snippet: {
            playlistId,
            resourceId: {
              "kind": "youtube#video",
              videoId,
            },
            position,
          },
        },
        auth,
        key,
      });
    }
  }
}

/**
 * Fetches metadata for specific video ids, without scanning any channel.
 * Fifty ids per request, one quota unit each, which is how a handful of
 * videos named only in the curation can be resolved without paying for a
 * complete scan of somebody else's channel.
 */
export async function videosById(
  videoIds: Array<string>,
): Promise<Map<string, googleapis.youtube_v3.Schema$Video>> {
  const { youtube, key } = await getClientAndKey();
  const results = new Map<string, googleapis.youtube_v3.Schema$Video>();
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    console.debug(`youtube.videos.list (${batch.length} ids)...`);
    const response = await youtube.videos.list({
      id: batch,
      part: ["snippet", "contentDetails"],
      key,
    });
    for (const video of response.data.items ?? []) {
      if (video.id) {
        results.set(video.id, video);
      }
    }
  }
  return results;
}

export type VideoDetails = {
  description: string;
  tags?: string[];
};

export async function getVideoDetails(
  videoIds: string[],
): Promise<Map<string, VideoDetails>> {
  const { youtube, key } = await getClientAndKey();
  const results = new Map<string, VideoDetails>();

  // Process in batches of 50 (API limit)
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);

    console.debug(`youtube.videos.list (${batch.length} videos)...`);
    const response = await youtube.videos.list({
      id: batch,
      part: ["snippet"],
      key,
      maxResults: 50,
    });

    for (const item of response.data?.items ?? []) {
      if (item.id && item.snippet) {
        results.set(item.id, {
          description: item.snippet.description ?? "",
          tags: item.snippet.tags ?? undefined,
        });
      }
    }
  }

  return results;
}
