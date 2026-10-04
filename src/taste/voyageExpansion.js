import { buildVoyageSequence, hash01 } from './constellationTopology.js';

export const voyageTrackKey = (track) => `${String(track?.artists || '').trim().toLowerCase()}|${String(track?.name || '').trim().toLowerCase()}`;

// Keep established stars fixed. New stars occupy a free position near their seed.
function freePosition(nodes, origin, seed) {
    const start = hash01(seed) * Math.PI * 2 + nodes.length * 2.399963229728653;
    for (let ring = 1; ; ring += 1) {
        for (let i = 0; i < 16; i += 1) {
            const angle = start + i * Math.PI / 8;
            const point = { x: origin.x + Math.cos(angle) * ring * 160, y: origin.y + Math.sin(angle) * ring * 160 };
            if (nodes.every((node) => Math.hypot(node.x - point.x, node.y - point.y) >= 155)) return point;
        }
    }
}

export function createVoyageGraph(constellation, startId) {
    const sequence = buildVoyageSequence(constellation.tracks, constellation.edges, startId);
    const nodes = [];
    const source = new Map((constellation.nodes || []).map((node) => [node.track?.id || node.id, node]));
    const xs = [...source.values()].map((node) => node.nX || 0);
    const ys = [...source.values()].map((node) => node.nY || 0);
    const minX = Math.min(...xs, xs[0] || 0);
    const minY = Math.min(...ys, ys[0] || 0);
    const spanX = Math.max(1e-3, Math.max(...xs, minX) - minX);
    const spanY = Math.max(1e-3, Math.max(...ys, minY) - minY);
    for (const id of sequence) {
        const original = source.get(id);
        const point = original ? { x: ((original.nX || 0) - minX) / spanX * 480, y: ((original.nY || 0) - minY) / spanY * 320 } : { x: 0, y: 0 };
        const position = nodes.every((node) => Math.hypot(node.x - point.x, node.y - point.y) >= 155)
            ? point : freePosition(nodes, point, id);
        nodes.push({ id, ...position });
    }
    return { nodes, sequence };
}

export function extendVoyage(state, track, anchorId) {
    if (!state.active || !track?.id || !state.curatedTrackIds.includes(anchorId)) return state;
    if (state.curatedTracks.some((existing) => existing.id === track.id || voyageTrackKey(existing) === voyageTrackKey(track))) return state;
    const anchor = state.nodes.find((node) => node.id === anchorId);
    if (!anchor) return state;
    return {
        ...state,
        curatedTracks: [...state.curatedTracks, track],
        curatedTrackIds: [...state.curatedTrackIds, track.id],
        curatedEdges: [...state.curatedEdges, { from: anchorId, to: track.id, color: '#7dd3fc' }],
        nodes: [...state.nodes, { id: track.id, ...freePosition(state.nodes, anchor, track.id) }],
        sequence: [...state.sequence, track.id],
        additions: [...(state.additions || []), { trackId: track.id, anchorId }],
    };
}

// Only undo the most recent addition, so existing branches never lose their anchor.
export function undoVoyageExpansion(state, trackId) {
    const addition = state.additions?.at(-1);
    if (!state.active || addition?.trackId !== trackId) return state;
    const wasPlaying = state.trackId === trackId;
    return {
        ...state,
        trackId: wasPlaying ? addition.anchorId : state.trackId,
        isPlaying: wasPlaying ? false : state.isPlaying,
        curatedTracks: state.curatedTracks.filter((track) => track.id !== trackId),
        curatedTrackIds: state.curatedTrackIds.filter((id) => id !== trackId),
        curatedEdges: state.curatedEdges.filter((edge) => edge.from !== trackId && edge.to !== trackId),
        nodes: state.nodes.filter((node) => node.id !== trackId),
        sequence: state.sequence.filter((id) => id !== trackId),
        additions: state.additions.slice(0, -1),
    };
}
