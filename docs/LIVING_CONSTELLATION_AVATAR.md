# Living Constellation Avatar — mobile prototype

## Repository audit

- `src/pages/TasteMapPage.jsx`: desktop Constellation is a mode of the existing Taste Field. It consumes imported/enriched tracks from `TasteDataContext`; its own selected source, recommendations, filters and cluster assignments remain page state.
- `src/workers/kmeansWorker.js`: genre/audio clustering (including DBSCAN and a noise region), with five-dimensional feature vectors. Results are cached in session storage.
- `src/workers/bubbleLayoutWorker.js`: feature/genre projection, deterministic ID-based jitter, collision resolution and track sizing. Desktop camera/zoom maps normalized positions to the viewport.
- Constellation edges: sparse local-neighbor candidates and Kruskal trees inside each cluster, limited extra links and faint bridges for isolated stars. The function was moved unchanged to `src/taste/constellationTopology.js` and is shared by desktop and avatar. Desktop genre identity colors were also extracted unchanged into `src/taste/genreIdentity.js`.
- The previous `TasteMapMobilePage` showed one `/api/discover` recommendation within a genre-based card flow; accepted/rejected tracks existed only in component state. Its desktop link previously returned to the responsive mobile page on small screens.
- Local/session data: `TasteDataContext` persists the imported library, import status and map ID under sessionStorage `spectra:taste:v5`. Desktop API/cluster caches are session-based; recommendations, saved recommendation flags, affinity/pin maps and camera/selection state are component-local. Custom groups, metro maps, language/theme and YouTube video matches use localStorage. There is no shared server-side taste-event store.

## Data separation

`buildTasteState(tracks, { decisions, now })` is a pure function and returns JSON-compatible:

```js
{
  coreGenres: [{ genre, strength }],
  emergingGenres: [{ genre, strength }],
  averageEnergy, averageValence, diversity,
  explorationTargets: [{ genre, strength }]
}
```

`decisions` contains `{ action: 'absorb' | 'dig' | 'pop', track }`. Only the last decision for a track counts. Track IDs and normalized genre tags are deduplicated. Current v1 treats each distinct imported track equally; it does not pretend that catalog popularity measures a user's listening frequency.

- One track contributes one unit split equally among its unique genre tags. Core strength is its genre's share of total tagged-track mass. Unknown tags produce unclassified track stars without invented genre labels.
- Imported preferences form the baseline. Absorb integrates a distinct track once; absorbing an existing library track acknowledges it visually without duplicating its statistical weight.
- A previously unseen absorbed genre starts as emerging, with strength `mass / (mass + 3)`. At 0.55 it joins core. A single-tag direction therefore joins core after four distinct absorbed tracks. Multi-tag tracks grow each direction more gradually.
- Date-based emerging genres require an explicit `now`, at least three tracks dated before the last 30 days, and a genre present in the recent window but absent from that dated history. Undated/future timestamps cannot establish a trend. This is an emergence heuristic, not a longitudinal listening model.
- Dig contributes only to `explorationTargets`, with strength `mass / (mass + 2)`. It does not change core, energy, valence, diversity or emerging taste. Existing library taste is not erased when Pop rejects a card.
- Energy/valence use finite numeric values clamped to [0, 1], neutral 0.5 when absent, preserving actual zeros. These features may be inferred from Last.fm tags by the existing importer, not measured audio features.
- Diversity is genre entropy divided by `log(8)`, clamped to [0, 1]. It uses the full distribution, not just the three labels displayed.
- `describeTasteState` uses deterministic Korean/English templates, prioritizing emerging, then exploring, then dominant core. It does not invent a recent mood shift.

## Avatar mapping

`buildAvatarState(taste, tracks, decisions)` translates the model into bounded SVG geometry, independent of React, DOM, viewport or time. It represents the same imported universe through genre regions; it does not reuse the desktop's full spatial coordinates or claim identical DBSCAN partitions.

