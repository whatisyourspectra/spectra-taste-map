import { cp, mkdir, writeFile } from 'node:fs/promises';
import { spectraDemoLibrary } from '../src/spectraDemoLibrary.js';

// Keep the standalone Vite public directory in sync with the original SPECTRA
// demo images. No cover lookup, credentials or music service is required.
const destination = new URL('../public/demo-covers/', import.meta.url);
await mkdir(destination, { recursive: true });
const names = new Set(spectraDemoLibrary.map(track => track.coverUrl.split('/').pop()));
names.add('sources.json');
await Promise.all([...names].map(name => cp(
  new URL(`../../public/demo-covers/${name}`, import.meta.url), new URL(name, destination),
)));
const tracks = spectraDemoLibrary.map(({ name, artists, album, genres, energy, valence, coverUrl }) => ({ name, artists, album, genres, energy, valence, coverUrl }));
await writeFile(new URL('../public/spectra-demo.json', import.meta.url), JSON.stringify({
  description: 'Original SPECTRA demo tracks and covers; mood values are illustrative. No audio included.', tracks,
}, null, 2) + '\n');
console.log(`Synchronized ${names.size - 1} original SPECTRA covers and ${tracks.length} demo tracks.`);
