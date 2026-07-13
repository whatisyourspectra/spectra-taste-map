# SPECTRA · Taste Map

A spatial visualization of your music taste. You import a list of your liked
songs (exported from Spotify/Apple/etc. via **Tune My Music**, Exportify, or any
CSV), SPECTRA enriches each track with **Last.fm** community tags, and turns them
into an interactive, clustered "taste field" you can explore — plus a mobile
companion view that syncs back to the desktop map in real time.

This repository is the standalone **Taste Map** feature extracted from the
larger SPECTRA project.

## Why Last.fm instead of Spotify?

Spotify's Web API keeps new apps in *Development mode* (a hard 25-user cap that
can't be lifted without an approval that is no longer granted for this kind of
app), and its `audio-features` / `recommendations` endpoints are deprecated for
new apps. Last.fm only needs a **free API key** (registration, no approval), so
the app can be shared publicly. Last.fm doesn't expose audio features, so we map
its genre/mood **tags** into the same `valence / energy / danceability /
acousticness / instrumentalness` space the map clusters on.

## Features

- **Import taste** — paste an "Artist - Title" list or drop a CSV; the server
  enriches it via Last.fm tags. No login required.
- **Taste Map** (`/taste-map`) — enriched tracks are clustered (k-means in a Web
  Worker) into an animated bubble field.
- **Responsive** — desktop map (`TasteMapPage`) and a touch-first mobile view
  (`TasteMapMobilePage`), auto-selected by viewport, also reachable directly at
  `/taste-map/mobile`.
- **Mobile companion + QR** — the desktop shows a QR/link; scanning it opens the
  companion, which loads the same taste by `mapId` and relays actions
  (expand / plan-add) back over Socket.IO.
- **Digging** — discovery via Last.fm `track.getSimilar` / `tag.getTopTracks`.
- Track clicks open the song on an external service (Spotify/YouTube search).

## Tech stack

- **Client:** React 19, React Router, Vite, Three.js (import scene), Web Workers
- **Server:** Node + Express, Socket.IO, Last.fm API (tag enrichment)

## Prerequisites

- Node 18+
- A free Last.fm API key from
  [last.fm/api/account/create](https://www.last.fm/api/account/create).

## Setup

```bash
npm install
cp .env.example .env   # then set LASTFM_API_KEY
```

See `.env.example` for every supported variable. To try the app without a key,
set `LASTFM_MOCK=1` (deterministic synthetic tags for demos/verification).

## Development

Run the Vite client (`:5173`) and the API/Socket server (`:3001`) together:

```bash
npm run dev:all
```

Or run them separately:

```bash
npm run server   # Express + Socket.IO on :3001
npm run dev      # Vite dev client on :5173 (proxies /api, /socket.io → :3001)
```

Open http://127.0.0.1:5173, then import a track list to generate your map.

## Production build

```bash
npm run build    # outputs to dist/
npm run server   # serves dist/ and the API from :3001
```

## Project layout

```
server.js                     Express API (Last.fm enrich/discover/handoff) + Socket.IO relay
src/
  App.jsx                     Routing + import overlay (Three.js scene + Tune My Music guide)
  context/TasteDataContext    Imported + enriched taste (sessionStorage backed)
  hooks/useSocket.js          Socket.IO client + control/spectrum helpers
  server/lastfm.js            Last.fm client (tags, similar, tag-top; mock mode)
  utils/parseTrackList.js     CSV / "Artist - Title" list parser
  pages/
    TasteMapPage.jsx          Desktop taste map
    TasteMapMobilePage.jsx    Mobile companion view
  workers/
    kmeansWorker.js           Clustering
    bubbleLayoutWorker.js     Bubble packing / layout
docs/TASTE_MAP_SPEC_KO.md     Feature spec (Korean)
```

## API endpoints

- `POST /api/taste/enrich` — `{ tracks:[{artist,title}] }` → enriched taste
- `GET  /api/discover` — Last.fm-backed discovery (valence/energy/seedGenres/seedTracks)
- `POST /api/taste/handoff` · `GET /api/taste/handoff/:mapId` — mobile companion handoff
