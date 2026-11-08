import { buildAvatarState } from '../avatar/buildAvatarState.js';
import { canonicalMusicTag } from '../taste/musicTags.js';
import { getGenreIdentity, titleizeGenre } from '../taste/genreIdentity.js';
import { hash01 } from '../taste/constellationTopology.js';

export const PUBLIC_GENRE_STAR_LIMIT = 12;
export const PUBLIC_CONSTELLATION_CAMERA = Object.freeze({ yaw: -.22, pitch: .12, zoom: 1 });

// Use the same star layout as the mobile share card, using only the explicitly
// public song sample. Genre stars are labelled as genres, never invented songs.
export function buildPublicConstellation(snapshot) {
    const weights = new Map();
    for (const item of Array.isArray(snapshot?.genreProfile) ? snapshot.genreProfile.slice(0, 512) : []) {
        if (typeof item?.genre !== 'string' || !Number.isFinite(item.strength) || item.strength <= 0 || item.strength > 1) continue;
        const genre = canonicalMusicTag(item.genre.slice(0, 80));
        if (genre) weights.set(genre, (weights.get(genre) || 0) + item.strength);
    }
    const total = [...weights.values()].reduce((sum, weight) => sum + weight, 0) || 1;
    const genres = [...weights].map(([genre, strength]) => ({ genre, strength: strength / total }))
        .filter(item => item.strength > 0).sort((a, b) => b.strength - a.strength || (a.genre < b.genre ? -1 : a.genre > b.genre ? 1 : 0));
    const tracks = (Array.isArray(snapshot?.tracks) ? snapshot.tracks : []).slice(0, 24)
        .filter(track => typeof track?.name === 'string' && typeof track?.artists === 'string')
        .map((track, index) => ({ id: `public-${index}`, name: track.name, artists: track.artists, coverUrl: track.coverUrl,
            genres: (Array.isArray(track.genres) ? track.genres : []).filter(genre => typeof genre === 'string').slice(0, 8).map(canonicalMusicTag) }));
    const diversity = genres.length > 1 ? -genres.reduce((sum, item) => sum + item.strength * Math.log(item.strength), 0) / Math.log(genres.length) : 0;
    const source = buildAvatarState({ coreGenres: genres, emergingGenres: [], diversity, averageEnergy: .5, averageValence: .5 }, tracks);
    const regionDepth = genre => (hash01(`${genre}:public-depth`) - .5) * 140;
    const genreNodes = genres.slice(0, PUBLIC_GENRE_STAR_LIMIT).map(item => {
        const angle = hash01(`${item.genre}:region`) * Math.PI * 2;
        const distance = (36 + hash01(`${item.genre}:radius`) * 42) * (.78 + diversity * .26);
        return { id: `genre:${item.genre}`, kind: 'genre', genre: item.genre,
            x: 180 + Math.cos(angle) * distance, y: 166 + Math.sin(angle) * distance * .88, z: regionDepth(item.genre),
            radius: 3.5 + Math.sqrt(item.strength) * 3, opacity: .95, color: `rgb(${getGenreIdentity(item.genre).tone.rgb})`,
            title: titleizeGenre(item.genre), strength: item.strength };
    });
    const nodes = [...source.nodes.map(node => ({ ...node, kind: 'track', z: regionDepth(node.genre) + (hash01(`${node.id}:depth`) - .5) * 65 })), ...genreNodes];
    // A fitted 3D bounding sphere leaves room for glow in every orientation.
    const center = nodes.length ? {
        x: nodes.reduce((sum, node) => sum + node.x, 0) / nodes.length,
        y: nodes.reduce((sum, node) => sum + node.y, 0) / nodes.length,
        z: nodes.reduce((sum, node) => sum + node.z, 0) / nodes.length,
    } : { x: 180, y: 166, z: 0 };
    const radius = Math.max(1, ...nodes.map(node => Math.hypot(node.x - center.x, node.y - center.y, node.z - center.z)));
    const scale = Math.min(2.2, 126 / radius);
    const fitted = nodes.map(node => ({ ...node, x: 180 + (node.x - center.x) * scale,
        y: 166 + (node.y - center.y) * scale, z: (node.z - center.z) * scale }));
    const byId = new Map(fitted.map(node => [node.id, node]));
    const links = source.edges.map(({ from, to, color, secondary }) => ({ from, to, color, secondary }));
    for (const anchor of genreNodes) {
        const neighbors = tracks.filter(track => track.genres.includes(anchor.genre))
            .map(track => byId.get(track.id)).filter(Boolean)
            .sort((a, b) => Math.hypot(a.x - byId.get(anchor.id).x, a.y - byId.get(anchor.id).y)
                - Math.hypot(b.x - byId.get(anchor.id).x, b.y - byId.get(anchor.id).y)).slice(0, 2);
        for (const node of neighbors) links.push({ from: anchor.id, to: node.id, color: anchor.color });
    }
    for (let index = 1; index < genreNodes.length; index++) {
        links.push({ from: genreNodes[index - 1].id, to: genreNodes[index].id, color: genreNodes[index].color, secondary: true });
    }
    const edges = [...new Map(links.map(link => [[link.from, link.to].sort().join('|'), link])).values()]
        .filter(link => byId.has(link.from) && byId.has(link.to))
        .map(link => ({ ...link, a: byId.get(link.from), b: byId.get(link.to) }));
    const regions = genreNodes.map(node => ({ ...byId.get(node.id), strength: node.strength }));
    return { avatar: { nodes: fitted, edges, regions, orbits: [], pulseSeconds: 7.5, driftSeconds: 24, warmth: .5 },
        genres: genres.slice(0, PUBLIC_GENRE_STAR_LIMIT).map(item => ({ ...item, color: `rgb(${getGenreIdentity(item.genre).tone.rgb})` })), tracks };
}
