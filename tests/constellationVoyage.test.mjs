import test from 'node:test';
import assert from 'node:assert/strict';
import { buildVoyageSequence, getVoyageNeighbor } from '../src/taste/constellationTopology.js';
import { buildConstellationPreviewGeometry } from '../src/pages/constellationPreviewGeometry.js';

test('constellation overview projects map coordinates and connects visible stars', () => {
    const geometry = buildConstellationPreviewGeometry([
        { track: { id: 'seed' }, nX: 0.25, nY: 0.4, previewX: 100, previewY: 100 },
        { track: { id: 'nearby' }, nX: 0.75, nY: 0.6, previewX: 300, previewY: 200 },
    ], [{ from: 'seed', to: 'nearby' }], 'seed');

    assert.equal(geometry.hasLayout, true);
    assert.equal(geometry.nodes.length, 2);
    assert.equal(geometry.edges.length, 1);
    assert.equal(geometry.nodes.find((node) => node.id === 'seed').isSelected, true);
    assert.ok(geometry.nodes.every((node) => Number.isFinite(node.x) && Number.isFinite(node.y)));
    assert.ok(Object.values(geometry.edges[0]).every(Number.isFinite));
    const seed = geometry.nodes.find((node) => node.id === 'seed');
    const nearby = geometry.nodes.find((node) => node.id === 'nearby');
    assert.equal((nearby.x - seed.x) / (nearby.y - seed.y), 2);
    assert.deepEqual(geometry.edges[0], { x1: seed.x, y1: seed.y, x2: nearby.x, y2: nearby.y });

    const fallback = buildConstellationPreviewGeometry([
        { track: { id: 'seed' }, nX: 0.25, nY: 0.4 },
        { track: { id: 'nearby' }, nX: 0.75, nY: 0.6 },
    ], [], 'seed');
    assert.equal(fallback.hasLayout, true);
    assert.ok(fallback.nodes.every((node) => Number.isFinite(node.x) && Number.isFinite(node.y)));

    const pending = buildConstellationPreviewGeometry([], [], 'seed');
    assert.equal(pending.hasLayout, false);
    assert.deepEqual(pending.nodes.map((node) => node.id), ['seed']);
    assert.deepEqual(pending.edges, []);
});

test('buildVoyageSequence returns empty array for empty tracks', () => {
    assert.deepEqual(buildVoyageSequence([]), []);
    assert.deepEqual(buildVoyageSequence(null), []);
});

test('buildVoyageSequence returns single track id for single track', () => {
    const tracks = [{ id: 'track-1' }];
    assert.deepEqual(buildVoyageSequence(tracks), ['track-1']);
});

test('buildVoyageSequence visits all tracks starting from designated track', () => {
    const tracks = [
        { id: 'track-1' },
        { id: 'track-2' },
        { id: 'track-3' },
        { id: 'track-4' },
    ];
    const edges = [
        { from: 'track-1', to: 'track-2' },
        { from: 'track-2', to: 'track-3' },
        { from: 'track-3', to: 'track-4' },
    ];

    const sequence = buildVoyageSequence(tracks, edges, 'track-2');
    assert.equal(sequence.length, 4);
    assert.equal(sequence[0], 'track-2'); // Starts at selected track
    assert.deepEqual(new Set(sequence), new Set(['track-1', 'track-2', 'track-3', 'track-4']));
});

test('buildVoyageSequence visits disconnected cluster tracks safely', () => {
    const tracks = [
        { id: 'track-a' },
        { id: 'track-b' },
        { id: 'track-c' },
    ];
    // No edges
    const sequence = buildVoyageSequence(tracks, [], 'track-c');
    assert.equal(sequence.length, 3);
    assert.equal(sequence[0], 'track-c');
    assert.deepEqual(new Set(sequence), new Set(['track-a', 'track-b', 'track-c']));
});

test('voyage advances through its fixed order and stops at either end', () => {
    const sequence = ['seed', 'second', 'last'];
    assert.equal(getVoyageNeighbor(sequence, 'seed', 1), 'second');
    assert.equal(getVoyageNeighbor(sequence, 'second', 1), 'last');
    assert.equal(getVoyageNeighbor(sequence, 'last', 1), null);
    assert.equal(getVoyageNeighbor(sequence, 'seed', -1), null);
});

