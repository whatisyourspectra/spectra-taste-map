import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import session from 'express-session';
import os from 'os';
import { promises as fsp, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || '';
const SPOTIFY_MOBILE_REDIRECT_URI = process.env.SPOTIFY_MOBILE_REDIRECT_URI || process.env.SPOTIFY_PUBLIC_REDIRECT_URI || '';
const CLIENT_APP_ORIGIN = process.env.CLIENT_APP_ORIGIN || 'http://localhost:5173';
let spotifyTokenCache = { token: null, expiresAt: 0 };
const TASTE_FEATURES_CACHE_TTL_MS = Number(process.env.TASTE_FEATURES_CACHE_TTL_MS || (10 * 60 * 1000));
const TASTE_FEATURES_CACHE_MAX_ENTRIES = Number(process.env.TASTE_FEATURES_CACHE_MAX_ENTRIES || 120);
const tasteFeaturesCache = new Map(); // cacheKey -> { payload, savedAt, expiresAt }
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_DIST_DIR = path.join(__dirname, 'dist');
const CLIENT_INDEX_PATH = path.join(CLIENT_DIST_DIR, 'index.html');
const PARTY_TASTE_SNAPSHOT_DB_PATH = process.env.PARTY_TASTE_SNAPSHOT_DB_PATH || path.join(__dirname, '.party-taste-snapshots.json');
const partyTasteSnapshotStore = new Map(); // spotifyUserId -> { updatedAt, snapshot }
let partyTasteSnapshotStoreLoadPromise = null;
let partyTasteSnapshotStoreWritePromise = Promise.resolve();
const authBridgeTransfers = new Map(); // token -> { expiresAt, spotify }
const AUTH_BRIDGE_TTL_MS = 2 * 60 * 1000;

const isProd = process.env.NODE_ENV === 'production';

const app = express();
app.set('trust proxy', 1);

function isAllowedCorsOrigin(origin) {
    if (!origin) return true;
    try {
        const parsed = new URL(String(origin));
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
        if (parsed.origin === CLIENT_APP_ORIGIN) return true;
        return isLocalNetworkHostname(parsed.hostname);
    } catch {
        return false;
    }
}

app.use(cors({
    origin: (origin, callback) => {
        if (isAllowedCorsOrigin(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));
app.use(express.json());
const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'dev-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: isProd ? 'none' : 'lax',
        secure: isProd,
    },
});
app.use(sessionMiddleware);

function isLoopbackHost(hostname) {
    const h = String(hostname || '').toLowerCase();
    return h === 'localhost' || h === '127.0.0.1' || h === '::1';
}

function isPrivateIpv4(hostname) {
    const h = String(hostname || '');
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return false;
    const [a, b] = h.split('.').map((n) => Number(n));
    if ([a, b].some((n) => !Number.isFinite(n) || n < 0 || n > 255)) return false;
    return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function isLocalNetworkHostname(hostname) {
    const h = String(hostname || '').toLowerCase();
    return isLoopbackHost(h) || isPrivateIpv4(h) || h.endsWith('.local');
}

function getFirstLanIPv4() {
    const entries = Object.values(os.networkInterfaces() || {}).flat().filter(Boolean);
    const ipv4 = entries.find((item) => (
        item.family === 'IPv4'
        && !item.internal
        && isPrivateIpv4(item.address)
    ));
    return ipv4?.address || null;
}

function getRequestBaseOrigin(req) {
    const host = req.get('host') || '';
    const protoHeader = String(req.get('x-forwarded-proto') || '').split(',')[0].trim();
    const proto = protoHeader || req.protocol || 'http';
    return host ? `${proto}://${host}` : null;
}

function getRefererOrigin(req) {
    try {
        const referer = req.get('referer');
        if (!referer) return null;
        const parsed = new URL(referer);
        return parsed.origin;
    } catch {
        return null;
    }
}

function sanitizeAppOrigin(input, req) {
    if (!input) return null;
    try {
        const parsed = new URL(String(input));
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
        const reqHost = String(req.get('host') || '').toLowerCase();
        const sameHost = parsed.host.toLowerCase() === reqHost;
        if (sameHost || isLocalNetworkHostname(parsed.hostname)) return parsed.origin;
        return null;
    } catch {
        return null;
    }
}

function getRecommendedOrigin(req) {
    const requestOrigin = getRequestBaseOrigin(req);
    if (!requestOrigin) return null;
    try {
        const parsed = new URL(requestOrigin);
        if (!isLoopbackHost(parsed.hostname)) return parsed.origin;
        const lanIp = getFirstLanIPv4();
        if (!lanIp) return parsed.origin;
        parsed.hostname = lanIp;
        return parsed.origin;
    } catch {
        return requestOrigin;
    }
}

function resolveReturnOrigin(req) {
    const sessionOrigin = sanitizeAppOrigin(req.session?.returnToOrigin, req);
    if (sessionOrigin) return sessionOrigin;
    const refererOrigin = sanitizeAppOrigin(getRefererOrigin(req), req);
    if (refererOrigin) return refererOrigin;
    const requestOrigin = getRequestBaseOrigin(req);
    try {
        if (requestOrigin && !isLoopbackHost(new URL(requestOrigin).hostname)) {
            return requestOrigin;
        }
    } catch {
        // ignore
    }
    return getRecommendedOrigin(req) || requestOrigin || CLIENT_APP_ORIGIN;
}

function resolveSpotifyRedirectUri(req, appOrigin) {
    if (!SPOTIFY_REDIRECT_URI) return '';
    try {
        const appUrl = appOrigin ? new URL(appOrigin) : null;
        if (
            appUrl
            && !isLoopbackHost(appUrl.hostname)
            && isLocalNetworkHostname(appUrl.hostname)
            && SPOTIFY_MOBILE_REDIRECT_URI
        ) {
            return new URL(SPOTIFY_MOBILE_REDIRECT_URI).toString();
        }
        return new URL(SPOTIFY_REDIRECT_URI).toString();
    } catch {
        return SPOTIFY_REDIRECT_URI;
    }
}

function pruneAuthBridgeTransfers() {
    const now = Date.now();
    for (const [token, item] of authBridgeTransfers.entries()) {
        if (!item || item.expiresAt <= now) {
            authBridgeTransfers.delete(token);
        }
    }
}

function createAuthBridgeTransfer(spotifyPayload) {
    pruneAuthBridgeTransfers();
    const token = crypto.randomBytes(24).toString('base64url');
    authBridgeTransfers.set(token, {
        expiresAt: Date.now() + AUTH_BRIDGE_TTL_MS,
        spotify: spotifyPayload,
    });
    return token;
}

function consumeAuthBridgeTransfer(token) {
    pruneAuthBridgeTransfers();
    const key = String(token || '');
    if (!key) return null;
    const entry = authBridgeTransfers.get(key);
    if (!entry) return null;
    authBridgeTransfers.delete(key);
    if (entry.expiresAt <= Date.now()) return null;
    return entry.spotify || null;
}

function sanitizeReturnToPath(input) {
    const raw = String(input || '').trim();
    if (!raw.startsWith('/')) return '/taste-map?auth=spotify';
    if (raw.startsWith('//')) return '/taste-map?auth=spotify';
    return raw;
}

function encodeOAuthState(payload) {
    try {
        const json = JSON.stringify(payload || {});
        return Buffer.from(json, 'utf8').toString('base64url');
    } catch {
        return '';
    }
}

function decodeOAuthState(raw) {
    if (!raw) return null;
    try {
        const json = Buffer.from(String(raw), 'base64url').toString('utf8');
        const data = JSON.parse(json);
        if (!data || typeof data !== 'object') return null;
        return data;
    } catch {
        return null;
    }
}

function normalizeIds(idsParam) {
    if (!idsParam) return [];
    return [...new Set(String(idsParam).split(',').map(v => v.trim()).filter(Boolean))];
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

class SpotifyFetchError extends Error {
    constructor(message, status, body) {
        super(message);
        this.name = 'SpotifyFetchError';
        this.status = status;
        this.body = body;
    }
}

async function spotifyJsonWithRetry(url, options = {}, { label = 'Spotify request', retries = 4 } = {}) {
    let lastError = null;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
            const res = await fetch(url, options);
            if (res.ok) return res.json();
            const body = await res.text();
            const retryable = res.status === 429 || res.status === 408 || res.status >= 500;
            lastError = new SpotifyFetchError(`${label} failed (${res.status})`, res.status, body);
            if (!retryable || attempt >= retries) break;
            const retryAfter = Number(res.headers.get('Retry-After'));
            const backoffMs = Number.isFinite(retryAfter) && retryAfter > 0
                ? retryAfter * 1000
                : Math.min(5000, 450 * (2 ** attempt));
            await wait(backoffMs);
        } catch (e) {
            lastError = e;
            if (attempt >= retries) break;
            await wait(Math.min(5000, 450 * (2 ** attempt)));
        }
    }
    throw lastError || new Error(`${label} failed`);
}

function buildTasteFeaturesCacheKey({ userId, includeGenres, ids }) {
    const sortedIds = [...ids].sort();
    return `v4|${userId}|g:${includeGenres ? 1 : 0}|ids:${sortedIds.join(',')}`;
}

function getTasteFeaturesCache(cacheKey) {
    const item = tasteFeaturesCache.get(cacheKey);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
        tasteFeaturesCache.delete(cacheKey);
        return null;
    }
    return item.payload;
}

function pruneTasteFeaturesCache() {
    if (tasteFeaturesCache.size <= TASTE_FEATURES_CACHE_MAX_ENTRIES) return;
    const now = Date.now();
    for (const [key, item] of tasteFeaturesCache.entries()) {
        if (item.expiresAt <= now) {
            tasteFeaturesCache.delete(key);
        }
    }
    if (tasteFeaturesCache.size <= TASTE_FEATURES_CACHE_MAX_ENTRIES) return;
    const sorted = [...tasteFeaturesCache.entries()].sort((a, b) => a[1].savedAt - b[1].savedAt);
    const overflow = sorted.length - TASTE_FEATURES_CACHE_MAX_ENTRIES;
    for (let i = 0; i < overflow; i++) {
        tasteFeaturesCache.delete(sorted[i][0]);
    }
}

function setTasteFeaturesCache(cacheKey, payload) {
    const now = Date.now();
    tasteFeaturesCache.set(cacheKey, {
        payload,
        savedAt: now,
        expiresAt: now + TASTE_FEATURES_CACHE_TTL_MS,
    });
    pruneTasteFeaturesCache();
}

function sanitizeTrackItems(tracks, limit = 24) {
    if (!Array.isArray(tracks)) return [];
    const seen = new Set();
    const out = [];
    for (const item of tracks) {
        if (!item?.id || !item?.name || seen.has(item.id)) continue;
        seen.add(item.id);
        out.push({
            id: String(item.id),
            name: String(item.name),
            artists: item.artists ? String(item.artists) : '',
            coverUrl: item.coverUrl ? String(item.coverUrl) : null,
            genres: Array.isArray(item.genres)
                ? [...new Set(item.genres.map((g) => String(g || '').trim()).filter(Boolean))].slice(0, 8)
                : [],
        });
        if (out.length >= limit) break;
    }
    return out;
}

function sanitizeDesktopHandoff(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const mode = ['expand', 'core', 'shared'].includes(String(raw.mode || ''))
        ? String(raw.mode)
        : 'core';
    const expansionRange = ['6m', '12m', '24m', 'all'].includes(String(raw.expansionRange || ''))
        ? String(raw.expansionRange)
        : '12m';
    const selectedGenreKeys = Array.isArray(raw.selectedGenreKeys)
        ? [...new Set(raw.selectedGenreKeys.map((v) => String(v || '').trim()).filter(Boolean))].slice(0, 12)
        : [];
    const nextTracks = sanitizeTrackItems(raw.nextTracks, 16);
    const note = raw.note ? String(raw.note).trim().slice(0, 180) : '';
    if (!nextTracks.length && !selectedGenreKeys.length) return null;
    return {
        mode,
        expansionRange,
        selectedGenreKeys,
        nextTracks,
        note,
        updatedAt: Number(raw.updatedAt) || Date.now(),
    };
}

function sanitizePartyTasteSnapshot(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const topGenres = Array.isArray(raw.topGenres)
        ? [...new Set(raw.topGenres.map((v) => String(v || '').trim()).filter(Boolean))].slice(0, 12)
        : [];
    const topArtistIds = Array.isArray(raw.topArtistIds)
        ? raw.topArtistIds.map((v) => String(v || '').trim()).filter(Boolean).slice(0, 8)
        : [];
    const topTrackIds = Array.isArray(raw.topTrackIds)
        ? raw.topTrackIds.map((v) => String(v || '').trim()).filter(Boolean).slice(0, 8)
        : [];
    const bubbleTracks = {
        recent: sanitizeTrackItems(raw.bubbleTracks?.recent || raw.recentTracks, 24),
        liked: sanitizeTrackItems(raw.bubbleTracks?.liked || raw.likedTracks, 24),
        top: sanitizeTrackItems(raw.bubbleTracks?.top || raw.topTracks, 18),
    };
    const desktopHandoff = sanitizeDesktopHandoff(raw.desktopHandoff);
    const profileHint = raw.profileHint && typeof raw.profileHint === 'object'
        ? {
            id: raw.profileHint.id ? String(raw.profileHint.id) : null,
            displayName: raw.profileHint.displayName ? String(raw.profileHint.displayName) : null,
        }
        : { id: null, displayName: null };
    const hasTaste = topGenres.length > 0
        || bubbleTracks.recent.length > 0
        || bubbleTracks.liked.length > 0
        || bubbleTracks.top.length > 0
        || Boolean(desktopHandoff);
    if (!hasTaste) return null;
    return {
        version: 1,
        updatedAt: Number(raw.updatedAt) || Date.now(),
        profileHint,
        topGenres,
        topArtistIds,
        topTrackIds,
        bubbleTracks,
        desktopHandoff,
    };
}

async function ensurePartyTasteSnapshotStoreLoaded() {
    if (partyTasteSnapshotStoreLoadPromise) return partyTasteSnapshotStoreLoadPromise;
    partyTasteSnapshotStoreLoadPromise = (async () => {
        try {
            const raw = await fsp.readFile(PARTY_TASTE_SNAPSHOT_DB_PATH, 'utf8');
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return;
            for (const [userId, entry] of Object.entries(parsed)) {
                if (!userId || !entry) continue;
                const snapshot = sanitizePartyTasteSnapshot(entry.snapshot || entry);
                if (!snapshot) continue;
                partyTasteSnapshotStore.set(userId, {
                    updatedAt: Number(entry.updatedAt) || snapshot.updatedAt || Date.now(),
                    snapshot,
                });
            }
        } catch (e) {
            if (e?.code !== 'ENOENT') {
                console.warn('[Party] snapshot store load failed:', e.message);
            }
        }
    })();
    return partyTasteSnapshotStoreLoadPromise;
}

function persistPartyTasteSnapshotStore() {
    partyTasteSnapshotStoreWritePromise = partyTasteSnapshotStoreWritePromise
        .then(async () => {
            const serializable = {};
            for (const [userId, entry] of partyTasteSnapshotStore.entries()) {
                serializable[userId] = {
                    updatedAt: entry.updatedAt || Date.now(),
                    snapshot: entry.snapshot,
                };
            }
            await fsp.writeFile(PARTY_TASTE_SNAPSHOT_DB_PATH, JSON.stringify(serializable, null, 2), 'utf8');
        })
        .catch((e) => {
            console.warn('[Party] snapshot store save failed:', e.message);
        });
    return partyTasteSnapshotStoreWritePromise;
}

// ---------- Spotify API (client_credentials + optional user OAuth) ----------

async function getSpotifyToken() {
    if (spotifyTokenCache.token && Date.now() < spotifyTokenCache.expiresAt) {
        return spotifyTokenCache.token;
    }
    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
        throw new Error('Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET');
    }
    const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64'),
        },
        body: 'grant_type=client_credentials',
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error('Spotify token failed: ' + res.status + ' ' + err);
    }
    const data = await res.json();
    spotifyTokenCache = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    };
    return spotifyTokenCache.token;
}

