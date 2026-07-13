import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import {
    getTrackInfo,
    getArtistTopTags,
    getSimilarTracks,
    getTagTopTracks,
    mapLimit,
    isLastfmConfigured,
} from './src/server/lastfm.js';

const CLIENT_APP_ORIGIN = process.env.CLIENT_APP_ORIGIN || 'http://localhost:5173';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_DIST_DIR = path.join(__dirname, 'dist');
const CLIENT_INDEX_PATH = path.join(CLIENT_DIST_DIR, 'index.html');

const ENRICH_MAX_TRACKS = Number(process.env.ENRICH_MAX_TRACKS || 1500);
const HANDOFF_TTL_MS = Number(process.env.HANDOFF_TTL_MS || 6 * 60 * 60 * 1000);
const handoffStore = new Map(); // mapId -> { updatedAt, payload }

const isProd = process.env.NODE_ENV === 'production';

const app = express();
app.set('trust proxy', 1);

// ---------- CORS (same-origin + local network for the mobile companion) ----------

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
app.use(express.json({ limit: '8mb' }));

// ---------- Tag → audio-feature estimation ----------
//
// Last.fm gives community *tags* (genre + mood) but no audio features. We map those
// tags into the same [valence, energy, danceability, acousticness, instrumentalness]
// space the taste map already clusters on.

const GENRE_SCORES = {
    'techno':           [0.35, 0.90], 'tech house':      [0.55, 0.82],
    'house':            [0.65, 0.72], 'deep house':      [0.58, 0.62],
    'minimal techno':   [0.40, 0.65], 'acid house':      [0.50, 0.80],
    'drum and bass':    [0.48, 0.95], 'jungle':          [0.52, 0.92],
    'dubstep':          [0.42, 0.88], 'trap':            [0.38, 0.80],
    'ambient':          [0.55, 0.12], 'dark ambient':    [0.20, 0.10],
    'drone':            [0.32, 0.08], 'new age':         [0.65, 0.10],
    'lo-fi':            [0.58, 0.22], 'lofi':            [0.58, 0.22], 'chillwave': [0.62, 0.28],
    'hip hop':          [0.48, 0.65], 'hip-hop':         [0.48, 0.65], 'rap': [0.42, 0.70],
    'r&b':              [0.68, 0.52], 'rnb':             [0.68, 0.52], 'soul': [0.72, 0.48],
    'jazz':             [0.65, 0.38], 'blues':           [0.42, 0.45],
    'bossa nova':       [0.75, 0.30], 'latin':           [0.78, 0.70],
    'pop':              [0.76, 0.65], 'dance pop':       [0.80, 0.78],
    'k-pop':            [0.78, 0.75], 'kpop':            [0.78, 0.75], 'j-pop': [0.75, 0.70],
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
    'gospel':           [0.80, 0.60], 'shoegaze':        [0.45, 0.55],
    'post-rock':        [0.45, 0.55], 'soundtrack':      [0.50, 0.40],
    'singer-songwriter': [0.55, 0.35], 'emo': [0.35, 0.70],
};

// Mood tags — Last.fm surfaces these heavily and they sharpen valence/energy.
const MOOD_SCORES = {
    'happy':       [0.85, 0.60], 'sad':         [0.20, 0.35],
    'melancholic': [0.25, 0.30], 'melancholy':  [0.25, 0.30],
    'chillout':    [0.55, 0.20], 'chill':       [0.55, 0.25],
    'relaxing':    [0.60, 0.20], 'relax':       [0.60, 0.20],
    'mellow':      [0.55, 0.30], 'calm':        [0.60, 0.20],
    'energetic':   [0.65, 0.90], 'upbeat':      [0.80, 0.75],
    'dark':        [0.25, 0.55], 'dreamy':      [0.55, 0.35],
    'aggressive':  [0.30, 0.95], 'angry':       [0.20, 0.90],
    'romantic':    [0.70, 0.40], 'sexy':        [0.65, 0.55],
    'party':       [0.80, 0.85], 'peaceful':    [0.60, 0.15],
    'uplifting':   [0.80, 0.70], 'nostalgic':   [0.45, 0.40],
    'emotional':   [0.40, 0.45], 'moody':       [0.35, 0.40],
    'feel good':   [0.85, 0.65], 'summer':      [0.80, 0.65],
    'sentimental': [0.40, 0.35], 'atmospheric': [0.45, 0.30],
};

