import { canonicalMusicTag } from '../taste/musicTags.js';

// Older publications may omit song genres or the song list entirely. Fall back
// to the public sample with an explicit label, never invent a genre match.
export function publicTastePeek(snapshot, genre) {
    const songs = Array.isArray(snapshot?.tracks) ? snapshot.tracks : [];
    const key = canonicalMusicTag(genre);
    const matches = key ? songs.filter(track => Array.isArray(track.genres)
        && track.genres.some(tag => typeof tag === 'string' && canonicalMusicTag(tag) === key)) : [];
    return { tracks: (matches.length ? matches : songs).slice(0, 3), genreMatched: matches.length > 0, hasPublicTracks: songs.length > 0 };
}
