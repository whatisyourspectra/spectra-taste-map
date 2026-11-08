# Constellation exploration additions

- **Add star** connects the song and appends it once to the constellation play queue while keeping the current playback.
- **Add & play** performs the same addition and starts that song in the existing embedded YouTube player. The addition toast also offers **Play now**.
- A recommendation already in the constellation has an enabled **Play** action and a disabled add action. Provider IDs and artist/title aliases resolve to the existing star.
- Undo removes the latest added branch from the saved constellation and queue. If that song was playing, playback stops and returns to its anchor.

The graph (track metadata, node positions, edges and play order) is saved under `stats.voyageConstellations` in the existing taste-map snapshot. Browser persistence and the existing account save/retry mechanism handle the snapshot; no database migration is required. Demo saves remain session-only, consistent with demo-map storage. New songs also join the personal library and Taste Map. Their discovery anchor is stored as placement provenance, separately from genre evidence. Undo removes the constellation branch and queue entry; the saved library song remains on the map.

Reopening a root star restores its own saved graph. Opening another star belonging to a saved graph can restore that graph too. Existing-library metadata is refreshed without changing saved graph IDs or coordinates. Restoring does not reuse stale playback or undo state. Starting a new imported map does not inherit another map's constellations.

Validation: unit coverage for expansion, undo, duplicate/alias handling, malformed saved graphs and account snapshot round trips. The browser check exercises add, immediate play, queue selection, undo, cached exploration, revisit and reload. Narrow viewport cases render the desktop voyager through a route fixture because the current mobile application uses a separate map; they do not claim an end-to-end mobile-route test. YouTube playback is stubbed in browser tests, so provider availability and autoplay restrictions still follow the existing player's behavior.

Map integration: recommendation overlays disappear on save, while the recommendation list retains its Added state and playback queue. Additions use the normal persisted-library and account-sync path, deduplicate artist/title aliases, and retain their own genre evidence. The bubble worker places them in nearby free space without moving base songs; density scaling excludes anchored discoveries. Placement survives closing discovery and browser reload. Metadata-import publications retain discoveries made during enrichment.
