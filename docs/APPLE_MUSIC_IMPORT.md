# Apple Music import guidance

Updated 2026-11-07. The reported difficulty was Apple sign-in and playlist selection.

## Shared template

Spotify, Apple Music and YouTube Music now use `src/components/PlaylistImportGuide.jsx` with one shared stylesheet. Service copy, export paths, formats, library links and optional video clips are configured in `src/components/playlistImportGuides.js`.

All services share the same introduction, export link, Mobile / Mac–PC selector, four instruction steps, previous/next actions, three troubleshooting sections and existing-file shortcut. Spotify's existing recordings are optional video disclosures within that template, mapped to the four steps; the video component no longer has its own competing navigation.

Each service keeps a separate `spectra:import-guide:v1:<service>` sessionStorage entry. Existing Apple progress under `spectra:apple-import-guide:v1` is read as a fallback, so the shared template does not lose the previous guide position. These entries contain only the guide step and device, never account credentials or authorization status.

## Experience

- Selecting Apple Music opens a dedicated four-step guide: account, playlist, file, map.
- The export link goes to TuneMyMusic's Apple Music → file page rather than its generic service picker.
- The guide distinguishes SPECTRA sign-in from Apple authorization. It asks users to use their music account and review the music-library access prompt.
- Playlist instructions call out the playlist name, song count and selected songs. The user advances the instructions manually; opening an external page never marks an account as connected.
- Contextual help covers an empty library, a particular missing playlist, and repeating sign-in. It links to the web library and official help rather than asking the user to make playlists public or share credentials.
- Mobile and Mac/PC choices adapt the sync and file-location instructions. Mobile upload copy covers iPhone/iPad and Android. The guide step and device preference are stored only in sessionStorage, with an in-memory fallback if storage is unavailable.
- An existing-file shortcut always opens the real file chooser, without requiring the user to complete the guide.
- All guide content is available in Korean and English. Changing language preserves the selected step.

The guide does not authorize Apple Music, inspect external login state, fetch private playlists, or change import parsing. Imports still use the existing CSV/TXT file flow. External page labels, available playlists and export conditions are controlled by TuneMyMusic and Apple.

## Sources checked

- [TuneMyMusic Apple Music → file](https://www.tunemymusic.com/transfer/apple-music-to-file): source authorization, library/playlist selection, CSV/TXT export.
- [TuneMyMusic Spotify → file](https://www.tunemymusic.com/transfer/spotify-to-file) and [YouTube Music → file](https://www.tunemymusic.com/transfer/youtube-music-to-file): dedicated service export entry points.
- [Apple Sync Library](https://support.apple.com/en-us/118285): subscription, account consistency, sync settings and web-library access.
- [Apple playlist creation](https://support.apple.com/en-ge/118289): creating a playlist and adding songs.
- [Apple library additions](https://support.apple.com/en-gb/guide/iphone/iph0cff2d191/26/ios/26): adding playlists to the library.
- [Apple downloaded files](https://support.apple.com/en-us/102440): Files → Browse → iCloud Drive → Downloads.

## Verification

`tests/browser/appleMusicImport.mjs` uses local auth/API stubs and an external-page fixture; it never signs in to Apple. It checks Korean/English at 1440, 390 and 320 px, the separate-tab handoff, missing-library help, device and locale changes, restoration after reload, horizontal layout and the native file chooser. It also checks navigation and upload with browser storage blocked.

`tests/browser/playlistImportGuides.mjs` covers all three services in both languages at the same three widths. It checks consistent layout/steps, correct service URLs and copy, file selection, video step mapping/close behavior, progress isolation between services, restoration after reload, and legacy Apple progress migration.

The Apple-specific browser check accepts `START_VITE=1`, a `PLAYWRIGHT_MODULE` path, and optionally `CHROMIUM_EXECUTABLE`. Its temporary Vite server is stopped in `finally`. The common browser check uses an existing temporary server through `BASE_URL`.
