# YouTube Playlist Manager - TODO

This branch: `claude/add-channel-list-012G76JY5jin6bVLGsqS6EPp`

## Immediate Tasks

### 1. Run Initial Scan with Credentials

- [ ] Transfer YouTube API credentials from local PC to Claude Code environment
- [ ] Set up `.env` file with credentials (CLIENT_ID, PROJECT_ID, CLIENT_SECRET,
      API_KEY)
- [ ] Run `deno task scan --headless` to get OAuth URL
- [ ] Complete authentication with `--auth-url` parameter
- [ ] Execute full channel scan to update video metadata (data hasn't been
      refreshed since March 2024)

## Feature Development

### 2. Track Video Changes Between Scans

- [ ] Design `changes.yaml` (or `updates.yaml`) format to track video
      additions/removals/modifications
- [ ] Structure as YAML array where each scan appends a batch of changes
- [ ] Within each batch, group by video (not by operation type)
- [ ] Each video entry can contain:
  - `added`: The new version of the video data (for new or modified videos)
  - `removed`: The old version of the video data (for deleted or modified
    videos)
  - Modified videos have both `removed` (old version) and `added` (new version)
- [ ] Sort videos within each batch by video publication date (ascending)
- [ ] Append new batches to end of file (preserves chronological order of scans)
- [ ] Modify `scan.ts` to generate change tracking data
- [ ] Modify `publish.ts` to clear changes file ONLY after successful completion
  - **Important:** Clear changes at the END of publish after all playlists
    update successfully, not at the start
  - If publish fails partway through, changes should be preserved for next run

### 3. Automated Daily Scans

- [ ] Create GitHub Actions workflow for daily cron job
- [ ] Set up GitHub Secrets for YouTube API credentials
- [ ] Implement headless authentication strategy for CI environment
- [ ] Configure workflow to commit changes back to repository
- [ ] Add error handling and notifications for failed scans
- [ ] Consider rate limiting and quota management for YouTube API
- **Note:** More complex due to OAuth requirements in headless environment -
  defer until after manual workflow is stable

### 4. AI-Assisted Video Curation

- [ ] Integrate Claude Code SDK for intelligent video categorization
- [ ] Develop prompts/workflows to:
  - Automatically categorize videos into seasons based on titles/descriptions
  - Identify free vs members-only content equivalents
  - Detect related videos across different playlists
  - Suggest episode numbering and ordering
- [ ] Create interactive tools for semi-automated curation in
      `curation/seasons.yaml`
- [ ] Build validation to ensure curation data quality

### 5. Support Playlists Without Playlist IDs

- [x] Allow playlists to be defined in config without a playlist ID
- [x] Skip these playlists when running `deno task publish`
- [ ] Consider: Auto-create playlists via API and insert generated playlist ID
      back into config

## Completed

- [x] Set up Deno and verify project runs
- [x] Implement headless OAuth flow (`--headless` and `--auth-url` flags)
- [x] Run `aggregate` task successfully
- [x] Update playlist templates to use "All Episodes and Extras" consistently
