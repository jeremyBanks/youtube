(aspirational descriptions of what this is intended to do, not accurate
descriptions of what it actually does yet)

---

- [ ] `deno task scan` (`deno run @jeb/youtube/scan`) scans the contents of
      YouTube channels as specified in `config/scan.yaml` to update
      `data/videos.yaml`, a list of videos with timestamps, durations, and
      members-only status. It also updates `data/channels.yaml`, a list of
      channels with handles and some stats, and `data/scans.yaml`, a list of
      scan sessions and what data they included, but those are just to support
      the scanning operation and aren't intended to be useful on their own (e.g.
      the channels stats may never be updated). This requires YouTube API client
      identifiers and keys to be set in `.env` as described in `.env.defaults`,
      and requires the user to interactively authenticate with their YouTube
      account (only be used for read operations, any YouTube account should work
      fine; it doesn't need to be a channel member in order to list member
      videos for a channel).

- [ ] `deno task aggregate` (`deno run @jeb/youtube/aggregate`) uses the
      contents of `curation/seasons.yaml` and `config/playlists.toml` to
      generate an updated list of videos that should be included in each
      playlist, saving the generated results in `data/playlists.yaml`.

- [ ] `deno task publish` (`deno run @jeb/youtube/publish`) takes the playlist
      videos and descriptions in `data/playlists.yaml` and publishes them to the
      specified playlist IDs on YouTube. This requires YouTube API client
      identifiers and keys to be set in `.env` as described in `.env.defaults`,
      and requires the user to interactively authenticate with a YouTube account
      that has owns or at least has write permissions for the specified
      playlists. Note that editing playlists can be an expensive operation in
      terms of YouTube API quota, so large changes may not be possible to finish
      at once, and this operation may need to be executed repeatedly over
      multiple days.

- [ ] `deno task scan-playlists` (`deno run @jeb/youtube/scan-playlists`) takes
      the playlist IDs specified in `config/playlists.toml`, fetches their
      current descriptions and contents from the YouTube API, and updates
      `data/playlists.yaml` with that information. Typically, we publish from
      that file instead of scanning into it, so this isn't meant as part of the
      typical workflow. Rather, it's only meant to help compare the actual
      contents with the intended ones.
