// YouTube Data API client used only on the server.
//
// The client resolves a taste-map track to an embeddable YouTube video. The API
// key never reaches the browser; the browser receives only public video
// metadata needed by the visible YouTube IFrame player.

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_REGION = process.env.YOUTUBE_REGION || 'KR';
const YOUTUBE_CACHE_TTL_MS = Number(process.env.YOUTUBE_CACHE_TTL_MS || 30 * 24 * 60 * 60 * 1000);
const YOUTUBE_CACHE_MAX = Number(process.env.YOUTUBE_CACHE_MAX || 5000);

const cache = new Map();

export function isYouTubeConfigured() {
    return Boolean(YOUTUBE_API_KEY);
}

function normalizeText(value) {
    return String(value || '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();
}

function cacheKey(artist, title) {
    return `${normalizeText(artist)}|${normalizeText(title)}`;
}

function cacheGet(key) {
    const item = cache.get(key);
    if (!item) return undefined;
    if (Date.now() >= item.expiresAt) {
        cache.delete(key);
        return undefined;
    }
    return item.value;
}

function cacheSet(key, value) {
    cache.set(key, { value, expiresAt: Date.now() + YOUTUBE_CACHE_TTL_MS });
    if (cache.size <= YOUTUBE_CACHE_MAX) return;
    const dropCount = Math.ceil(YOUTUBE_CACHE_MAX * 0.1);
    let removed = 0;
    for (const oldestKey of cache.keys()) {
        cache.delete(oldestKey);
        removed += 1;
        if (removed >= dropCount) break;
    }
}

function candidateScore(item, artist, title) {
    const candidateTitle = normalizeText(item?.snippet?.title);
    const channelTitle = normalizeText(item?.snippet?.channelTitle);
    const wantedArtist = normalizeText(artist);
    const wantedTitle = normalizeText(title);
    let score = 0;

    if (candidateTitle.includes(wantedTitle)) score += 12;
    if (candidateTitle.includes(wantedArtist)) score += 7;
    if (channelTitle.includes(wantedArtist)) score += 5;
    if (/\bofficial\b|\baudio\b|\btopic\b|\bmusic video\b/.test(`${candidateTitle} ${channelTitle}`)) score += 3;

    const sourceText = `${candidateTitle} ${channelTitle}`;
    const sourceRequested = /\blive\b|\bremix\b|\bacoustic\b|\bcover\b/.test(`${wantedArtist} ${wantedTitle}`);
    if (!sourceRequested && /\bcover\b|\bkaraoke\b|\bnightcore\b|\bsped up\b|\bslowed\b|\breaction\b|\btutorial\b/.test(sourceText)) {
        score -= 8;
    }
    return score;
}

function mapCandidate(item) {
    const videoId = String(item?.id?.videoId || '').trim();
    if (!videoId) return null;
    const thumbnails = item?.snippet?.thumbnails || {};
    return {
        videoId,
        title: String(item?.snippet?.title || '').trim(),
        channelTitle: String(item?.snippet?.channelTitle || '').trim(),
        thumbnailUrl: thumbnails.medium?.url || thumbnails.default?.url || null,
    };
}

export async function searchYouTubeTrack(artist, title) {
    if (!isYouTubeConfigured()) {
        const error = new Error('YOUTUBE_API_KEY is not configured on the server.');
        error.status = 503;
        error.code = 'YOUTUBE_NOT_CONFIGURED';
        throw error;
    }

    const safeArtist = String(artist || '').trim();
    const safeTitle = String(title || '').trim();
    if (!safeArtist || !safeTitle) {
        const error = new Error('artist and title are required.');
        error.status = 400;
        error.code = 'INVALID_TRACK';
        throw error;
    }

    const key = cacheKey(safeArtist, safeTitle);
    const cached = cacheGet(key);
    if (cached !== undefined) return cached;

    const params = new URLSearchParams({
        part: 'snippet',
        q: `${safeArtist} ${safeTitle} official audio`,
        type: 'video',
        maxResults: '5',
        videoEmbeddable: 'true',
        videoSyndicated: 'true',
        regionCode: YOUTUBE_REGION,
        key: YOUTUBE_API_KEY,
    });
    const response = await fetch(`${YOUTUBE_API_BASE}/search?${params.toString()}`);
    const body = await response.json().catch(() => null);
    if (!response.ok) {
        const error = new Error(body?.error?.message || `YouTube search failed (${response.status})`);
        error.status = response.status === 403 ? 503 : response.status;
        error.code = response.status === 403 ? 'YOUTUBE_QUOTA_OR_KEY' : 'YOUTUBE_SEARCH_FAILED';
        throw error;
    }

    const items = Array.isArray(body?.items) ? body.items : [];
    const best = items
        .map((item) => ({ item, score: candidateScore(item, safeArtist, safeTitle) }))
        .sort((left, right) => right.score - left.score)
        .map(({ item }) => mapCandidate(item))
        .find(Boolean) || null;

    cacheSet(key, best);
    return best;
}
