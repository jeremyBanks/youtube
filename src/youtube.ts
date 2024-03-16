// import { delay } from "@std/async";

import * as googleapis from "npm:googleapis";

// import { only, unwrap } from "./common.ts";

export type GoogleYoutubeClient = googleapis.youtube_v3.Youtube;
export type GoogleOAuth2Client = googleapis.Common.OAuth2Client;

export const youtube: GoogleYoutubeClient = googleapis.google.youtube(
  "v3",
);

/**
Client for YouTube Data API v3.
 */
export class YouTubeClient {
  #oauth2?: GoogleOAuth2Client;
  #tokens?: googleapis.Auth.Credentials;
  #apiKey?: string;

  constructor() {
  }

  // async withServedLocalhostOauth2(opts: {
  //   port: number;
  //   clientId: string;
  //   clientSecret: string;
  //   redirectUri: string;
  // }) {
  //   const authUrl = this.#oauth2.generateAuthUrl({
  //     access_type: "offline",
  //     scope: "https://www.googleapis.com/auth/youtube",
  //     redirect_uri: opts.redirectUri,
  //   });
  //   const userAuthCode: string = await new Promise((resolve) => {
  //     const abort = new AbortController();
  //     Deno.serve(
  //       { signal: abort.signal, port: 8783, hostname: "localhost" },
  //       (request) => {
  //         const url = new URL(request.url);
  //         resolve(url.searchParams.get("code")!);
  //         delay(1024).then(() => abort.abort());
  //         return new Response("Got it, thanks! You can close this window.");
  //       },
  //     );
  //   });
  // }

  // oauth2(opts: {
  //   clientId: string;
  //   clientSecret: string;
  //   redirectUri: string;
  // }) {
  //   this.#oauth2 = new googleapis.google.auth.OAuth2(opts);
  // }
}