// Session-scoped Spotify tokens (per user)
function ensureSpotifySession(req) {
    if (!req.session) throw new Error('Session not initialized');
    if (!req.session.spotify) {
        req.session.spotify = { access: null, refresh: null, expiresAt: 0 };
    }
    return req.session.spotify;
}

async function getUserAccessToken(req) {
    const state = ensureSpotifySession(req);
    if (state.access && Date.now() < state.expiresAt - 60_000) {
        return state.access;
    }
    if (!state.refresh) {
        throw new Error('No Spotify user refresh token set. Please login.');
    }
    const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: state.refresh,
    });
    const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64'),
        },
        body,
    });
    if (!res.ok) {
        const txt = await res.text();
        throw new Error('Spotify refresh failed: ' + res.status + ' ' + txt);
    }
    const data = await res.json();
    state.access = data.access_token;
    if (data.refresh_token) {
        state.refresh = data.refresh_token;
    }
    state.expiresAt = Date.now() + (data.expires_in - 60) * 1000;
    return state.access;
}

async function getSpotifyUserProfile(req) {
    const cache = req.session?.spotifyProfileCache;
    if (cache?.id && Date.now() < cache.expiresAt) {
        return cache;
    }
    const access = await getUserAccessToken(req);
    const res = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: 'Bearer ' + access },
    });
    if (!res.ok) {
        const txt = await res.text();
        throw new Error('Failed to fetch Spotify profile: ' + txt);
    }
    const data = await res.json();
    const profile = {
        id: data.id,
        displayName: data.display_name || data.id,
        expiresAt: Date.now() + 5 * 60 * 1000, // cache for 5 minutes
    };
    if (req.session) {
        req.session.spotifyProfileCache = profile;
    }
    return profile;
}

