# SPECTRA · Taste Map

A spatial visualization of your music taste. You import a list of your liked
songs (exported from Spotify/Apple/etc. via **Tune My Music**, Exportify, or any
CSV), SPECTRA combines **Last.fm community tags** with login-free **Spotify
catalog metadata**, then turns them into interactive clustered fields you can
explore on desktop or mobile.

This repository is the standalone **Taste Map** feature extracted from the
larger SPECTRA project.

## Dual taste fields without user login

Visitors import their own list instead of connecting a Spotify account. Last.fm
supplies the detailed genre/mood tags used by the original **Taste Field**. The
server also uses Spotify's **Client Credentials** flow to fill album covers and
links, and to power a separate **Spotify Field** whose coordinates are estimated
from Spotify artist genres. Spotify `audio-features` remains unavailable to this
Development Mode app.

## Features

- **Import taste** — paste an "Artist - Title" list or drop a CSV; the server
  enriches it with Last.fm tags plus Spotify catalog metadata. No login required.
- **Taste Field** — the original Last.fm tag/mood distribution with Spotify
  cover matching layered onto every matched track.
- **Spotify Field** — a separate field estimated from Spotify artist genres.
- **Taste Map** (`/taste-map`) — enriched tracks are clustered (k-means in a Web
  Worker) into an animated bubble field.
- **Responsive** — desktop map (`TasteMapPage`) and a touch-first mobile view
  (`TasteMapMobilePage`), auto-selected by viewport, also reachable directly at
  `/taste-map/mobile`.
- **Digging** — Last.fm similar/tag discovery in Taste Field and Spotify
  artist/genre discovery in Spotify Field.
- **Metro live playback** — a visible YouTube mini player can resolve a train's
  route tracks, keep playing through the stations, and drive train
  play/pause/progress from the actual video state.
- Track clicks open the song on an external service (Spotify/YouTube search).

## Tech stack

- **Client:** React 19, React Router, Vite, Three.js (import scene), Web Workers
- **Server:** Node + Express, Vercel Functions, Last.fm API + Spotify Web API

## Prerequisites

- Node 18+
- A Spotify developer app with Client ID and Client Secret from the
  [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
- A free Last.fm API key from
  [last.fm/api/account/create](https://www.last.fm/api/account/create).
- For Metro live playback, a YouTube Data API v3 key from the
  [Google Cloud Console](https://console.cloud.google.com/apis/library/youtube.googleapis.com).

## Setup

```bash
npm install
cp .env.example .env   # then set Spotify, Last.fm, and optional YouTube credentials
```

See `.env.example` for every supported variable. To try the app without
credentials, set `SPOTIFY_MOCK=1` and `LASTFM_MOCK=1` for deterministic demos.

## Development

Run the Vite client (`:5173`) and the API server (`:3001`) together:

```bash
npm run dev:all
```

Or run them separately:

```bash
npm run server   # Express API on :3001
npm run dev      # Vite dev client on :5173 (proxies /api → :3001)
```

Open http://127.0.0.1:5173, then import a track list to generate your map.

## Production build

```bash
npm run build    # outputs to dist/
npm run server   # serves dist/ and the API from :3001
```

## Project layout

```
server.js                     Express API (dual-source enrich/discover) + production server
api/                          Vercel Function entrypoints for the Express API
src/
  App.jsx                     Routing + import overlay (Three.js scene + Tune My Music guide)
  context/TasteDataContext    Imported + enriched taste (sessionStorage backed)
  server/spotify.js           Spotify catalog client (Client Credentials + cache/mock)
  server/lastfm.js            Last.fm tag/similar-track client (cache/mock)
  server/youtube.js           Server-only YouTube video resolver + cache
  utils/parseTrackList.js     CSV / "Artist - Title" list parser
  pages/
    TasteMapPage.jsx          Desktop taste map
    TasteMapMobilePage.jsx    Touch-first view using the current browser session
    MetroYouTubePlayer.jsx    Visible IFrame player for Metro journeys
  workers/
    kmeansWorker.js           Clustering
    bubbleLayoutWorker.js     Bubble packing / layout
docs/TASTE_MAP_SPEC_KO.md     Feature spec (Korean)
```

## API endpoints

- `POST /api/taste/enrich` — `{ tracks:[{artist,title}] }` → enriched taste
- `GET  /api/discover` — source-aware discovery (`source=lastfm|spotify`)
- `GET  /api/youtube/search` — resolves `artist` + `title` to an embeddable video

On Vercel, set `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, and
`LASTFM_API_KEY`. Set `YOUTUBE_API_KEY` to enable Metro live playback. The
files under `api/` expose the endpoints as Vercel Functions while the Vite app
remains a static deployment.
