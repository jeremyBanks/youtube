import * as dotenv from "@std/dotenv";
import * as yaml from "@std/yaml";
import z from "zod";
import { JsonValue } from "@std/json";
import { Spinner } from "@std/cli";
import { crypto } from "@std/crypto";
import { delay } from "@std/async";
import { google } from "googleapis";
import cloudquotas from "npm:@google-cloud/cloudquotas";
import { join as pathJoin } from "@std/path";

import { raise, unwrap, spinning } from "./common.ts";

if (import.meta.main) {
  await main();
}

/** Command-line entry point. */
export async function main() {
  await dotenv.load({ export: true });

  const youtube = google.youtube("v3");

  const { CloudQuotasClient } = cloudquotas.v1;
  const quotas = new CloudQuotasClient({
    credentials: {
      project_id: Deno.env.get("QUOTAS_PROJECT_ID"),
      private_key_id: Deno.env.get("QUOTAS_PRIVATE_KEY_ID"),
      private_key: Deno.env.get("QUOTAS_PRIVATE_KEY"),
      client_email: Deno.env.get("QUOTAS_CLIENT_EMAIL"),
    },
  });

  console.log("Listing quotas...");
  console.log(
    "quota!",
    await quotas.getQuotaInfo({
      name: "projects/jeremy-ca/locations/global/services/youtube.googleapis.com/quotaInfos/defaultPerDayPerProject",
    })
  );

  Deno.exit();

  const auth = new google.auth.OAuth2({
    clientId: unwrap(
      Deno.env.get("YOUTUBE_CLIENT_ID"),
      "missing YOUTUBE_CLIENT_ID"
    ),
    clientSecret: unwrap(
      Deno.env.get("YOUTUBE_CLIENT_SECRET"),
      "missing YOUTUBE_CLIENT_SECRET"
    ),
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
        () => true
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
            abort.abort();
            return new Response("Got it, thanks! You can close this window.");
          }
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

  const channel = await youtube.channels
    .list({
      auth,
      mine: true,
      part: ["brandingSettings", "id"],
    })
    .then(({ data }) => data.items?.[0]!);

  console.log(
    `Authenticated to channel: ${channel.brandingSettings?.channel?.title} (${channel.id})`
  );

  const key = unwrap(
    Deno.env.get("YOUTUBE_API_KEY"),
    "missing YOUTUBE_API_KEY"
  );

  const items = await youtube.playlistItems.list({
    playlistId: "UUMVPDXXXJj9nax0fr0Wfc048g",
    part: ["snippet", "contentDetails", "status"],
    key,
    maxResults: 50,
  });

  console.log(JSON.stringify(items, null, 2));
}

/** YouTube video ID */
const VideoId = z.string().regex(/^[0-9A-Za-z_\-]{11}$/);
type VideoId = z.TypeOf<typeof VideoId>;

/** YouTube channel ID */
const ChannelId = z.string().regex(/^[A-Z]C[0-9A-Za-z_\-]{22}$/);
type ChannelId = z.TypeOf<typeof ChannelId>;

/** Timestamp in milliseconds */
const Timestamp = z.number().positive().finite();
type Timestamp = z.TypeOf<typeof Timestamp>;

/** Duration in seconds */
const Duration = z.number().positive().finite();
type Duration = z.TypeOf<typeof Duration>;

/** A scan of a channel for new content */
const Scan = z.object({
  /** the channel ID being scanned */
  channelId: ChannelId,
  /** the timestamp at which this scan initiated. */
  timestamp: Timestamp,
  /** what is the minimum timestamp we're interested in including in this scan? if null, we want to include all videos with no minimum. */
  minTimestamp: Timestamp.nullable(),
  /** how was this scan completed? */
  completion: z.union([
    /** the scan was interrupted before completion, or is still in progress */
    z.literal("incomplete"),
    /** the scan completely exhausted the available videos, reaching either the end of the video list, or the end of the specified time range */
    z.literal("exhaustion"),
    /** the scan reached a video that was already captured by a previously completed scan covering at least the same time range */
    z.literal("overlap"),
  ]),
});
type Scan = z.TypeOf<typeof Scan>;

/** YouTube video metadata as captured by a scan.
 *
 * The channel ID isn't included inline because videos are already stored by channel ID.
 */
const Video = z.object({
  videoId: VideoId,
  title: z.string().min(1),
  description: z.string(),
  publishedAt: Timestamp,
  duration: Duration,
  embeddable: z.boolean(),
  unlisted: z.boolean().default(false),
  // Oh, right: the official API doesn't let you know if something is a members-only video. And other limitations too. Google neglects all their products so much. Can it even see members-only videos? I think so, but I guess we'll have to see...
  // Okay, but we can use the associated members-only playlist (see UUMOPDXXXJj9nax0fr0Wfc048g) to find members-only videos specifically... and this even works if we aren't authenticated! Okay! That's a very good workaround!
  // And unlike the very-similar UUMF playlist, this one also includes unlisted videos! Like ndTplebrzs8! Weird! Okay, they're not delisted, they're live streams? As are listed in the UUMV playlist. weird but okay. So we'll use UU (all public videos + shorts + live) and UUMO (all members only videos + shorts(?) + live)
  // I guess to make this sensible we may want to separate out discovery of video IDs from fetching their details. But maybe the API doesn't even make that make sense. We'll see!
  // I guess we need to confirm whether the API even works with these playlists.
  membersOnly: z.boolean().default(false),
});
