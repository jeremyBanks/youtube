// deno-lint-ignore-file no-explicit-any
import * as yaml from "https://deno.land/std@0.198.0/yaml/mod.ts";
import * as json from "https://deno.land/std@0.198.0/json/mod.ts";
import { youtubei } from "./src/youtube.ts";

const playlistId = "PLObfuAmZm9pDqgg3_8kXgd7uFrOFmGVUG";
const title = "Dimension 20 (All Full Episodes)";
const description = `Mega-playlist with every episode of Dimension 20 in order. Free videos are used where possible, while member-only videos used for the rest. Episodes are all in chronological release order, except for special live episodes, with are grouped with their associated seasons even if they occurred a bit later.

Dimension 20 is an Actual Play TTRPG show from CollegeHumor/Dropout, featuring original campaigns of Dungeons and Dragons and other tabletop RPG systems.`;
const videoIds = [
  "_zZxCVBi7-k",
  "DZ5rprmAHhE",
  "d2r0NBbJcww",
  "cet2H3L_Xxk",
  "Uly8iW-oowE",
  "LrUbqcBYx6s",
  "XJ0SMDQZrCQ",
  "ZRkL7h1usw8",
  "DczPnt0YCTg",
  "2i_yAoWqPJA",
  "nJKSJwYhxOw",
  "eZQSVAnW5Yk",
  "DVh_FQnW5eM",
  "C6lnrDGbOag",
  "xYZnyhOc4Rw",
  "G4bdPAmK4fg",
  "-ulIYMA0sqg",
  "Ekgd2ePymD8",
  "GiEQO77PV9Q",
  "QU45vh8K6_c",
  "XCcgJbGf3es",
  "ITLvyb41lDA",
  "8OUNHM0dMZ8",
  "2Kktwa0kqaU",
  "uIxx5ID1BU8",
  "zme6xXL1WQ8",
  "k8FPa4KjoUE",
  "uFrZM6A4t44",
  "lfCb7uMW8JM",
  "8n0PA87sugg",
  "MeC7Jhnb8cE",
  "22jrl5-8tNQ",
  "RsIuqJiZdnY",
  "deJ-bNFYVe4",
  "54SgvyoOI2I",
  "GRjDgEXTrB0",
  "3HzN11pnXdw",
  "8rz--KiKHYU",
  "WfM1isoVe8U",
  "RcvVO3xd-po",
  "J5D0ij7cv-c",
  "I5rJSs8QxvY",
  "3o39rSn-K6o",
  "r8FZ9Tac5M8",
  "1zQIIYDUdCw",
  "GItg7LXFW4M",
  "5IRQ9s2Y-7U",
  "Df_mE-oF1OM",
  "Arq-6m91-oQ",
  "mWjkxC84foM",
  "BRsAaAYdbmQ",
  "nXsCz9Hbv8M",
  "olqzGm7MSzw",
  "moICMKn4f1c",
  "powei5k8GR0",
  "p7x6EzePaeg",
  "YmEtDw_M94o",
  "9yNsjuMvEoE",
  "La_0tmztgVo",
  "FuCA0JgxFTc",
  "d43Hl6_hq24",
  "USDoNZ-Ygdc",
  "Sr0Zi59jpEc",
  "7rjNgO-YUos",
  "l-y98OYaXu8",
  "2ZnZRQlMIms",
  "iDtVwR5IxTg",
  "qX2Im7TwUSo",
  "VesqRsUy7sc",
  "uc0zK0IRMKM",
  "REnc_wXkHnc",
  "t8mO8UlfDho",
  "rKXhP1mV5A8",
  "QSVHCBuS7ys",
  "2AkMeUhcTT0",
  "YpbxZ7CBTwU",
  "VRpIyUkeRY4",
  "zjkhYwst2tE",
  "HJUWVd7byRI",
  "XMaGdEKIfiI",
  "l-AUIcjoln4",
  "KbOetf8U6TY",
  "bSvcfWDgC7I",
  "i9OczQ1vCvo",
  "u6nBCXfCUVE",
  "yPDSSCV02xc",
  "he8QU5a9HfA",
  "HuMbE1G2O2c",
  "uofsyQtHjq0",
  "qrllCdwZP3w",
  "VqTE22HU-1A",
  "O0VHseTnWNM",
  "SshOcZR5_Do",
  "-Ho5CdsUIQc",
  "Zacas5bn0Y4",
  "EUtbkIyYbSs",
  "sM9t4jCeL_o",
  "gmU6DEXP4Q0",
  "AvwtIPtuWvQ",
  "d7HNkywItkU",
  "hdv8-A75yEc",
  "LW1MkDhYTog",
  "Kff_E0jrPxU",
  "HmSG1F97z1A",
  "VEiSV8faeU0",
  "dKLW2EgEmEo",
  "CfldRVNPXNk",
  "aDvCAxLpJp0",
  "-Ihu3sOYxGs",
  "6T6pUOq2br4",
  "2CfxlgkapJE",
  "_GX8075fX3k",
  "v79wbHZPqJM",
  "DAdOEaLlLqg",
  "efUbyvvZ-KM",
  "oy75ccKpawE",
  "KLuAA_qeWRs",
  "X6K7qXawUuQ",
  "3WPs3tj9bl0",
  "siJ8N-FU-g4",
  "eeyoMM9Rpt4",
  "C1VffF1Z5-Y",
  "Y5gw8bpe1Bc",
  "R3hq2zf55SE",
  "nyEunKC1Y70",
  "DCDpWKEPQzQ",
  "4c4yMS4Zhlg",
  "9_LkwjqQ_mo",
  "s1w3krwpU9Y",
  "1I8te_xbk-M",
  "xJVcO6QdZHo",
  "KYU-nznR5x4",
  "C4ZxnN7lTuo",
  "tuDdqACkRp4",
  "Ya1LxpI0LbU",
  "jgxxwrybbNY",
  "F3dJqK_MriE",
  "msr-i7SwcN0",
  "jKYykMZpad0",
  "mZuaiaBIJyc",
  "yb169Rb3UPU",
  "6I7cZG_RoWI",
  "-PXnJ25vgec",
  "1aeZiZT9kjs",
  "3rV-tm8OiOU",
  "iiEf2E1kIOM",
  "XsFcJ8eD9j0",
  "a5Uamf-JeW4",
  "fcOzNxk2PgA",
  "FaRQeh41ThQ",
  "EH3zr_EJfA4",
  "zzXwoZz-s58",
  "-wtoiSfr_FU",
  "sqwSnG0o2es",
  "E2i_AQ1vO-Q",
  "nSqi34msqg0",
  "jCR9JfQo2hE",
  "NxJi-1GLa4E",
  "renBy5RQG4I",
  "ul8iK77Cl-k",
  "EE_8AOsWwO4",
  "JMEu5WUzCnE",
  "pUSMYzMBI5c",
  "U9yOg46ZJjc",
  "KXzcNhs8w18",
  "hMNzZiN0-P0",
  "fGonw_1q3hk",
  "P3Vn60Z-WS4",
  "bwr69Oj-nLM",
  "MnwPwum3FIU",
  "0nsDWuL3Sm4",
  "Ggn0IfRUZOM",
  "HgTqinh73kE",
  "Hfd5lRmT6pM",
  "AJG4IqC0Ivw",
  "7GTogwQVmYE",
  "9sjFyMxZ8-U",
  "jPlOR1EBGqA",
  "DxKgpGDUBAQ",
  "ViTCCW6PGxw",
  "bErTB5lb7EE",
  "fNEG6bIc2wA",
  "FglHink-o9s",
  "P4zzJzFxr0g",
  "_S5rrZf3OEY",
  "JEI9h_CgRZ8",
  "gNJeX0Akhk0",
  "JBe4gSqbdus",
  "6ZBHwl9vsck",
  "LkFCU39jr44",
  "zXM4SPVz9w8",
  "a5V4LiFWQQI",
  "txSRxktXbjo",
  "4_ZGJc5ZwPQ",
  "rW7KlrvS6qY",
  "LiBe4WJaLo0",
  "O9G-tVBO3Cw",
  "bw0-RfAq7d4",
  "F97JEYPFE5I",
  "RbG2v-cWFdU",
  "8yqzTFQ2FjA",
  "MZhCgp-GRQ8",
  "37vlzMCTfdg",
  "OrAxFXlvKqc",
  "RT6XwcsQ3Tc",
  "wed7lXpuoSA",
];

