import * as yaml from "./yaml.ts";

/*

many things to do, this is just some hacky scripts now.

but also:

- store generated playlists in a yaml file, and publish from that,
  instead of only serializing it as markdown and during the publication.
- rename campaigns to seasons
- split campaigns/seasons into separate files
- split catalogue channels into separate files
- update playlists file in-place to merge in catalogue data and apply sorting, etc.

- maybe an `--all` CLI option when updating catalogue, without which we
  ignore channels marked as less important (because we aren't actually
  using them for playlists).

- in a manner as we delete no-longer-existing playlist data files,
  we should accept the existing video ID entires in a playlist file as
  a starting point, but only really as a default/manual sort order, after which
  we remove and append entries based on the playlist definitions, then
  apply the defined sorting order on top of that, if appropriate.

- Or we could even try using https://www.npmjs.com/package/yawn-yaml instead, to
  write our changes on top of the existing data's style, if that makes sense.

- one thing at a time:
  - first, work on rewriting the catalogue logic, with the additional
    options you want added.
*/

export class Catalog {
  #channels?: {
    id: string;
    handle: string;
    name: string;
    videos: {
      id: string;
      title: string;
      details?: {
        released: string;
        duration: number;
        type: "video" | "stream" | "premiere" | "short";
        audience: "public" | "members" | "premium" | "pay";
        privacy: "public" | "unlisted" | "private" | "deleted";
      };
    }[];
  }[];

  async refresh(opts?: {
    mode?: "quick" | "all" | "detailed";
    channels?: string[];
  }) {
    const refreshMode = opts?.mode ?? "quick";

    const channels = await this.channels();

    await this.save();
  }

  async migrate(opts?: {}) {
    await this.load({ legacy: true });
    await this.save();
  }

  async channels() {
    if (!this.#channels) {
      await this.load();
    }
    return this.#channels!;
  }

  private async load(opts?: { legacy: boolean }) {
    this.#channels = [];

    if (opts?.legacy) {
      type LegacyCatalogueEntry = {
        handle: string;
        id: string;
        videos?: Record<
          string,
          {
            title: string;
            type: "public" | "members";
            duration: number;
            published: string;
          }
        >;
      };
      const legacyCatalog = yaml.load(
        "catalogue.yaml"
      ) as unknown as LegacyCatalogueEntry[];

      console.log("loading", legacyCatalog.length);

      for (const entry of legacyCatalog) {
        this.#channels.push({
          id: entry.id,
          handle: entry.handle,
          name:
            {
              collegehumor: "CollegeHumor",
              dimension20show: "Dimension 20",
              dimension20shorts: "Dimension 20 Shorts",
            }[entry.handle] ?? entry.handle,
          videos: Object.entries(entry.videos ?? {}).map(([id, video]) => ({
            title: video.title,
            id,
            details: {
              duration: video.duration,
              released: video.published,
              audience: video.type == "members" ? "members" : "public",
              privacy: "public",
              type: "video",
            },
          })),
        });
      }
    }
  }

  private async save() {
    const catalog = await this.channels();

    await yaml.dumpDirectory(
      "data/catalog",
      Object.fromEntries(
        catalog.map((entry) => [pathComponent(entry.name), entry])
      )
    );
  }
}

export class App {
  catalog: Catalog;

  constructor() {
    this.catalog = new Catalog();
  }

  async migrate() {
    await this.catalog.migrate();
  }

  // async catalogue(
  //   opts?: { quick?: "quick"; all?: "all"; exhaustive?: "exhaustive" },
  //   ...channels: string[]
  // ): Promise<void> {
  //   const mode = opts?.exhaustive ?? opts?.all ?? opts?.quick ?? "quick";

  //   await this.#load();

  //   // If channel handles or IDs are specified, limit our search to those
  //   // channels, otherwise catalog all known channels. If the specified channel
  //   // ID doesn't exist in our catalog, raise an error.

  //   const included = channels.length
  //     ? this.catalog.filter(
  //         (channel) =>
  //           channels.includes(channel.handle) || channels.includes(channel.id)
  //       )
  //     : this.catalog;

  //   // if mode is full, then we want to do an exhaustive listing of every video
  //   // in the channel, fetching metadata for any we don't have, and using that
  //   // listing to classify videos as "unlisted" or "deleted" if appropriate.
  //   // we still won't redundantly fetch individual video details for listed videos
  //   // we've already catalogued, unless the mode is set to "exhaustive".

  //   // if mode is quick, we just scan the latest 32 videos, or keep going until
  //   // we find a video that we haven't seen before.

  //   await this.#save();
  // }

  // async rebuildPlaylists(): Promise<void> {
  //   await this.#save();
  // }

  // async publishPlaylists(): Promise<void> {}

  // async #load(): Promise<void> {
  //   this.catalog = yaml.load(
  //     "catalogue.yaml"
  //   ) as unknown as LegacyCatalogueEntry[];
  //   this.seasons = yaml.load("campaigns.yaml") as unknown as Season[];
  //   this.playlists = yaml.load("playlists.yaml") as unknown as Playlist[];
  // }

  // async #save(): Promise<void> {
  //   yaml.dump("catalogue.yaml", this.catalog);
  //   await Deno.mkdir("data/catalog", { recursive: true });
  //   await yaml.dumpDirectory(
  //     "data/catalog",
  //     Object.fromEntries(
  //       this.catalog.map((entry) => [pathComponent(entry.handle), entry])
  //     )
  //   );

  //   yaml.dump("campaigns.yaml", this.seasons);
  //   await Deno.mkdir("data/seasons", { recursive: true });
  //   await yaml.dumpDirectory(
  //     "data/seasons",
  //     Object.fromEntries(
  //       this.seasons.map((entry) => [
  //         pathComponent([...new Set([entry.from, entry.season])].join(" - ")),
  //         entry,
  //       ])
  //     )
  //   );

  //   yaml.dump("playlists.yaml", this.playlists);
  //   await Deno.mkdir("data/playlists", { recursive: true });
  //   await yaml.dumpDirectory(
  //     "data/playlists",
  //     Object.fromEntries(
  //       this.playlists.map((entry) => [pathComponent(entry.name), entry])
  //     )
  //   );
  // }
}

const pathComponent = (s: string): string => {
  return s
    .replace(/(\S): /g, "$1 - ")
    .replace(/[^A-Za-z0-9_()\-+,. ]+/g, "")
    .trim();
};