// Start OAuth login
app.get('/auth/login', (req, res) => {
    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_REDIRECT_URI) {
        return res.status(500).send('Spotify OAuth not configured');
    }
    // returnTo: 로그인 후 돌아갈 경로 (예: /party/ABC123)
    const normalizedReturnTo = sanitizeReturnToPath(req.query.returnTo || req.session?.returnTo);
    req.session.returnTo = normalizedReturnTo;
    const runtimeOrigin = sanitizeAppOrigin(req.query.appOrigin || req.get('origin'), req);
    const refererOrigin = sanitizeAppOrigin(getRefererOrigin(req), req);
    const requestOrigin = getRequestBaseOrigin(req);
    req.session.returnToOrigin = runtimeOrigin
        || refererOrigin
        || getRecommendedOrigin(req)
        || requestOrigin
        || CLIENT_APP_ORIGIN;
    const spotifyRedirectUri = resolveSpotifyRedirectUri(req, req.session.returnToOrigin);
    const oauthState = encodeOAuthState({
        rt: normalizedReturnTo,
        ro: req.session.returnToOrigin,
        ru: spotifyRedirectUri,
        ts: Date.now(),
    });
    const scopes = [
        'user-top-read',
        'user-follow-read',
        'user-read-recently-played',
        'user-read-currently-playing',
        'user-read-playback-state',
        'user-modify-playback-state',
        'user-library-modify',
        'user-library-read',
        'playlist-modify-public',
        'playlist-modify-private',
        'playlist-read-private',
        'playlist-read-collaborative',
    ].join(' ');
    const params = new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        response_type: 'code',
        redirect_uri: spotifyRedirectUri,
        scope: scopes,
        show_dialog: 'true',
    });
    if (oauthState) params.set('state', oauthState);
    res.redirect('https://accounts.spotify.com/authorize?' + params.toString());
});

// OAuth callback
app.get('/auth/callback', async (req, res) => {
    const code = req.query.code;
    const decodedState = decodeOAuthState(req.query.state);
    if (!code) {
        return res.status(400).send('Missing code');
    }
    try {
        const body = new URLSearchParams({
            grant_type: 'authorization_code',
            code: String(code),
            redirect_uri: decodedState?.ru || SPOTIFY_REDIRECT_URI,
        });
        const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64'),
            },
            body,
        });
        if (!tokenRes.ok) {
            const txt = await tokenRes.text();
            console.error('[Spotify] auth code exchange failed:', tokenRes.status, txt);
            return res.status(500).send('Spotify auth failed');
        }
    const data = await tokenRes.json();
    if (!req.session) throw new Error('Session unavailable');
    req.session.spotify = {
        access: data.access_token,
        refresh: data.refresh_token,
        expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    };
    req.session.spotifyProfileCache = null;
    console.log('[Spotify] user logged in');
    const returnTo = sanitizeReturnToPath(decodedState?.rt || req.session.returnTo || '/taste-map?auth=spotify');
    const returnOrigin = sanitizeAppOrigin(decodedState?.ro, req) || resolveReturnOrigin(req);
    const requestOrigin = getRequestBaseOrigin(req) || returnOrigin;
    delete req.session.returnTo;
    delete req.session.returnToOrigin;
    if (returnOrigin && requestOrigin && returnOrigin !== requestOrigin) {
        const bridgeToken = createAuthBridgeTransfer({
            access: data.access_token,
            refresh: data.refresh_token,
            expiresAt: Date.now() + (data.expires_in - 60) * 1000,
        });
        const bridgeParams = new URLSearchParams({
            token: bridgeToken,
            returnTo,
        });
        return res.redirect(`${returnOrigin}/auth/bridge?${bridgeParams.toString()}`);
    }
    res.redirect(returnOrigin + returnTo);
} catch (e) {
        console.error('[Spotify] auth callback error:', e.message);
        res.status(500).send('Spotify auth error');
    }
});

app.get('/auth/bridge', (req, res) => {
    try {
        const spotify = consumeAuthBridgeTransfer(req.query.token);
        if (!spotify) {
            return res.redirect('/taste-map/mobile?auth=expired');
        }
        req.session.spotify = spotify;
        req.session.spotifyProfileCache = null;
        const returnTo = sanitizeReturnToPath(req.query.returnTo || '/taste-map?auth=spotify');
        return res.redirect(returnTo);
    } catch (e) {
        console.error('[AuthBridge] failed:', e.message);
        return res.redirect('/taste-map/mobile?auth=error');
    }
});