const TAG_SCORES = { ...GENRE_SCORES, ...MOOD_SCORES };
const TAG_SCORE_ENTRIES = Object.entries(TAG_SCORES);

const NEUTRAL_FEATURES = {
    valence: 0.5,
    energy: 0.5,
    danceability: 0.5,
    acousticness: 0.5,
    instrumentalness: 0.0,
};

// Map a set of Last.fm tags → audio-feature estimates. Returns { ...features, matched }.
function tagsToFeatures(tags) {
    if (!Array.isArray(tags) || tags.length === 0) {
        return { ...NEUTRAL_FEATURES, matched: 0 };
    }
    let vSum = 0;
    let eSum = 0;
    let count = 0;
    for (const tag of tags) {
        const gl = String(tag).toLowerCase();
        for (const [key, [v, e]] of TAG_SCORE_ENTRIES) {
            if (gl.includes(key)) { vSum += v; eSum += e; count++; break; }
        }
    }
    if (count === 0) {
        return { ...NEUTRAL_FEATURES, matched: 0 };
    }
    const valence = vSum / count;
    const energy = eSum / count;
    const acoustic = tags.some((t) => /acoustic|folk|classical|jazz|blues|bossa|country|bluegrass|singer-songwriter|piano/.test(String(t).toLowerCase())) ? 0.75 : 0.15;
    const instrumental = tags.some((t) => /instrumental|classical|orchestral|ambient|drone|post-rock|soundtrack/.test(String(t).toLowerCase())) ? 0.60 : 0.05;
    return {
        valence,
        energy,
        danceability: Math.min(1, energy * 0.9 + 0.1),
        acousticness: acoustic,
        instrumentalness: instrumental,
        matched: count,
    };
}

function slugId(artist, title) {
    const hash = crypto.createHash('sha1').update(`${artist}|${title}`.toLowerCase()).digest('base64url');
    return `lf_${hash.slice(0, 16)}`;
}

function playcountToPopularity(playcount) {
    const n = Number(playcount) || 0;
    if (n <= 0) return null;
    return Math.round(Math.min(100, Math.log10(n + 1) * 12));
}

function externalSearchUrl(artist, title) {
    const q = encodeURIComponent(`${artist} ${title}`.trim());
    return `https://open.spotify.com/search/${q}`;
}

// ---------- POST /api/taste/enrich — core taste-map data source ----------
//
// Body: { tracks: [{ artist, title, album?, addedAt? }], includeGenres? }
// Returns the same shape the old /api/me/liked-tracks-features did, so the taste
// map front-end consumes it unchanged.

