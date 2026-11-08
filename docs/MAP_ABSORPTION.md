# Adding a song to the map

A visible recommendation's + action captures its current screen position. Library persistence happens immediately. An artwork sprite presses inward, follows a curved damped-spring path to the real library bubble, then hands off to an elastic landing with a lavender/pink halo and a small confirmation check.

The destination is hidden only while its own sprite is active, so there are no duplicate bubbles. Its position is read each frame during travel to follow zoom, pan and passive floating. The effect shares the canvas stacking context and passes beneath menus. Concurrent additions have independent tokens; completing an older effect cannot remove a newer one.

Motion is skipped for reduced-motion preferences. A preference change during travel, missing/offscreen destination, tab visibility change or leaving the map safely removes the sprite. A layout-worker delay is capped; animations never gate storage or account syncing. No sound or playback is triggered.

The browser fixture `tests/browser/mapAbsorption.mjs` verifies immediate persistence, concurrent additions, camera movement, destination visibility, reduced motion and route cleanup. It uses local data and mocked discovery/auth endpoints. Existing unit tests and production build remain part of validation.
