# My Spectra mobile reflection

The mobile surface uses “My Spectra / 나의 스펙트라” for personal taste identity. Internal constellation module names and route IDs remain compatible.

## Experience

1. Current Spectra: 3D orbit rotation with inertia, two-finger pinch zoom, recenter, keyboard navigation, and selectable track lights.
2. One factual change summary relative to the prior visit's arrival snapshot.
3. Up to five source tracks labeled by explicit choice or import; listening links do not count as listening history.
4. Previous/current crossfade with a nearby preview and labeled endpoints.
5. Optional Taste Drop, fetched only when opened.

The first visit establishes a baseline without inventing a trend. The arrival snapshot stays fixed throughout the visit; decisions persist separately, so the next visit can show choices made since the previous arrival. Only the latest choice per track is retained. This is a two-visit comparison, not a historical timeline or a playback model.

Records are stored locally under an account-and-map-specific key. Storage failure is shown in the page. Cross-device reflection sync is not implemented. Importing a new map starts a new reflection history. Existing cloud library sync remains separate.

SVG star count remains bounded. A deterministic XYZ projection keeps track depth stable between visits; SVG nodes and attached edges are projected together with perspective, preserving PNG export. Depth is a visual property, not an additional taste metric. Pointer updates are batched through requestAnimationFrame; inertia stops when hidden or unmounted. Reduced-motion preference disables inertia and decorative animations. The field owns horizontal/vertical swipes and pinch gestures; surrounding content remains scrollable. Explicit buttons and keyboard controls provide alternatives.

Validation: `node --test tests/*.test.mjs`, targeted ESLint, `npm run build`. Chromium smoke checks use seeded music and mocked discovery: first visit, persistent Absorb, return-visit summary, comparison slider, keyboard track selection, zoom, PNG export, 390×844 and 320×568 widths, reduced motion. Additional Chromium touch-event checks cover horizontal/vertical rotation, pinch zoom, inertia, recenter, and reduced-motion inertia suppression. Projection tests cover quarter-turn volume, full-turn identity, stable edge endpoints and finite coordinates. Real-device Safari and live music services need separate validation.

## Daily Spectra

The primary area below the 3D field now presents a daily music reading: a date, one of four editorial themes, a short invitation, and an expandable bundle of up to five tracks. Theme and ranking depend deterministically on local calendar date and account/map identity. This is music curation, not a prediction or inferred personal mood.

Opening the card fetches discovery once with a 12-second timeout, mixing up to three new tracks with library tracks ranked by the theme's energy and a daily stable tie-breaker. Missing energy is neutral. Empty/failed discovery uses real library tracks with an explicit label and optional retry. The day’s bundle is cached in this browser; midnight or return after a day change selects the next day. A short library produces fewer than five tracks.

Each row opens the track externally; there is no implied continuous playback or exported service playlist. Accepting the whole bundle records distinct Absorb decisions through the existing reflection flow, including during background library enrichment. Reflection/comparison remain in a disclosure below the daily card. Local storage and cross-device limitations remain unchanged.

Validation adds deterministic bundle tests and mobile browser checks for reveal, fallback, accepting all five tracks, persisted decisions, same-day cache reuse without another discovery request, and 320px layout.

## Story cards

My Spectra and Daily Spectra each generate a 1080×1920 PNG and open a shared preview dialog. My Spectra captures the rendered current 3D projection before asynchronous image decoding; Daily Spectra draws the current theme, date, message and up to five track titles/artists. Long track metadata is truncated to the card width. Card text stays within vertical story UI margins. No external cover images are needed for rendering.

Sharing is invoked directly from a separate user button after the file exists. Feature detection gates the native share action; saving always remains available. Cancelling the system share sheet is silent, while other failures show an error and retain the image download. The web app cannot force Instagram as a target or confirm publication. Browser verification stubs the system share call for success/cancel/failure; actual Instagram handoff requires device testing on HTTPS.

## Release fixes and regression checks

During enrichment, saving decisions preserves the existing snapshot until a new ready-state baseline is available. Failed local writes show an alert outside the collapsed reflection and beside Daily Spectra actions; retry persists the pending choices without repeating Absorb. The daily library seed is captured on first reveal, so background enrichment completed before reveal is included; same-day cached bundles remain stable.

Run `tests/browser/mobileRelease.mjs` with `PLAYWRIGHT_MODULE` pointing to an installed Playwright module, optional `CHROMIUM_EXECUTABLE`, and `BASE_URL` pointing to the Vite development server. The checks seed isolated browser data and mock music/auth requests. They cover snapshot preservation during enrichment, storage quota failure/retry, and library growth before daily reveal.
