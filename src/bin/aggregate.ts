import { upsert } from "../common.ts";
import {
  getAggregateConfig,
  getDropoutConfig,
  getSeasonsCuration,
} from "../config.ts";
import { isAggregate, showPrefixes } from "../dropout-link.ts";
import * as yaml from "../yaml.ts";
import { normalizeTitle } from "../common.ts";
import {
  Channel,
  ChannelPlaylist,
  DropoutCollection,
  DropoutEpisode,
} from "../storage.ts";
import {
  openPlaylistsStorage,
  openResolvedVideoStorage,
  openVideoStorage,
} from "../storage.ts";

/** YouTube's own cap on a playlist description. */
const DESCRIPTION_LIMIT = 5000;

/**
 * Appends the covered collections to a description, one url per line after
 * a blank line, dropping links from the end rather than exceeding YouTube's
 * limit and having the update rejected.
 */
function withDropoutLinks(
  description: string,
  urls: Array<string>,
  missing: Array<string> = [],
): string {
  // The templates end in a newline of their own; trim it so the links are
  // separated by exactly one blank line rather than two.
  const body = description.replace(/\s+$/, "");
  // Whichever episodes a playlist cannot carry would be named here, so that
  // "Full Episodes" says what is absent instead of leaving a viewer to notice
  // a gap and wonder whether it is an oversight. They are dropped before the
  // collection links when the description will not fit, since a partial list
  // of what is missing is worse than none: it reads as the whole of it.
  //
  // The heading says "not in this playlist", which is exactly the test. It
  // first said "not on YouTube", which is a different and larger claim, and 18
  // of the 158 entries broke it: they were on YouTube, curated into some other
  // playlist. Those are real gaps in this playlist and belong on the list --
  // the wording was wrong, not the test.
  //
  // What the test cannot see is an entry we hold under a different title with
  // no `dropout:` link. Crown of Candy's behind-the-scenes and Cloudward,
  // Ho!'s mid-season recap were both announced as absent while sitting in the
  // playlist under our own names for them. Every such false report is a
  // missing link, so the list is also a queue of links to add.
  let keptMissing = [...missing];
  while (true) {
    const tail = keptMissing.length
      ? `\n\nNot in this playlist. Watch these on Dropout:\n${
        keptMissing.join("\n")
      }`
      : "";
    let kept = [...urls];
    while (true) {
      const combined = kept.length
        ? `${body}\n\n${kept.join("\n")}${tail}`
        : `${body}${tail}`;
      if (combined.length <= DESCRIPTION_LIMIT) {
        return combined;
      }
      if (!kept.length) break;
      kept = kept.slice(0, -1);
    }
    if (!keptMissing.length) return description;
    keptMissing = [];
  }
}

/** The subset of a curation entry needed to join it to Dropout's index. */
type CuratedEntry = {
  dropout?: string;
  episode?: string;
  special?: string;
  trailer?: string;
  bts?: string;
  animation?: string;
};

/**
 * Every Dropout collection this playlist covers completely, as urls, with
 * any collection that is a subset of another dropped so only the largest
 * remain. A collection counts only when every one of its episodes has been
 * scraped and is present in the playlist: a partial match would misleadingly
 * promise the whole show.
 */
/**
 * The Dropout episodes this playlist does not carry.
 *
 * "All Episodes and Extras" used to be a fixed string, so it claimed both
 * halves whether or not either was true: the TablePop playlist carries 14 of
 * Dropout's 38 and announced all of them.
 *
 * Scope is the collections the playlist actually draws from, taken from the
 * canonical `collection` of each entry it linked -- not the show. Judging a
 * single-campaign playlist against the whole of Dimension 20 would mark every
 * campaign incomplete, which is true of the show and false of the playlist.
 *
 * A playlist that links nothing on Dropout returns `false`, because nothing is
 * known about what it might be missing. Critical Role is not on Dropout at
 * all, and reading that silence as completeness is the same mistake as reading
 * an empty search result as proof a thing does not exist.
 */
