import { songIdentity } from '../utils/trackIdentity.js';

export function findLibraryTrack(tracks, candidate) {
    const identity = songIdentity(candidate);
    return tracks.find(track => String(track.id) === String(candidate?.id)
        || (identity && songIdentity(track) === identity));
}

// Placement is provenance, never genre evidence: do not copy a seed's tags.
export function prepareLibraryAddition(tracks, candidate, anchorId) {
    if (!candidate?.id || !candidate?.name) return null;
    const existing = findLibraryTrack(tracks, candidate);
    if (existing) return existing;
    let anchor = tracks.find(track => track.id === anchorId);
    if (!anchor && tracks.length) {
        const keys = ['valence', 'energy', 'danceability', 'acousticness', 'instrumentalness'];
        const genres = new Set([...(candidate.genres || []), ...(candidate.spotifyGenres || [])]
            .map(genre => genre.toLowerCase()));
        const ranked = tracks.map(track => {
            const shared = [...(track.genres || []), ...(track.spotifyGenres || [])]
                .some(genre => genres.has(genre.toLowerCase()));
            const comparable = keys.filter(key => Number.isFinite(candidate[key]) && Number.isFinite(track[key]));
            const distance = comparable.length ? comparable.reduce((sum, key) => sum + (candidate[key] - track[key]) ** 2, 0) / comparable.length : 1;
            return { track, score: distance - (shared ? 2 : 0), valid: shared || comparable.length > 0 };
        }).filter(item => item.valid).sort((a, b) => a.score - b.score);
        anchor = ranked[0]?.track;
    }
    return {
        ...candidate,
        // Discovery responses use `genres`; imported Spotify maps use the
        // parallel Spotify fields. Preserve actual Spotify evidence on save.
        ...(candidate.featuresSource === 'spotify-genres' && !Array.isArray(candidate.spotifyGenres)
            ? {
                spotifyGenres: [...(candidate.genres || [])],
                spotifyFeatures: Object.fromEntries(['valence', 'energy', 'danceability', 'acousticness', 'instrumentalness']
                    .filter(key => Number.isFinite(candidate[key])).map(key => [key, candidate[key]])),
            } : {}),
        addedAt: candidate.addedAt || new Date().toISOString(),
        ...(anchor ? { tasteMapPlacement: { anchorId: anchor.id } } : {}),
    };
}
