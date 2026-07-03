# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

SPECTRA Taste Map — analyzes and clusters your Spotify listening data (liked/recently-played tracks, followed artists) into a spatial "taste field" visualization. It has a desktop map and a mobile companion view that syncs to the desktop in real time.

## Commands

```bash
npm run dev:all   # Vite client (:5173) + Express/Socket server (:3001) together — default dev flow
npm run dev       # Client only (:5173, proxies /api·/auth·/socket.io → :3001)
npm run server    # Express + Socket.IO server only (:3001, via nodemon)
npm run build     # Build the client to dist/
npm run preview   # Preview the production build
npm run lint      # eslint . (whole repo)
```

- **No test runner is configured.** There is no single-test command. Verify changes with `npm run lint` plus running the app manually.
- First-time setup: `npm install` → `cp .env.example .env`, then fill in Spotify credentials. All variables are documented in `.env.example`.
- Register the redirect URI `http://127.0.0.1:3001/auth/callback` in the Spotify developer dashboard.
- Production: `npm run build`, then `npm run server` serves both `dist/` and the API from :3001.

## Git workflow

- **The base branch is `dev`, not `main`.** Always branch off `dev`.
- Use purpose prefixes for branch names: `feature/<name>`, `fix/<name>`, `chore/<name>`, `refactor/<name>`.
- Open PRs / merge back into `dev`. Keep `main` for releases/deploys only.
- Do not commit or push unless the user explicitly asks.

## Design rules (summary)

- Keep secrets and tokens on the server only (see "Secret boundary").
- Offload heavy computation to Web Workers and reuse results via the `sessionStorage` TTL cache.
- The client consumes server endpoints only; it never calls the Spotify API directly.
