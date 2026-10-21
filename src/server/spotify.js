// Spotify catalog client for login-free server-side enrichment.
//
// Client Credentials authenticates this server as the application. It can read
// public catalog metadata (tracks, albums, artists) without asking each visitor
// to sign in, but it cannot access a visitor's library or profile.

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_MARKET = process.env.SPOTIFY_MARKET || 'KR';
const SPOTIFY_MOCK = process.env.SPOTIFY_MOCK === '1';

const CACHE_TTL_MS = Number(process.env.SPOTIFY_CACHE_TTL_MS || 24 * 60 * 60 * 1000);
const CACHE_MAX = Number(process.env.SPOTIFY_CACHE_MAX || 5000);
const REQUEST_CONCURRENCY = Math.max(1, Number(process.env.SPOTIFY_REQUEST_CONCURRENCY || 3));
const REQUEST_TIMEOUT_MS = Math.max(1000, Number(process.env.SPOTIFY_REQUEST_TIMEOUT_MS || 8000));
const REQUEST_MIN_INTERVAL_MS = Math.max(0, Number(process.env.SPOTIFY_REQUEST_MIN_INTERVAL_MS || 220));
const RATE_LIMIT_MAX_WAIT_MS = Math.max(1000, Number(process.env.SPOTIFY_RATE_LIMIT_MAX_WAIT_MS || 120_000));
const CIRCUIT_FAILURE_THRESHOLD = Math.max(1, Number(process.env.SPOTIFY_CIRCUIT_FAILURE_THRESHOLD || 3));
const CIRCUIT_COOLDOWN_MS = Math.max(1000, Number(process.env.SPOTIFY_CIRCUIT_COOLDOWN_MS || 20_000));

const cache = new Map();
const pending = new Map();
let tokenCache = { token: '', expiresAt: 0 };
let tokenRequestPromise = null;
let activeRequests = 0;
const requestWaiters = [];
let consecutiveTransientFailures = 0;
let circuitOpenUntil = 0;
let rateLimitedUntil = 0;
let nextRequestAt = 0;

export function isSpotifyConfigured() {
    return SPOTIFY_MOCK || Boolean(SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_SECRET);
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function transientBackoff(attempt) {
    const base = Math.min(2500, 350 * (2 ** attempt));
    return base + Math.floor(Math.random() * 180);
}

function circuitError(label) {
    const error = new Error(`${label} skipped while Spotify is temporarily unavailable`);
    error.status = 503;
    error.code = 'SPOTIFY_CIRCUIT_OPEN';
    error.transient = true;
    return error;
}

function assertCircuitAvailable(label) {
    if (circuitOpenUntil <= Date.now()) {
        if (circuitOpenUntil > 0) {
            circuitOpenUntil = 0;
            consecutiveTransientFailures = 0;
        }
        return;
    }
    throw circuitError(label);
}

function markRequestHealthy() {
    consecutiveTransientFailures = 0;
    circuitOpenUntil = 0;
}

function markTransientFailure() {
    consecutiveTransientFailures += 1;
    if (consecutiveTransientFailures >= CIRCUIT_FAILURE_THRESHOLD) {
        circuitOpenUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
    }
}

function registerRateLimit(response) {
    const retryAfterSeconds = Number(response?.headers?.get('retry-after'));
    const retryAfterMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
        ? retryAfterSeconds * 1000
        : 5000;
    const cooldownMs = Math.min(RATE_LIMIT_MAX_WAIT_MS, Math.max(1000, retryAfterMs));
    rateLimitedUntil = Math.max(rateLimitedUntil, Date.now() + cooldownMs);
    nextRequestAt = Math.max(nextRequestAt, rateLimitedUntil);
}

async function waitForRequestWindow() {
    // Reserve start times synchronously so concurrent workers do not all wake
    // and hit Spotify at the same instant after a 429 cooldown.
    const now = Date.now();
    const scheduledAt = Math.max(now, rateLimitedUntil, nextRequestAt);
    nextRequestAt = scheduledAt + REQUEST_MIN_INTERVAL_MS;
    if (scheduledAt > now) await wait(scheduledAt - now);

    // A different in-flight request may have extended the shared cooldown
    // while this request was sleeping.
    if (Date.now() < rateLimitedUntil) await waitForRequestWindow();
}

async function acquireRequestSlot() {
    if (activeRequests < REQUEST_CONCURRENCY) {
        activeRequests += 1;
        return;
    }
    await new Promise((resolve) => requestWaiters.push(resolve));
}

function releaseRequestSlot() {
    const next = requestWaiters.shift();
    if (next) next();
    else activeRequests = Math.max(0, activeRequests - 1);
}

async function catalogFetch(url, options, label) {
    await acquireRequestSlot();
    try {
        assertCircuitAvailable(label);
        await waitForRequestWindow();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        try {
            const response = await fetch(url, { ...options, signal: controller.signal });
            if (response.ok) markRequestHealthy();
            else if (response.status === 429) registerRateLimit(response);
            else if (response.status >= 500) markTransientFailure();
            return response;
        } catch (error) {
            markTransientFailure();
            throw error;
        } finally {
            clearTimeout(timeout);
        }
    } finally {
        releaseRequestSlot();
    }
}

function sharePending(key, factory) {
    const existing = pending.get(key);
    if (existing) return existing;
    const request = Promise.resolve()
        .then(factory)
        .finally(() => pending.delete(key));
    pending.set(key, request);
    return request;
}

function normKey(...parts) {
    return parts.map((part) => String(part || '').trim().toLowerCase()).join('|');
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
    cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    if (cache.size <= CACHE_MAX) return;
    const drop = Math.ceil(CACHE_MAX * 0.1);
    let removed = 0;
    for (const keyToDrop of cache.keys()) {
        cache.delete(keyToDrop);
        removed += 1;
        if (removed >= drop) break;
    }
}

export async function mapLimit(items, limit, mapper) {
    const results = new Array(items.length);
    let cursor = 0;
    const workers = Array.from(
        { length: Math.max(1, Math.min(limit, items.length)) },
        async () => {
            while (true) {
                const index = cursor;
                cursor += 1;
                if (index >= items.length) return;
                results[index] = await mapper(items[index], index);
            }
        },
    );
    await Promise.all(workers);
    return results;
}

async function getAccessToken({ force = false } = {}) {
    if (!force && tokenCache.token && Date.now() < tokenCache.expiresAt) {
        return tokenCache.token;
    }
    if (!force && tokenRequestPromise) return tokenRequestPromise;
    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
        throw new Error('Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET');
    }

    const requestToken = async () => {
        const basic = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
        const response = await fetch(SPOTIFY_TOKEN_URL, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${basic}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.access_token) {
            throw new Error(`Spotify token failed (${response.status})`);
        }

        tokenCache = {
            token: data.access_token,
            expiresAt: Date.now() + Math.max(60, Number(data.expires_in) - 60) * 1000,
        };
        return tokenCache.token;
    };

    tokenRequestPromise = requestToken();
    try {
        return await tokenRequestPromise;
    } finally {
        tokenRequestPromise = null;
    }
}

