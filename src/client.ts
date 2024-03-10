import * as googleapis from "npm:googleapis";
import * as dotenv from "@std/dotenv";
import { delay } from "@std/async";

import { spinning, truthy } from "./common.ts";
import { openChannelStorage } from "./storage.ts";
import { Channel } from "./storage.ts";
import { only } from "./common.ts";
import { unwrap } from "./common.ts";

type AuthenticatedClient = {
  youtube: googleapis.youtube_v3.Youtube;
  auth: googleapis.Auth.OAuth2Client;
  key: string;
};

let authenticatedClient:
  | undefined
  | Promise<AuthenticatedClient>;

export const getClientAuthAndKey = async (): Promise<AuthenticatedClient> => {
  return await (authenticatedClient ??= (async () => {
    await dotenv.load({ export: true });

    const youtube = googleapis.google.youtube("v3");

    const key = truthy(Deno.env.get("YOUTUBE_API_KEY"));

    const auth = new googleapis.google.auth.OAuth2({
      clientId: Deno.env.get("YOUTUBE_CLIENT_ID"),
      clientSecret: Deno.env.get("YOUTUBE_CLIENT_SECRET"),
      redirectUri: "http://localhost:8783",
    });

    await spinning("authenticating...", async () => {
      if (localStorage.clientAccessToken) {
        auth.setCredentials({
          token_type: "Bearer",
          scope: "https://www.googleapis.com/auth/youtube",
          access_token: localStorage.clientAccessToken,
          refresh_token: localStorage.clientRefreshToken,
          expiry_date: localStorage.clientExpiryDate,
        });
      }

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

        console.log("Please open this URL to authenticate:", authUrl);

        const userAuthCode: string = await new Promise((resolve) => {
          const abort = new AbortController();
          Deno.serve(
            { signal: abort.signal, port: 8783, hostname: "localhost" },
            (request) => {
              const url = new URL(request.url);
              resolve(url.searchParams.get("code")!);
              delay(1024).then(() => abort.abort());
              return new Response("Got it, thanks! You can close this window.");
            },
          );
        });

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
  const { youtube, key } = await getClientAuthAndKey();

  const response = await youtube.playlists.list({
    id: [playlistId],
    part: ["snippet", "contentDetails"],
    key,
  });

  return only(response.data?.items!);
}

export async function* playlistVideos(playlistId: string) {
  const { youtube, key } = await getClientAuthAndKey();

  let pageToken: string | undefined = undefined;

  do {
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
    const detailResponse = await youtube.videos.list({
      id: response.data.items?.map((item) => item.contentDetails?.videoId!),
      part: ["snippet", "contentDetails"],
      key,
      maxResults: 50,
    });
    for (const detailItem of detailResponse.data?.items ?? []) {
      details[detailItem.id!] = detailItem;
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
export async function channelMetadata(handle: string): Promise<Channel> {
  const { youtube, auth } = await getClientAuthAndKey();

  const channels = await openChannelStorage();

  // Unfortunately, the API converts handles to lowercase even if the URLs and UI use mixed-case,
  // so we need to normalize to that for case matching.
  handle = handle.toLowerCase().replace(/^(https?:\/\/youtube\.com\/)?@/, "")
    .replace(/\?si=\w+$/, "");

  const existing = channels.find((channel) => channel.handle === handle);

  if (existing) {
    return existing;
  }

  const refreshedAt = new Date();

  const result = await youtube.channels.list({
    auth,
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