let pi = await youtubei.getPlaylist(playlistId);
const all = pi.items.map((item) => (item as PlaylistVideo).id);
while (pi.has_continuation) {
  pi = await pi.getContinuation();
  all.push(...pi.items.map((item) => (item as PlaylistVideo).id));
}

console.log(`Found ${all.length} entries in playlist. Removing and replacing.`);

await youtubei.playlist.removeVideos(playlistId, all);
await youtubei.playlist.addVideos(playlistId, videoIds);

if (Math.random()) {
  Deno.exit();
}

// console.log(pi.videos);

const youtube = google.youtube("v3");

const auth = new google.auth.OAuth2({
  clientId: (localStorage.clientId ??= prompt("YouTube API Client ID:")),
  clientSecret: (localStorage.clientSecret ??= prompt(
    "YouTube API Client Secret:"
  )),
  redirectUri: "http://localhost:8783",
});

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
}

auth.setCredentials({
  token_type: "Bearer",
  scope: "https://www.googleapis.com/auth/youtube",
  access_token: localStorage.clientAccessToken,
  refresh_token: localStorage.clientRefreshToken,
  expiry_date: localStorage.clientExpiryDate,
});

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

const channel = await youtube.channels
  .list({
    auth,
    mine: true,
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
  })
  .then(({ data }) => data.items?.[0]!);

