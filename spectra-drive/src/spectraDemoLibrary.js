import { DEMO_UNIVERSES, getEnrichedDemoTracks } from '../../src/taste/demoUniverses.js';
import { getDemoCover } from '../../src/taste/demoCoverAssets.js';

// Album labels for the bundled SPECTRA cover set. Original tracks and mock taste
// features come directly from demoUniverses; no audio service is queried here.
const ALBUMS = {
  currents: 'Currents', 'depression-cherry': 'Depression Cherry',
  'cigarettes-after-sex': 'Cigarettes After Sex', 'show-me-how': 'Show Me How — Single',
  'salad-days': 'Salad Days', 'slow-rush': 'The Slow Rush',
  'random-access-memories': 'Random Access Memories', outrun: 'OutRun', justice: 'Justice',
  'after-hours': 'After Hours', discovery: 'Discovery', starboy: 'Starboy',
  geography: 'Geography', 'lady-lady': 'Lady Lady', 'team-baby': 'TEAM BABY',
  'every-letter': 'Every letter I sent you.', bewitched: 'Bewitched',
};

export const spectraDemoLibrary = DEMO_UNIVERSES.flatMap(universe =>
  getEnrichedDemoTracks({ ...universe, tracks: universe.tracks.slice(0, 6) }).map(track => {
    const coverUrl = getDemoCover(track.artists, track.name);
    const key = coverUrl?.split('/').pop().replace(/\.jpg$/, '');
    return { ...track, album: ALBUMS[key] || track.album, genres: track.spotifyGenres,
      coverUrl, albumArt: coverUrl, imageUrl: coverUrl };
  }));

export const initialDemoTrackName = 'The Less I Know the Better';