app.post('/api/taste/enrich', async (req, res) => {
    if (!isLastfmConfigured()) {
        return res.status(503).json({ error: 'LASTFM_API_KEY is not configured on the server.' });
    }
    const input = Array.isArray(req.body?.tracks) ? req.body.tracks : null;
    if (!input) {
        return res.status(400).json({ error: 'Body must include a tracks array.' });
    }

    // Normalize + dedupe input.
    const seen = new Set();
    const items = [];
    for (const raw of input) {
        const artist = String(raw?.artist || '').trim();
        const title = String(raw?.title || raw?.name || '').trim();
        if (!artist || !title) continue;
        const key = `${artist}|${title}`.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        items.push({
            artist,
            title,
            album: raw?.album ? String(raw.album).trim() : '',
            addedAt: raw?.addedAt ?? null,
        });
        if (items.length >= ENRICH_MAX_TRACKS) break;
    }

    if (items.length === 0) {
        return res.json({
            tracks: [],
            featuresSource: 'none',
            stats: { fetchedCount: 0, totalAvailable: input.length, matchedCount: 0, taggedCount: 0 },
        });
    }

    const artistTagCache = new Map(); // artist(lower) -> tags[]
    let taggedCount = 0;
    let matchedCount = 0;

    const enriched = await mapLimit(items, 5, async (item) => {
        const info = await getTrackInfo(item.artist, item.title);
        let tags = info?.tags || [];
        // Fallback to artist tags when the track itself has no tags.
        if (tags.length === 0) {
            const ak = item.artist.toLowerCase();
            if (artistTagCache.has(ak)) {
                tags = artistTagCache.get(ak);
            } else {
                tags = await getArtistTopTags(item.artist);
                artistTagCache.set(ak, tags);
            }
        }
        if (tags.length > 0) taggedCount += 1;
        const feat = tagsToFeatures(tags);
        if (feat.matched > 0) matchedCount += 1;
        const displayArtist = info?.artist || item.artist;
        const displayName = info?.name || item.title;
        return {
            id: info?.mbid || slugId(displayArtist, displayName),
            name: displayName,
            artists: displayArtist,
            album: info?.album || item.album || '',
            coverUrl: info?.coverUrl || null,
            durationMs: info?.durationMs || 0,
            addedAt: item.addedAt,
            popularity: playcountToPopularity(info?.playcount),
            valence: feat.valence,
            energy: feat.energy,
            danceability: feat.danceability,
            acousticness: feat.acousticness,
            instrumentalness: feat.instrumentalness,
            tempo: null,
            key: null,
            mode: null,
            genres: tags.slice(0, 8),
            externalUrl: externalSearchUrl(displayArtist, displayName),
            featuresSource: tags.length > 0 ? 'lastfm' : 'none',
        };
    });

    // Dedupe again by resolved id (autocorrect can collapse two inputs to one track).
    const outSeen = new Set();
    const tracks = [];
    for (const t of enriched) {
        if (!t || outSeen.has(t.id)) continue;
        outSeen.add(t.id);
        tracks.push(t);
    }

    const featuresSource = matchedCount > 0 ? 'lastfm' : (taggedCount > 0 ? 'lastfm' : 'none');
    console.log(`[TasteMap] enriched ${tracks.length}/${items.length} | tagged: ${taggedCount} | matched: ${matchedCount}`);
    res.json({
        tracks,
        featuresSource,
        stats: {
            fetchedCount: tracks.length,
            totalAvailable: input.length,
            taggedCount,
            matchedCount,
            cacheHit: false,
        },
    });
});

// ---------- GET /api/discover — Last.fm-backed Digging / discovery ----------
//
// Query: xAxis, yAxis, targetX, targetY, seedGenres (csv),
// seedTracks ("artist|title;artist|title"), limit.
// `valence` / `energy` remain accepted as backwards-compatible target aliases.

