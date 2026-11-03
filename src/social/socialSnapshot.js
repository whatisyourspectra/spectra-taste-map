import { buildTasteState, uniqueTracks, getTasteGenres } from '../taste/buildTasteState.js';
import { isDemoTaste } from '../taste/tasteStorage.js';
import { MUSIC_TAG_VERSION } from '../taste/musicTags.js';

export const SOCIAL_SNAPSHOT_VERSION = 1;
export const SOCIAL_TRACK_LIMIT = 24;
export const SOCIAL_PAGE_SIZE = 12;
export const cleanSocialText = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
export const isSocialId = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value || '');
export function socialDisplayName(user) {
    const meta = user?.user_metadata || {};
    return cleanSocialText(meta.nickname || meta.full_name || meta.name, 40) || 'Music explorer';
}
export function safeSocialCover(value) {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && !url.username && !url.password ? url.href.slice(0, 1000) : '';
    } catch { return ''; }
}

export function buildSocialSnapshot(tracks, { stats, includeTracks = true, source = 'lastfm' } = {}) {
    if (isDemoTaste({ tracks, stats })) throw new Error('SOCIAL_DEMO');
    const library = uniqueTracks(tracks).filter(track => cleanSocialText(track.artists || track.artist, 200));
    if (!library.length) throw new Error('SOCIAL_EMPTY');
    const state = buildTasteState(library);
    const retained = state.coreGenres.slice(0, 512);
    const total = retained.reduce((sum, item) => sum + item.strength, 0) || 1;
    const genreProfile = retained.map(({ genre, strength }) => ({ genre, strength: strength / total }));
    // Sample across leading genres; cap repeats by artist to avoid showing one
    // album as the whole taste. Never serialize private IDs or import history.
    const selected = [], selectedIds = new Set(), artists = new Map();
    const add = track => {
        const artist = cleanSocialText(track.artists || track.artist, 200);
        if (selected.length >= SOCIAL_TRACK_LIMIT || selectedIds.has(track.id) || (artists.get(artist) || 0) >= 3) return;
        selected.push(track); selectedIds.add(track.id); artists.set(artist, (artists.get(artist) || 0) + 1);
    };
    if (includeTracks) {
        for (const { genre } of genreProfile.slice(0, 12)) {
            for (const track of library.filter(item => getTasteGenres(item).includes(genre)).slice(0, 3)) add(track);
        }
        for (const track of library) add(track);
    }
    return {
        version: SOCIAL_SNAPSHOT_VERSION, tagVersion: MUSIC_TAG_VERSION, source, trackCount: library.length,
        genreProfile, diversity: state.diversity,
        tracks: selected.map((track, index) => ({ id: `public-${index}`, name: cleanSocialText(track.name, 200),
            artists: cleanSocialText(track.artists || track.artist, 200), coverUrl: safeSocialCover(track.coverUrl),
            genres: getTasteGenres(track).slice(0, 8) })),
    };
}

export function readSocialSnapshot(value) {
    if (!value || value.version !== SOCIAL_SNAPSHOT_VERSION) return { version: 1, trackCount: 0, genreProfile: [], tracks: [] };
    return {
        version: 1, tagVersion: Number.isInteger(value.tagVersion) ? value.tagVersion : 1,
        source: value.source === 'spotify' ? 'spotify' : 'lastfm',
        trackCount: Number.isInteger(value.trackCount) ? Math.max(0, value.trackCount) : 0,
        genreProfile: (Array.isArray(value.genreProfile) ? value.genreProfile : []).filter(item =>
            typeof item?.genre === 'string' && Number.isFinite(item.strength) && item.strength > 0 && item.strength <= 1)
            .slice(0, 512).map(item => ({ genre: cleanSocialText(item.genre, 80), strength: item.strength })),
        tracks: (Array.isArray(value.tracks) ? value.tracks : []).slice(0, SOCIAL_TRACK_LIMIT)
            .filter(track => typeof track?.name === 'string' && typeof track?.artists === 'string')
            .map((track, index) => ({ id: `public-${index}`, name: cleanSocialText(track.name, 200),
                artists: cleanSocialText(track.artists, 200), coverUrl: safeSocialCover(track.coverUrl) })),
    };
}
