// deno-lint-ignore-file no-explicit-any
import {
  MetadataBadge,
  Video,
} from "../../../YouTube.js/deno/src/parser/nodes.ts";
import * as yaml from "../yaml.ts";
import { youtubeiReader } from "../youtube.ts";

const catalogue = yaml.load("catalogue.yaml") as Array<{
  handle: string;
  id: string;
  videos?: Record<
    string,
    {
      title: string;
      type: "public" | "members" | "removed" | "unlisted";
      duration: number;
      published: string;
      scan: string;
    }
  >;
}>;

const scan = `s${Date.now().toString(36).slice(0, 2)}${
  Date.now().toString(36).slice(0, 11)
}`;

for (const channel of catalogue) {
  channel.videos ??= {};

  console.log("Cataloguing", channel.handle, channel.id);

  const meta = await youtubeiReader.getChannel(channel.id);

  for (
    let feed of [
      await meta.getVideos().then(
        (videos) => [videos],
        () => [],
      ),
      await meta.getShorts().then(
        (shorts) => [shorts],
        () => [],
      ),
    ].flat()
  ) {
    for (;;) {
      let foundExisting = false;
      for (const video of feed.videos as Array<Video>) {
        const existing = channel.videos[video.id];

        if (existing && existing.scan) {
          foundExisting = true;
          break;
        }

        const details = await youtubeiReader.getInfo(video.id);

        const publishedHumaneReadable = details.primary_info?.published?.text!;
        const [month, day, year] =
          publishedHumaneReadable?.replace("Premiered ", "")?.split(/[ ,]+/g) ??
            (() => {
              console.warn(
                "failed to find publication date for",
                video.id,
                details.primary_info,
                video,
              );
              return ["00", "00", "0000"];
            })();
        const published = `${year}-${
          month
            .replace("Jan", "01")
            .replace("Feb", "02")
            .replace("Mar", "03")
            .replace("Apr", "04")
            .replace("May", "05")
            .replace("Jun", "06")
            .replace("Jul", "07")
            .replace("Aug", "08")
            .replace("Sep", "09")
            .replace("Oct", "10")
            .replace("Nov", "11")
            .replace("Dec", "12")
        }-${day.padStart(2, "0")}`;

        channel.videos[video.id] = {
          title: video.title.text!,
          type: video.badges?.filter(
              (badge: MetadataBadge) => badge.label === "Members only",
            ).length
            ? "members"
            : "public",
          duration: Number(
            video.duration?.seconds ??
              (video as any).accessibility_label?.match(
                /- (\d+) second(s)? - play video$/,
              )?.[1] ??
              60,
          ),
          published,
          scan,
        };
      }

      // Now sort channel videos by date descending and ID ascending
      const entries = Object.entries(channel.videos);
      entries.sort(([aId, a], [bId, b]) => {
        if (a.published > b.published) {
          return -1;
        } else if (b.published > a.published) {
          return +1;
        } else if (aId < bId) {
          return +1;
        } else if (bId < aId) {
          return -1;
        } else {
          return 0;
        }
      });
      channel.videos = {};
      for (const [key, value] of entries) {
        channel.videos[key] = value;
      }

      yaml.dump("catalogue.yaml", catalogue);

      if (foundExisting) {
        console.info(
          "Assuming all videos are catalogued because we've encountered one that's already catalogued.",
        );
        break;
      } else if (feed.has_continuation) {
        console.log("Loading another page of videos.");
        feed = (await feed.getContinuation()) as any;
        continue;
      } else {
        console.log("Reached end of video list; all videos catalogued.");
        break;
      }
    }
  }
}

yaml.dump("catalogue.yaml", catalogue);
