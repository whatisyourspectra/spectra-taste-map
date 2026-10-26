import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, stat } from 'node:fs/promises';
import { DEMO_UNIVERSES, getEnrichedDemoTracks } from '../../src/taste/demoUniverses.js';
import { spectraDemoLibrary } from '../src/spectraDemoLibrary.js';
import { normalizeLibrary } from '../src/moodEngine.js';
import { artworkOptions } from '../src/trackArtwork.js';

test('vehicle demo reuses original SPECTRA tracks, mock features and identical bundled covers', async () => {
  const original = DEMO_UNIVERSES.flatMap(universe => getEnrichedDemoTracks({ ...universe, tracks: universe.tracks.slice(0, 6) }));
  assert.equal(spectraDemoLibrary.length, 18);
  const tracks = normalizeLibrary(spectraDemoLibrary);
  assert.equal(new Set(tracks.map(track => track.coverUrl)).size, 17);
  for (const track of tracks) {
    const source = original.find(item => item.name === track.name && item.artists === track.artist);
    assert.ok(source);
    assert.equal(track.energy, source.energy);
    assert.equal(track.brightness, source.valence);
    assert.ok(track.album);
    assert.match(track.coverUrl, /^\/demo-covers\/.+\.jpg$/);
    const relative = track.coverUrl.slice(1);
    const [bundled, existing] = await Promise.all([
      readFile(new URL(`../public/${relative}`, import.meta.url)),
      readFile(new URL(`../../public/${relative}`, import.meta.url)),
    ]);
    assert.deepEqual(bundled, existing, 'Use the original image bytes');
  }
  assert.ok((await stat(new URL('../public/demo-covers/sources.json', import.meta.url))).size > 0);
});

test('SPECTRA artwork fields and album metadata survive personal JSON normalization', () => {
  const [primary, alias, nested, invalid, bundled] = normalizeLibrary([
    { name: 'One', artist: 'Artist', album: 'Album', coverUrl: 'https://example.com/one.jpg' },
    { name: 'Two', artist: 'Artist', albumArt: '/demo-covers/currents.jpg' },
    { name: 'Three', artists: [{ name: 'Artist' }], album: { name: 'Nested album', images: [{ url: 'https://example.com/three.jpg' }] } },
    { name: 'Four', artist: 'Artist', coverUrl: 'javascript:alert(1)', imageUrl: 'file:///private/example.png' },
    { name: 'Space Song', artists: 'Beach House' },
  ]);
  assert.equal(primary.album, 'Album');
  assert.equal(primary.coverUrl, 'https://example.com/one.jpg');
  assert.equal(alias.coverUrl, '/demo-covers/currents.jpg');
  assert.equal(nested.album, 'Nested album');
  assert.equal(nested.coverUrl, 'https://example.com/three.jpg');
  assert.equal(invalid.coverUrl, null);
  assert.equal(bundled.coverUrl, '/demo-covers/depression-cherry.jpg');
});

test('unknown covers retain SPECTRA procedural fallback without network lookups', () => {
  const options = artworkOptions({ name: 'Missing artwork', artist: 'Unknown', coverUrl: 'https://example.com/missing.jpg' }, '#70d6ff');
  assert.deepEqual(options.candidates, ['https://example.com/missing.jpg']);
  assert.match(options.fallback, /^data:image\/svg\+xml/);
  assert.match(decodeURIComponent(options.fallback), /Missing artwork/);
});