function episodesMissingFrom(
  included: Array<CuratedEntry>,
  excluded: Array<CuratedEntry>,
  dropoutEpisodes: Array<DropoutEpisode>,
  prefixes: Array<string>,
): Array<DropoutEpisode> | undefined {
  if (!prefixes.length) return undefined;
  const slugs = new Set<string>();
  const titles = new Set<string>();
  for (const entry of included) {
    if (entry.dropout) slugs.add(entry.dropout);
    const title = entry.episode ?? entry.special ?? entry.trailer ??
      entry.bts ?? entry.animation;
    if (title) titles.add(normalizeTitle(title));
  }
  if (!slugs.size) return undefined;

  // Accounted for without being carried: the playlist knows about these and
  // chose not to include them, so they are not missing from it.
  const declined = new Set<string>();
  const declinedTitles = new Set<string>();
  for (const entry of excluded) {
    if (entry.dropout) declined.add(entry.dropout);
    const title = entry.episode ?? entry.special ?? entry.trailer ??
      entry.bts ?? entry.animation;
    if (title) declinedTitles.add(normalizeTitle(title));
  }

  const byCollection = new Map<string, Array<DropoutEpisode>>();
  const touched = new Set<string>();
  for (const episode of dropoutEpisodes) {
    byCollection.set(episode.collection, [
      ...(byCollection.get(episode.collection) ?? []),
      episode,
    ]);
    // Only collections belonging to this playlist's own show. A crossover
    // entry links an episode of somebody else's show -- Crowd Control's
    // precursor links Game Changer's `crowd-control` -- and without this the
    // whole of Game Changer season 7 came into scope and counted as missing.
    if (
      slugs.has(episode.slug) &&
      prefixes.some((p) => episode.collection.startsWith(p)) &&
      // An aggregate collection is not a home. Dimension 20's live shows are
      // filed under one, so a campaign playlist carrying its own live show
      // was treated as drawing on every live show there had ever been.
      !isAggregate(episode.collection.replace(/-season-\d+$/, ""))
    ) {
      touched.add(episode.collection);
    }
  }
  if (!touched.size) return undefined;

  const missing: Array<DropoutEpisode> = [];
  for (const collection of touched) {
    const episodes = byCollection.get(collection) ?? [];
    // Coverage cannot be judged against episodes whose titles we have never
    // read, so an unscraped collection is skipped rather than called missing.
    if (episodes.some((e) => !e.title)) continue;
    for (const episode of episodes) {
      const known = slugs.has(episode.slug) ||
        titles.has(normalizeTitle(episode.title!));
      const turnedAway = declined.has(episode.slug) ||
        declinedTitles.has(normalizeTitle(episode.title!));
      if (!known && !turnedAway) {
        missing.push(episode);
      }
    }
  }
  return missing;
}

function coveredCollectionUrls(
  included: Array<CuratedEntry>,
  episodesByCollection: Map<string, Array<DropoutEpisode>>,
): Array<string> {
  const titles = new Set<string>();
  const slugs = new Set<string>();
  for (const entry of included) {
    if (entry.dropout) {
      slugs.add(entry.dropout);
    }
    const title = entry.episode ?? entry.special ?? entry.trailer ??
      entry.bts ?? entry.animation;
    if (title) {
      titles.add(normalizeTitle(title));
    }
  }

  const covered = new Map<string, Set<string>>();
  for (const [slug, episodes] of episodesByCollection) {
    if (episodes.length === 0 || episodes.some((e) => !e.title)) {
      continue; // never scraped in full, so coverage cannot be judged
    }
    // Dropout re-publishes some shows under a "-new" twin of the same slug -
    // game-changer-new, um-actually-new - carrying the same episodes under
    // the same display name. Never link one when the original exists: the
    // subset filter would only drop it if both happened to be covered with
    // identical sets, and a link should not depend on that coincidence.
    if (slug.endsWith("-new") && episodesByCollection.has(slug.slice(0, -4))) {
      continue;
    }
    const all = episodes.every((e) =>
      slugs.has(e.slug) || titles.has(normalizeTitle(e.title!))
    );
    if (all) {
      covered.set(slug, new Set(episodes.map((e) => e.slug)));
    }
  }

  const maximal = [...covered].filter(([slug, episodes]) =>
    ![...covered].some(([other, otherEpisodes]) =>
      other !== slug &&
      [...episodes].every((e) => otherEpisodes.has(e)) &&
      (episodes.size < otherEpisodes.size ||
        // Identical collections do exist — Dropout carries game-changer and
        // game-changer-new, make-some-noise and make-some-noise-new — so on
        // an exact tie keep the shorter name, which is the canonical one,
        // falling back to alphabetical for a genuine draw.
        (episodes.size === otherEpisodes.size &&
          (other.length < slug.length ||
            (other.length === slug.length && other < slug))))
    )
  );
  return maximal.map(([slug]) => `https://watch.dropout.tv/${slug}`).sort();
}

