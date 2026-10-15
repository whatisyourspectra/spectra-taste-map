// Last.fm API client — replaces the Spotify Web API as the taste-map data source.
//
// Last.fm only needs a free API key (registration, no production approval), which
// sidesteps Spotify's Development-mode 25-user cap. It does NOT provide audio
// features (valence/energy/…), but it does provide community *tags* (genre + mood)
// per track/artist, which we map into the same feature space via tagsToFeatures().

const LASTFM_API_KEY = process.env.LASTFM_API_KEY || '';
const LASTFM_BASE = 'https://ws.audioscrobbler.com/2.0/';

// Offline/demo mode — deterministic synthetic data so the app works end-to-end
// without a Last.fm key (verification + demos). Enable with LASTFM_MOCK=1.
const LASTFM_MOCK = process.env.LASTFM_MOCK === '1';

const LASTFM_CACHE_TTL_MS = Number(process.env.LASTFM_CACHE_TTL_MS || 24 * 60 * 60 * 1000);
const LASTFM_CACHE_MAX = Number(process.env.LASTFM_CACHE_MAX || 5000);

const cache = new Map(); // key -> { value, expiresAt }

export function isLastfmConfigured() {
    return Boolean(LASTFM_API_KEY) || LASTFM_MOCK;
}

// ---- Mock data generation (deterministic per artist|title) ----
const MOCK_TAG_POOL = [
    'techno', 'house', 'deep house', 'ambient', 'lo-fi', 'hip hop', 'r&b', 'jazz',
    'pop', 'k-pop', 'rock', 'indie', 'metal', 'classical', 'folk', 'electronic',
    'disco', 'funk', 'chill', 'melancholic', 'energetic', 'dreamy', 'dark', 'happy',
];

function mockHash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i += 1) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

function mockTags(artist, title) {
    const h = mockHash(`${artist}|${title}`.toLowerCase());
    const n = 2 + (h % 3);
    const tags = [];
    for (let i = 0; i < n; i += 1) {
        tags.push(MOCK_TAG_POOL[(h >> (i * 3)) % MOCK_TAG_POOL.length]);
    }
    return [...new Set(tags)];
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function cacheGet(key) {
    const item = cache.get(key);
    if (!item) return undefined;
    if (Date.now() > item.expiresAt) {
        cache.delete(key);
        return undefined;
    }
    return item.value;
}

function cacheSet(key, value) {
    cache.set(key, { value, expiresAt: Date.now() + LASTFM_CACHE_TTL_MS });
    if (cache.size > LASTFM_CACHE_MAX) {
        // Drop the oldest ~10% of entries (Map preserves insertion order).
        const drop = Math.ceil(LASTFM_CACHE_MAX * 0.1);
        let i = 0;
        for (const k of cache.keys()) {
            cache.delete(k);
            if (++i >= drop) break;
        }
    }
}

// Run an async mapper over items with a bounded number of concurrent workers.
export async function mapLimit(items, limit, fn) {
    const results = new Array(items.length);
    let cursor = 0;
    const workerCount = Math.max(1, Math.min(limit, items.length));
    const workers = Array.from({ length: workerCount }, async () => {
        while (true) {
            const index = cursor++;
            if (index >= items.length) return;
            results[index] = await fn(items[index], index);
        }
    });
    await Promise.all(workers);
    return results;
}

async function lastfmRequest(method, params, { retries = 1, label = method } = {}) {
    if (!LASTFM_API_KEY) {
        throw new Error('Missing LASTFM_API_KEY');
    }
    const search = new URLSearchParams({
        method,
        api_key: LASTFM_API_KEY,
        format: 'json',
        ...params,
    });
    const url = `${LASTFM_BASE}?${search.toString()}`;
    let lastError = null;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
            const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
            if (res.status === 429 || res.status >= 500) {
                lastError = new Error(`${label} failed (${res.status})`);
                if (attempt >= retries) break;
                await wait(Math.min(4000, 400 * (2 ** attempt)));
                continue;
            }
            const data = await res.json().catch(() => null);
            // Last.fm returns HTTP 200 with an { error, message } body for logical errors
            // (e.g. 6 = not found). Treat "not found" as an empty result, not a throw.
            if (data && data.error) {
                if (data.error === 6) return null; // not found
                lastError = new Error(`${label} lastfm error ${data.error}: ${data.message || ''}`);
                if (data.error === 29 && attempt < retries) { // rate limit
                    await wait(Math.min(4000, 500 * (2 ** attempt)));
                    continue;
                }
                return null;
            }
            return data;
        } catch (e) {
            lastError = e;
            if (attempt >= retries) break;
            await wait(Math.min(4000, 400 * (2 ** attempt)));
        }
    }
    if (lastError) console.warn('[Last.fm]', label, lastError.message);
    return null;
}

function normKey(...parts) {
    return parts.map((p) => String(p || '').trim().toLowerCase()).join('|');
}