app.get('/api/discover', async (req, res) => {
    if (!isLastfmConfigured()) {
        return res.status(503).json({ error: 'LASTFM_API_KEY is not configured on the server.' });
    }
    try {
        const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 16));
        const featureKeys = new Set([
            'valence',
            'energy',
            'danceability',
            'acousticness',
            'instrumentalness',
        ]);
        const xAxis = featureKeys.has(String(req.query.xAxis)) ? String(req.query.xAxis) : 'valence';
        const yAxis = featureKeys.has(String(req.query.yAxis)) ? String(req.query.yAxis) : 'energy';
        const toTarget = (value, fallback = 0.5) => {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : fallback;
        };
        const targetX = toTarget(req.query.targetX ?? req.query.valence);
        const targetY = toTarget(req.query.targetY ?? req.query.energy);
        const seedGenres = String(req.query.seedGenres || '')
            .split(',').map((s) => s.trim()).filter(Boolean);
        const seedTracks = String(req.query.seedTracks || '')
            .split(';').map((s) => s.trim()).filter(Boolean)
            .map((pair) => {
                const [artist, title] = pair.split('|').map((v) => (v || '').trim());
                return artist && title ? { artist, title } : null;
            })
            .filter(Boolean)
            .slice(0, 5);

        // Collect candidate {artist, title} from similar tracks and/or tag top tracks.
        const candidates = [];
        const candSeen = new Set();
        const pushCand = (artist, title, coverUrl) => {
            if (!artist || !title) return;
            const k = `${artist}|${title}`.toLowerCase();
            if (candSeen.has(k)) return;
            candSeen.add(k);
            candidates.push({ artist, title, coverUrl: coverUrl || null });
        };

        if (seedTracks.length > 0) {
            const perSeed = Math.ceil((limit * 2) / seedTracks.length);
            const sims = await mapLimit(seedTracks, 3, (s) => getSimilarTracks(s.artist, s.title, perSeed));
            for (const list of sims) {
                for (const t of list || []) pushCand(t.artist, t.name, t.coverUrl);
            }
        }
        if (candidates.length < limit && seedGenres.length > 0) {
            const perTag = Math.ceil((limit * 2) / seedGenres.length);
            const tops = await mapLimit(seedGenres, 3, (g) => getTagTopTracks(g, perTag));
            for (const list of tops) {
                for (const t of list || []) pushCand(t.artist, t.name, t.coverUrl);
            }
        }
        if (candidates.length === 0) {
            const fallback = await getTagTopTracks(seedGenres[0] || 'electronic', limit * 2);
            for (const t of fallback || []) pushCand(t.artist, t.name, t.coverUrl);
        }

        const picked = candidates.slice(0, limit * 2);
        const enriched = await mapLimit(picked, 5, async (c) => {
            const info = await getTrackInfo(c.artist, c.title);
            let tags = info?.tags || [];
            if (tags.length === 0) tags = await getArtistTopTags(c.artist);
            const feat = tagsToFeatures(tags);
            const displayArtist = info?.artist || c.artist;
            const displayName = info?.name || c.title;
            return {
                id: info?.mbid || slugId(displayArtist, displayName),
                name: displayName,
                artists: displayArtist,
                album: info?.album || '',
                coverUrl: info?.coverUrl || c.coverUrl || null,
                valence: feat.valence,
                energy: feat.energy,
                danceability: feat.danceability,
                acousticness: feat.acousticness,
                instrumentalness: feat.instrumentalness,
                tempo: null,
                genres: tags.slice(0, 8),
                externalUrl: externalSearchUrl(displayArtist, displayName),
                featuresSource: tags.length > 0 ? 'lastfm' : 'none',
            };
        });

        // The Last.fm calls above decide the semantic candidate pool. Rank that
        // pool against the axes the user is actually looking at so the visible
        // discovery position and the recommendation order stay aligned.
        enriched.sort((a, b) => {
            const distanceFor = (track) => {
                const dx = (Number(track?.[xAxis]) || 0) - targetX;
                const dy = (Number(track?.[yAxis]) || 0) - targetY;
                return dx * dx + dy * dy;
            };
            return distanceFor(a) - distanceFor(b);
        });

        const outSeen = new Set();
        const tracks = [];
        for (const t of enriched) {
            if (!t || outSeen.has(t.id)) continue;
            outSeen.add(t.id);
            tracks.push(t);
            if (tracks.length >= limit) break;
        }
        res.json({
            tracks,
            seed: {
                seedGenres,
                seedTracks,
                axes: { xAxis, yAxis, targetX, targetY },
            },
        });
    } catch (e) {
        console.error('[Discover] error:', e.message);
        res.status(502).json({ error: e.message || 'Discovery failed' });
    }
});

// ---------- Mobile companion handoff (taste-by-id) ----------
//
// The desktop pushes its enriched taste under a random mapId; the mobile companion
// (reached via QR / ?map=<id>) reads it back. Replaces the old Spotify-session bridge.

function pruneHandoffStore() {
    const now = Date.now();
    for (const [id, entry] of handoffStore.entries()) {
        if (!entry || entry.updatedAt + HANDOFF_TTL_MS <= now) {
            handoffStore.delete(id);
        }
    }
}

function isValidMapId(id) {
    return typeof id === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(id);
}

function sanitizeHandoffTrack(t) {
    if (!t || !t.id) return null;
    return {
        id: String(t.id),
        name: String(t.name || ''),
        artists: String(t.artists || ''),
        album: t.album ? String(t.album) : '',
        coverUrl: t.coverUrl ? String(t.coverUrl) : null,
        durationMs: Number(t.durationMs) || 0,
        addedAt: t.addedAt ?? null,
        popularity: t.popularity ?? null,
        valence: Number(t.valence),
        energy: Number(t.energy),
        danceability: Number(t.danceability),
        acousticness: Number(t.acousticness),
        instrumentalness: Number(t.instrumentalness),
        tempo: t.tempo ?? null,
        genres: Array.isArray(t.genres) ? t.genres.slice(0, 8).map(String) : [],
        externalUrl: t.externalUrl ? String(t.externalUrl) : null,
        featuresSource: t.featuresSource ? String(t.featuresSource) : 'lastfm',
    };
}

