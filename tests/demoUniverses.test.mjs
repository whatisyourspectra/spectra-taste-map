import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEMO_UNIVERSES, DEMO_CATALOG_VERSION, getEnrichedDemoTracks, getCombinedDemoTracks, getDemoUniverseIndex, refreshDemoCatalog } from '../src/taste/demoUniverses.js';
import { songIdentity } from '../src/utils/trackIdentity.js';
import { partitionGenreTracks } from '../src/taste/genreClustering.js';

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
    assert.ok(universe.tracks.length >= 80, 'Each demo theme should offer at least 80 tracks');
    assert.ok(new Set(universe.tracks.map(track => track.artists)).size >= 18, 'Each theme should feature a varied set of artists');

    universe.tracks.forEach((track) => {
      assert.ok(typeof track.name === 'string' && track.name.length > 0, 'Track must have a name');
      assert.ok(typeof track.artists === 'string' && track.artists.length > 0, 'Track must have artists');
    });
  });
});

test('demo tracks have bounded illustrative features and locally bundled album covers', () => {
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
      for (const key of ['valence', 'energy', 'danceability', 'acousticness', 'instrumentalness']) {
        assert.ok(track[key] >= 0 && track[key] <= 1, `${track.name}: ${key} must be within the map range`);
      }
      assert.ok(track.coverUrl.startsWith('/demo-covers/'), `${track.artists} / ${track.name} needs bundled artwork`);
      assert.ok(track.album && !track.album.startsWith(`${track.artists} - `), 'Album metadata must come from a matched catalog entry');
      assert.match(track.appleMusicUrl, /^https:\/\/music\.apple\.com\//);
      assert.ok(Number.isInteger(track.catalogTrackId));
      assert.ok(track.albumArt, 'Track must have albumArt');
      assert.ok(track.imageUrl, 'Track must have imageUrl');
    });
  });
});

test('the shared demo field contains every entry card with stable filter membership', () => {
  const tracks = getCombinedDemoTracks();
  assert.ok(tracks.length > 200, 'The complete field should offer more than 200 songs');
  assert.equal(tracks.length, DEMO_UNIVERSES.reduce((sum, universe) => sum + universe.tracks.length, 0));
  assert.equal(new Set(tracks.map(track => track.id)).size, tracks.length);
  assert.equal(new Set(tracks.map(songIdentity)).size, tracks.length, 'Different IDs must not inflate the song count');
  DEMO_UNIVERSES.forEach((universe, index) => {
    assert.equal(tracks.filter(track => getDemoUniverseIndex(track) === index).length, universe.tracks.length);
    assert.equal(getDemoUniverseIndex({ id: `demo-${universe.id}-0` }), index);
  });
  assert.equal(getDemoUniverseIndex({ id: 'personal-track' }), -1);
});

test('all demo artwork files exist as JPEGs with recorded source URLs', () => {
  const sources = JSON.parse(readFileSync(new URL('../public/demo-covers/sources.json', import.meta.url), 'utf8'));
  const sourcePaths = new Set(Object.values(sources).map(source => source.path));
  for (const path of new Set(getCombinedDemoTracks().map(track => track.coverUrl))) {
    assert.ok(sourcePaths.has(path), `Artwork needs provenance: ${path}`);
    const image = readFileSync(new URL(`../public${path}`, import.meta.url));
    assert.ok(image.length > 1000, `${path} must not be an empty thumbnail`);
    assert.equal(image.readUInt16BE(0), 0xffd8, `${path} must be a JPEG`);
  }
});

test('legacy demo previews upgrade without losing map identity or discovered songs', () => {
  const seed = getCombinedDemoTracks()[0];
  const discovered = { id: 'added-discovery', name: 'My discovery', artists: 'Artist', coverUrl: '/my-cover.jpg' };
  const original = { mapId: 'existing-demo', updatedAt: '2026-11-01',
    tracks: [{ ...seed, coverUrl: 'data:image/svg+xml,old' }, discovered],
    stats: { isDemo: true, demoUniverse: 'cyber-synthwave', voyageConstellations: [{ id: 'saved' }] } };
  const updated = refreshDemoCatalog(original);
  assert.equal(updated.tracks.length, getCombinedDemoTracks().length + 1);
  assert.equal(updated.mapId, original.mapId);
  assert.equal(updated.updatedAt, original.updatedAt);
  assert.equal(updated.stats.demoUniverse, original.stats.demoUniverse);
  assert.deepEqual(updated.stats.voyageConstellations, original.stats.voyageConstellations);
  assert.ok(updated.tracks.includes(discovered));
  assert.equal(updated.tracks[0].id, seed.id);
  assert.equal(updated.tracks[0].coverUrl, seed.coverUrl);
  assert.equal(updated.stats.demoCatalogVersion, DEMO_CATALOG_VERSION);
  assert.equal(updated.stats.totalAvailable, updated.tracks.length);
  assert.equal(original.tracks.length, 2);
  assert.equal(refreshDemoCatalog(updated), updated, 'An upgraded demo should not be rebuilt repeatedly');
});

test('demo catalog upgrades leave personal imports and unrelated fixtures untouched', () => {
  for (const data of [null, { tracks: [] }, { tracks: [{ id: 'personal', name: 'My song', artists: 'Me' }] },
    { tracks: [{ id: 'demo-unrelated-0' }], stats: { isDemo: true } }]) {
    assert.equal(refreshDemoCatalog(data), data);
  }
});

test('three landing themes introduce a richer, exhaustive genre map', () => {
  const tracks = getCombinedDemoTracks();
  const partition = partitionGenreTracks(tracks);
  assert.equal(DEMO_UNIVERSES.length, 3);
  assert.ok(partition.groups.length > 3 && partition.groups.length <= 15);
  assert.equal(partition.groups.reduce((sum, group) => sum + group.count, 0), tracks.length);
  assert.ok(partition.labels.every(id => id >= 0 && id < partition.groups.length));
  const labelsFor = artist => tracks.filter(track => track.artists === artist).map(track => partition.groups[partition.labels[tracks.indexOf(track)]].name);
  assert.ok(labelsFor('Laufey').every(name => /jazz/i.test(name)));
  assert.ok(labelsFor('Daft Punk').every(name => /house/i.test(name)));
  assert.ok(labelsFor('Jungle').every(name => name !== 'Jungle'), 'An artist name must not become invented genre evidence');
  assert.ok(tracks.every(track => !track.genres.includes(track.artists.toLowerCase())));
});
