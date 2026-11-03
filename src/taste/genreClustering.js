import { genreParents, trackGenreTags } from './musicTags.js';
import { titleizeGenre } from './genreIdentity.js';

export const MAX_GENRE_GROUPS = 15;
export const GENRE_PARTITION_VERSION = 2;

// Broad navigation families, never additional tags written onto songs.
// Fourteen families leave room for one bucket with no genre evidence.
const families = {
    pop: 'Pop', hiphop: 'Hip Hop', soul: 'R&B · Soul', rock: 'Rock', indie: 'Indie · Alternative',
    heavy: 'Metal · Punk', electronic: 'Electronic', ambient: 'Ambient · Downtempo',
    jazz: 'Jazz · Blues', folk: 'Folk · Country', classical: 'Classical · Soundtrack',
    reggae: 'Reggae · Dub', world: 'World · Regional', other: 'Other Genres',
};

function familyOf(tag) {
    if (/(?:^|[ -])(?:r&b|soul|funk)$/.test(tag) || tag === 'gospel') return 'soul';
    if (/(?:^|[ -])(?:hip hop|rap)$/.test(tag) || /^(?:trap|grime|boom bap|phonk|g-funk)$/.test(tag)) return 'hiphop';
    if (/(?:metal|punk|hardcore|grindcore|deathcore|screamo|metalcore)/.test(tag)) return 'heavy';
    if (/(?:jazz|blues|swing)/.test(tag)) return 'jazz';
    if (/(?:classical|soundtrack|orchestral|opera|baroque|cinematic|score)/.test(tag) || ['minimalism', 'new age'].includes(tag)) return 'classical';
    if (/(?:ambient|downtempo|chillout|drone)/.test(tag)) return 'ambient';
    if (/(?:reggae|dancehall|^dub$|^ska$)/.test(tag)) return 'reggae';
    if (/(?:folk|country|bluegrass|americana|singer-songwriter)/.test(tag)) return 'folk';
    if (/(?:indie|alternative|shoegaze|dream pop|bedroom pop|grunge|^emo$)/.test(tag)) return 'indie';
    if (/rock/.test(tag)) return 'rock';
    if (/(?:house|techno|trance|electronic|electronica|drum and bass|garage|dubstep|breakbeat|breaks|jungle|disco|synthwave|vaporwave|chillwave|retrowave|future bass|bass music|^idm$|^edm$|^ebm$|^electro$|^ukg$|^2-step$|^skweee$)/.test(tag)) return 'electronic';
    if (/(?:pop|ballad|^trot$)/.test(tag)) return 'pop';
    if (/^(?:world|world music|afrobeat|afrobeats|amapiano|highlife|reggaeton|reggaetón|soca|bossa nova|samba|salsa|tango|flamenco|fado|bhangra|klezmer|qawwali|gamelan|chanson)$/.test(tag)) return 'world';
    return 'other';
}

function makeNode(key, name, kind = 'genre') {
    return { key, name, kind, indices: [], terminal: [], children: new Map() };
}

// An all-House library should say House rather than Electronic even when it
// only needs one group. Single-child levels cost no additional tag slots.
function compress(node) {
    while (!node.terminal.length && node.children.size === 1) node = node.children.values().next().value;
    return node;
}
function branches(node) {
    const result = [...node.children.values()].map(compress);
    if (node.terminal.length) result.push({ ...makeNode(`${node.key}/direct`, node.name, node.kind), indices: node.terminal });
    return result.sort((a, b) => b.indices.length - a.indices.length || a.key.localeCompare(b.key));
}

/** Disjoint, exhaustive partition. No top-N truncation, vocabulary cutoff,
 * artist overrides, or density chains can hide a track from its tag. */
export function partitionGenreTracks(tracks = []) {
    const tags = tracks.map(track => trackGenreTags(track).sort());
    const frequency = new Map();
    tags.forEach(genres => genres.forEach(genre => frequency.set(genre, (frequency.get(genre) || 0) + 1)));
    const roots = new Map();
    tags.forEach((genres, index) => {
        const votes = new Map();
        for (const genre of genres) {
            const family = familyOf(genre);
            votes.set(family, (votes.get(family) || 0) + 1 + genreParents(genre).length * .1);
        }
        const family = [...votes].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || 'unknown';
        if (!roots.has(family)) roots.set(family, makeNode(family, families[family] || 'Genre Unknown', family === 'unknown' ? 'unknown' : family === 'other' ? 'other' : 'genre'));
        const root = roots.get(family);
        root.indices.push(index);
        if (family === 'unknown') { root.terminal.push(index); return; }
        const primary = genres.filter(genre => familyOf(genre) === family).sort((a, b) =>
            genreParents(b).length - genreParents(a).length || frequency.get(b) - frequency.get(a) || a.localeCompare(b))[0];
        const path = [...new Set([...genreParents(primary).reverse(), primary])].filter(genre => familyOf(genre) === family);
        let node = root;
        for (const genre of path) {
            const key = `${node.key}/${genre}`;
            if (!node.children.has(key)) node.children.set(key, makeNode(key, titleizeGenre(genre)));
            node = node.children.get(key); node.indices.push(index);
        }
        node.terminal.push(index);
    });

    let frontier = [...roots.values()].map(compress);
    while (frontier.length < MAX_GENRE_GROUPS) {
        const slots = MAX_GENRE_GROUPS - frontier.length;
        let best = null;
        for (const node of frontier) {
            const children = branches(node);
            if (children.length < 2) continue;
            let replacements = children;
            if (children.length - 1 > slots) {
                // Retain a named parent remainder for every unselected child.
                replacements = [...children.slice(0, slots), { ...makeNode(`${node.key}/remainder`, `${node.name} · Other`, node.kind),
                    indices: children.slice(slots).flatMap(child => child.indices) }];
            }
            const entropy = replacements.reduce((sum, child) => {
                const share = child.indices.length / node.indices.length;
                return sum - share * Math.log(share);
            }, 0);
            const score = node.indices.length * entropy / (replacements.length - 1);
            if (!best || score > best.score || (score === best.score && node.key.localeCompare(best.node.key) < 0)) best = { node, replacements, score };
        }
        if (!best) break;
        frontier = frontier.flatMap(node => node === best.node ? best.replacements : [node]);
    }

    frontier.sort((a, b) => b.indices.length - a.indices.length || a.key.localeCompare(b.key));
    const labels = Array(tracks.length).fill(-1);
    const groups = frontier.map((node, id) => {
        for (const index of node.indices) labels[index] = id;
        return { key: node.key, name: node.name, kind: node.kind, count: node.indices.length };
    });
    const unknown = groups.findIndex(group => group.kind === 'unknown');
    return { labels, groups, clusterCount: groups.length, noiseClusterId: unknown < 0 ? null : unknown };
}
