# YouTube Playlist Curation Project

This project manages curated YouTube playlists for Dropout content (Dimension
20, Game Changer, Um Actually, etc.).

## Project Structure

```
curation/seasons.yaml   # Source of truth - defines shows, seasons, episodes
config/aggregate.toml   # Defines which playlists to generate and their content
data/videos.yaml        # Scraped video metadata from YouTube channels
data/playlists.yaml     # Generated playlist data (don't edit directly)
data/channels.yaml      # Channel metadata
```

## Workflow

### Finding uncurated videos

```bash
deno task curate --channel=dropout,dimension20show --since=2024-01-01
```

This shows videos in `data/videos.yaml` that aren't yet in
`curation/seasons.yaml`.

### Adding content

1. Edit `curation/seasons.yaml` to add new shows/seasons/episodes
2. Run `deno task aggregate` to regenerate `data/playlists.yaml`
3. Run `deno task publish` to push changes to YouTube

### Creating new playlists

1. Add playlist definition to `config/aggregate.toml` with
   `[todo-playlist-name]`
2. Run `deno task aggregate`
3. Run `deno task publish --create-missing` to create on YouTube and update
   config with real ID

## Episode Numbering Conventions

**Season-prefixed numbering** (101, 201, 301, etc.) for:

- Game Changer
- Um, Actually
- Make Some Noise
- Dirty Laundry
- Very Important People
- Smartypants
- Gastronauts
- Adventuring Party (uses 1801, 1901, 2001 for seasons 18, 19, 20)
- Adventuring Academy
- Breaking News
- Play It By Ear
- Nobody Asked, Parlor Room, Crowd Control (newer game shows)

**Simple numbering** (1, 2, 3, etc.) for:

- Dimension 20 campaigns (each campaign is its own "season")
- Fatal Decision (short-form series)
- Game Changer Animated, Dimension 20 Animated (no season structure)

## seasons.yaml Structure

```yaml
---
show: Dimension 20
season: Fantasy High (Chapter 1) # Optional - campaign name for D20
cast: Intrepid Heroes # Optional - for D20 cast designation
world: Spyre # Optional - for D20 shared universes
live: true # Optional - for live shows
videos:
  - trailer: "Fantasy High Trailer"
    public: VIDEO_ID # Free on YouTube
    members: VIDEO_ID # Dropout members version
    published: 2024-01-15
  - episode: "1. The Beginning Begins"
    public: VIDEO_ID
    members: VIDEO_ID
    published: 2024-01-22
  - bts: "Behind the Scenes Title" # Behind-the-scenes content
    members: VIDEO_ID
    published: 2024-01-23
```

### Video Type Fields

- `episode`: Main episode content
- `trailer`: Promotional trailers
- `bts`: Behind-the-scenes content
- `special`: Special episodes (holiday specials, etc.)
- `animation`: Animated content
- `external`: Content on other channels

### Video ID Fields

- `public`: Free version on YouTube
- `members`: Dropout members-only version
- `paid`: Paid/rental version
- `public copy`: Re-uploaded public version
- `public compilation`: Compilation including this content
- `public parts`: Array of video IDs for split episodes
- `removed members`: Previously available members version (now removed)
- `members deleted`: Deleted members version

## Dropout-Related Channels

Main channels to scan for content:

- `dropout` - Main Dropout channel
- `dimension20show` - Dimension 20 full episodes
- `dimension20shorts` - D20 clips (mostly not curated)
- `gamechangershorts` - Game Changer clips (mostly not curated)
- `umactually` - Um, Actually clips and episodes
- `makesomenoisedo` - Make Some Noise
- `veryimportantpeopleshow` - VIP
- `smartypantsdropout` - Smartypants
- `dirtylaundryshorts` - Dirty Laundry clips

## Common Tasks

### Update with new episodes

```bash
# Find what's missing
deno task curate --channel=dropout,dimension20show --since=2024-10-01 --no-fetch

# Edit seasons.yaml to add missing episodes
# Then regenerate and publish
deno task aggregate
deno task publish
```

### Publish specific playlist only

```bash
deno task publish --playlist="game-changer"
deno task publish --playlist="misfits" --dry-run  # Preview only
```

### Create new show playlist

1. Add to `config/aggregate.toml`:

```toml
[todo-new-show]
name = "New Show (All Episodes and Extras)"
description = "..."
include = [{ show = "New Show" }]
```

2. Run `deno task aggregate && deno task publish --create-missing`

## Git Conventions

Use `save` instead of `git commit` for committing changes:

```bash
save -m "Commit message here"
```

This automatically adds the Co-Authored-By tag. Commit frequently to checkpoint
progress.

## Tips

- Run `deno task aggregate` after editing seasons.yaml to verify changes
- The `--no-fetch` flag on curate skips fetching video descriptions (faster)
- Shorts channels have thousands of clips - focus on main channels for episodes
- Check episode counts against Dimension 20 Wiki or Dropout site when adding
  seasons
