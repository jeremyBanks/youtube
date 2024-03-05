import * as googleapis from "npm:googleapis";
import * as dotenv from "@std/dotenv";
import { delay } from "@std/async";

import { spinning, truthy } from "./common.ts";

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