app.post('/api/taste/handoff', (req, res) => {
    pruneHandoffStore();
    const mapId = req.body?.mapId;
    if (!isValidMapId(mapId)) {
        return res.status(400).json({ error: 'Invalid mapId.' });
    }
    const rawTracks = Array.isArray(req.body?.tracks) ? req.body.tracks : [];
    const tracks = rawTracks.map(sanitizeHandoffTrack).filter(Boolean).slice(0, ENRICH_MAX_TRACKS);
    if (tracks.length === 0) {
        return res.status(400).json({ error: 'No tracks to hand off.' });
    }
    const payload = {
        tracks,
        featuresSource: req.body?.featuresSource ? String(req.body.featuresSource) : 'lastfm',
        profileName: req.body?.profileName ? String(req.body.profileName).slice(0, 60) : null,
        desktopHandoff: req.body?.desktopHandoff && typeof req.body.desktopHandoff === 'object'
            ? req.body.desktopHandoff
            : null,
        updatedAt: Date.now(),
    };
    handoffStore.set(mapId, { updatedAt: payload.updatedAt, payload });
    res.json({ ok: true, mapId, updatedAt: payload.updatedAt });
});

app.get('/api/taste/handoff/:mapId', (req, res) => {
    pruneHandoffStore();
    const { mapId } = req.params;
    if (!isValidMapId(mapId)) {
        return res.status(400).json({ error: 'Invalid mapId.' });
    }
    const entry = handoffStore.get(mapId);
    if (!entry) {
        return res.status(404).json({ error: 'Handoff not found or expired.' });
    }
    res.json(entry.payload);
});

// ---------- Socket.IO relay (mobile companion ↔ desktop, broadcast) ----------

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: (origin, callback) => callback(null, isAllowedCorsOrigin(origin)),
        credentials: true,
    },
});

io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Relay control messages (e.g. taste-map-expand / taste-map-plan-add)
    // between the mobile companion view and the desktop Taste Map.
    socket.on('control', (data) => {
        socket.broadcast.emit('control', data);
    });

    socket.on('spectrum', (data) => {
        socket.broadcast.emit('spectrum', data);
    });

    socket.on('disconnect', () => {
        console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
});

// ---------- SPA static serving (so /taste-map works when served from :3001) ----------

if (existsSync(CLIENT_INDEX_PATH)) {
    app.use(express.static(CLIENT_DIST_DIR, {
        index: false,
        maxAge: isProd ? '1h' : 0,
    }));

    app.get(/^\/(?!api\/|socket\.io\/).*/, (req, res, next) => {
        if (req.method !== 'GET') return next();
        if (req.path.includes('.')) return next(); // skip asset-like paths
        return res.sendFile(CLIENT_INDEX_PATH);
    });
} else {
    console.warn('[Web] dist/index.html not found. Build client first (`npm run build`) to enable direct route access on :3001.');
}

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const DISABLE_SERVER = process.env.DISABLE_SERVER === '1';

httpServer.on('error', (err) => {
    if (err.code === 'EPERM') {
        console.error(`[Socket] Listen blocked by environment (EPERM) on ${HOST}:${PORT}. Set DISABLE_SERVER=1 to suppress listen in restricted sandboxes.`);
        return;
    }
    throw err;
});

if (!isLastfmConfigured()) {
    console.warn('[Last.fm] LASTFM_API_KEY not set — /api/taste/enrich and /api/discover will return 503. Add it to .env.');
}

if (DISABLE_SERVER) {
    console.warn('[Socket] DISABLE_SERVER=1 — skipping listen() (useful in restricted environments)');
} else {
    httpServer.listen(PORT, HOST, () => {
        console.log(`[Socket] Server listening on ${HOST}:${PORT}`);
    });
}
