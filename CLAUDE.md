# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

SPECTRA Taste Map — the user imports a list of liked songs (CSV or "Artist - Title" lines, e.g. exported via Tune My Music / Exportify), the server combines **Last.fm tags** with **Spotify public-catalog metadata** through Client Credentials, and the app exposes separate Last.fm and Spotify-derived spatial fields.

**Dual source:** users provide the track list themselves, so the app does not need Spotify OAuth or private user data. Last.fm genre/mood tags drive the original Taste Field. Spotify supplies album covers, links, and artist genres; those genres drive a separate Spotify Field. Both sources are mapped into `[valence, energy, danceability, acousticness, instrumentalness]` because Spotify `audio-features` is unavailable to this Development Mode app.

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
- First-time setup: `npm install` → `cp .env.example .env`, then set `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, and `LASTFM_API_KEY`. All variables are documented in `.env.example`.
- **Verify without credentials:** set both `SPOTIFY_MOCK=1` and `LASTFM_MOCK=1` in `.env` for deterministic offline data.
- Production: `npm run build`, then `npm run server` serves both `dist/` and the API from :3001.
- Key endpoints: `POST /api/taste/enrich`, `GET /api/discover`. Both are also exposed through `api/` as Vercel Functions. There is **no OAuth / login** anymore.

## Git workflow

- **The base branch is `dev`, not `main`.** Always branch off `dev`.
- Use purpose prefixes for branch names: `feature/<name>`, `fix/<name>`, `chore/<name>`, `refactor/<name>`.
- Open PRs / merge back into `dev`. Keep `main` for releases/deploys only.
- Do not commit or push unless the user explicitly asks.

## Design rules (summary)

- Keep `SPOTIFY_CLIENT_SECRET`, app access tokens, and `LASTFM_API_KEY` on the server only; the client consumes server endpoints only.
- Offload heavy computation to Web Workers; the imported taste is cached in `sessionStorage` (`TasteDataContext`) and re-enriched only on a new import.
- The client consumes server endpoints only. Track "play" opens an external search link (no in-app playback); "save" folds the track into the local field.
- Desktop and mobile views use the imported taste cached in the current browser session; there is no cross-device handoff or realtime relay.
