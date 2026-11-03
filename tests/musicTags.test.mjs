import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalMusicTag, classifyMusicTags, trackGenreTags, findMusicTagScore } from '../src/taste/musicTags.js';
import { buildGenreFeatures } from '../src/taste/genreFeatures.js';
import { buildTasteState } from '../src/taste/buildTasteState.js';
import { buildMobileMapModel } from '../src/taste/mobileMapModel.js';
import { getClusterEvidence } from '../src/taste/clusterEvidence.js';

test('equivalent genre spellings collapse, while musically different subgenres stay distinct', () => {
    const tags = classifyMusicTags([' ＨＩＰ－ＨＯＰ ', 'hiphop', 'Hip Hop', 'RNB', 'R & B', 'drum & bass', 'DnB', 'lo fi', 'lofi', 'Deep House', 'Tech House']);
    assert.deepEqual(tags.genres, ['hip hop', 'r&b', 'drum and bass', 'lo-fi', 'deep house', 'tech house']);
    assert.equal(canonicalMusicTag('instrumental hip-hop'), 'instrumental hip hop');
    assert.equal(canonicalMusicTag('Korean HIPHOP'), 'korean hip hop');
    assert.equal(canonicalMusicTag('Liquid Drum & Bass'), 'liquid drum and bass');
    assert.equal(canonicalMusicTag('Alternative R & B'), 'alternative r&b');
    assert.deepEqual(classifyMusicTags(['RNB / Soul']).genres, ['r&b', 'soul']);
});

test('genres, mood, eras, styles, community metadata and unknown tags retain separate evidence', () => {
    const raw = ['Dream-Pop', 'Indie Rock', 'chill', '90s', "1980's", 'female vocalists', 'favorites', 'instrumental', 'Tame Impala', 'a rare unreviewed style'];
    const result = classifyMusicTags(raw, { exclude: ['Tame Impala'] });
    assert.deepEqual(result.rawTags, raw);
    assert.deepEqual(result.genres, ['dream pop', 'indie rock']);
    assert.deepEqual(result.moodTags, ['chill']);
    assert.deepEqual(result.eraTags, ['1990s', '1980s']);
    assert.deepEqual(result.styleTags, ['instrumental']);
    assert.deepEqual(result.contextTags, ['female vocalists', 'favorites', 'tame impala']);
    assert.deepEqual(result.otherTags, ['a rare unreviewed style']);
    assert.deepEqual(classifyMusicTags(['chillout']).genres, ['chillout'], 'A recognized genre can also be a mood');
    assert.deepEqual(classifyMusicTags([null, {}, 42]).genres, []);
    assert.deepEqual(classifyMusicTags(['best rock songs', 'i love jazz']).genres, []);
});

test('legacy maps, mobile filters and cluster evidence use the same cleaned genres without rewriting songs', () => {
    const tracks = [
        { id: 'one', name: 'Jazz', artists: 'Artist', genres: ['jazz', 'hip-hop', 'hiphop', 'chill', '90s'] },
        { id: 'two', name: 'Another', artists: 'Artist', genres: ['HIP HOP', 'happy', 'seen live'] },
    ];
    const before = JSON.stringify(tracks);
    assert.deepEqual(trackGenreTags(tracks[0]), ['jazz', 'hip hop'], 'A song title must not suppress a real genre');
    const model = buildMobileMapModel(tracks);
    assert.equal(model.genres.reduce((sum, item) => sum + item.count, 0), tracks.length);
    assert.ok(model.library.every(track => track.mapGenreKey));
    assert.deepEqual(getClusterEvidence({ members: tracks }).genres, [{ genre: 'hip hop', label: 'Hip Hop', count: 2 }, { genre: 'jazz', label: 'Jazz', count: 1 }]);
    const state = buildTasteState(tracks);
    assert.equal(state.coreGenres.find(item => item.genre === 'hip hop').strength, .75);
    assert.equal(JSON.stringify(tracks), before);
});

