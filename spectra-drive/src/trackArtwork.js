import { getDemoCover } from '../../src/taste/demoCoverAssets.js';
import { generateAestheticCoverSvg } from '../../src/taste/demoArtwork.js';

// Preserve SPECTRA's artwork fields without allowing executable/document URLs.
export function artworkUrl(value) {
  if (typeof value !== 'string') return null;
  const url = value.trim();
  if (/^\/(?!\/)/.test(url)) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (/^data:image\/(?:png|jpe?g|webp|avif|gif|svg\+xml)[;,]/i.test(url)) return url;
  return null;
}

export function importedArtwork(item, artist, name) {
  return [item.coverUrl, item.albumArt, item.imageUrl, item.album?.images?.[0]?.url,
    getDemoCover(artist, name)].map(artworkUrl).find(Boolean) || null;
}

export function artworkOptions(track, color) {
  const artist = track?.artist || track?.artists || '';
  const candidates = [...new Set([
    artworkUrl(track?.coverUrl), artworkUrl(getDemoCover(artist, track?.name)),
  ].filter(Boolean))];
  const fallback = generateAestheticCoverSvg({ name: track?.name || 'SPECTRA', artists: artist, color });
  return { candidates, fallback };
}