// Logout: clear in-memory tokens (single-user dev usage)
app.post('/auth/logout', (req, res) => {
    req.session.spotify = { access: null, refresh: null, expiresAt: 0 };
    req.session.spotifyProfileCache = null;
    req.session.destroy(() => {
        res.json({ ok: true });
    });
});

app.get('/api/me/profile', async (req, res) => {
    try {
        const profile = await getSpotifyUserProfile(req);
        res.json({ id: profile.id, displayName: profile.displayName });
    } catch (e) {
        res.status(401).json({ error: e.message || 'Not logged in' });
    }
});

app.get('/api/me/taste-snapshot', async (req, res) => {
    try {
        const profile = await getSpotifyUserProfile(req);
        await ensurePartyTasteSnapshotStoreLoaded();
        const entry = partyTasteSnapshotStore.get(profile.id);
        if (!entry?.snapshot) {
            return res.json({ snapshot: null, updatedAt: null });
        }
        return res.json({
            snapshot: entry.snapshot,
            updatedAt: entry.updatedAt || entry.snapshot.updatedAt || null,
        });
    } catch (e) {
        res.status(401).json({ error: e.message || 'Not logged in' });
    }
});

app.post('/api/me/taste-snapshot', async (req, res) => {
    try {
        const profile = await getSpotifyUserProfile(req);
        const snapshot = sanitizePartyTasteSnapshot(req.body?.snapshot);
        if (!snapshot) {
            return res.status(400).json({ error: 'snapshot payload is invalid' });
        }
        await ensurePartyTasteSnapshotStoreLoaded();
        const merged = {
            ...snapshot,
            profileHint: {
                id: profile.id,
                displayName: profile.displayName,
            },
            updatedAt: Date.now(),
        };
        partyTasteSnapshotStore.set(profile.id, {
            updatedAt: merged.updatedAt,
            snapshot: merged,
        });
        await persistPartyTasteSnapshotStore();
        res.json({ ok: true, updatedAt: merged.updatedAt });
    } catch (e) {
        res.status(401).json({ error: e.message || 'Not logged in' });
    }
});

// 최근 재생 트랙 (recently played)
app.get('/api/me/recently-played', async (req, res) => {
    try {
        const access = await getUserAccessToken(req);
        const limit = Math.min(Number(req.query.limit) || 30, 50);
        const r = await fetch(
            `https://api.spotify.com/v1/me/player/recently-played?limit=${limit}`,
            { headers: { Authorization: 'Bearer ' + access } },
        );
        if (!r.ok) {
            const txt = await r.text();
            return res.status(r.status).json({ error: txt });
        }
        const data = await r.json();
        // Count occurrences per track before deduplication — reflects recent listen frequency
        const playCounts = new Map();
        (data.items || []).forEach(item => {
            const id = item.track?.id;
            if (id) playCounts.set(id, (playCounts.get(id) || 0) + 1);
        });
        const seen = new Set();
        const tracks = (data.items || []).reduce((acc, item) => {
            const t = item.track;
            if (!t?.id || seen.has(t.id)) return acc;
            seen.add(t.id);
            acc.push({
                id: t.id,
                name: t.name,
                artists: (t.artists || []).map(a => a.name).join(', '),
                album: t.album?.name,
                coverUrl: t.album?.images?.[0]?.url || null,
                playedAt: item.played_at,
                recentPlayCount: playCounts.get(t.id) || 1,
            });
            return acc;
        }, []);
        res.json({ tracks });
    } catch (e) {
        console.error('[Spotify] /api/me/recently-played error:', e.message);
        res.status(401).json({ error: e.message || 'Not logged in' });
    }
});

// Taste Map용 팔로우 아티스트 + 저장 앨범 요약
app.get('/api/me/taste-library-summary', async (req, res) => {
    try {
        const cache = req.session?.tasteLibrarySummaryCache;
        if (cache?.payload && Date.now() < cache.expiresAt) {
            return res.json(cache.payload);
        }

        const access = await getUserAccessToken(req);
        const headers = { Authorization: 'Bearer ' + access };

        const followedArtists = [];
        let followedArtistsTotal = null;
        let after = null;
        let artistPage = 0;
        const ARTIST_LIMIT = 50;
        const ARTIST_MAX_PAGES = 6; // 최대 300명

        while (artistPage < ARTIST_MAX_PAGES) {
            const qs = new URLSearchParams({
                type: 'artist',
                limit: String(ARTIST_LIMIT),
            });
            if (after) qs.set('after', after);
            const r = await fetch(`https://api.spotify.com/v1/me/following?${qs.toString()}`, { headers });
            if (!r.ok) {
                const txt = await r.text();
                return res.status(r.status).json({ error: txt || 'Failed to fetch followed artists' });
            }
            const data = await r.json();
            const page = data?.artists;
            const items = Array.isArray(page?.items) ? page.items : [];

            if (Number.isFinite(page?.total) && followedArtistsTotal === null) {
                followedArtistsTotal = page.total;
            }

            items.forEach((artist) => {
                if (!artist?.id) return;
                followedArtists.push({
                    id: artist.id,
                    name: artist.name,
                    genres: artist.genres || [],
                    imageUrl: artist.images?.[0]?.url || null,
                    followers: artist.followers?.total ?? null,
                });
            });

            const nextAfter = page?.cursors?.after || null;
            if (!page?.next || !nextAfter || items.length < ARTIST_LIMIT) break;
            after = nextAfter;
            artistPage += 1;
        }

        const savedAlbums = [];
        let savedAlbumsTotal = null;
        let offset = 0;
        let albumPage = 0;
        const ALBUM_LIMIT = 50;
        const ALBUM_MAX_PAGES = 6; // 최대 300장

        while (albumPage < ALBUM_MAX_PAGES) {
            const qs = new URLSearchParams({
                limit: String(ALBUM_LIMIT),
                offset: String(offset),
                market: 'KR',
            });
            const r = await fetch(`https://api.spotify.com/v1/me/albums?${qs.toString()}`, { headers });
            if (!r.ok) {
                const txt = await r.text();
                return res.status(r.status).json({ error: txt || 'Failed to fetch saved albums' });
            }
            const data = await r.json();
            const items = Array.isArray(data?.items) ? data.items : [];

            if (Number.isFinite(data?.total) && savedAlbumsTotal === null) {
                savedAlbumsTotal = data.total;
            }

            items.forEach((item) => {
                const album = item?.album;
                if (!album?.id) return;
                savedAlbums.push({
                    id: album.id,
                    name: album.name,
                    artists: (album.artists || []).map((a) => a.name).join(', '),
                    coverUrl: album.images?.[0]?.url || null,
                    releaseDate: album.release_date || null,
                    addedAt: item.added_at || null,
                });
            });

            if (items.length < ALBUM_LIMIT) break;
            offset += items.length;
            albumPage += 1;
        }

        const followedGenreCount = new Map();
        followedArtists.forEach((artist) => {
            (artist.genres || []).forEach((genre) => {
                const key = String(genre || '').trim().toLowerCase();
                if (!key) return;
                followedGenreCount.set(key, (followedGenreCount.get(key) || 0) + 1);
            });
        });
        const topFollowedGenres = [...followedGenreCount.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([genre, count]) => ({ genre, count }));

        const payload = {
            followedArtists,
            savedAlbums,
            topFollowedGenres,
            stats: {
                followedArtistsFetched: followedArtists.length,
                followedArtistsTotal: followedArtistsTotal ?? followedArtists.length,
                savedAlbumsFetched: savedAlbums.length,
                savedAlbumsTotal: savedAlbumsTotal ?? savedAlbums.length,
                partial:
                    (followedArtistsTotal != null && followedArtists.length < followedArtistsTotal)
                    || (savedAlbumsTotal != null && savedAlbums.length < savedAlbumsTotal),
            },
        };

        if (req.session) {
            req.session.tasteLibrarySummaryCache = {
                payload,
                expiresAt: Date.now() + 5 * 60 * 1000,
            };
        }

        res.json(payload);
    } catch (e) {
        console.error('[Spotify] /api/me/taste-library-summary error:', e.message);
        res.status(401).json({ error: e.message || 'Not logged in' });
    }
});

