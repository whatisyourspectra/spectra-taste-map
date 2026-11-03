import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGenreFeatures } from '../src/taste/genreFeatures.js';
import { partitionGenreTracks, MAX_GENRE_GROUPS } from '../src/taste/genreClustering.js';
import { representativeClusterGenres, getClusterEvidence, clusterGenreName } from '../src/taste/clusterEvidence.js';
import { trackGenreTags } from '../src/taste/musicTags.js';

function group(tracks, options) {
    const features = buildGenreFeatures(tracks, options);
    return { ...features, ...partitionGenreTracks(tracks) };
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
    assert.ok(result.clusterCount <= MAX_GENRE_GROUPS);
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

test('all rare genres are included within 15 tags, independent of embedding vocabulary limits', () => {
    const tracks = Array.from({ length: 80 }, (_, i) => repeated(`genre-${i}`, [`style ${i} house`], 3)).flat();
    tracks.push(...repeated('unknown', ['happy', 'favorites'], 5));
    const result = group(tracks);
    assert.equal(result.clusterCount, 15);
    assert.ok(tracks.slice(0, -5).every((_, i) => result.labels[i] >= 0));
    assert.ok(result.labels.slice(-5).every(label => label === result.noiseClusterId));
    assert.equal(result.groups.reduce((sum, item) => sum + item.count, 0), tracks.length);
    assert.equal(result.groups[result.noiseClusterId].kind, 'unknown');
    const capped = group([...repeated('common', ['deep house'], 20), ...repeated('rare', ['tech house'], 3)], { maxGenres: 1, maxParents: 8 });
    assert.ok(capped.labels.slice(-3).every(label => label >= 0), 'Navigation does not discard tags omitted from the embedding');
    assert.notEqual(capped.labels[0], capped.labels.at(-1));
    assert.equal(group([{ genres: ['r&b'] }, { genres: ['taiwanese indie'] }]).clusterCount, 2);
});

test('artist names ending in genre words are not genres, but actual genre names remain valid', () => {
    assert.deepEqual(trackGenreTags({ artists: 'Beach House', genres: ['Beach House', 'dream pop'] }), ['dream pop']);
    assert.deepEqual(trackGenreTags({ artists: 'Daft Punk', genres: ['Daft Punk', 'house'] }), ['house']);
    assert.deepEqual(trackGenreTags({ name: 'Jazz', genres: ['jazz'] }), ['jazz']);
    assert.deepEqual(trackGenreTags({ name: 'Deep House', genres: ['deep house'] }), ['deep house']);
    assert.equal(clusterGenreName(['alternative r&b']), 'Alternative R&B');
});

test('actual worker includes an explicit unknown group and keeps unrelated small libraries separate', async () => {
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
        assert.equal(new Set(output.assignments).size, 2);
        assert.equal(output.noiseClusterId, null);
    } finally { delete globalThis.self; }
});

test('partition is exhaustive, exclusive, order independent and immutable across 5,000 diverse imports', () => {
    const styles = ['deep house', 'tech house', 'techno', 'synthpop', 'j-pop', 'k-pop', 'folk', 'indie rock', 'metal', 'punk', 'jazz', 'blues', 'r&b', 'neo soul', 'hip hop', 'trap', 'classical', 'soundtrack', 'reggae', 'ambient', 'afrobeats', 'experimental', 'chill'];
    const tracks = Array.from({ length: 5000 }, (_, i) => ({ id: `song-${i}`, name: `Song ${i}`, genres: i % 31 ? [styles[i % styles.length], styles[(i * 7) % styles.length]] : [], valence: null, metadataPending: i % 31 === 0 }));
    const before = JSON.stringify(tracks);
    const result = partitionGenreTracks(tracks);
    assert.equal(result.labels.length, tracks.length);
    assert.ok(result.groups.length <= 15);
    assert.equal(result.groups.reduce((sum, item) => sum + item.count, 0), tracks.length);
    result.groups.forEach((group, id) => assert.equal(result.labels.filter(label => label === id).length, group.count));
    assert.ok(result.labels.every(label => Number.isInteger(label) && label >= 0 && label < result.groups.length));
    const reversed = [...tracks].reverse().map(track => ({ ...track, genres: [...track.genres].reverse() }));
    const other = partitionGenreTracks(reversed);
    assert.deepEqual(other.groups, result.groups);
    assert.deepEqual(other.labels.reverse(), result.labels);
    assert.equal(JSON.stringify(tracks), before);
});

test('empty, single-song and entirely untagged libraries have complete honest partitions', () => {
    assert.equal(partitionGenreTracks([]).clusterCount, 0);
    const single = partitionGenreTracks([{ genres: ['jazz'] }]);
    assert.deepEqual(single.labels, [0]);
    assert.equal(single.groups[0].name, 'Jazz');
    const unknown = partitionGenreTracks([{ genres: [] }, { genres: ['happy'] }, { metadataPending: true }]);
    assert.deepEqual(unknown.labels, [0, 0, 0]);
    assert.equal(unknown.groups[0].kind, 'unknown');
    assert.equal(unknown.groups[0].count, 3);
});
