This script is (intended to, eventually, when and if completed, be) used to
generate the YouTube playlists for https://youtube.com/@actualplaylists, which
aggregates (non-original) "actual play" table-top RPG content. The generated
playlists are also listed in [`playlists.md`](./playlists.md).

## Commands

### `deno task catalogue`

Updates `catalogue.yaml` to include all videos we can find from the specified channels.
Videos that were previously in the catalogue file, but not found when this command
re-checks (due to deletion or privacy changes) is marked as `status: removed public` /
`status: removed members`.

This file isn't used directly by anything else, and will include a lot of content we're
not interested in. It's just meant to make sure we have a complete list of available
content from the channels we're interested in, while manually editing `campaigns.yaml`.

### `deno task playlists`

Calculates the desired contents of each playlist defined in `playlists.yaml` from the
lists of videos tagged in `campaigns.yaml`, saving the results in `playlists.md`.

### `deno task publish`

Runs `deno task playlists` and publishes the results to YouTube.