// 장르 키워드 → [valence, energy] 추정값 (Spotify audio-features deprecated 대비 fallback)
const GENRE_SCORES = {
    'techno':           [0.35, 0.90], 'tech house':      [0.55, 0.82],
    'house':            [0.65, 0.72], 'deep house':      [0.58, 0.62],
    'minimal techno':   [0.40, 0.65], 'acid house':      [0.50, 0.80],
    'drum and bass':    [0.48, 0.95], 'jungle':          [0.52, 0.92],
    'dubstep':          [0.42, 0.88], 'trap':            [0.38, 0.80],
    'ambient':          [0.55, 0.12], 'dark ambient':    [0.20, 0.10],
    'drone':            [0.32, 0.08], 'new age':         [0.65, 0.10],
    'lo-fi':            [0.58, 0.22], 'chillwave':       [0.62, 0.28],
    'hip hop':          [0.48, 0.65], 'rap':             [0.42, 0.70],
    'r&b':              [0.68, 0.52], 'soul':            [0.72, 0.48],
    'jazz':             [0.65, 0.38], 'blues':           [0.42, 0.45],
    'bossa nova':       [0.75, 0.30], 'latin':           [0.78, 0.70],
    'pop':              [0.76, 0.65], 'dance pop':       [0.80, 0.78],
    'k-pop':            [0.78, 0.75], 'j-pop':           [0.75, 0.70],
    'rock':             [0.52, 0.75], 'indie rock':      [0.55, 0.68],
    'alternative':      [0.50, 0.62], 'indie':           [0.58, 0.52],
    'punk':             [0.42, 0.88], 'post-punk':       [0.35, 0.72],
    'metal':            [0.25, 0.95], 'heavy metal':     [0.20, 0.98],
    'classical':        [0.60, 0.28], 'orchestral':      [0.55, 0.50],
    'folk':             [0.65, 0.28], 'acoustic':        [0.62, 0.26],
    'country':          [0.68, 0.52], 'bluegrass':       [0.70, 0.60],
    'electronic':       [0.55, 0.62], 'edm':             [0.72, 0.88],
    'electro':          [0.58, 0.82], 'synthwave':       [0.50, 0.70],
    'funk':             [0.78, 0.75], 'disco':           [0.82, 0.80],
    'reggae':           [0.72, 0.40], 'dub':             [0.55, 0.35],
    'gospel':           [0.80, 0.60], 'rnb':             [0.68, 0.52],
};

function genreProxy(genres) {
    if (!genres || genres.length === 0) return { valence: 0.5, energy: 0.5, danceability: 0.5, acousticness: 0.5, instrumentalness: 0.0 };
    let vSum = 0, eSum = 0, count = 0;
    for (const genre of genres) {
        const gl = genre.toLowerCase();
        for (const [key, [v, e]] of Object.entries(GENRE_SCORES)) {
            if (gl.includes(key)) { vSum += v; eSum += e; count++; break; }
        }
    }
    if (count === 0) return { valence: 0.5, energy: 0.5, danceability: 0.5, acousticness: 0.5, instrumentalness: 0.0 };
    // acousticness: 장르에 'acoustic','folk','classical','jazz','blues' 포함 여부
    const acoustic = genres.some(g => /acoustic|folk|classical|jazz|blues|bossa|country|bluegrass/.test(g.toLowerCase())) ? 0.75 : 0.15;
    const instrumental = genres.some(g => /classical|orchestral|ambient|drone|instrumental/.test(g.toLowerCase())) ? 0.60 : 0.05;
    return {
        valence: vSum / count,
        energy: eSum / count,
        danceability: Math.min(1, (eSum / count) * 0.9 + 0.1),
        acousticness: acoustic,
        instrumentalness: instrumental,
    };
}

