import 'dotenv/config';
import express from 'express';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import {
    getTrackInfo as getSpotifyTrackInfo,
    getArtistGenres,
    searchTracks,
    mapLimit,
    isSpotifyConfigured,
} from './src/server/spotify.js';
import {
    getTrackInfo as getLastfmTrackInfo,
    getArtistTopTags,
    getSimilarTracks,
    getTagTopTracks,
    isLastfmConfigured,
} from './src/server/lastfm.js';
import {
    isYouTubeConfigured,
    searchYouTubeTrack,
} from './src/server/youtube.js';

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

function asyncRoute(handler) {
    return (req, res, next) => {
        Promise.resolve(handler(req, res, next)).catch(next);
    };
}

// ---------- Spotify genre → audio-feature estimation ----------
//
// Spotify Audio Features are unavailable to this Development Mode app. Public
// artist genres remain available through Client Credentials, so we map those
// genres into the [valence, energy, danceability, acousticness, instrumentalness]
// space the taste map clusters on.

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

// Mood-like genre labels occasionally appear in Spotify's artist genres too.
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

// Map a set of Spotify artist genres → audio-feature estimates.
function genresToFeatures(genres) {
    if (!Array.isArray(genres) || genres.length === 0) {
        return { ...NEUTRAL_FEATURES, matched: 0 };
    }
    let vSum = 0;
    let eSum = 0;
    let count = 0;
    for (const genre of genres) {
        const gl = String(genre).toLowerCase();
        for (const [key, [v, e]] of TAG_SCORE_ENTRIES) {
            if (gl.includes(key)) { vSum += v; eSum += e; count++; break; }
        }
    }
    if (count === 0) {
        return { ...NEUTRAL_FEATURES, matched: 0 };
    }
    const valence = vSum / count;
    const energy = eSum / count;
    const acoustic = genres.some((genre) => /acoustic|folk|classical|jazz|blues|bossa|country|bluegrass|singer-songwriter|piano/.test(String(genre).toLowerCase())) ? 0.75 : 0.15;
    const instrumental = genres.some((genre) => /instrumental|classical|orchestral|ambient|drone|post-rock|soundtrack/.test(String(genre).toLowerCase())) ? 0.60 : 0.05;
    return {
        valence,
        energy,
        danceability: Math.min(1, energy * 0.9 + 0.1),
        acousticness: acoustic,
        instrumentalness: instrumental,
        matched: count,
    };
}

const tagsToFeatures = genresToFeatures;

function slugId(artist, title) {
    const hash = crypto.createHash('sha1').update(`${artist}|${title}`.toLowerCase()).digest('base64url');
    return `sp_${hash.slice(0, 16)}`;
}

function externalSearchUrl(artist, title) {
    const q = encodeURIComponent(`${artist} ${title}`.trim());
    return `https://open.spotify.com/search/${q}`;
}

// ---------- GET /api/youtube/search — server-side video resolution ----------
//
// Query: ?artist=...&title=...
// Returns one embeddable YouTube video candidate. The API key stays server-side.

app.get('/api/youtube/search', asyncRoute(async (req, res) => {
    if (!isYouTubeConfigured()) {
        return res.status(503).json({
            code: 'YOUTUBE_NOT_CONFIGURED',
            error: 'YOUTUBE_API_KEY is not configured on the server.',
        });
    }
    const artist = String(req.query.artist || '').trim();
    const title = String(req.query.title || '').trim();
    if (!artist || !title) {
        return res.status(400).json({
            code: 'INVALID_TRACK',
            error: 'artist and title are required.',
        });
    }
    try {
        const video = await searchYouTubeTrack(artist, title);
        return res.json({ video });
    } catch (error) {
        const status = Number.isInteger(error?.status) ? error.status : 502;
        return res.status(status).json({
            code: error?.code || 'YOUTUBE_SEARCH_FAILED',
            error: error?.message || 'YouTube search failed.',
        });
    }
}));

// ---------- POST /api/taste/enrich — core taste-map data source ----------
//
// Body: { tracks: [{ artist, title, album?, addedAt? }], includeGenres? }
// Returns the same shape the old /api/me/liked-tracks-features did, so the taste
// map front-end consumes it unchanged.

