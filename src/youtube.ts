// deno-lint-ignore-file no-explicit-any
import { Innertube } from "../../YouTube.js/deno.ts";
import PlaylistVideo from "../../YouTube.js/deno/src/parser/classes/PlaylistVideo.ts";
import { miliseconds } from "./common.ts";

export const youtubei = await Innertube.create({
  cookie: (localStorage.youtubeCookie =
    Deno.env.get("YOUTUBE_COOKIE") ?? localStorage.youtubeCookie),
  on_behalf_of_user: (localStorage.onBehalfOfUser =
    Deno.env.get("ON_BEHALF_OF_USER") ?? localStorage.onBehalfOfUser),
  retrieve_player: false,
  fetch: async (req: any, opts: any) => {
    await miliseconds(Math.random() * 4_000);

    const response = await fetch(req, opts);

    console.log(response.status, response.url);

    return response;
  },
});

export const youtubeiDefaultUser = await Innertube.create({
  cookie: (localStorage.youtubeCookie =
    Deno.env.get("YOUTUBE_COOKIE") ?? localStorage.youtubeCookie),
  retrieve_player: false,
  fetch: async (req: any, opts: any) => {
    await miliseconds(Math.random() * 4_000);

    const response = await fetch(req, opts);

    console.log(response.status, response.url);

    return response;
  },
});

export const setPlaylist = async (
  playlistId: string,
  description: string,
  videoIds: Array<string>
) => {
  console.log("Publishing", videoIds.length, "videos to", playlistId);

  let pi = await youtubei.getPlaylist(playlistId);
  const all = pi.items.map((item) => (item as PlaylistVideo).id);
  while (pi.has_continuation) {
    pi = await pi.getContinuation();
    all.push(...pi.items.map((item) => (item as PlaylistVideo).id));
  }

  console.log(`Found ${all.length} existing entries in playlist.`);

  if (all.toString() === videoIds.toString()) {
    console.log("Playlist is already up-to-date!");
  } else {
    console.log("Replacing with intended playlist contents.");

    try {
      const toRemove = [...all];
      const toAdd = [...videoIds];

      let leaving = 0;
      while (toRemove.length > 0 && toRemove[0] === toAdd[0]) {
        leaving += 1;
        toRemove.shift();
        toAdd.shift();
      }
      console.log(
        `Leaving ${leaving} videos in-place, removing ${toRemove.length} and adding ${toAdd.length}.`
      );

      if (toRemove.length) {
        await youtubei.playlist.removeVideos(playlistId, toRemove);
      }
      if (toAdd.length) {
        await youtubei.playlist.addVideos(playlistId, toAdd);
      }
    } catch (error) {
      console.error(error, "\n" + JSON.stringify(videoIds));
    }
  }
};
