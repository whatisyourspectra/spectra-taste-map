export const YOUTUBE_MATCH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function youtubeMatchKey(artist, title, region = 'KR') {
  const normalize = value => String(value || '').normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  return `${region.toUpperCase()}|${normalize(artist)}|${normalize(title)}`;
}

// Carry the original expiry through every cache layer; a browser/CDN hit
// must not renew old YouTube metadata for another 30 days.
export function youtubeMatchExpiry(match) {
  const fetchedAt = Number(match?.fetchedAt);
  const expiresAt = Number(match?.expiresAt);
  if (!Number.isFinite(fetchedAt) || !Number.isFinite(expiresAt) || fetchedAt < 0) return 0;
  return Math.min(expiresAt, fetchedAt + YOUTUBE_MATCH_TTL_MS);
}

export function isFreshYouTubeMatch(match, now = Date.now()) {
  return youtubeMatchExpiry(match) > now && Number(match.fetchedAt) <= now
    && (match.video === null || Boolean(match.video?.videoId));
}

export function youtubeCacheControl(match, now = Date.now()) {
  const seconds = Math.max(0, Math.min(86400, Math.floor((youtubeMatchExpiry(match) - now) / 1000)));
  return seconds ? `public, max-age=0, s-maxage=${seconds}` : 'no-store';
}
