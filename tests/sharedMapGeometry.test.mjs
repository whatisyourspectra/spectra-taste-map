import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { getMapPoints, buildMapEdges, zoomCameraAt, focusCameraOn } from '../src/share/sharedMapGeometry.js';

function screenPoint(point, camera, size) {
    return {
        x: camera.x + size.width / 2 + (point.x - size.width / 2) * camera.zoom,
        y: camera.y + size.height / 2 + (point.y - size.height / 2) * camera.zoom,
    };
}
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

test('shared map positions preserve feature direction, deterministic jitter, and control margins', () => {
    const tracks = [{ x: 0, y: 1 }, { x: 1, y: 0 }, { x: .5, y: .5 }, { x: -4, y: 9 }, { x: Infinity, y: NaN }, null];
    const before = JSON.stringify(tracks);
    for (const size of [{ width: 390, height: 440 }, { width: 800, height: 640 }, { width: 32, height: 64 }]) {
        const result = getMapPoints(tracks, size);
        assert.equal(result.length, tracks.length);
        assert.deepEqual(result, getMapPoints(tracks, size));
        for (const point of result) {
            assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
            assert.ok(point.x >= Math.min(32, size.width / 2) && point.x <= size.width - Math.min(32, size.width / 2));
            assert.ok(point.y >= Math.min(80, size.height / 2) && point.y <= size.height - Math.min(80, size.height / 2));
        }
        assert.ok(result[0].x <= result[1].x);
        assert.ok(result[0].y <= result[1].y);
    }
    assert.equal(JSON.stringify(tracks), before);
    assert.deepEqual(getMapPoints(null), []);
    assert.deepEqual(getMapPoints([{ x: .5, y: .5 }]), [{ x: 400, y: 344 }]);
    assert.ok(getMapPoints([{ x: .5, y: .5 }], { width: NaN, height: 0 }).every(point => Number.isFinite(point.x) && Number.isFinite(point.y)));
});

function referenceEdges(points, limit, neighbors) {
    const edges = new Set();
    points.forEach((point, index) => points.map((other, j) => ({ j, distance: Math.hypot(point.x - other.x, point.y - other.y) }))
        .filter(item => item.j !== index && item.distance <= limit)
        .sort((a, b) => a.distance - b.distance || a.j - b.j).slice(0, neighbors)
        .forEach(({ j }) => edges.add([index, j].sort((a, b) => a - b).join('-'))));
    return [...edges].map(edge => edge.split('-').map(Number)).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

test('bucket edges match an exact nearest-neighbor reference across boundaries and ties', () => {
    const points = Array.from({ length: 64 }, (_, index) => ({ x: ((index * 73) % 499) - 150, y: ((index * 109) % 397) - 120 }));
    points.push({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: -10, y: 0 }, { x: 0, y: 10 }, { x: 0, y: 0 });
    for (const distance of [10, 50, 125]) for (const count of [1, 2, 3]) {
        assert.deepEqual(buildMapEdges(points, distance, count), referenceEdges(points, distance, count));
    }
    assert.deepEqual(buildMapEdges([{ x: 0, y: 0 }, { x: 10, y: 0 }], 10), [[0, 1]]);
    assert.deepEqual(buildMapEdges([{ x: 0, y: 0 }, { x: 10.001, y: 0 }], 10), []);
    assert.deepEqual(buildMapEdges([{ x: 0, y: 0 }, null, { x: 3, y: 0 }], 5), [[0, 2]]);
    assert.deepEqual(buildMapEdges(points, 0), []);
    assert.deepEqual(buildMapEdges(points, 100, 0), []);
});

test('2,000-song input produces bounded real links without self-links or duplicates', () => {
    const points = getMapPoints(Array.from({ length: 2000 }, (_, index) => ({ x: ((index * 739) % 2003) / 2003, y: ((index * 1223) % 2011) / 2011 })), { width: 390, height: 540 });
    const begin = performance.now();
    const edges = buildMapEdges(points, 65);
    const elapsed = performance.now() - begin;
    assert.ok(edges.length > 1000 && edges.length <= points.length * 2);
    assert.equal(new Set(edges.map(edge => edge.join('-'))).size, edges.length);
    for (const [a, b] of edges) {
        assert.ok(a >= 0 && a < b && b < points.length);
        assert.ok(Math.hypot(points[a].x - points[b].x, points[a].y - points[b].y) <= 65 + 1e-9);
    }
    // A broad guard against accidental quadratic full-map sorting, not a
    // frame-rate benchmark that depends on a particular developer machine.
    assert.ok(elapsed < 2000, `2,000 songs took ${elapsed.toFixed(0)}ms`);
});

test('zooming preserves the anchor world point, including translated and clamped cameras', () => {
    const size = { width: 390, height: 540 };
    for (const camera of [{ x: 0, y: 0, zoom: 1 }, { x: 77, y: -43, zoom: 2.8 }]) {
        for (const anchor of [{ x: 0, y: 0 }, { x: 119, y: 353 }, { x: 390, y: 540 }]) {
            const world = { x: (anchor.x - camera.x - size.width / 2) / camera.zoom + size.width / 2, y: (anchor.y - camera.y - size.height / 2) / camera.zoom + size.height / 2 };
            for (const factor of [.01, .8, 1.3, 100]) {
                const next = zoomCameraAt(camera, anchor, factor, size);
                const screen = screenPoint(world, next, size);
                near(screen.x, anchor.x);
                near(screen.y, anchor.y);
                assert.ok(next.zoom >= .65 && next.zoom <= 4);
            }
        }
    }
    assert.deepEqual(zoomCameraAt({ x: 12, y: -7, zoom: 1 }, null, NaN, size), { x: 12, y: -7, zoom: 1 });
});

test('focusing centers the selected song and retains an existing enlarged view', () => {
    const size = { width: 360, height: 520 };
    const point = { x: 38, y: 401 };
    for (const zoom of [.65, 1, 2.6, 10]) {
        const camera = focusCameraOn(point, { x: 100, y: -80, zoom }, size);
        const screen = screenPoint(point, camera, size);
        near(screen.x, size.width / 2);
        near(screen.y, size.height / 2);
        assert.equal(camera.zoom, Math.max(1.35, Math.min(4, zoom)));
    }
    assert.deepEqual(focusCameraOn(null, {}, size), { x: 0, y: 0, zoom: 1.35 });
});