function pickImage(images) {
    if (!Array.isArray(images)) return null;
    const bySize = new Map(images.map((im) => [im.size, im['#text']]));
    const url = bySize.get('extralarge') || bySize.get('large') || bySize.get('medium') || null;
    // Last.fm serves a known placeholder star image for missing art — treat as null.
    if (!url || url.includes('2a96cbd8b46e442fc41c2b86b821562f')) return null;
    return url;
}

function tagNames(tagContainer, max = 12) {
    const raw = tagContainer?.tag;
    const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return [...new Set(arr.map((t) => String(t?.name || '').trim().toLowerCase()).filter(Boolean))].slice(0, max);
}

// track.getInfo — one call yields tags + duration + album art + listeners/playcount.
export async function getTrackInfo(artist, title) {
    const key = `track:${normKey(artist, title)}`;
    const cached = cacheGet(key);
    if (cached !== undefined) return cached;
    if (LASTFM_MOCK) {
        const h = mockHash(`${artist}|${title}`.toLowerCase());
        const value = {
            name: title,
            artist,
            mbid: '',
            durationMs: 180000 + (h % 120000),
            listeners: h % 500000,
            playcount: (h % 5000000) + 1000,
            album: '',
            coverUrl: null,
            tags: mockTags(artist, title),
            url: '',
        };
        cacheSet(key, value);
        return value;
    }
    const data = await lastfmRequest('track.getInfo', {
        artist,
        track: title,
        autocorrect: '1',
    }, { label: 'track.getInfo' });
    const t = data?.track;
    let value = null;
    if (t) {
        value = {
            name: t.name || title,
            artist: t.artist?.name || artist,
            mbid: t.mbid || '',
            durationMs: Number(t.duration) || 0,
            listeners: Number(t.listeners) || 0,
            playcount: Number(t.playcount) || 0,
            album: t.album?.title || '',
            coverUrl: pickImage(t.album?.image),
            tags: tagNames(t.toptags),
            url: t.url || '',
        };
    }
    cacheSet(key, value);
    return value;
}

// artist.getTopTags — fallback genre source when a track has no tags.
export async function getArtistTopTags(artist) {
    const key = `artistTags:${normKey(artist)}`;
    const cached = cacheGet(key);
    if (cached !== undefined) return cached;
    if (LASTFM_MOCK) {
        const value = mockTags(artist, 'artist');
        cacheSet(key, value);
        return value;
    }
    const data = await lastfmRequest('artist.getTopTags', {
        artist,
        autocorrect: '1',
    }, { label: 'artist.getTopTags' });
    const value = tagNames(data?.toptags);
    cacheSet(key, value);
    return value;
}

// track.getSimilar — seed for the Digging / discovery tab.
export async function getSimilarTracks(artist, title, limit = 20) {
    const key = `similar:${normKey(artist, title)}:${limit}`;
    const cached = cacheGet(key);
    if (cached !== undefined) return cached;
    if (LASTFM_MOCK) {
        const h = mockHash(`${artist}|${title}`.toLowerCase());
        const value = Array.from({ length: Math.min(limit, 12) }, (_, i) => ({
            name: `${title} (similar ${i + 1})`,
            artist: `${artist} ~${(h + i) % 9}`,
            match: 1 - i * 0.05,
            coverUrl: null,
        }));
        cacheSet(key, value);
        return value;
    }
    const data = await lastfmRequest('track.getSimilar', {
        artist,
        track: title,
        autocorrect: '1',
        limit: String(limit),
    }, { label: 'track.getSimilar' });
    const raw = data?.similartracks?.track;
    const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
    const value = arr.map((t) => ({
        name: t.name || '',
        artist: t.artist?.name || '',
        match: Number(t.match) || 0,
        coverUrl: pickImage(t.image),
    })).filter((t) => t.name && t.artist);
    cacheSet(key, value);
    return value;
}

// tag.getTopTracks — seed by genre/tag when no seed track is available.
export async function getTagTopTracks(tag, limit = 20) {
    const key = `tagTop:${normKey(tag)}:${limit}`;
    const cached = cacheGet(key);
    if (cached !== undefined) return cached;
    if (LASTFM_MOCK) {
        const h = mockHash(String(tag).toLowerCase());
        const value = Array.from({ length: Math.min(limit, 16) }, (_, i) => ({
            name: `${tag} anthem ${i + 1}`,
            artist: `${tag} artist ${(h + i) % 20}`,
            coverUrl: null,
        }));
        cacheSet(key, value);
        return value;
    }
    const data = await lastfmRequest('tag.getTopTracks', {
        tag,
        limit: String(limit),
    }, { label: 'tag.getTopTracks' });
    const raw = data?.tracks?.track;
    const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
    const value = arr.map((t) => ({
        name: t.name || '',
        artist: t.artist?.name || '',
        coverUrl: pickImage(t.image),
    })).filter((t) => t.name && t.artist);
    cacheSet(key, value);
    return value;
}
