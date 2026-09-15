import test from 'node:test';
import assert from 'node:assert/strict';
import { projectPoint, projectSpectra, DEFAULT_CAMERA, clampZoom } from '../src/reflection/projectSpectra.js';
test('quarter turn retains depth rather than collapsing a flat plane', () => {
    const a = projectPoint({ x: 180, y: 166 }, { ...DEFAULT_CAMERA, yaw: Math.PI / 2 }, 'a');
    const b = projectPoint({ x: 180, y: 166 }, { ...DEFAULT_CAMERA, yaw: Math.PI / 2 }, 'b');
    assert.notEqual(a.x, b.x);
    const full = projectPoint({ x: 220, y: 120 }, { ...DEFAULT_CAMERA, yaw: Math.PI * 2 }, 'a');
    const start = projectPoint({ x: 220, y: 120 }, DEFAULT_CAMERA, 'a');
    assert.ok(Math.abs(full.x - start.x) < 1e-9);
    assert.ok(Math.abs(full.y - start.y) < 1e-9);
});
test('rotated edges stay attached, output stays finite and source is unchanged', () => {
    const nodes = [{ id: 'a', x: 110, y: 100, radius: 3, opacity: .8 }, { id: 'b', x: 250, y: 240, radius: 2, opacity: .6 }];
    const avatar = { nodes, edges: [{ from: 'a', to: 'b', a: nodes[0], b: nodes[1] }], orbits: [], regions: [] };
    const before = JSON.stringify(avatar);
    for (const yaw of [0, Math.PI / 2, Math.PI, 100]) {
        const result = projectSpectra(avatar, { yaw, pitch: 1.5, zoom: 2.4 });
        assert.equal(result.edges[0].a, result.nodes.find(n => n.id === 'a'));
        for (const node of result.nodes) for (const key of ['x', 'y', 'radius', 'depth', 'opacity']) assert.ok(Number.isFinite(node[key]));
    }
    assert.equal(JSON.stringify(avatar), before);
    assert.equal(clampZoom(50), 2.4);
    assert.equal(clampZoom(0), .65);
});
