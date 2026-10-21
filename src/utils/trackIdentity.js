const normalize = value => String(value ?? '').normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase();

export function songIdentity(track) {
    const artist = normalize(track?.artists || track?.artist);
    const title = normalize(track?.name || track?.title);
    return artist && title ? JSON.stringify([artist, title]) : null;
}

// Covers identify albums, not songs. Keep different songs and versions even
// when they share artwork; collapse provider IDs and exact artist/title pairs.
export function deduplicateTracks(tracks = []) {
    const byId = new Map();
    for (const track of tracks) {
        if (track?.id) byId.set(String(track.id), track);
    }
    const seenSongs = new Set();
    return [...byId.values()].filter(track => {
        const key = songIdentity(track);
        if (!key) return true;
        if (seenSongs.has(key)) return false;
        seenSongs.add(key);
        return true;
    });
}
