import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_UNIVERSES, getEnrichedDemoTracks, getCombinedDemoTracks, getDemoUniverseIndex } from '../src/taste/demoUniverses.js';

test('DEMO_UNIVERSES contains 3 rich preset universes with valid track structures', () => {
  assert.equal(DEMO_UNIVERSES.length, 3);

  DEMO_UNIVERSES.forEach((universe) => {
    assert.ok(universe.id, 'Universe must have an id');
    assert.ok(universe.name, 'Universe must have a name');
    assert.ok(universe.koreanName, 'Universe must have a koreanName');
    assert.ok(universe.color.startsWith('#'), 'Universe must have a valid hex color');
    assert.ok(Array.isArray(universe.featuredArtists), 'Featured artists must be an array');
    assert.ok(universe.featuredArtists.length >= 3, 'Must have at least 3 featured artists');
    assert.ok(Array.isArray(universe.tracks), 'Tracks must be an array');
    assert.ok(universe.tracks.length >= 20, 'Each demo universe should provide at least 20 tracks');

    universe.tracks.forEach((track) => {
      assert.ok(typeof track.name === 'string' && track.name.length > 0, 'Track must have a name');
      assert.ok(typeof track.artists === 'string' && track.artists.length > 0, 'Track must have artists');
    });
  });
});

test('getEnrichedDemoTracks generates pre-computed 5D audio features and valid album covers', () => {
  DEMO_UNIVERSES.forEach((universe) => {
    const enriched = getEnrichedDemoTracks(universe);
    assert.equal(enriched.length, universe.tracks.length);
    enriched.forEach((track) => {
      assert.ok(track.id.startsWith('demo-'), 'Track ID must start with demo- for demo detection');
      assert.equal(typeof track.valence, 'number');
      assert.equal(typeof track.energy, 'number');
      assert.equal(typeof track.danceability, 'number');
      assert.equal(typeof track.acousticness, 'number');
      assert.ok(Array.isArray(track.genres) && track.genres.length > 0);
      assert.ok(typeof track.coverUrl === 'string' && track.coverUrl.length > 10, 'Track must have non-empty coverUrl');
      assert.ok(track.albumArt, 'Track must have albumArt');
      assert.ok(track.imageUrl, 'Track must have imageUrl');
    });
  });
});

test('the shared demo field contains every entry card with stable filter membership', () => {
  const tracks = getCombinedDemoTracks();
  assert.equal(tracks.length, DEMO_UNIVERSES.reduce((sum, universe) => sum + universe.tracks.length, 0));
  assert.equal(new Set(tracks.map(track => track.id)).size, tracks.length);
  DEMO_UNIVERSES.forEach((universe, index) => {
    assert.equal(tracks.filter(track => getDemoUniverseIndex(track) === index).length, universe.tracks.length);
    assert.equal(getDemoUniverseIndex({ id: `demo-${universe.id}-0` }), index);
  });
  assert.equal(getDemoUniverseIndex({ id: 'personal-track' }), -1);
});