async function spotifyRequest(path, { retries = 2, label = path } = {}) {
    let lastError = null;
    let forceToken = false;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
        assertCircuitAvailable(label);
        const token = await getAccessToken({ force: forceToken });
        forceToken = false;
        let response;
        try {
            response = await catalogFetch(`${SPOTIFY_API_BASE}${path}`, {
                headers: { Authorization: `Bearer ${token}` },
            }, label);
        } catch (error) {
            lastError = error;
            if (error?.code === 'SPOTIFY_CIRCUIT_OPEN') throw error;
            if (attempt < retries) {
                await wait(transientBackoff(attempt));
                continue;
            }
            error.transient = true;
            throw error;
        }

        if (response.ok) {
            return response.json();
        }
        if (response.status === 401 && attempt < retries) {
            tokenCache = { token: '', expiresAt: 0 };
            forceToken = true;
            continue;
        }
        if (response.status === 429 && attempt < retries) {
            // catalogFetch registered a process-wide cooldown. The next
            // attempt enters the same paced queue as every other request.
            continue;
        }

        const body = await response.text().catch(() => '');
        const error = new Error(`${label} failed (${response.status})${body ? `: ${body.slice(0, 180)}` : ''}`);
        error.status = response.status;
        error.transient = response.status === 429 || response.status >= 500;
        lastError = error;

        if (response.status >= 500 && attempt < retries) {
            await wait(transientBackoff(attempt));
            continue;
        }
        throw error;
    }
    throw lastError || new Error(`${label} failed`);
}

