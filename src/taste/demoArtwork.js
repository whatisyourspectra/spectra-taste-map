import { getDemoCover } from './demoCoverAssets.js';

/**
 * Dynamic and procedural album artwork for demo universes.
 * 1. Provides instant aesthetic procedural vinyl/cosmic album cover SVG (0ms, 100% offline).
 * 2. Asynchronously resolves authentic high-res album covers from iTunes Search API in the browser.
 * 3. Caches results in localStorage so subsequent loads are instant.
 */

const ARTWORK_CACHE_PREFIX = 'spectra.cover.v2.';

function sanitizeText(str = '', max = 22) {
  const clean = String(str)
    .replace(/[&<>"']/g, '')
    .trim();
  return clean.length > max ? clean.slice(0, max - 1) + '…' : clean;
}

export function generateAestheticCoverSvg({ name, artists, color = '#70d6ff', index = 0 }) {
  const cleanTitle = sanitizeText(name, 18);
  const cleanArtist = sanitizeText(artists, 16).toUpperCase();

  // Create subtle color variations for the inner disc
  const palette = [
    { c1: '#38bdf8', c2: '#1e40af' },
    { c1: '#c084fc', c2: '#581c87' },
    { c1: '#f472b6', c2: '#9d174d' },
    { c1: '#fb923c', c2: '#9a3412' },
    { c1: '#34d399', c2: '#065f46' },
    { c1: '#fbbf24', c2: '#78350f' },
  ];
  const pair = palette[index % palette.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#151d2a"/>
      <stop offset="70%" stop-color="#0a0f18"/>
      <stop offset="100%" stop-color="#04060a"/>
    </radialGradient>
    <radialGradient id="labelGrad" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="${color}"/>
      <stop offset="50%" stop-color="${pair.c1}"/>
      <stop offset="100%" stop-color="${pair.c2}"/>
    </radialGradient>
    <linearGradient id="sheen" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.22)"/>
      <stop offset="35%" stop-color="rgba(255,255,255,0.03)"/>
      <stop offset="65%" stop-color="transparent"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0.15)"/>
    </linearGradient>
  </defs>

  <!-- Vinyl Body -->
  <rect width="300" height="300" fill="url(#bg)"/>

  <!-- Concentric Vinyl Grooves -->
  <circle cx="150" cy="150" r="142" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
  <circle cx="150" cy="150" r="134" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1.8"/>
  <circle cx="150" cy="150" r="124" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
  <circle cx="150" cy="150" r="114" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1.5"/>
  <circle cx="150" cy="150" r="102" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="1"/>
  <circle cx="150" cy="150" r="92" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="2"/>
  <circle cx="150" cy="150" r="82" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
  <circle cx="150" cy="150" r="74" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>

  <!-- Vinyl Light Reflection Sheens -->
  <path d="M 150 150 L 40 10 A 144 144 0 0 1 260 10 Z" fill="url(#sheen)" opacity="0.65"/>
  <path d="M 150 150 L 260 290 A 144 144 0 0 1 40 290 Z" fill="url(#sheen)" opacity="0.65"/>

  <!-- Center Label Disc -->
  <circle cx="150" cy="150" r="60" fill="url(#labelGrad)"/>
  <circle cx="150" cy="150" r="59" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1.2"/>
  <circle cx="150" cy="150" r="48" fill="none" stroke="rgba(255,255,255,0.15)" stroke-dasharray="2 2"/>

  <!-- Typography & Glyphs -->
  <text x="150" y="116" font-family="'Space Grotesk', -apple-system, sans-serif" font-size="9" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="1.2">${cleanArtist}</text>
  <text x="150" y="192" font-family="'Space Grotesk', -apple-system, sans-serif" font-size="9.5" font-weight="700" fill="rgba(255,255,255,0.92)" text-anchor="middle" letter-spacing="0.5">${cleanTitle}</text>
  
  <!-- Center Spindle Hole -->
  <circle cx="150" cy="150" r="14" fill="#04060a" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/>
  <circle cx="150" cy="150" r="7" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getCachedArtwork(artists, title) {
  const bundled = getDemoCover(artists, title);
  if (bundled) return bundled;
  if (typeof window === 'undefined') return null;
  const key = `${ARTWORK_CACHE_PREFIX}${artists?.toLowerCase()}|${title?.toLowerCase()}`;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setCachedArtwork(artists, title, url) {
  if (typeof window === 'undefined' || !url) return;
  const key = `${ARTWORK_CACHE_PREFIX}${artists?.toLowerCase()}|${title?.toLowerCase()}`;
  try {
    window.localStorage.setItem(key, url);
  } catch {}
}

export async function fetchTrackArtwork(artists, title) {
  const cached = getCachedArtwork(artists, title);
  if (cached) return cached;

  const query = `${artists || ''} ${title || ''}`.trim();
  if (!query) return null;

  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const rawUrl = data.results?.[0]?.artworkUrl100;
    if (!rawUrl) return null;

    // Upgrade 100x100 thumbnail to 600x600 high-res album art
    const highRes = rawUrl.replace('100x100bb', '600x600bb');
    setCachedArtwork(artists, title, highRes);
    return highRes;
  } catch {
    return null;
  }
}

/**
 * Concurrently resolves artwork for a list of tracks in batches,
 * notifying onBatchResolved whenever new covers are found.
 */
export async function enrichTracksWithArtwork(tracks, onUpdate) {
  if (!Array.isArray(tracks) || tracks.length === 0) return;

  const BATCH_SIZE = 4;
  let hasUpdates = false;
  const nextTracks = [...tracks];

  for (let i = 0; i < nextTracks.length; i += BATCH_SIZE) {
    const batch = nextTracks.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (track, relIdx) => {
        const actualIdx = i + relIdx;
        // If already has non-svg official cover, keep it
        if (track.coverUrl && !track.coverUrl.startsWith('data:image/svg+xml')) {
          return null;
        }

        const url = await fetchTrackArtwork(track.artists, track.name);
        if (url && url !== track.coverUrl) {
          nextTracks[actualIdx] = {
            ...track,
            coverUrl: url,
            albumArt: url,
          };
          hasUpdates = true;
          return true;
        }
        return null;
      }),
    );

    if (hasUpdates && typeof onUpdate === 'function') {
      onUpdate([...nextTracks]);
    }

    // Small breathe between batches
    if (i + BATCH_SIZE < nextTracks.length) {
      await new Promise((r) => setTimeout(r, 60));
    }
  }
}
