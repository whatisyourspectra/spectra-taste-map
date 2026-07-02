# SPECTRA · Taste Map

A spatial visualization of your Spotify listening taste. SPECTRA turns your
liked songs, recently played tracks and followed artists into an interactive,
clustered "taste field" you can explore — plus a mobile companion view that
syncs back to the desktop map in real time.

This repository is the standalone **Taste Map** feature extracted from the
larger SPECTRA project.

## Features

- **Taste Map** (`/taste-map`) — Spotify library is fetched, feature-analyzed,
  and clustered (k-means in a Web Worker) into an animated bubble field.
- **Responsive** — desktop map (`TasteMapPage`) and a touch-first mobile view
  (`TasteMapMobilePage`), auto-selected by viewport, also reachable directly at
  `/taste-map/mobile`.
- **Real-time sync** — the mobile companion relays actions (expand / plan-add)
  to the desktop map over Socket.IO.
- **Spotify OAuth** — server-side auth code flow; user tokens live in the
  Express session, never in the browser.

## Tech stack

- **Client:** React 19, React Router, Vite, Three.js (login scene), Web Workers
- **Server:** Node + Express, Socket.IO, Spotify Web API, Firebase Firestore
  (reads the `favorites` collection)

## Prerequisites

- Node 18+
- A Spotify app (Client ID / Secret) from the
  [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) with
  `http://127.0.0.1:3001/auth/callback` registered as a redirect URI.

## Setup

```bash
npm install
cp .env.example .env   # then fill in your Spotify credentials
```

See `.env.example` for every supported variable.

## Development

Run the Vite client (`:5173`) and the API/Socket server (`:3001`) together:

```bash
npm run dev:all
```

Or run them separately:

```bash
npm run server   # Express + Socket.IO on :3001
npm run dev      # Vite dev client on :5173 (proxies /api, /auth, /socket.io → :3001)
```

Open http://127.0.0.1:5173 and connect with Spotify.

## Production build

```bash
npm run build    # outputs to dist/
npm run server   # serves dist/ and the API from :3001
```

## Project layout

```
server.js                     Express API + Spotify OAuth + Socket.IO relay
src/
  App.jsx                     Routing + Spotify login overlay (Three.js scene)
  context/SpotifyAuthContext  Auth state (session-cookie based)
  hooks/useSocket.js          Socket.IO client + control/spectrum helpers
  firebase.js                 Firestore client (favorites collection)
  pages/
    TasteMapPage.jsx          Desktop taste map
    TasteMapMobilePage.jsx    Mobile companion view
  workers/
    kmeansWorker.js           Clustering
    bubbleLayoutWorker.js     Bubble packing / layout
docs/TASTE_MAP_SPEC_KO.md     Feature spec (Korean)
```

## API endpoints

All under the authenticated Spotify session:

- `GET  /auth/login`, `GET /auth/callback`, `GET /auth/bridge`, `POST /auth/logout`
- `GET  /api/me/profile`
- `GET|POST /api/me/taste-snapshot`
- `GET  /api/me/recently-played`
- `GET  /api/me/taste-library-summary`
- `GET  /api/me/liked-tracks-features`
- `GET  /api/me/now-playing`
- `POST /api/me/playback/play-track`
- `PUT  /api/me/library/save`
- `GET  /api/spotify/digging`