test('getConstellationInfo generates valid fallback and cluster metadata', async () => {
    const { getConstellationInfo } = await import('../src/taste/constellationTopology.js');

    // Null cluster fallback
    const fallbackKo = getConstellationInfo(null, 'ko');
    assert.equal(fallbackKo.name, '나의 별자리');
    assert.ok(fallbackKo.poem.length > 0);
    assert.ok(fallbackKo.color);

    const fallbackEn = getConstellationInfo(null, 'en');
    assert.equal(fallbackEn.name, 'Starlight Cluster');

    // With cluster
    const cluster = {
        j: 2,
        color: '#6366f1',
        label: {
            name: '신스웨이브 성좌',
            symbol: 'matrix',
            summary: '네온 불빛 아래 춤추는 신디사이저의 밤',
        },
        topGenres: ['synthwave', 'retrowave', 'electronic'],
    };

    const info = getConstellationInfo(cluster, 'ko');
    assert.equal(info.name, '신스웨이브 별자리');
    assert.equal(info.symbol, 'matrix');
    assert.equal(info.color, '#6366f1');
    assert.equal(info.essence, 'synthwave · retrowave · electronic');
    assert.equal(info.poem, '“네온 불빛 아래 춤추는 신디사이저의 밤”');
});

test('buildSeedConstellation extracts a focused 8-star subset around seed track', async () => {
    const { buildSeedConstellation, buildVoyageSequence } = await import('../src/taste/constellationTopology.js');

    // Safe fallback on empty
    assert.deepEqual(buildSeedConstellation(null, []).trackIds, []);
    assert.deepEqual(buildSeedConstellation({ id: 't1' }, []).trackIds, ['t1']);

    // Create a mock pool of 30 stars across 2 clusters
    const seedTrack = { id: 'seed', name: 'Seed Star' };
    const nodes = [
        { id: 'seed', track: seedTrack, nX: 0.5, nY: 0.5, clusterId: 1, color: '#60a5fa' },
    ];
    for (let i = 1; i <= 20; i++) {
        nodes.push({
            id: `c1-${i}`,
            track: { id: `c1-${i}`, name: `Track ${i}` },
            nX: 0.5 + (i * 0.02),
            nY: 0.5 + (i * 0.01),
            clusterId: 1,
            color: '#60a5fa',
        });
    }
    for (let i = 1; i <= 10; i++) {
        nodes.push({
            id: `c2-${i}`,
            track: { id: `c2-${i}`, name: `Other ${i}` },
            nX: 0.9,
            nY: 0.9,
            clusterId: 2,
            color: '#f43f5e',
        });
    }

    // Request maxStars = 8
    const result = buildSeedConstellation(seedTrack, nodes, { maxStars: 8 });

    assert.equal(result.nodes.length, 8);
    assert.equal(result.tracks.length, 8);
    assert.equal(result.trackIds.length, 8);
    assert.equal(result.trackIds[0], 'seed'); // Starts with seed track
    assert.ok(result.edges.length >= 7); // Connected tree

    // Ensure all selected tracks are from the closest candidates (cluster 1)
    result.trackIds.forEach((id) => {
        assert.ok(id.startsWith('seed') || id.startsWith('c1-'));
    });

    // Sequence generated from this constellation starts at seed track and visits all 8
    const sequence = buildVoyageSequence(result.tracks, result.edges, seedTrack.id);
    assert.equal(sequence.length, 8);
    assert.equal(sequence[0], 'seed');
    assert.deepEqual(new Set(sequence), new Set(result.trackIds));
});

test('buildPlanarSeedTopology produces non-crossing edges', async () => {
    const { buildPlanarSeedTopology } = await import('../src/taste/constellationTopology.js');

    // Create a 2x2 grid with center, diagonals could cross if not planar
    const points = [
        { id: 'p0', nX: 0.1, nY: 0.1 },
        { id: 'p1', nX: 0.9, nY: 0.1 },
        { id: 'p2', nX: 0.1, nY: 0.9 },
        { id: 'p3', nX: 0.9, nY: 0.9 },
        { id: 'p4', nX: 0.5, nY: 0.5 },
    ];

    const edges = buildPlanarSeedTopology(points);
    assert.ok(edges.length >= 4);

    // Segment intersection check helper
    function ccw(p1, p2, p3) {
        return (p3.y - p1.y) * (p2.x - p1.x) > (p2.y - p1.y) * (p3.x - p1.x);
    }
    function intersects(a1, a2, b1, b2) {
        if (a1.id === b1.id || a1.id === b2.id || a2.id === b1.id || a2.id === b2.id) return false;
        return (ccw(a1, b1, b2) !== ccw(a2, b1, b2)) && (ccw(a1, a2, b1) !== ccw(a1, a2, b2));
    }

    const pMap = new Map(points.map((p) => [p.id, { id: p.id, x: p.nX, y: p.nY }]));
    for (let i = 0; i < edges.length; i++) {
        for (let j = i + 1; j < edges.length; j++) {
            const e1 = edges[i];
            const e2 = edges[j];
            const a1 = pMap.get(e1.from);
            const a2 = pMap.get(e1.to);
            const b1 = pMap.get(e2.from);
            const b2 = pMap.get(e2.to);
            assert.equal(intersects(a1, a2, b1, b2), false, `Edges ${e1.from}-${e1.to} and ${e2.from}-${e2.to} must not cross`);
        }
    }
});