// 좋아요 트랙 오디오 피처 일괄 조회 (Taste Map용)
app.get('/api/me/liked-tracks-features', async (req, res) => {
    try {
        const profile = await getSpotifyUserProfile(req);
        const normalizedIds = normalizeIds(req.query.ids);
        const access = await getUserAccessToken(req);
        const headers = { Authorization: 'Bearer ' + access };
        const includeGenres = ['1', 'true', 'yes'].includes(String(req.query.includeGenres || '').toLowerCase());
        const cacheKey = buildTasteFeaturesCacheKey({
            userId: profile?.id || 'guest',
            includeGenres,
            ids: normalizedIds,
        });
        const cached = getTasteFeaturesCache(cacheKey);
        if (cached) {
            return res.json({
                ...cached,
                stats: {
                    ...(cached.stats || {}),
                    cacheHit: true,
                },
            });
        }

        let allTracks = [];
        // artistId 매핑도 함께 수집 (genre fallback용)
        const trackArtistIds = new Map(); // trackId → [artistId, ...]
        const trackPrimaryArtistId = new Map(); // trackId → primary artistId
        let totalAvailable = null;
        let mode = 'liked';
        const seenTrackIds = new Set();
        let likedFetchFailure = null;

        // ?ids= 파라미터가 있으면 (Favorites 모드) 해당 ID만 메타데이터 조회
        if (normalizedIds.length > 0) {
            mode = 'ids';
            const chunks = [];
            for (let i = 0; i < normalizedIds.length; i += 50) chunks.push(normalizedIds.slice(i, i + 50));
            for (const chunk of chunks) {
                try {
                    const data = await spotifyJsonWithRetry(
                        `https://api.spotify.com/v1/tracks?ids=${chunk.join(',')}&market=KR`,
                        { headers },
                        { label: 'Spotify track metadata lookup' },
                    );
                    (data.tracks || []).forEach(t => {
                        if (!t?.id) return;
                        if (seenTrackIds.has(t.id)) return;
                        seenTrackIds.add(t.id);
                        allTracks.push({ id: t.id, name: t.name, artists: (t.artists || []).map(a => a.name).join(', '), album: t.album?.name || '', coverUrl: t.album?.images?.[1]?.url || t.album?.images?.[0]?.url || null, durationMs: t.duration_ms || 0, popularity: t.popularity ?? null });
                        const artistIds = (t.artists || []).map(a => a.id).filter(Boolean);
                        trackArtistIds.set(t.id, artistIds);
                        trackPrimaryArtistId.set(t.id, artistIds[0] || null);
                    });
                } catch (e) {
                    if (!likedFetchFailure) {
                        likedFetchFailure = {
                            status: e.status || 502,
                            message: e.body || e.message || 'Spotify tracks lookup failed',
                        };
                    }
                }
            }
            totalAvailable = normalizedIds.length;
        } else {
            // Spotify 좋아요 트랙 전량 수집 (50개 페이지네이션)
            let offset = 0;
            let page = 0;
            const LIMIT = 50;
            while (page < 200) { // safety guard (max 10,000 tracks)
                let data;
                try {
                    data = await spotifyJsonWithRetry(
                        `https://api.spotify.com/v1/me/tracks?limit=${LIMIT}&offset=${offset}&market=KR`,
                        { headers },
                        { label: `Spotify liked tracks page offset ${offset}` },
                    );
                } catch (e) {
                    likedFetchFailure = {
                        status: e.status || 502,
                        message: e.body || e.message || `Spotify liked tracks fetch failed at offset ${offset}`,
                    };
                    break;
                }
                if (totalAvailable === null && Number.isFinite(data.total)) {
                    totalAvailable = data.total;
                }
                (data.items || []).forEach(item => {
                    const t = item.track;
                    if (!t?.id) return;
                    if (seenTrackIds.has(t.id)) return;
                    seenTrackIds.add(t.id);
                    allTracks.push({ id: t.id, name: t.name, artists: (t.artists || []).map(a => a.name).join(', '), album: t.album?.name || '', coverUrl: t.album?.images?.[1]?.url || t.album?.images?.[0]?.url || null, durationMs: t.duration_ms || 0, addedAt: item.added_at, popularity: t.popularity ?? null });
                    const artistIds = (t.artists || []).map(a => a.id).filter(Boolean);
                    trackArtistIds.set(t.id, artistIds);
                    trackPrimaryArtistId.set(t.id, artistIds[0] || null);
                });
                console.log(`[TasteMap] liked page offset ${offset}: +${(data.items || []).length} (${allTracks.length}/${totalAvailable ?? '?'})`);
                if (totalAvailable !== null && allTracks.length >= totalAvailable) break;
                if ((data.items || []).length < LIMIT) break;
                offset += LIMIT;
                page += 1;
            }
        }

        if (likedFetchFailure && (allTracks.length === 0 || (totalAvailable != null && allTracks.length < totalAvailable))) {
            const status = likedFetchFailure.status === 401 || likedFetchFailure.status === 403 ? 401 : 502;
            return res.status(status).json({
                error: likedFetchFailure.message || 'Failed to fetch liked tracks from Spotify.',
                spotifyStatus: likedFetchFailure.status || null,
                fetchedCount: allTracks.length,
                totalAvailable: totalAvailable ?? null,
            });
        }

        if (allTracks.length === 0) {
            const payload = {
                tracks: [],
                featuresSource: 'none',
                stats: {
                    mode,
                    fetchedCount: 0,
                    totalAvailable: totalAvailable ?? 0,
                    cacheHit: false,
                },
            };
            setTasteFeaturesCache(cacheKey, payload);
            return res.json(payload);
        }

        // 1) audio-features 시도 (Spotify 신규 앱에서는 deprecated)
        const featMap = new Map();
        let audioFeaturesUnavailable = false;
        const allTrackIds = allTracks.map(t => t.id);
        for (let i = 0; i < allTrackIds.length; i += 100) {
            if (audioFeaturesUnavailable) break;
            const chunk = allTrackIds.slice(i, i + 100);
            try {
                const featData = await spotifyJsonWithRetry(
                    `https://api.spotify.com/v1/audio-features?ids=${chunk.join(',')}`,
                    { headers },
                    { label: 'Spotify audio features lookup', retries: 2 },
                );
                (featData.audio_features || []).filter(Boolean).forEach(f => featMap.set(f.id, f));
            } catch (e) {
                if (e.status === 403) {
                    audioFeaturesUnavailable = true;
                    console.warn('[TasteMap] Spotify audio features unavailable (403); using artist genre fallback.');
                } else {
                    console.warn('[TasteMap] audio features chunk skipped:', e.status || '', e.message);
                }
            }
        }
        const audioFeatCount = featMap.size;

        // 2) 요청 시(또는 audio-features 누락 시) 아티스트 장르 조회
        let genreMap = new Map(); // artistId → genres[]
        const missingFeatureTrackIds = allTracks.filter(t => !featMap.has(t.id)).map(t => t.id);
        const genreTargetTrackIds = includeGenres ? allTrackIds : missingFeatureTrackIds;
        if (genreTargetTrackIds.length > 0) {
            const uniqueArtistIds = [...new Set(
                genreTargetTrackIds.flatMap(tid => trackArtistIds.get(tid) || []),
            )];
            if (uniqueArtistIds.length > 0) {
                const chunks = [];
                for (let i = 0; i < uniqueArtistIds.length; i += 50) chunks.push(uniqueArtistIds.slice(i, i + 50));
                for (const chunk of chunks) {
                    try {
                        const d = await spotifyJsonWithRetry(
                            `https://api.spotify.com/v1/artists?ids=${chunk.join(',')}`,
                            { headers },
                            { label: 'Spotify artists lookup' },
                        );
                        (d.artists || []).forEach(a => { if (a?.id) genreMap.set(a.id, a.genres || []); });
                    } catch (e) {
                        console.warn('[TasteMap] artist genre chunk skipped:', e.status || '', e.message);
                    }
                }
            }
        }

        // 3) 트랙 + 피처 병합
        const featuresSource = audioFeatCount > 0 ? 'audio' : (genreMap.size > 0 ? 'genre' : 'none');
        const tracks = allTracks.map(t => {
            const artistIds = trackArtistIds.get(t.id) || [];
            const primaryArtistId = trackPrimaryArtistId.get(t.id);
            const primaryGenres = primaryArtistId ? (genreMap.get(primaryArtistId) || []) : [];
            const fallbackGenres = artistIds.flatMap(aid => genreMap.get(aid) || []);
            // Prefer primary artist genres to avoid featured/remixer genres over-dominating.
            const genres = [...new Set((primaryGenres.length > 0 ? primaryGenres : fallbackGenres))];
            const f = featMap.get(t.id);
            if (f) {
                return {
                    ...t,
                    valence: f.valence,
                    energy: f.energy,
                    danceability: f.danceability,
                    acousticness: f.acousticness,
                    instrumentalness: f.instrumentalness,
                    tempo: f.tempo,
                    key: f.key,
                    mode: f.mode,
                    ...(includeGenres ? { genres } : {}),
                    featuresSource: 'audio',
                };
            }
            // genre fallback
            const proxy = genreProxy(genres);
            return { ...t, ...proxy, tempo: null, key: null, mode: null, genres, featuresSource: genres.length > 0 ? 'genre' : 'none' };
        });

        console.log(`[TasteMap] ${tracks.length} tracks | source: ${featuresSource} | audio: ${audioFeatCount} | total: ${totalAvailable ?? tracks.length}`);
        const payload = {
            tracks,
            featuresSource,
            stats: {
                mode,
                fetchedCount: tracks.length,
                totalAvailable: totalAvailable ?? tracks.length,
                audioFeatureCount: audioFeatCount,
                audioFeaturesUnavailable,
                includeGenres,
                cacheHit: false,
            },
        };
        setTasteFeaturesCache(cacheKey, payload);
        res.json(payload);
    } catch (e) {
        console.error('[Spotify] /api/me/liked-tracks-features error:', e.message);
        res.status(401).json({ error: e.message || 'Not logged in' });
    }
});

