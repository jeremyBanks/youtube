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
  a starting point, but only really as a default sort order, after which
  we remove and append entries based on the playlist definitions, then
  apply the defined sorting order on top of that, if appropriate.
*/

export type Catalog = Array<{
  handle: string;
  id: string;
  videos?: Record<
    string,
    {
      title: string;
      type: "public" | "members" | "removed" | "unlisted";
      duration: number;
      published: string;
    }
  >;
}>;

export type Season = {
  season: string;
  from: string;
  "sort by"?: "oldest" | `${string}=>${string}`;
  debut: string;
  cast?: string;
  world?: string;
  videos: Array<{
    trailer?: string;
    episode?: string;
    animation?: string;
    bts?: string;
    special?: string;
    external?: string;
    public?: string;
    "public parts"?: Array<string>;
    members?: string;
    dropout?: string;
    published?: string;
    duration?: number;
  }>;
};

export type Playlist = {
  name: string;
  id?: string;
  description: string;
  include: {
    from: "Dimension 20";
    world?: string;
    cast?: string;
    season?: string | Array<string>;
    type: Array<
      "episode" | "special" | "trailer" | "bts" | "animation" | "external"
    >;
    version: Array<"public" | "members">;
  };
};

export class App {
  catalog: Catalog;
  seasons: Array<Season>;
  playlists: Array<Playlist>;

  constructor() {
    this.catalog = yaml.load("catalogue.yaml") as unknown as Catalog;
    this.seasons = yaml.load("campaigns.yaml") as unknown as Array<Season>;
    this.playlists = yaml.load("playlists.yaml") as unknown as Array<Playlist>;
  }

  async updateCatalogue(): Promise<void> {
    await this.save();
  }

  async rebuildPlaylists(): Promise<void> {
    await this.save();
  }

  async publishPlaylists(): Promise<void> {}

  async save() {
    yaml.dump("catalogue.yaml", this.catalog);
    await Deno.mkdir("data/catalog", { recursive: true });
    await yaml.dumpDirectory(
      "data/catalog",
      Object.fromEntries(
        this.catalog.map((entry) => [pathComponent(entry.handle), entry])
      )
    );

    yaml.dump("campaigns.yaml", this.seasons);
    await Deno.mkdir("data/seasons", { recursive: true });
    await yaml.dumpDirectory(
      "data/seasons",
      Object.fromEntries(
        this.seasons.map((entry) => [
          pathComponent([...new Set([entry.from, entry.season])].join(" - ")),
          entry,
        ])
      )
    );

    yaml.dump("playlists.yaml", this.playlists);
    await Deno.mkdir("data/playlists", { recursive: true });
    await yaml.dumpDirectory(
      "data/playlists",
      Object.fromEntries(
        this.playlists.map((entry) => [pathComponent(entry.name), entry])
      )
    );
  }
}

const pathComponent = (s: string): string => {
  return s
    .replace(/(\S): /g, "$1 - ")
    .replace(/[^A-Za-z0-9_()\-+,. ]+/g, "")
    .trim();
};

await new App().save();
