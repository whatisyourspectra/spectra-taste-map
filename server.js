import 'dotenv/config';
import express from 'express';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_DIST_DIR = path.join(__dirname, 'dist');
const CLIENT_INDEX_PATH = path.join(CLIENT_DIST_DIR, 'index.html');
const isDirectRun = Boolean(process.argv[1]) && path.resolve(process.argv[1]) === __filename;

const ENRICH_MAX_TRACKS = Number(process.env.ENRICH_MAX_TRACKS || 1500);

const isProd = process.env.NODE_ENV === 'production';

const app = express();
app.set('trust proxy', 1);

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

// ---------- SPA static serving (so /taste-map works when served from :3001) ----------

if (isDirectRun && existsSync(CLIENT_INDEX_PATH)) {
    app.use(express.static(CLIENT_DIST_DIR, {
        index: false,
        maxAge: isProd ? '1h' : 0,
    }));

    app.get(/^\/(?!api\/).*/, (req, res, next) => {
        if (req.method !== 'GET') return next();
        if (req.path.includes('.')) return next(); // skip asset-like paths
        return res.sendFile(CLIENT_INDEX_PATH);
    });
} else if (isDirectRun) {
    console.warn('[Web] dist/index.html not found. Build client first (`npm run build`) to enable direct route access on :3001.');
}

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const DISABLE_SERVER = process.env.DISABLE_SERVER === '1';

if (!isLastfmConfigured()) {
    console.warn('[Last.fm] LASTFM_API_KEY not set — /api/taste/enrich and /api/discover will return 503. Add it to .env.');
}

if (isDirectRun) {
    if (DISABLE_SERVER) {
        console.warn('[Server] DISABLE_SERVER=1 — skipping listen() (useful in restricted environments)');
    } else {
        const server = app.listen(PORT, HOST, () => {
            console.log(`[Server] Listening on ${HOST}:${PORT}`);
        });
        server.on('error', (err) => {
            if (err.code === 'EPERM') {
                console.error(`[Server] Listen blocked by environment (EPERM) on ${HOST}:${PORT}. Set DISABLE_SERVER=1 to suppress listen in restricted sandboxes.`);
                return;
            }
            throw err;
        });
    }
}

export default app;