// Currently playing track (if any)
app.get('/api/me/now-playing', async (req, res) => {
    try {
        const access = await getUserAccessToken(req);
        const headers = { Authorization: 'Bearer ' + access };
        const nowRes = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
            headers,
        });

        if (nowRes.status === 204) {
            // No content = nothing is playing
            return res.json({ playing: false, track: null });
        }

        if (!nowRes.ok) {
            const txt = await nowRes.text();
            console.error('[Spotify] /api/me/now-playing error:', nowRes.status, txt);
            return res.status(nowRes.status).json({ error: 'Failed to fetch now playing' });
        }

        const data = await nowRes.json();
        if (!data || !data.item) {
            return res.json({ playing: false, track: null });
        }

        const t = data.item;
        const track = {
            id: t.id,
            name: t.name,
            artists: (t.artists || []).map((a) => a.name).join(', '),
            artistIds: (t.artists || []).map((a) => a.id).filter(Boolean),
            album: t.album?.name,
            albumId: t.album?.id || null,
            coverUrl: t.album?.images?.[0]?.url || null,
            durationMs: t.duration_ms,
            isPlaying: Boolean(data.is_playing),
            progressMs: data.progress_ms ?? null,
        };

        // Try to fetch audio features for tempo (BPM)
        try {
            const featRes = await fetch(`https://api.spotify.com/v1/audio-features/${track.id}`, { headers });
            if (featRes.ok) {
                const f = await featRes.json();
                track.tempo = f?.tempo || null;
                track.timeSignature = f?.time_signature || null;
            }
        } catch (e) {
            // Ignore feature fetch errors; tempo will just be null
        }

        res.json({ playing: Boolean(data.is_playing), track });
    } catch (e) {
        console.error('[Spotify] /api/me/now-playing error:', e.message);
        res.status(401).json({ error: e.message || 'Not logged in' });
    }
});

// Play a specific track from recommendations/search
app.post('/api/me/playback/play-track', async (req, res) => {
    try {
        const { trackId } = req.body || {};
        if (!trackId) {
            return res.status(400).json({ error: 'trackId is required' });
        }
        const access = await getUserAccessToken(req);
        const body = JSON.stringify({
            uris: [`spotify:track:${trackId}`],
        });
        const r = await fetch('https://api.spotify.com/v1/me/player/play', {
            method: 'PUT',
            headers: {
                Authorization: 'Bearer ' + access,
                'Content-Type': 'application/json',
            },
            body,
        });
        if (r.status !== 204 && !r.ok) {
            const txt = await r.text();
            console.error('[Spotify] /api/me/playback/play-track error:', r.status, txt);
            return res.status(r.status).json({ error: 'Failed to start track playback' });
        }
        res.json({ ok: true });
    } catch (e) {
        console.error('[Spotify] /api/me/playback/play-track error:', e.message);
        res.status(401).json({ error: e.message || 'Not logged in' });
    }
});

// 트랙을 내 Liked Songs에 저장
app.put('/api/me/library/save', async (req, res) => {
    try {
        const { trackId } = req.body || {};
        if (!trackId) return res.status(400).json({ error: 'trackId is required' });
        const access = await getUserAccessToken(req);
        const r = await fetch(`https://api.spotify.com/v1/me/tracks?ids=${encodeURIComponent(trackId)}`, {
            method: 'PUT',
            headers: { Authorization: 'Bearer ' + access },
        });
        if (r.status !== 200 && !r.ok) {
            const txt = await r.text();
            return res.status(r.status).json({ error: 'Failed to save track', detail: txt });
        }
        res.json({ ok: true });
    } catch (e) {
        console.error('[Spotify] /api/me/library/save error:', e.message);
        res.status(401).json({ error: e.message || 'Not logged in' });
    }
});