if (import.meta.main) {
  await main();
}

async function main() {
  const aggregateConfig = await getAggregateConfig();
  const dropoutConfig = await getDropoutConfig();

  const seasons = await getSeasonsCuration();

  const allVideos = await openVideoStorage();
  const playlists = await openPlaylistsStorage();

  const videosById = new Map(allVideos.map((video) => [video.videoId, video]));

  // Ids looked up directly, for videos on channels we do not scan — a public
  // copy on a guest's own channel, say. These only ever fill gaps: a scanned
  // record always wins, since it carries the richer metadata.
  // Dropout's own catalogue, read plainly rather than opened as storage:
  // aggregate must never write to the scan's files.
  const dropoutEpisodes = DropoutEpisode.array().parse(
    await yaml.load("./data/dropout.yaml"),
  ).filter((episode) => !episode.removedBefore);
  const dropoutCollections = DropoutCollection.array().parse(
    await yaml.load("./data/dropout-collections.yaml"),
  ).filter((collection) => !collection.removedBefore);
  // Collections are named at show level; an episode lists the season-level
  // slugs it appears under, so a season belongs to its show.
  const episodesByCollection = new Map<string, Array<DropoutEpisode>>();
  for (const collection of dropoutCollections) {
    const season = `${collection.slug}-season-`;
    episodesByCollection.set(
      collection.slug,
      dropoutEpisodes.filter((episode) =>
        episode.collections.some((c) =>
          c === collection.slug || c.startsWith(season)
        )
      ),
    );
  }

  const prefixesFor = showPrefixes(dropoutCollections, dropoutConfig.shows);

  // The playlists the scanned channels publish themselves, so that a playlist
  // of ours holding exactly the same videos can say so and point at theirs.
  // Read plainly: aggregate never writes to the scan's files.
  const channelPlaylists = ChannelPlaylist.array().parse(
    await yaml.load("./data/channel-playlists.yaml"),
  ).filter((playlist) => !playlist.removedBefore);
  const channelName = new Map(
    Channel.array().parse(await yaml.load("./data/channels.yaml"))
      .map((channel) => [channel.channelId, channel.name] as const),
  );
  const officialByVideoSet = new Map<string, ChannelPlaylist>();
  for (const playlist of channelPlaylists) {
    // Private entries are dropped before comparing. The API refuses to add a
    // private video to a playlist, so one of ours can never contain it and
    // would be judged different for a video it was never able to carry --
    // Dropout's "A Message From the CEO" is twelve videos of which one is
    // private, so a complete copy of ours would still have looked unequal.
    const ids = (playlist.entries ?? [])
      .filter((entry) =>
        !entry.removedBefore && entry.privacyStatus !== "private"
      )
      .map((entry) => entry.videoId);
    if (!ids.length) continue;
    const key = [...new Set(ids)].sort().join(",");
    // Ties keep the first seen; two official playlists with identical
    // contents is not a distinction worth encoding.
    if (!officialByVideoSet.has(key)) officialByVideoSet.set(key, playlist);
  }

  const resolvedById = new Map(
    (await openResolvedVideoStorage())
      .filter((video) => !video.missing)
      .map((video) => [video.videoId, video]),
  );
  const detailsFor = (
    videoId: string,
  ): { title?: string; duration?: number } | undefined =>
    videosById.get(videoId) ?? resolvedById.get(videoId);

  playlists.length = 0;

  for (const config of aggregateConfig) {
    if (config.skip) {
      continue;
    }

    const videoIds: Array<string> = [];
    // The curation entries this playlist actually took, for working out
    // which Dropout collections it covers in full.
    const included: Array<CuratedEntry> = [];
    // The entries this playlist's own filters turned away. Not gaps: an
    // episodes-only playlist is not missing the behind-the-scenes it was
    // configured to leave out. Counting them made "Dimension 20 (All
    // Episodes)" report 52 missing, nearly all of them extras it excludes by
    // design, and a free-only playlist report every members video.
    const excluded: Array<CuratedEntry> = [];

    let seasonCount = 0;
    let episodeCount = 0;
    let extrasCount = 0;
    // Extras that are not trailers. A trailer is not "extras": every show has
    // one and it says nothing about there being bonus material.
    let bonusCount = 0;
    let freeCount = 0;
    let membersCount = 0;
    let paidCount = 0;

    for (const season of seasons) {
      // ATTEMPTING THIS EXPOSES DATA ERRORS
      // THis should be a separate script cleaning up seasons.yaml in-place, not here!
      // season.videos?.sort((left, right) => {
      //   return (+(left?.published ?? 0) - +(right?.published ?? 0));
      // });

      if (
        config.shows && !(season.show && config.shows.includes(season.show))
      ) {
        continue;
      }
      if (
        config.seasons &&
        !(season.season && config.seasons.includes(season.season))
      ) {
        continue;
      }
      if (
        config.casts && !(season.cast && config.casts.includes(season.cast))
      ) {
        continue;
      }
      if (
        config.worlds && !(season.world && config.worlds.includes(season.world))
      ) {
        continue;
      }
      if (
        config.live !== undefined && season.live !== config.live
      ) {
        continue;
      }

      if (season.season) {
        seasonCount += 1;
      }

      for (const episode of season.videos) {
        if (
          config.types &&
          config.types.filter((type) =>
              Object.prototype.hasOwnProperty.call(episode, type)
            )
              .length ===
            0
        ) {
          excluded.push(episode);
          continue;
        }
        if (
          config.talkback !== undefined &&
          (episode.talkback ?? false) !== config.talkback
        ) {
          excluded.push(episode);
          continue;
        }
        if (episode.public) {
          videoIds.push(episode.public);
          included.push(episode);
          freeCount += 1;
          if (episode.episode || episode.special) {
            episodeCount += 1;
          } else {
            extrasCount += 1;
            if (!episode.trailer) bonusCount += 1;
          }
        } else if (episode["public parts"]) {
          freeCount += 1;
          videoIds.push(...episode["public parts"]);
          included.push(episode);
          if (episode.episode || episode.special) {
            episodeCount += 1;
          } else {
            extrasCount += 1;
            if (!episode.trailer) bonusCount += 1;
          }
        } else if (episode.members) {
          if (config.free) excluded.push(episode);
          if (!config.free) {
            videoIds.push(episode.members);
            included.push(episode);
            membersCount += 1;
            if (episode.episode || episode.special) {
              episodeCount += 1;
            } else {
              extrasCount += 1;
              if (!episode.trailer) bonusCount += 1;
            }
          }
        } else if (episode.paid) {
          if (config.free) excluded.push(episode);
          if (!config.free) {
            videoIds.push(episode.paid);
            included.push(episode);
            paidCount += 1;
            if (episode.episode || episode.special) {
              episodeCount += 1;
            } else {
              extrasCount += 1;
              if (!episode.trailer) bonusCount += 1;
            }
          }
        } else {
          console.error(`no video ID specified for ${JSON.stringify(episode)}`);
        }
      }
    }

    const videos: Record<string, string> = {};
    let durationSeconds = 0;

    if (videoIds.length === 0) {
      console.error(`empty playlist: ${config.playlistId} ${config.name}`);
    }

    for (const videoId of videoIds) {
      const videoDetails = detailsFor(videoId);
      if (videoDetails?.title) {
        videos[videoId] = videoDetails.title;
        durationSeconds += videoDetails.duration ?? 0;
      } else {
        videos[videoId] = "unknown";
        console.error(
          `unknown video in playlist: ${videoId} in empty playlist: ${config.playlistId} ${config.name}`,
        );
      }
    }

    // Pairing a count against a zero reads badly - "0 videos are free and 49
    // require ..." - so a playlist that is all one or all the other says so.
    const membership = freeCount && membersCount
      ? "${FREE} videos are free and ${MEMBERS} require a @Dropout channel membership on YouTube."
      : membersCount
      ? `${
        membersCount === 1
          ? "The one video requires"
          : `All ${membersCount} videos require`
      } a @Dropout channel membership on YouTube.`
      : freeCount
      ? `${
        freeCount === 1 ? "The one video is" : `All ${freeCount} videos are`
      } free.`
      : "";

    // "All Episodes and Extras" was a fixed string, so it claimed both halves
    // whether or not either was true. "All" now requires that no episode of
    // the show is missing from the playlist, and "and Extras" requires at
    // least one extra that is not a trailer.
    // "All" is a claim about the episodes and nothing else, so "and Extras"
    // is appended on its own terms. Where the claim cannot be made the
    // playlist says "Full Episodes", which still distinguishes it from the
    // clips channels -- the thing a viewer is actually asking when they look.
    const missingEpisodes = episodesMissingFrom(
      included,
      excluded,
      dropoutEpisodes,
      (config.shows ?? []).flatMap((show) => prefixesFor(show) ?? []),
    );
    // A playlist with no episodes at all claims nothing: Toylight is one
    // trailer for a campaign that has not aired, and "Full Episodes" of
    // nothing is worse than saying nothing. The empty parentheses the
    // templates leave behind are cleaned up below.
    const completeness = episodeCount === 0
      ? ""
      : `${
        missingEpisodes && missingEpisodes.length === 0 ? "All" : "Full"
      } Episodes${bonusCount > 0 ? " and Extras" : ""}`;

    const applyTemplates = (s: string) =>
      s.replaceAll(
        "${D20_PLUG}",
        "Dimension 20 is an Actual Play TTRPG series from Dropout, featuring original campaigns of Dungeons and Dragons and other tabletop role-playing systems.",
      ).replaceAll(
        "${MAYBE_MEMBERS_ONLY}",
        membership,
      ).replaceAll(
        "${HOURS}",
        String(Math.floor(durationSeconds / 60 / 60)),
      ).replaceAll(
        "${EPISODES}",
        String(episodeCount),
      ).replaceAll(
        "${EXTRAS}",
        String(extrasCount),
      ).replaceAll(
        "${FREE}",
        String(freeCount),
      ).replaceAll(
        "${MEMBERS}",
        String(membersCount),
      ).replaceAll(
        "${PAID}",
        String(paidCount),
      ).replaceAll(
        "${SEASONS}",
        String(seasonCount),
      ).replaceAll(
        "${ALL_EPISODES}",
        completeness,
      ).replaceAll(
        "${ALL_SEASONS}",
        completeness,
      )
        .replaceAll(" ()", "")
        .replaceAll(/\b1 Extras\b/g, "1 Extra")
        .replaceAll(/\b1 Episodes\b/g, "1 Episode")
        .replaceAll(/\b1 Seasons\b/g, "1 Season")
        .replaceAll(/\b1 Videos\b/g, "1 Video")
        .replaceAll(/\b1 videos\b/g, "1 video")
        .replaceAll(/\b1 Video are\b/g, "1 Video is")
        .replaceAll(/\b1 video are\b/g, "1 video is")
        .replaceAll(/\b1 require \b/g, "1 requires ");

    // `--report` prints the completeness judgement rather than reimplementing
    // it somewhere else and having the two disagree, which is how the show
    // mapping ended up with four versions.
    if (Deno.args.includes("--report")) {
      console.log(
        [
          missingEpisodes === undefined
            ? "unknown"
            : String(missingEpisodes.length),
          episodeCount,
          bonusCount,
          applyTemplates(config.name),
          Deno.args.includes("--missing")
            ? (missingEpisodes ?? []).map((e) => e.slug).join(",")
            : "",
        ].join("\t"),
      );
    }

    // An official playlist holding exactly our videos, ignoring order and
    // repeats. Computed rather than configured, so it stops being claimed the
    // moment either side changes.
    const official = officialByVideoSet.get(
      [...new Set(videoIds)].sort().join(","),
    );
    // Named for whoever publishes it: six of these are Dropout's own "Full
    // Episodes" playlists, but Critical Role's Exandria Unlimited is Critical
    // Role's.
    const officialLead = official
      ? `${channelName.get(official.channelId) ?? "The channel"}` +
        ` publishes this same set themselves: ` +
        `https://www.youtube.com/playlist?list=${official.playlistId}\n\n`
      : "";

    upsert(playlists, {
      name: applyTemplates(config.name),
      description: withDropoutLinks(
        officialLead + applyTemplates(config.description ?? ""),
        coveredCollectionUrls(included, episodesByCollection),
        (missingEpisodes ?? []).map((e) => e.url).filter((u): u is string =>
          typeof u === "string"
        ),
      ),
      playlistId: config.playlistId,
      // A playlist that duplicates an official one, video for video, is
      // published unlisted: it stays reachable by link and by anyone we point
      // at it, without competing in search or on the channel with the version
      // the show's own people maintain. It goes back to listed by itself if
      // either set ever changes, since `official` is recomputed every run.
      unlisted: config.unlisted || (official !== undefined ? true : undefined),
      private: config.private,
      videos: Object.fromEntries(
        videoIds.map((id) => [id, detailsFor(id)?.title ?? "unknown"]),
      ),
    }, (record) => record.playlistId === config.playlistId);
  }
}
