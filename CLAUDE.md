# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

SPECTRA Taste Map — the user imports a list of liked songs (CSV or "Artist - Title" lines, e.g. exported via Tune My Music / Exportify), the server enriches each track with **Last.fm** genre/mood tags, and the app clusters them into a responsive spatial "taste field" visualization.

**Why not Spotify:** Spotify's Web API can't leave Development mode (25-user cap, no production approval) and `audio-features`/`recommendations` are deprecated for new apps. Last.fm needs only a free API key (no approval). Last.fm has no audio features, so tags are mapped into the `[valence, energy, danceability, acousticness, instrumentalness]` space via `tagsToFeatures()` in `server.js` (extends the pre-existing `GENRE_SCORES` with `MOOD_SCORES`).

## Commands

```bash
npm run dev:all   # Vite client (:5173) + Express API server (:3001) together — default dev flow
npm run dev       # Client only (:5173, proxies /api → :3001)
npm run server    # Express API server only (:3001, via nodemon)
npm run build     # Build the client to dist/
npm run preview   # Preview the production build
npm run lint      # eslint . (whole repo)
```

- **No test runner is configured.** There is no single-test command. Verify changes with `npm run lint` plus running the app manually.
- First-time setup: `npm install` → `cp .env.example .env`, then set `LASTFM_API_KEY` (free key from https://www.last.fm/api/account/create). All variables are documented in `.env.example`.
- **Verify without a key:** set `LASTFM_MOCK=1` in `.env` — `src/server/lastfm.js` returns deterministic synthetic tags so the whole flow works offline.
- Production: `npm run build`, then `npm run server` serves both `dist/` and the API from :3001.
- Key endpoints: `POST /api/taste/enrich`, `GET /api/discover`. Both are also exposed through `api/` as Vercel Functions. There is **no OAuth / login** anymore.

## Git workflow

- **The base branch is `dev`, not `main`.** Always branch off `dev`.
- Use purpose prefixes for branch names: `feature/<name>`, `fix/<name>`, `chore/<name>`, `refactor/<name>`.
- Open PRs / merge back into `dev`. Keep `main` for releases/deploys only.
- Do not commit or push unless the user explicitly asks.

## Design rules (summary)

- Keep the `LASTFM_API_KEY` on the server only; the client never calls Last.fm directly.
- Offload heavy computation to Web Workers; the imported taste is cached in `sessionStorage` (`TasteDataContext`) and re-enriched only on a new import.
- The client consumes server endpoints only. Track "play" opens an external search link (no in-app playback); "save" folds the track into the local field.
- Desktop and mobile views use the imported taste cached in the current browser session; there is no cross-device handoff or realtime relay.
