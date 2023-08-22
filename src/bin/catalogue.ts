import yaml from "../yaml.ts";
import { youtubeiDefaultUser as youtubei } from "../youtube.ts";

const catalogue = yaml.load("catalogue.yaml");

for (const channel: {
  handle: string;
  id: string;
  videos?: Array<{
    title: string;
    type: "public" | "members" | "removed" | "unlisted";
    duration: number;
  }>;
} of catalogue) {
  channel.videos ??= {};

  const meta = await youtubei.getChannel(channel.id);
  for (let feed of [
    await meta.getVideos(),
    await meta.getShorts().catch(() => ({
      videos: [],
    })),
  ]) {
    for (;;) {
      for (const video of feed.videos) {
        channel.videos[video.id] = {
          title: video.title.text,
          type: video.badges?.filter((badge) => badge.label === "Members only")
            .length
            ? "members"
            : "public",
          duration: Number(
            video.duration?.seconds ??
              video.accessibility_label?.match(
                /- (\d+) second(s)? - play video$/
              )?.[1] ??
              60
          ),
        };
      }

      yaml.dump("catalogue.yaml", catalogue);

      if (feed.has_continuation) {
        console.warn(
          "XXX: SKIPPING ADDITIONAL PAGES, DELETE THIS `break`; LATER."
        );
        break;

        feed = await feed.getContinuation();
        continue;
      } else {
        break;
      }
    }
  }
}

yaml.dump("catalogue.yaml", catalogue);