app.post('/api/taste/enrich', asyncRoute(async (req, res) => {
    if (!isSpotifyConfigured()) {
        return res.status(503).json({ error: 'SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are not configured on the server.' });
    }
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
            stats: {
                fetchedCount: 0,
                totalAvailable: input.length,
                spotifyMatchedCount: 0,
                lastfmTaggedCount: 0,
                lastfmMatchedCount: 0,
                spotifyGenreCount: 0,
                spotifyErrorCount: 0,
            },
        });
    }

    const artistTagCache = new Map();
    let spotifyMatchedCount = 0;
    let lastfmTaggedCount = 0;
    let lastfmMatchedCount = 0;
    let spotifyGenreCount = 0;
    let spotifyErrorCount = 0;
    let spotifyCircuitNoticeShown = false;

    const enriched = await mapLimit(items, 5, async (item) => {
        const [spotifyInfo, lastfmInfo] = await Promise.all([
            getSpotifyTrackInfo(item.artist, item.title, item.album).catch((error) => {
                spotifyErrorCount += 1;
                if (error?.code === 'SPOTIFY_CIRCUIT_OPEN') {
                    if (!spotifyCircuitNoticeShown) {
                        spotifyCircuitNoticeShown = true;
                        console.warn('[Spotify] Temporarily unavailable; skipping remaining Spotify lookups and continuing with Last.fm.');
                    }
                } else if (spotifyErrorCount <= 3) {
                    console.warn(`[Spotify] Track metadata fallback for ${item.artist} — ${item.title}: ${error.message}`);
                } else if (spotifyErrorCount === 4) {
                    console.warn('[Spotify] Additional track metadata errors suppressed for this import.');
                }
                return null;
            }),
            getLastfmTrackInfo(item.artist, item.title),
        ]);
        let lastfmTags = lastfmInfo?.tags || [];
        if (lastfmTags.length === 0) {
            const artistKey = item.artist.toLowerCase();
            if (!artistTagCache.has(artistKey)) {
                artistTagCache.set(artistKey, await getArtistTopTags(item.artist));
            }
            lastfmTags = artistTagCache.get(artistKey) || [];
        }
        const spotifyGenres = spotifyInfo?.genres || [];
        if (spotifyInfo) spotifyMatchedCount += 1;
        if (lastfmTags.length > 0) lastfmTaggedCount += 1;
        if (spotifyGenres.length > 0) spotifyGenreCount += 1;

        const lastfmFeatures = tagsToFeatures(lastfmTags);
        const spotifyFeatures = genresToFeatures(spotifyGenres);
        if (lastfmFeatures.matched > 0) lastfmMatchedCount += 1;

        const displayArtist = spotifyInfo?.artist || lastfmInfo?.artist || item.artist;
        const displayName = spotifyInfo?.name || lastfmInfo?.name || item.title;
        return {
            id: spotifyInfo?.id || lastfmInfo?.mbid || slugId(displayArtist, displayName),
            name: displayName,
            artists: displayArtist,
            album: spotifyInfo?.album || lastfmInfo?.album || item.album || '',
            coverUrl: spotifyInfo?.coverUrl || lastfmInfo?.coverUrl || null,
            coverSource: spotifyInfo?.coverUrl ? 'spotify' : (lastfmInfo?.coverUrl ? 'lastfm' : 'none'),
            durationMs: spotifyInfo?.durationMs || lastfmInfo?.durationMs || 0,
            addedAt: item.addedAt,
            popularity: spotifyInfo?.popularity ?? null,
            valence: lastfmFeatures.valence,
            energy: lastfmFeatures.energy,
            danceability: lastfmFeatures.danceability,
            acousticness: lastfmFeatures.acousticness,
            instrumentalness: lastfmFeatures.instrumentalness,
            tempo: null,
            key: null,
            mode: null,
            genres: lastfmTags.slice(0, 8),
            spotifyGenres: spotifyGenres.slice(0, 8),
            spotifyFeatures: {
                valence: spotifyFeatures.valence,
                energy: spotifyFeatures.energy,
                danceability: spotifyFeatures.danceability,
                acousticness: spotifyFeatures.acousticness,
                instrumentalness: spotifyFeatures.instrumentalness,
            },
            externalUrl: spotifyInfo?.externalUrl || externalSearchUrl(displayArtist, displayName),
            featuresSource: lastfmTags.length > 0 ? 'lastfm' : 'none',
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

    const featuresSource = lastfmMatchedCount > 0 ? 'lastfm' : 'none';
    console.log(`[TasteMap] enriched ${tracks.length}/${items.length} | Spotify matches: ${spotifyMatchedCount} | Last.fm tags: ${lastfmTaggedCount} | Last.fm scored: ${lastfmMatchedCount} | Spotify genres: ${spotifyGenreCount}`);
    res.json({
        tracks,
        featuresSource,
        stats: {
            fetchedCount: tracks.length,
            totalAvailable: input.length,
            spotifyMatchedCount,
            lastfmTaggedCount,
            lastfmMatchedCount,
            spotifyGenreCount,
            spotifyErrorCount,
            cacheHit: false,
        },
    });
}));

