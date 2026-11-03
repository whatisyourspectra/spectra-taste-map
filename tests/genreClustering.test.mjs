import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGenreFeatures } from '../src/taste/genreFeatures.js';
import { clusterGenreProfiles, MIN_GENRE_SIMILARITY } from '../src/taste/genreClustering.js';
import { representativeClusterGenres, getClusterEvidence, clusterGenreName } from '../src/taste/clusterEvidence.js';
import { trackGenreTags } from '../src/taste/musicTags.js';

function group(tracks, options) {
    const features = buildGenreFeatures(tracks, options);
    return { ...features, ...clusterGenreProfiles(tracks, features.points, features.vocab) };
}
const repeated = (prefix, genres, count = 12) => Array.from({ length: count }, (_, i) => ({ id: `${prefix}-${i}`, genres }));
const partition = (tracks, labels) => [...new Set(labels.filter(label => label >= 0))]
    .map(label => tracks.filter((_, i) => labels[i] === label).map(track => track.id).sort().join('|')).sort();

test('Frank Ocean artist-tag fixture stays separate from East Asian indie scenes without artist overrides', () => {
    // Live artist.getTopTags response checked 2026-11-03; this is NOT the
    // user's saved track metadata or a claim about every Frank Ocean song.
    const tags = ['rnb', 'soul', 'hip-hop', 'r&b', 'ofwgkta', 'neo-soul', 'alternative rnb', 'american', 'hip hop', 'pop'];
    const tracks = [
        ...repeated('frank', tags).map(track => ({ ...track, artists: 'Frank Ocean' })),
        ...repeated('taiwan', ['taiwanese indie', 'chinese indie', 'indie', 'indie pop']),
        ...repeated('japan', ['japanese indie', 'indie', 'indie rock']),
        ...repeated('western-indie', ['indie pop', 'dream pop', 'pop']),
    ];
    const result = group(tracks);
    assert.equal(result.clusterCount, 4);
    assert.notEqual(result.labels[0], result.labels[12]);
    assert.notEqual(result.labels[0], result.labels[24]);
    const members = tracks.filter((_, i) => result.labels[i] === result.labels[0]);
    assert.doesNotMatch(representativeClusterGenres(members).join(' '), /taiwan|chinese|japan/);
    assert.deepEqual(group(tracks.map(track => ({ ...track, artists: 'Unrelated Artist' }))).labels, result.labels,
        'Grouping uses tag evidence, not the artist name');
});

test('bridge tracks cannot transitively merge disjoint genres', () => {
    const tracks = [
        ...repeated('rnb', ['r&b'], 20),
        ...repeated('rnb-pop', ['r&b', 'pop'], 3),
        ...repeated('pop', ['pop'], 15),
        ...repeated('indie-pop', ['pop', 'indie'], 3),
        ...repeated('indie', ['indie'], 20),
    ];
    const result = group(tracks);
    assert.notEqual(result.labels[0], result.labels.at(-1));
    assert.ok(result.clusterCount >= 3);
    for (let label = 0; label < result.clusterCount; label++) {
        const indices = result.labels.flatMap((value, i) => value === label ? [i] : []);
        const common = trackGenreTags(tracks[indices[0]]).filter(genre =>
            indices.every(index => trackGenreTags(tracks[index]).includes(genre)));
        assert.ok(common.length, 'Every cluster has at least one direct genre shared by ALL members');
        // A fixed observed seed must explain the whole group; pairwise chains
        // and a moving centroid are not sufficient evidence.
        assert.ok(indices.some(anchor => indices.every(index =>
            result.points[anchor].reduce((sum, v, d) => sum + v * result.points[index][d], 0) >= MIN_GENRE_SIMILARITY - 1e-10)));
    }
    const reversed = [...tracks].reverse();
    assert.deepEqual(partition(reversed, group(reversed).labels), partition(tracks, result.labels));
});

test('a minority scene tag cannot name the entire cluster, while real scene evidence remains visible', () => {
    const tracks = [...repeated('scene', ['pop', 'taiwanese indie', 'chinese indie'], 8), ...repeated('other', ['pop'], 2)];
    assert.deepEqual(representativeClusterGenres(tracks), ['pop']);
    assert.ok(getClusterEvidence({ members: tracks }).genres.some(item => item.genre === 'taiwanese indie' && item.count === 8));
    assert.deepEqual(representativeClusterGenres(tracks.slice(0, 8)), ['chinese indie', 'pop']);
    assert.deepEqual(representativeClusterGenres([...repeated('a', ['rock'], 3), ...repeated('b', ['jazz'], 3)]), []);
    assert.deepEqual(representativeClusterGenres([]), []);
});

test('rare genres survive beyond the old 32-tag limit; untagged and parent-only vectors stay unclassified', () => {
    const tracks = Array.from({ length: 80 }, (_, i) => repeated(`genre-${i}`, [`style ${i} house`], 3)).flat();
    tracks.push(...repeated('unknown', ['happy', 'favorites'], 5));
    const result = group(tracks);
    assert.equal(result.clusterCount, 80);
    assert.ok(tracks.slice(0, -5).every((_, i) => result.labels[i] >= 0));
    assert.ok(result.labels.slice(-5).every(label => label === -1));
    const capped = group([...repeated('common', ['deep house'], 20), ...repeated('rare', ['tech house'], 3)], { maxGenres: 1, maxParents: 8 });
    assert.ok(capped.labels.slice(-3).every(label => label === -1), 'Shared broad parents cannot replace missing direct evidence');
    assert.equal(group([{ genres: ['r&b'] }, { genres: ['taiwanese indie'] }]).clusterCount, 0);
});

test('artist names ending in genre words are not genres, but actual genre names remain valid', () => {
    assert.deepEqual(trackGenreTags({ artists: 'Beach House', genres: ['Beach House', 'dream pop'] }), ['dream pop']);
    assert.deepEqual(trackGenreTags({ artists: 'Daft Punk', genres: ['Daft Punk', 'house'] }), ['house']);
    assert.deepEqual(trackGenreTags({ name: 'Jazz', genres: ['jazz'] }), ['jazz']);
    assert.deepEqual(trackGenreTags({ name: 'Deep House', genres: ['deep house'] }), ['deep house']);
    assert.equal(clusterGenreName(['alternative r&b']), 'Alternative R&B');
});

test('actual worker routes unknown tracks to Mixed / Other and never merges two unrelated small libraries', async () => {
    let output;
    globalThis.self = { postMessage: value => { output = value; } };
    try {
        await import('../src/workers/kmeansWorker.js');
        const tracks = [...repeated('rnb', ['r&b'], 3), ...repeated('indie', ['taiwanese indie'], 3), ...repeated('unknown', [], 4)];
        self.onmessage({ data: { tracks, clusterBasis: 'genre' } });
        assert.equal(output.effectiveClusterBasis, 'genre');
        assert.notEqual(output.assignments[0], output.assignments[3]);
        assert.notEqual(output.assignments[0], output.noiseClusterId);
        assert.ok(output.assignments.slice(-4).every(label => label === output.noiseClusterId));
        assert.equal(output.centroids.length, 3);
        assert.ok(output.projection3D.every(point => point.every(Number.isFinite)));
        self.onmessage({ data: { tracks: [tracks[0], tracks[3]], clusterBasis: 'genre' } });
        assert.ok(output.assignments.every(label => label === output.noiseClusterId));
    } finally { delete globalThis.self; }
});
