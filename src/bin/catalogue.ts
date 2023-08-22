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

  console.log("Cataloguing", channel.handle, channel.id);

  const meta = await youtubei.getChannel(channel.id);

  for (let feed of [
    [await meta.getVideos()],
    await meta.getShorts().then(
      (shorts) => [shorts],
      () => []
    ),
  ].flat()) {
    for (;;) {
      let foundExisting = false;
      for (const video of feed.videos) {
        const existing = channel.videos[video.id];

        if (existing) {
          foundExisting = true;
          break;
        }

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

      if (foundExisting) {
        console.info(
          "Assuming all videos are catalogued because we've encountered one that's already catalogued."
        );
        break;
      } else if (feed.has_continuation) {
        console.log("Loading another page of videos.");
        feed = await feed.getContinuation();
        continue;
      } else {
        console.log("Reached end of video list; all videos catalogued.");
        break;
      }
    }
  }
}

yaml.dump("catalogue.yaml", catalogue);