test('genre embeddings connect related subgenres weakly, preserve detail and ignore shared moods', () => {
    const tracks = ['deep house', 'tech house', 'rock'].map((genre, index) => ({ id: `${index}`, genres: [genre, 'chill', '1990s'] }));
    const before = JSON.stringify(tracks);
    const { points, vocab } = buildGenreFeatures(tracks);
    const similarity = (a, b) => points[a].reduce((sum, v, i) => sum + v * points[b][i], 0);
    assert.ok(vocab.includes('deep house') && vocab.includes('tech house') && vocab.includes('house'));
    assert.ok(!vocab.includes('chill') && !vocab.includes('1990s'));
    assert.ok(similarity(0, 1) > similarity(0, 2));
    assert.ok(similarity(0, 1) < 1, 'Shared parents do not erase distinct subgenres');
    assert.ok(points.every(point => Math.abs(Math.hypot(...point) - 1) < 1e-10));
    assert.equal(JSON.stringify(tracks), before);
    const alias = buildGenreFeatures([{ genres: ['hip-hop'] }, { genres: ['HIPHOP', 'happy', 'favorites'] }]);
    assert.deepEqual(alias.points[0], alias.points[1]);
    const reversed = buildGenreFeatures([...tracks].reverse());
    assert.deepEqual(reversed.vocab, vocab);
    assert.deepEqual(reversed.points.reverse(), points);
});

test('specific genre scoring takes precedence and unrelated words cannot match mood/genre substrings', () => {
    const scores = [['rock', [0.52, .75]], ['indie rock', [.55, .68]], ['happy', [.85, .6]], ['pop', [.76, .65]], ['r&b', [.68, .52]]];
    assert.deepEqual(findMusicTagScore('indie rock', scores), [.55, .68]);
    assert.deepEqual(findMusicTagScore('british indie rock', scores), [.55, .68]);
    assert.deepEqual(findMusicTagScore('RNB', scores), [.68, .52]);
    assert.equal(findMusicTagScore('unhappy', scores), null);
    assert.equal(findMusicTagScore('Pop Smoke', scores), null);
});

test('actual worker groups spelling variants together and excludes non-genre metadata from its vocabulary', async () => {
    let output;
    globalThis.self = { postMessage: data => { output = data; } };
    try {
        await import('../src/workers/kmeansWorker.js');
        const variants = [['hip-hop', 'hiphop', 'hip hop'], ['deep-house', 'deep house'], ['rock']];
        const tracks = variants.flatMap((genres, group) => Array.from({ length: 20 }, (_, index) => ({ id: `${group}-${index}`, genres: [genres[index % genres.length], index % 2 ? 'chill' : 'happy', '90s'] })));
        self.onmessage({ data: { tracks, clusterBasis: 'genre' } });
        assert.equal(output.effectiveClusterBasis, 'genre');
        assert.equal(new Set(output.assignments).size, 3);
        for (let group = 0; group < 3; group++) assert.equal(new Set(output.assignments.slice(group * 20, group * 20 + 20)).size, 1);
        assert.ok(!output.genreVocab.includes('chill') && !output.genreVocab.includes('1990s'));
        assert.ok(output.points.every(point => point.every(Number.isFinite)));
        assert.ok(output.centroids.every(point => point.length === output.genreVocab.length));
        const diverse = Array.from({ length: 30 }, (_, group) => Array.from({ length: 20 }, (_, index) => ({ id: `${group}-${index}`, genres: [`style ${group} house`] }))).flat();
        self.onmessage({ data: { tracks: diverse, clusterBasis: 'genre' } });
        assert.equal(output.noiseClusterId, null, 'A large vocabulary must not force coherent small groups into noise');
        assert.equal(new Set(output.assignments).size, 15);
        assert.equal(output.genreGroups.reduce((sum, item) => sum + item.count, 0), diverse.length);
        self.onmessage({ data: { tracks: [{ genres: [] }, { genres: ['happy'] }], clusterBasis: 'genre' } });
        assert.equal(output.effectiveClusterBasis, 'genre');
        assert.equal(output.genreGroups[0].name, 'Mixed');
    } finally { delete globalThis.self; }
});