// Mood/energy/tempo 기반 추천 (Digging UI용)
app.get('/api/spotify/digging', async (req, res) => {
    try {
        const token = await getSpotifyToken();

        const {
            valence = '0.5',
            energy = '0.5',
            limit = '16',
            seedGenres = 'house,techno',
            seedArtists = '',
            seedTracks = '',
            market = 'KR',
            strangeness = '0.5',
        } = req.query;

        // Enrich recommendation/search tracks with audio features.
        // If audio-features are unavailable, fall back to genre proxy (or seed genre proxy).
        const enrichTracksWithFeatures = async (rawTracks) => {
            if (!Array.isArray(rawTracks) || rawTracks.length === 0) return [];

            const featMap = new Map();
            const ids = rawTracks.map((t) => t.id).filter(Boolean);
            for (let i = 0; i < ids.length; i += 100) {
                const chunk = ids.slice(i, i + 100);
                const featRes = await fetch(`https://api.spotify.com/v1/audio-features?ids=${chunk.join(',')}`, {
                    headers: { Authorization: 'Bearer ' + token },
                });
                if (!featRes.ok) continue;
                const featData = await featRes.json();
                (featData.audio_features || []).filter(Boolean).forEach((f) => featMap.set(f.id, f));
            }

            const missing = rawTracks.filter((t) => !featMap.has(t.id));
            const artistIds = [...new Set(
                missing.flatMap((t) => Array.isArray(t.artistIds) ? t.artistIds : []),
            )];
            const genreMap = new Map();
            for (let i = 0; i < artistIds.length; i += 50) {
                const chunk = artistIds.slice(i, i + 50);
                const artistRes = await fetch(`https://api.spotify.com/v1/artists?ids=${chunk.join(',')}`, {
                    headers: { Authorization: 'Bearer ' + token },
                });
                if (!artistRes.ok) continue;
                const artistData = await artistRes.json();
                (artistData.artists || []).forEach((a) => {
                    if (a?.id) genreMap.set(a.id, a.genres || []);
                });
            }

            const seedGenresList = String(seedGenres).split(',').map((s) => s.trim()).filter(Boolean);
            const seedProxy = genreProxy(seedGenresList);

            return rawTracks.map((track) => {
                const f = featMap.get(track.id);
                if (f) {
                    return {
                        ...track,
                        valence: f.valence,
                        energy: f.energy,
                        danceability: f.danceability,
                        acousticness: f.acousticness,
                        instrumentalness: f.instrumentalness,
                        tempo: f.tempo,
                        key: f.key,
                        mode: f.mode,
                        featuresSource: 'audio',
                    };
                }
                const genres = [...new Set((track.artistIds || []).flatMap((artistId) => genreMap.get(artistId) || []))];
                const proxy = genres.length > 0 ? genreProxy(genres) : seedProxy;
                return {
                    ...track,
                    ...proxy,
                    tempo: null,
                    key: null,
                    mode: null,
                    genres,
                    featuresSource: genres.length > 0 ? 'genre' : 'seed',
                };
            });
        };

        // Build fallback tracks via search when recommendations API fails or returns 0 items.
        const buildFallbackTracks = async () => {
            const v = parseFloat(valence);
            const e = parseFloat(energy);
            const moodKeywords = [];
            if (!Number.isNaN(v)) {
                if (v < 0.3) moodKeywords.push('dark');
                else if (v > 0.7) moodKeywords.push('happy');
            }
            if (!Number.isNaN(e)) {
                if (e < 0.3) moodKeywords.push('chill');
                else if (e > 0.7) moodKeywords.push('energetic');
            }

            const genreTokens = String(seedGenres).split(',').map((s) => s.trim()).filter(Boolean);
            const seedGenreForQuery = genreTokens[0] || 'electronic';
            const searchGenre = seedGenreForQuery.replace(/-/g, ' ');
            const moodPart = moodKeywords.join(' ');
            const qParts = [];
            qParts.push(`genre:\"${searchGenre}\"`);
            if (moodPart) qParts.push(moodPart);
            const q = qParts.join(' ');

            const baseSearchParams = new URLSearchParams({
                q,
                type: 'track',
                limit: '50',
                offset: '0',
                market: String(market),
            });
            let searchRes = await fetch('https://api.spotify.com/v1/search?' + baseSearchParams, {
                headers: { Authorization: 'Bearer ' + token },
            });
            if (!searchRes.ok) {
                const err2 = await searchRes.text();
                throw new Error('Spotify recommendations fallback: ' + err2);
            }
            let data = await searchRes.json();
            let items = data.tracks?.items || [];

            if (items.length < 5 && moodKeywords.length > 0) {
                const relaxedQ = `genre:\"${searchGenre}\"`;
                const relaxedParams = new URLSearchParams({
                    q: relaxedQ,
                    type: 'track',
                    limit: '50',
                    offset: '0',
                    market: String(market),
                });
                searchRes = await fetch('https://api.spotify.com/v1/search?' + relaxedParams, {
                    headers: { Authorization: 'Bearer ' + token },
                });
                if (searchRes.ok) {
                    data = await searchRes.json();
                    items = data.tracks?.items || items;
                }
            }

            const total = data.tracks?.total ?? items.length ?? 0;
            if (total > 50) {
                const searchLimit = 50;
                const maxOffset = Math.max(0, Math.min(total - searchLimit, 1000 - searchLimit));
                const randomOffset = Math.floor(Math.random() * (maxOffset + 1));
                const randomParams = new URLSearchParams({
                    q,
                    type: 'track',
                    limit: String(searchLimit),
                    offset: String(randomOffset),
                    market: String(market),
                });
                const randomRes = await fetch('https://api.spotify.com/v1/search?' + randomParams, {
                    headers: { Authorization: 'Bearer ' + token },
                });
                if (randomRes.ok) {
                    const randomData = await randomRes.json();
                    const randomItems = randomData.tracks?.items || [];
                    if (randomItems.length > 0) {
                        items = randomItems;
                    }
                }
            }

            for (let i = items.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [items[i], items[j]] = [items[j], items[i]];
            }

            const visible = Number(limit) || 12;
            const sliced = items.slice(0, visible);
            return sliced.map((t) => ({
                id: t.id,
                name: t.name,
                artists: (t.artists || []).map((a) => a.name).join(', '),
                artistIds: (t.artists || []).map((a) => a.id).filter(Boolean),
                album: t.album?.name,
                albumId: t.album?.id || null,
                url: t.preview_url || null,
                coverUrl: t.album?.images?.[0]?.url || null,
                durationMs: t.duration_ms,
                popularity: t.popularity ?? null,
            }));
        };

        // Build Spotify recommendation seeds (max 5 total: genres + artists + tracks)
        const trackTokens  = String(seedTracks).split(',').map(s => s.trim()).filter(Boolean).slice(0, 1);
        const artistTokens = String(seedArtists).split(',').map(s => s.trim()).filter(Boolean).slice(0, Math.max(1, 2 - trackTokens.length));
        const genreTokens  = String(seedGenres).split(',').map(s => s.trim()).filter(Boolean)
            .slice(0, Math.max(1, 5 - artistTokens.length - trackTokens.length));

        const params = new URLSearchParams({
            seed_genres: genreTokens.join(','),
            target_valence: String(valence),
            target_energy: String(energy),
            limit: String(limit),
            market: String(market)
        });
        if (artistTokens.length) params.set('seed_artists', artistTokens.join(','));
        if (trackTokens.length)  params.set('seed_tracks',  trackTokens.join(','));

        let apiRes = await fetch('https://api.spotify.com/v1/recommendations?' + params, {
            headers: { Authorization: 'Bearer ' + token },
        });
        if (!apiRes.ok) {
            const errText = await apiRes.text();
            console.warn('[Spotify] recommendations failed, falling back to search:', apiRes.status, errText);
            const tracks = await enrichTracksWithFeatures(await buildFallbackTracks());
            return res.json({ tracks });
        }
        const data = await apiRes.json();
        let tracks = (data.tracks || []).map((t) => ({
            id: t.id,
            name: t.name,
            artists: (t.artists || []).map((a) => a.name).join(', '),
            artistIds: (t.artists || []).map((a) => a.id).filter(Boolean),
            album: t.album?.name,
            albumId: t.album?.id || null,
            url: t.preview_url || null,
            coverUrl: t.album?.images?.[0]?.url || null,
            durationMs: t.duration_ms,
            popularity: t.popularity ?? null,
        }));
        // recommendations 성공해도 0건일 때는 fallback 검색 사용
        if (!tracks.length) {
            try {
                tracks = await buildFallbackTracks();
            } catch (fallbackErr) {
                console.warn('[Spotify] recommendations empty; fallback failed:', fallbackErr.message);
            }
        }
        const enriched = await enrichTracksWithFeatures(tracks);
        res.json({ tracks: enriched });
    } catch (e) {
        console.error('[Spotify] digging error:', e.message);
        res.status(500).json({ error: e.message || 'Spotify digging failed' });
    }
});


// ---------- WebSocket relay (mobile ⇄ desktop taste-map sync) ----------

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // allow any origin during development
        methods: ["GET", "POST"]
    }
});

// Share the express-session with Socket.IO
io.use((socket, next) => {
    sessionMiddleware(socket.request, socket.request.res || {}, next);
});

io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Relay control messages (e.g. taste-map-expand / taste-map-plan-add)
    // between the mobile companion view and the desktop Taste Map.
    socket.on('control', (data) => {
        socket.broadcast.emit('control', data);
    });

    socket.on('disconnect', () => {
        console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
});

// SPA static serving (so direct access like /taste-map works on :3001)
if (existsSync(CLIENT_INDEX_PATH)) {
    app.use(express.static(CLIENT_DIST_DIR, {
        index: false,
        maxAge: isProd ? '1h' : 0,
    }));

    // Client-side routes fallback (exclude API/Auth/Socket paths)
    app.get(/^\/(?!api\/|auth\/|socket\.io\/).*/, (req, res, next) => {
        if (req.method !== 'GET') return next();
        if (req.path.includes('.')) return next(); // skip asset-like paths
        return res.sendFile(CLIENT_INDEX_PATH);
    });
} else {
    console.warn('[Web] dist/index.html not found. Build client first (`npm run build`) to enable direct route access on :3001.');
}

const PORT = process.env.PORT || 3001;
// Bind to all interfaces by default so mobile/LAN devices can reach the dev server.
// Use HOST=127.0.0.1 if you want to keep it loopback-only.
const HOST = process.env.HOST || '0.0.0.0';
const DISABLE_SERVER = process.env.DISABLE_SERVER === '1';

httpServer.on('error', (err) => {
    if (err.code === 'EPERM') {
        console.error(`[Socket] Listen blocked by environment (EPERM) on ${HOST}:${PORT}. Set DISABLE_SERVER=1 to suppress listen in restricted sandboxes.`);
        return;
    }
    throw err;
});

if (DISABLE_SERVER) {
    console.warn('[Socket] DISABLE_SERVER=1 — skipping listen() (useful in restricted environments)');
} else {
    httpServer.listen(PORT, HOST, () => {
        console.log(`[Socket] Server listening on ${HOST}:${PORT}`);
    });
}
