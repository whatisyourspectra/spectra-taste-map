import { buildConstellationTopology, hash01 } from '../taste/constellationTopology.js';
import { getGenreIdentity } from '../taste/genreIdentity.js';
import { getTasteGenres, latestDecisions, uniqueTracks } from '../taste/buildTasteState.js';

export const AVATAR_NODE_LIMIT = 72;
export const AVATAR_ORBIT_LIMIT = 8;
const TAU = Math.PI * 2;

function tone(genre) {
    return `rgb(${getGenreIdentity(genre === 'unclassified' ? '' : genre).tone.rgb})`;
}

/** Bounded, deterministic geometry; no viewport, DOM, clock, or random input. */
export function buildAvatarState(taste, tracks = [], decisions = []) {
    const choices = latestDecisions(decisions);
    const absorbed = choices.filter((choice) => choice.action === 'absorb').map((choice) => choice.track);
    const integrated = uniqueTracks([...tracks, ...absorbed]);
    const strengthByGenre = new Map(taste.coreGenres.map((item) => [item.genre, item.strength]));
    const emergingByGenre = new Map(taste.emergingGenres.map((item) => [item.genre, item.strength]));
    const primaryGenre = (track) => [...getTasteGenres(track)].sort((a, b) => (
        Number(emergingByGenre.has(b)) - Number(emergingByGenre.has(a))
        || (strengthByGenre.get(b) || emergingByGenre.get(b) || 0)
        - (strengthByGenre.get(a) || emergingByGenre.get(a) || 0) || a.localeCompare(b)
    ))[0] || 'unclassified';
    const regions = new Map();
    const spread = 0.78 + taste.diversity * 0.26;
    const getRegion = (genre) => {
        if (regions.has(genre)) return regions.get(genre);
        const emerging = emergingByGenre.has(genre);
        const strength = emergingByGenre.get(genre) || strengthByGenre.get(genre) || 0.08;
        const angle = hash01(`${genre}:region`) * TAU;
        const radius = emerging ? 124 - strength * 70 : (36 + hash01(`${genre}:radius`) * 42) * spread;
        const region = {
            genre, emerging, strength, color: tone(genre),
            x: 180 + Math.cos(angle) * radius,
            y: 166 + Math.sin(angle) * radius * 0.88,
        };
        regions.set(genre, region);
        return region;
    };
    // Deterministic round-robin sampling retains small taste regions. Reserve
    // recent Absorbs so the chosen star remains visible even in a large library.
    const buckets = new Map();
    [...integrated].sort((a, b) => hash01(a.id) - hash01(b.id) || String(a.id).localeCompare(String(b.id)))
        .forEach((track) => {
            const genre = primaryGenre(track);
            if (!buckets.has(genre)) buckets.set(genre, []);
            buckets.get(genre).push(track);
        });
    const selected = new Map(absorbed.slice(-12).map((track) => [track.id, track]));
    const sortedBuckets = [...buckets.entries()].sort(([a], [b]) =>
        (strengthByGenre.get(b) || 0) - (strengthByGenre.get(a) || 0) || a.localeCompare(b));
    for (let index = 0; selected.size < Math.min(integrated.length, AVATAR_NODE_LIMIT); index += 1) {
        for (const [, bucket] of sortedBuckets) {
            if (bucket[index]) selected.set(bucket[index].id, bucket[index]);
            if (selected.size >= AVATAR_NODE_LIMIT) break;
        }
    }
    const clusterIds = new Map([...buckets.keys()].sort().map((genre, index) => [genre, index]));
    const nodes = [...selected.values()].map((track) => {
        const genre = primaryGenre(track);
        const region = getRegion(genre);
        const angle = hash01(`${track.id}:angle`) * TAU;
        const radius = 8 + Math.sqrt(hash01(`${track.id}:radius`)) * (22 + taste.diversity * 17);
        const x = region.x + Math.cos(angle) * radius;
        const y = region.y + Math.sin(angle) * radius * (0.6 + hash01(genre) * 0.5);
        const prominence = hash01(`${track.id}:light`);
        return {
            id: track.id, genre, x, y, nX: x / 360, nY: y / 360,
            clusterId: clusterIds.get(genre), color: region.color,
            radius: 1.4 + prominence * 1.8 + region.strength * 2.2,
            opacity: region.emerging ? 0.25 + region.strength * 0.8 : 0.55 + prominence * 0.4,
            emerging: region.emerging, title: `${track.name} · ${track.artists || ''}`,
        };
    });
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const core = nodes.filter((node) => !node.emerging);
    const links = buildConstellationTopology(core);
    // Emerging stars have just one thread back into the existing core.
    for (const node of nodes.filter((item) => item.emerging)) {
        const nearest = [...core].sort((a, b) => Math.hypot(a.x - node.x, a.y - node.y)
            - Math.hypot(b.x - node.x, b.y - node.y))[0];
        if (nearest) links.push({ from: node.id, to: nearest.id, color: node.color, secondary: true });
    }
    const anchors = [...regions.keys()].map((genre) => core.find((node) => node.genre === genre)).filter(Boolean);
    // A few inter-region threads give the condensed universe a single body.
    for (let index = 1; index < anchors.length; index += 1) {
        const a = anchors[index];
        const b = [...anchors.slice(0, index)].sort((left, right) =>
            Math.hypot(left.x - a.x, left.y - a.y) - Math.hypot(right.x - a.x, right.y - a.y))[0];
        links.push({ from: a.id, to: b.id, color: a.color, secondary: true });
    }
    const edges = [...new Map(links.map((link) => [
        [String(link.from), String(link.to)].sort().join('::'), link,
    ])).values()].map((link) => ({ ...link, a: nodeById.get(link.from), b: nodeById.get(link.to) }));
    const orbits = choices.filter((choice) => choice.action === 'dig').slice(-AVATAR_ORBIT_LIMIT).map(({ track }) => {
        const genre = primaryGenre(track);
        const angle = hash01(`${track.id}:orbit`) * TAU;
        return {
            id: track.id, genre, angle, color: tone(genre),
            x: 180 + Math.cos(angle) * 150, y: 166 + Math.sin(angle) * 134,
            title: `${track.name} · ${track.artists || ''}`,
        };
    });
    return {
        nodes, edges, orbits, regions: [...regions.values()],
        pulseSeconds: 10 - taste.averageEnergy * 5,
        driftSeconds: 28 - taste.averageEnergy * 10,
        warmth: taste.averageValence,
    };
}

export function buildAvatarReaction(action, track, avatar) {
    const destination = action === 'absorb' ? avatar.nodes.find((node) => node.id === track.id)
        : action === 'dig' ? avatar.orbits.find((node) => node.id === track.id) : null;
    return {
        action, trackId: track.id,
        color: destination?.color || tone(getTasteGenres(track)[0] || 'unclassified'),
        x: destination?.x ?? 330, y: destination?.y ?? 300,
    };
}