// ---------- GET /api/discover — source-aware Digging / discovery ----------
//
// Query: xAxis, yAxis, targetX, targetY, seedGenres (csv),
// seedTracks ("artist|title;artist|title"), limit.
// `valence` / `energy` remain accepted as backwards-compatible target aliases.

app.get('/api/discover', asyncRoute(async (req, res) => {
    const discoverySource = req.query.source === 'spotify' ? 'spotify' : 'lastfm';
    if (!isSpotifyConfigured()) {
        return res.status(503).json({ error: 'SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are not configured on the server.' });
    }
    if (discoverySource === 'lastfm' && !isLastfmConfigured()) {
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

        const candidates = [];
        const candSeen = new Set();
        const seedKeys = new Set(seedTracks.map((track) => `${track.artist}|${track.title}`.toLowerCase()));
        const pushCand = (track) => {
            if (!track?.artist || !track?.name) return;
            const k = `${track.artist}|${track.name}`.toLowerCase();
            if (seedKeys.has(k)) return;
            if (candSeen.has(k)) return;
            candSeen.add(k);
            candidates.push(track);
        };

        let discoveryGenres = seedGenres;
        let enriched = [];

        if (discoverySource === 'spotify') {
            const seedInfo = seedTracks.length > 0
                ? await mapLimit(seedTracks, 3, (track) => getSpotifyTrackInfo(track.artist, track.title))
                : [];
            const inferredGenres = seedInfo.flatMap((track) => track?.genres || []);
            discoveryGenres = [...new Set([...seedGenres, ...inferredGenres])].slice(0, 6);

            if (seedTracks.length > 0) {
                const artistSearches = await mapLimit(
                    seedTracks,
                    3,
                    (track) => searchTracks(`artist:${track.artist}`, 10),
                );
                for (const list of artistSearches) for (const track of list || []) pushCand(track);
            }
            if (candidates.length < limit * 2 && discoveryGenres.length > 0) {
                const genreSearches = await mapLimit(
                    discoveryGenres,
                    3,
                    (genre) => searchTracks(`genre:${genre}`, 10),
                );
                for (const list of genreSearches) for (const track of list || []) pushCand(track);
            }
            if (candidates.length === 0) {
                const fallback = await searchTracks(`genre:${seedGenres[0] || 'electronic'}`, 10);
                for (const track of fallback) pushCand(track);
            }

            const picked = candidates.slice(0, Math.max(limit * 3, 30));
            enriched = await mapLimit(picked, 5, async (track) => {
                const genres = await getArtistGenres(track.primaryArtistId);
                const feat = genresToFeatures(genres);
                return {
                    id: track.id || slugId(track.artist, track.name),
                    name: track.name,
                    artists: track.artist,
                    album: track.album || '',
                    coverUrl: track.coverUrl || null,
                    valence: feat.valence,
                    energy: feat.energy,
                    danceability: feat.danceability,
                    acousticness: feat.acousticness,
                    instrumentalness: feat.instrumentalness,
                    tempo: null,
                    genres: genres.slice(0, 8),
                    externalUrl: track.externalUrl || externalSearchUrl(track.artist, track.name),
                    featuresSource: genres.length > 0 ? 'spotify-genres' : 'none',
                };
            });
        } else {
            if (seedTracks.length > 0) {
                const perSeed = Math.ceil((limit * 2) / seedTracks.length);
                const similar = await mapLimit(seedTracks, 3, (track) => getSimilarTracks(track.artist, track.title, perSeed));
                for (const list of similar) {
                    for (const track of list || []) pushCand({
                        artist: track.artist,
                        name: track.name,
                        coverUrl: track.coverUrl || null,
                    });
                }
            }
            if (candidates.length < limit && seedGenres.length > 0) {
                const perTag = Math.ceil((limit * 2) / seedGenres.length);
                const tops = await mapLimit(seedGenres, 3, (genre) => getTagTopTracks(genre, perTag));
                for (const list of tops) {
                    for (const track of list || []) pushCand({
                        artist: track.artist,
                        name: track.name,
                        coverUrl: track.coverUrl || null,
                    });
                }
            }
            if (candidates.length === 0) {
                const fallback = await getTagTopTracks(seedGenres[0] || 'electronic', limit * 2);
                for (const track of fallback || []) pushCand({
                    artist: track.artist,
                    name: track.name,
                    coverUrl: track.coverUrl || null,
                });
            }

            enriched = await mapLimit(candidates.slice(0, limit * 2), 5, async (candidate) => {
                const [lastfmInfo, spotifyInfo] = await Promise.all([
                    getLastfmTrackInfo(candidate.artist, candidate.name),
                    getSpotifyTrackInfo(candidate.artist, candidate.name).catch((error) => {
                        console.warn(`[Spotify] Discovery cover fallback for ${candidate.artist} — ${candidate.name}: ${error.message}`);
                        return null;
                    }),
                ]);
                let tags = lastfmInfo?.tags || [];
                if (tags.length === 0) tags = await getArtistTopTags(candidate.artist);
                const feat = tagsToFeatures(tags);
                const artist = spotifyInfo?.artist || lastfmInfo?.artist || candidate.artist;
                const name = spotifyInfo?.name || lastfmInfo?.name || candidate.name;
                return {
                    id: spotifyInfo?.id || lastfmInfo?.mbid || slugId(artist, name),
                    name,
                    artists: artist,
                    album: spotifyInfo?.album || lastfmInfo?.album || '',
                    coverUrl: spotifyInfo?.coverUrl || lastfmInfo?.coverUrl || candidate.coverUrl || null,
                    valence: feat.valence,
                    energy: feat.energy,
                    danceability: feat.danceability,
                    acousticness: feat.acousticness,
                    instrumentalness: feat.instrumentalness,
                    tempo: null,
                    genres: tags.slice(0, 8),
                    externalUrl: spotifyInfo?.externalUrl || externalSearchUrl(artist, name),
                    featuresSource: tags.length > 0 ? 'lastfm' : 'none',
                };
            });
        }

        // Rank the Spotify catalog pool against the axes the user is actually
        // looking at so discovery position and recommendation order stay aligned.
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
                discoveryGenres,
                source: discoverySource,
                axes: { xAxis, yAxis, targetX, targetY },
            },
        });
    } catch (e) {
        console.error('[Discover] error:', e.message);
        res.status(502).json({ error: e.message || 'Discovery failed' });
    }
}));

app.use('/api', (error, req, res, next) => {
    if (res.headersSent) return next(error);
    console.error(`[API] ${req.method} ${req.originalUrl}:`, error?.message || error);
    const status = Number(error?.status);
    const safeStatus = Number.isInteger(status) && status >= 400 && status < 600 ? status : 502;
    return res.status(safeStatus).json({
        error: safeStatus >= 500
            ? 'External music metadata service is temporarily unavailable. Please try again.'
            : (error?.message || 'Request failed'),
    });
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

if (!isSpotifyConfigured()) {
    console.warn('[Spotify] SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET not set — /api/taste/enrich and /api/discover will return 503. Add them to .env.');
}
if (!isLastfmConfigured()) {
    console.warn('[Last.fm] LASTFM_API_KEY not set — Taste Field enrichment and discovery will return 503. Add it to .env.');
}
if (!isYouTubeConfigured()) {
    console.warn('[YouTube] YOUTUBE_API_KEY not set — Metro video playback will ask for configuration.');
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
