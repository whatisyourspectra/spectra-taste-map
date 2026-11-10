# Demo artwork and playback preparation

The 240-song demo uses 147 locally bundled album covers in `public/demo-covers/`.
Artwork display does not call the Apple search API. `sources.json` records the
album sources. Songs are played through the existing visible YouTube IFrame player.

The server checks `src/server/data/demoYouTubeMatches.js` before using YouTube
search. This prepared catalog survives a server restart and is shared by visitors
once deployed. Runtime searches also coalesce concurrent requests for the same song;
successful responses permit a Vercel CDN cache of up to one day. The browser keeps
the source expiration instead of extending it by another 30 days.

Inspect preparation status without any provider requests:

```sh
npm run demo:playback
```

Prepare at most 40 missing songs, prioritizing the first songs of all three themes:

```sh
npm run demo:playback -- --prepare --limit=40
```

This command uses the server's `YOUTUBE_API_KEY` and `YOUTUBE_REGION` from `.env`.
It stops on the first provider error, saves completed matches, and validates video
embedding, regional restrictions and age restrictions through `videos.list`.
Running it again skips fresh matches. Review the generated video titles before
deploying the catalog. Preparation changes must be deployed to reach exhibition
visitors; changing the local file alone does not update the live service.

Refresh existing matches before they reach 30 days, without repeating song searches:

```sh
npm run demo:playback -- --verify
```

Validation uses batches of up to 50 video IDs, so 240 existing matches require up
to five `videos.list` requests and no `search.list` requests. Expired matches are
never served. Deleted, blocked or non-embeddable videos are removed and can be
searched again during the next preparation run.

The default project allocation is 100 searches per day, shared with live visitors;
240 initial song searches may require preparation across several days, depending
on the project's actual quota and existing usage. The default 40-song run leaves
room for live requests. This does not download MP3s or provide offline playback;
YouTube playback still requires an internet connection.

References: [YouTube quota](https://developers.google.com/youtube/data/determine_quota_cost),
[data refresh policy](https://developers.google.com/youtube/terms/developer-policies#refreshing-storing-and-displaying-api-data),
[Vercel caching](https://vercel.com/docs/caching/cache-control-headers).