console.log(
  `Authenticated to channel: ${channel.brandingSettings?.channel?.title} (${channel.id})`
);

await youtube.playlists.update({
  auth,
  part: ["snippet"],
  requestBody: {
    id: playlistId,
    snippet: {
      title,
      description,
    },
  },
});

const existingItems = [];
let pageToken: string | undefined = undefined;

do {
  const page = await youtube.playlistItems
    .list({
      auth,
      pageToken,
      playlistId,
      maxResults: 50,
      part: ["id", "snippet", "contentDetails", "status"],
    })
    .then(({ data }) => data);

  existingItems.push(
    ...page.items!.map((item) => ({
      id: item.id,
      videoId: item.contentDetails?.videoId!,
    }))
  );
  pageToken = page.nextPageToken as string | undefined;
} while (pageToken);

const uniqueItems = new Set(existingItems.map(({ videoId }) => videoId)).size;
if (uniqueItems !== existingItems.length) {
  console.warn("Warning: playlist contains duplicate entries.");

  // TODO: remove them, and any other unexpected entires
}

for (const [targetIndex, videoId] of videoIds.entries()) {
  const actualIndex = existingItems.findIndex(
    (item) => item.videoId == videoId
  );

  if (actualIndex === -1) {
    console.log(
      `Video ${videoId} was missing from playlist. Inserting it now.`
    );

    await youtube.playlistItems.insert({
      auth,
      part: ["snippet"],
      requestBody: {
        snippet: {
          playlistId,
          position: targetIndex,
          resourceId: {
            kind: "youtube#video",
            videoId,
          },
        },
      },
    });
  } else if (actualIndex !== targetIndex) {
    console.log(
      `Video ${videoId} was in the playlist, but at the wrong position.`
    );

    // TODO: fix that?
  } else {
    console.log(
      `Video ${videoId} was already in the playlist at the correct location.`
    );

    // TODO: fix that?
  }
}
