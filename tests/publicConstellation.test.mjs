import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPublicConstellation, PUBLIC_CONSTELLATION_CAMERA, PUBLIC_GENRE_STAR_LIMIT } from '../src/social/publicConstellation.js';
import { projectSpectra } from '../src/reflection/projectSpectra.js';

const genres = [{ genre: 'house', strength: .45 }, { genre: 'r&b', strength: .35 }, { genre: 'soul', strength: .2 }];
const songs = Array.from({ length: 8 }, (_, i) => ({ id: `private-id-${i}`, name: `Song ${i}`, artists: `Artist ${i}`,
    genres: i % 2 ? ['rnb', 'soul'] : ['house'], secret: 'private-token' }));

test('public constellation separates real shared song stars from genre stars without exposing private fields', () => {
    const input = { genreProfile: genres, tracks: songs, privateHistory: 'secret' };
    const before = JSON.stringify(input);
    const model = buildPublicConstellation(input);
    assert.equal(model.avatar.nodes.filter(node => node.kind === 'track').length, 8);
    assert.equal(model.avatar.nodes.filter(node => node.kind === 'genre').length, 3);
    assert.ok(model.avatar.nodes.filter(node => node.kind === 'track').every(node => model.tracks.some(track => track.id === node.id)));
    assert.ok(model.avatar.nodes.filter(node => node.kind === 'genre').every(node => model.genres.some(genre => genre.genre === node.genre)));
    assert.doesNotMatch(JSON.stringify(model), /private-id|private-token|privateHistory/);
    assert.equal(JSON.stringify(input), before);
    assert.deepEqual(model, buildPublicConstellation({ genreProfile: [...genres].reverse(), tracks: songs }));
});

test('genre-only and older snapshots do not fabricate song metadata or genre associations', () => {
    const onlyGenres = buildPublicConstellation({ trackCount: 1932, genreProfile: genres, tracks: [] });
    assert.equal(onlyGenres.tracks.length, 0);
    assert.ok(onlyGenres.avatar.nodes.every(node => node.kind === 'genre'));
    const legacy = buildPublicConstellation({ genreProfile: genres, tracks: songs.map(({ genres: _genres, ...song }) => song) });
    assert.ok(legacy.avatar.nodes.filter(node => node.kind === 'track').every(node => node.genre === 'unclassified'));
    assert.deepEqual(buildPublicConstellation(null).avatar.nodes, []);
});

test('large public summaries stay bounded, deterministic and fitted to a 3D sphere', () => {
    const model = buildPublicConstellation({ genreProfile: Array.from({ length: 512 }, (_, i) => ({ genre: `genre-${i}`, strength: 1 / 512 })), tracks: Array.from({ length: 100 }, (_, i) => ({ ...songs[i % 8], name: `Song ${i}` })) });
    assert.equal(model.genres.length, PUBLIC_GENRE_STAR_LIMIT);
    assert.equal(model.tracks.length, 24);
    assert.ok(model.avatar.nodes.length <= 24 + PUBLIC_GENRE_STAR_LIMIT);
    for (const node of model.avatar.nodes) {
        assert.ok(Math.hypot(node.x - 180, node.y - 166, node.z) <= 126.00001);
        assert.ok(Number.isFinite(node.x) && Number.isFinite(node.y) && Number.isFinite(node.z));
    }
});

test('actual XYZ rotation changes star positions, sizes and depth order while keeping links attached', () => {
    const model = buildPublicConstellation({ genreProfile: genres, tracks: songs });
    const before = JSON.stringify(model);
    const start = projectSpectra(model.avatar, PUBLIC_CONSTELLATION_CAMERA);
    for (const yaw of [Math.PI / 2, Math.PI, 11]) {
        const view = projectSpectra(model.avatar, { yaw, pitch: .7, zoom: 1 });
        assert.notDeepEqual(view.nodes.map(node => [node.x, node.y, node.radius]), start.nodes.map(node => [node.x, node.y, node.radius]));
        assert.ok(view.nodes.every((node, i) => !i || node.depth >= view.nodes[i - 1].depth));
        for (const edge of view.edges) {
            assert.equal(edge.a, view.nodes.find(node => node.id === edge.from));
            assert.equal(edge.b, view.nodes.find(node => node.id === edge.to));
        }
    }
    const fullTurn = projectSpectra(model.avatar, { ...PUBLIC_CONSTELLATION_CAMERA, yaw: PUBLIC_CONSTELLATION_CAMERA.yaw + Math.PI * 2 });
    for (const node of fullTurn.nodes) {
        const original = start.nodes.find(item => item.id === node.id);
        assert.ok(Math.abs(node.x - original.x) < 1e-8 && Math.abs(node.y - original.y) < 1e-8);
    }
    assert.equal(JSON.stringify(model), before);
});