- Stable genre/track hashes determine region centers and individual positions; existing genre regions do not rearrange by rank on each action.
- Strong regions have larger, brighter stars and larger localized glow. Multiple tracks create dense connected groups through the shared constellation graph.
- Emerging regions start farther out and move inward as strength grows, with lower opacity and one connection per emerging track.
- Dig stars have their own outer orbit and no new core edges. Up to the most recent eight are rendered; all exploration decisions still contribute to TasteState.
- Energy changes breathing/pulse speed; valence changes the ambient glow's warm/cool character; diversity increases spread and shape complexity.
- The receiving star at the base of the avatar links the card spatially to its reaction. Absorb travels inward and joins an existing/new star; Dig curves outward and enters orbit; Pop expands briefly and drifts away. The next card follows the 1.15-second reaction. Rapid duplicate actions are blocked during this interval.

## Mobile flow

The hero uses approximately 56% of the small viewport height, with a compact track card and three aligned actions underneath. Dark surfaces, white-centered stars, restrained genre colors and 0.65–0.8px threads echo desktop Constellation. There are no decorative random particles, mascot assets or added rendering dependencies.

The current `/api/discover` is requested once per stable library seed (or explicit session restart), aborted on unmount/change and bounded by a 12-second timeout. Taste Drop actions do not initiate new discovery or YouTube searches. While waiting, on empty results, or on failure, cards come from the actual library and are labeled accordingly. All candidates are deduplicated, already-decided cards are skipped, and exhaustion offers an explicit new session. Cover playback links to an external service.

`/taste-map/mobile` and the existing narrow-screen route open the avatar. The explicit `?view=constellation` link opens desktop's existing detailed Constellation, including on mobile. Desktop's normal default and all other modes remain unchanged.

## Performance and accessibility

- Maximum 72 integrated track stars plus 8 orbit stars; recent absorbed stars are reserved in the sample. Geometry and state use React memoization; animated frames do not update React state.
- Shared graph construction operates on the small avatar sample, not thousands of imported tracks. Tests cover 5,000-track input, bounded edges and no dangling endpoints.
- SVG gradients supply glow without per-node blur filters. CSS handles transform/opacity motion. Animation pauses when the document is hidden; `prefers-reduced-motion` stops breathing, glimmer, orbit and travel, showing final states immediately.
- Labeled controls, 44px-or-larger primary touch targets, visible focus, descriptive SVG title/description, polite action/state announcements, responsive width and safe-area spacing are included.
- No runtime packages were added. Temporary Playwright tooling lives outside the repository.

## Validation

Run pure model tests with `node --test tests/tasteAvatar.test.mjs`, targeted lint with `npx eslint src/taste src/avatar src/pages/TasteMapMobilePage.jsx`, and `npm run build`.

Coverage includes empty/invalid metadata, per-track weighting, Dig isolation, Pop semantics, emerging promotion/proximity, historical date requirements, distinct/reorder-stable avatars, and large-library limits. A before/after comparison also verifies the extracted desktop topology returns exactly the same graph.

Browser checks use a seeded library and a mocked discovery response, so they validate the UI and transitions independently of external quotas; they do not verify live recommendation or media availability. Chromium checks passed at 390×844 and 320×568: all three actions, retained orbit state, no horizontal overflow, reduced motion, Korean/English switching, unavailable-discovery fallback, a single initial discovery request in development mode, and navigation into the detailed Constellation. No page runtime errors were observed. The 390×844 hero measured 472.6px (56%). Real Safari and live API/media playback were not tested.

## Persistence and native next steps

Taste Drop is intentionally local React state, scoped to map ID and reset on reload/navigation/new session. It does not mutate the desktop library or persist across devices. Browser session storage containing the imported library is also not account-level storage.

For persistence, introduce authenticated, idempotent taste events (`userId`, `libraryId`, `trackId`, `action`, `timestamp`, schema version), durable track metadata, and baseline snapshots; hydrate/replay events before deriving TasteState. Define reversal, repeated listens, retention and conflict semantics before syncing. An actual time-series baseline is needed for meaningful recent mood comparisons.

A native client can reuse the pure state and geometry modules, replacing SVG/CSS rendering and browser lifecycle/storage with native drawing, reduced-motion/lifecycle APIs and a shared event service. No React Native/Expo project is created here.