function normalizeText(value) {
    return String(value || '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\b(feat|featuring|ft|with)\b[\s\S]*$/i, '')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();
}

function tokenSimilarity(left, right) {
    const a = normalizeText(left);
    const b = normalizeText(right);
    if (!a || !b) return 0;
    if (a === b) return 1;
    const aa = new Set(a.split(/\s+/));
    const bb = new Set(b.split(/\s+/));
    let overlap = 0;
    for (const token of aa) if (bb.has(token)) overlap += 1;
    // Extra version/collaborator words are common; partial words are not a
    // match (e.g. KAI must not match Kaiit, or Love match Lovely).
    if (overlap === Math.min(aa.size, bb.size)) return 0.82;
    return (2 * overlap) / (aa.size + bb.size);
}

export function rankTrackCandidates(candidates, artist, title, album = '') {
    return candidates.map((track, index) => {
        const titleSimilarity = tokenSimilarity(title, track.name);
        const artistSimilarity = tokenSimilarity(artist, track.artist);
        return {
            track,
            titleSimilarity,
            artistSimilarity,
            score: titleSimilarity * 0.58 + artistSimilarity * 0.37
                + (album ? tokenSimilarity(album, track.album) * 0.05 : 0)
                - index * 0.002,
        };
    })
        // A matching title alone used to clear the combined 0.48 threshold,
        // repeatedly replacing unrelated imports with a popular namesake.
        .filter(candidate => candidate.titleSimilarity >= 0.8 && candidate.artistSimilarity >= 0.6)
        .sort((a, b) => b.score - a.score);
}

function pickCover(images) {
    if (!Array.isArray(images) || images.length === 0) return null;
    return images.find((image) => Number(image?.width) <= 640 && Number(image?.width) >= 250)?.url
        || images[1]?.url
        || images[0]?.url
        || null;
}

function mapTrack(track) {
    if (!track?.id || !track?.name) return null;
    const artists = Array.isArray(track.artists) ? track.artists : [];
    return {
        id: track.id,
        name: track.name,
        artist: artists.map((item) => item?.name).filter(Boolean).join(', '),
        primaryArtistId: artists[0]?.id || null,
        album: track.album?.name || '',
        albumId: track.album?.id || null,
        coverUrl: pickCover(track.album?.images),
        durationMs: Number(track.duration_ms) || 0,
        popularity: Number.isFinite(Number(track.popularity)) ? Number(track.popularity) : null,
        externalUrl: track.external_urls?.spotify || '',
        genres: [],
    };
}

function mockHash(value) {
    let hash = 2166136261;
    for (const char of String(value)) {
        hash ^= char.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

const MOCK_GENRES = ['electronic', 'indie rock', 'pop', 'hip hop', 'ambient', 'jazz', 'folk', 'r&b'];

function mockTrack(artist, title, album = '') {
    const hash = mockHash(`${artist}|${title}`.toLowerCase());
    return {
        id: `mock_${hash.toString(16)}`,
        name: title,
        artist,
        primaryArtistId: `mock_artist_${mockHash(artist).toString(16)}`,
        album,
        albumId: null,
        coverUrl: null,
        durationMs: 180000 + (hash % 120000),
        popularity: null,
        externalUrl: `https://open.spotify.com/search/${encodeURIComponent(`${artist} ${title}`)}`,
        genres: [MOCK_GENRES[hash % MOCK_GENRES.length]],
    };
}

export async function getArtistGenres(artistId) {
    if (!artistId) return [];
    if (SPOTIFY_MOCK) {
        return [MOCK_GENRES[mockHash(artistId) % MOCK_GENRES.length]];
    }
    const key = `artist:${artistId}`;
    const cached = cacheGet(key);
    if (cached !== undefined) return cached;
    return sharePending(key, async () => {
        const data = await spotifyRequest(`/artists/${encodeURIComponent(artistId)}`, {
            label: 'Spotify artist lookup',
        });
        const genres = Array.isArray(data?.genres)
            ? [...new Set(data.genres.map((genre) => String(genre || '').trim().toLowerCase()).filter(Boolean))]
            : [];
        cacheSet(key, genres);
        return genres;
    });
}

export async function searchTracks(query, limit = 10) {
    const safeLimit = Math.max(1, Math.min(10, Number(limit) || 10));
    if (SPOTIFY_MOCK) {
        return Array.from({ length: safeLimit }, (_, index) => mockTrack(
            `${query} artist ${index + 1}`,
            `${query} track ${index + 1}`,
        ));
    }
    const key = `search:${normKey(query, safeLimit, SPOTIFY_MARKET)}`;
    const cached = cacheGet(key);
    if (cached !== undefined) return cached;
    return sharePending(key, async () => {
        const params = new URLSearchParams({
            q: String(query || '').trim(),
            type: 'track',
            limit: String(safeLimit),
            market: SPOTIFY_MARKET,
        });
        const data = await spotifyRequest(`/search?${params.toString()}`, {
            label: 'Spotify track search',
        });
        const tracks = (data?.tracks?.items || []).map(mapTrack).filter(Boolean);
        cacheSet(key, tracks);
        return tracks;
    });
}

export async function getTrackInfo(artist, title, album = '') {
    if (SPOTIFY_MOCK) return mockTrack(artist, title, album);
    const key = `track:${normKey(artist, title, album)}`;
    const cached = cacheGet(key);
    if (cached !== undefined) return cached;

    return sharePending(key, async () => {
        const queries = [];
        if (album) queries.push(`track:${title} artist:${artist} album:${album}`);
        queries.push(`track:${title} artist:${artist}`);
        queries.push(`${artist} ${title}`);

        let best = null;
        for (const query of [...new Set(queries)]) {
            const ranked = rankTrackCandidates(await searchTracks(query, 10), artist, title, album);
            if (ranked[0]?.score >= 0.48) {
                best = ranked[0].track;
                break;
            }
        }
        if (!best) {
            cacheSet(key, null);
            return null;
        }
        const genres = await getArtistGenres(best.primaryArtistId);
        const value = { ...best, genres };
        cacheSet(key, value);
        return value;
    });
}
