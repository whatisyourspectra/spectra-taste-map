// YouTube Data API client used only on the server.
//
// The client resolves a taste-map track to an embeddable YouTube video. The API
// key never reaches the browser; the browser receives only public video
// metadata needed by the visible YouTube IFrame player.

import { DEMO_YOUTUBE_MATCHES } from './data/demoYouTubeMatches.js';
import { YOUTUBE_MATCH_TTL_MS, youtubeMatchKey, isFreshYouTubeMatch } from '../audio/youtubeCachePolicy.js';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_REGION = process.env.YOUTUBE_REGION || 'KR';
const YOUTUBE_CACHE_TTL_MS = Number(process.env.YOUTUBE_CACHE_TTL_MS || YOUTUBE_MATCH_TTL_MS);
const YOUTUBE_CACHE_MAX = Number(process.env.YOUTUBE_CACHE_MAX || 5000);

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

function candidateScore(item, artist, title) {
    const candidateTitle = normalizeText(item?.snippet?.title);
    const channelTitle = normalizeText(item?.snippet?.channelTitle);
    const wantedArtist = normalizeText(artist);
    const wantedTitle = normalizeText(title);
    let score = 0;

    if (candidateTitle.includes(wantedTitle)) score += 12;
    if (candidateTitle.includes(wantedArtist)) score += 7;
    // An artist/Topic upload should outrank a re-upload that puts the artist
    // name in its title. Multi-artist songs can belong to either artist's channel.
    const artistParts = String(artist).split(/[,;&]/).map(normalizeText).filter(Boolean);
    if (artistParts.some(part => channelTitle.includes(part))) score += 16;
    if (/\bofficial\b|\baudio\b|\btopic\b|\bmusic video\b/.test(`${candidateTitle} ${channelTitle}`)) score += 3;

    const sourceText = `${candidateTitle} ${channelTitle}`;
    const variant = /\blive\b|\bremix\b|\bacoustic\b|\bcover\b|\bkaraoke\b|\bnightcore\b|\bsped up\b|\bslowed\b|\breaction\b|\btutorial\b|\b(?:8|16|32)d\b|\b(?:japanese|korean|english|spanish) (?:ver|version)\b/;
    if (!variant.test(`${wantedArtist} ${wantedTitle}`) && variant.test(sourceText)) {
        score -= 60;
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

export function createYouTubeResolver({
    apiKey = '', region = 'KR', initialMatches = {}, now = Date.now,
    fetchImpl = (...args) => fetch(...args), ttlMs = YOUTUBE_MATCH_TTL_MS, maxEntries = 5000,
} = {}) {
    const cache = new Map(Object.entries(initialMatches));
    const pending = new Map();
    const ttl = Number.isFinite(ttlMs) && ttlMs > 0 ? Math.min(ttlMs, YOUTUBE_MATCH_TTL_MS) : YOUTUBE_MATCH_TTL_MS;
    let unavailableUntil = 0;
    let unavailableError = null;

    function peek(artist, title) {
        const key = youtubeMatchKey(artist, title, region);
        const match = cache.get(key);
        if (isFreshYouTubeMatch(match, now())) return match;
        cache.delete(key);
        return null;
    }

    async function resolve(artist, title) {
        const safeArtist = String(artist || '').trim();
        const safeTitle = String(title || '').trim();
        if (!safeArtist || !safeTitle) {
            throw Object.assign(new Error('artist and title are required.'), { status: 400, code: 'INVALID_TRACK' });
        }
        const cached = peek(safeArtist, safeTitle);
        if (cached) return cached;
        const key = youtubeMatchKey(safeArtist, safeTitle, region);
        if (pending.has(key)) return pending.get(key);
        if (!apiKey) {
            throw Object.assign(new Error('YOUTUBE_API_KEY is not configured on the server.'), { status: 503, code: 'YOUTUBE_NOT_CONFIGURED' });
        }
        if (now() < unavailableUntil) throw unavailableError;

        const request = (async () => {
            const params = new URLSearchParams({
                part: 'snippet', q: `${safeArtist} ${safeTitle} official audio`,
                type: 'video', maxResults: '5', videoEmbeddable: 'true', videoSyndicated: 'true',
                regionCode: region, key: apiKey,
            });
            const response = await fetchImpl(`${YOUTUBE_API_BASE}/search?${params}`, { signal: AbortSignal.timeout(12000) });
            const body = await response.json().catch(() => null);
            if (!response.ok) {
                const error = Object.assign(new Error(body?.error?.message || `YouTube search failed (${response.status})`), {
                    status: response.status === 403 ? 503 : response.status,
                    code: response.status === 403 ? 'YOUTUBE_QUOTA_OR_KEY' : 'YOUTUBE_SEARCH_FAILED',
                });
                if (response.status === 403 || response.status === 429) {
                    unavailableUntil = now() + 60000;
                    unavailableError = error;
                }
                throw error;
            }
            const candidates = (Array.isArray(body?.items) ? body.items : [])
                .map(item => ({ item, score: candidateScore(item, safeArtist, safeTitle) }))
                .sort((a, b) => b.score - a.score)
                .filter(({ score }) => score >= 0)
                .map(({ item }) => mapCandidate(item)).filter(Boolean);
            const video = candidates[0] || null;
            const fetchedAt = now();
            const match = { video, candidates, fetchedAt, expiresAt: fetchedAt + (video ? ttl : Math.min(ttl, 5 * 60 * 1000)) };
            cache.set(key, match);
            if (cache.size > maxEntries) cache.delete(cache.keys().next().value);
            return match;
        })();
        pending.set(key, request);
        try { return await request; }
        finally { pending.delete(key); }
    }
    return { resolve, peek };
}

const resolver = createYouTubeResolver({
    apiKey: YOUTUBE_API_KEY, region: YOUTUBE_REGION,
    initialMatches: DEMO_YOUTUBE_MATCHES.matches,
    ttlMs: YOUTUBE_CACHE_TTL_MS, maxEntries: YOUTUBE_CACHE_MAX,
});

export const resolveYouTubeTrack = (artist, title) => resolver.resolve(artist, title);
export const searchYouTubeTrack = async (artist, title) => (await resolveYouTubeTrack(artist, title)).video;
