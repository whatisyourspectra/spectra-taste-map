import { songIdentity } from '../utils/trackIdentity.js';

export const DISCOVERY_BATCH_SIZE = 8;

// A request captures its basis when the user asks. Camera/layout/library updates
// must not silently replace a recommendation list that someone is listening to.
export async function fetchDesktopRecommendations(request, { fetcher = fetch, signal, base = '' } = {}) {
    const excludedIds = new Set((request.exclude || []).map(track => String(track.id)));
    const excludedSongs = new Set((request.exclude || []).map(songIdentity).filter(Boolean));
    const anchors = request.anchors.slice(0, 3);
    const results = await Promise.all(anchors.map(async anchor => {
        const params = new URLSearchParams({
            xAxis: request.xAxis, yAxis: request.yAxis,
            targetX: String(anchor.x), targetY: String(anchor.y),
            source: request.source, limit: '14',
            seedGenres: request.genres.join(','),
        });
        if (request.seed) params.set('seedTracks', `${request.seed.artists}|${request.seed.name}`);
        const response = await fetcher(`${base}/api/discover?${params}`, { signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return (Array.isArray(data?.tracks) ? data.tracks : []).map((track, sourceRank) => ({
            track, sourceRank, anchorId: anchor.id, targetX: anchor.x, targetY: anchor.y,
            seedTrackId: request.seed?.id || null,
        }));
    }));
    const candidates = results.flat().sort((a, b) => a.sourceRank - b.sourceRank);
    const seenIds = new Set(excludedIds), seenSongs = new Set(excludedSongs);
    return candidates.filter(({ track }) => {
        if (!track?.id || !track.name) return false;
        const id = String(track.id), song = songIdentity(track);
        if (seenIds.has(id) || (song && seenSongs.has(song))) return false;
        seenIds.add(id);
        if (song) seenSongs.add(song);
        return true;
    }).slice(0, DISCOVERY_BATCH_SIZE);
}
