import yaml from "./yaml.ts";

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
    yaml.dump("campaigns.yaml", this.seasons);
    yaml.dump("playlists.yaml", this.playlists);
  }
}
