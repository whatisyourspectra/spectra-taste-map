import test from 'node:test';
import assert from 'node:assert/strict';
import {
    createDecision,
    appendDecision,
    loadReflection,
    saveReflection,
    reflectionKey,
    reflectionChanges,
} from '../src/reflection/reflectionStorage.js';
import { uniqueTracks, buildTasteState } from '../src/taste/buildTasteState.js';

const mockTrackA = { id: 'track-a', name: 'Track A', artists: 'Artist A', genres: ['indie rock'] };
const mockTrackB = { id: 'track-b', name: 'Track B', artists: 'Artist B', genres: ['dream pop'] };

test('createDecision creates valid structured decisions with source', () => {
    const decision = createDecision('absorb', mockTrackA, 'web', 1000);
    assert.deepEqual(decision, {
        action: 'absorb',
        track: mockTrackA,
        source: 'web',
        at: 1000,
    });

    const mobileDecision = createDecision('dig', mockTrackB, 'mobile', 2000);
    assert.equal(mobileDecision.source, 'mobile');
    assert.equal(mobileDecision.action, 'dig');

    // Invalid actions or missing track IDs should return null
    assert.equal(createDecision('invalid', mockTrackA), null);
    assert.equal(createDecision('absorb', { name: 'No ID' }), null);
});

test('appendDecision updates reflection choices and preserves snapshot', () => {
    const data = new Map();
    const storage = {
        getItem: (k) => data.get(k),
        setItem: (k, v) => data.set(k, v),
    };
    const key = reflectionKey('guest', 'map-1');
    const dummySnapshot = {
        at: 500,
        ids: [mockTrackA.id],
        decisions: [],
        avatar: { nodes: [], edges: [], orbits: [], regions: [] },
    };

    saveReflection(storage, key, [], dummySnapshot);

    // Append a web discovery absorb
    const res1 = appendDecision(storage, key, 'absorb', mockTrackA, 'web');
    assert.equal(res1.length, 1);
    assert.equal(res1[0].source, 'web');
    assert.equal(res1[0].action, 'absorb');

    // Append a second decision
    const res2 = appendDecision(storage, key, 'dig', mockTrackB, 'mobile');
    assert.equal(res2.length, 2);

    // Overwriting track A with dig should update without duplicating
    const res3 = appendDecision(storage, key, 'dig', mockTrackA, 'web');
    assert.equal(res3.length, 2);
    const updatedA = res3.find((d) => d.track.id === mockTrackA.id);
    assert.equal(updatedA.action, 'dig');

    // Snapshot is preserved
    const loaded = loadReflection(storage, key);
    assert.equal(loaded.snapshot.at, 500);
    assert.equal(loaded.decisions.length, 2);
});

test('reflectionChanges identifies web decisions correctly', () => {
    const previous = {
        at: 500,
        ids: ['old-track'],
        decisions: [],
    };
    const webDecision = createDecision('absorb', mockTrackA, 'web', 1200);
    const changes = reflectionChanges(previous, [mockTrackA], [webDecision]);

    assert.equal(changes.choices.length, 1);
    assert.equal(changes.choices[0].source, 'web');
    assert.equal(changes.choices[0].action, 'absorb');
    assert.equal(changes.added.length, 1);
});

test('absorb expands library and taste state, while dig only enters orbit', () => {
    const initialLibrary = [mockTrackA];
    const absorbDecision = createDecision('absorb', mockTrackB, 'web', 1500);

    // When absorbed, uniqueTracks merges it into library
    const absorbedLibrary = uniqueTracks([...initialLibrary, absorbDecision.track]);
    assert.equal(absorbedLibrary.length, 2);

    const tasteAfterAbsorb = buildTasteState(absorbedLibrary, { decisions: [absorbDecision] });
    assert.ok(tasteAfterAbsorb.coreGenres.some((g) => g.genre === 'dream pop'));

    // When dig, library is not enlarged
    const digDecision = createDecision('dig', { id: 'track-c', name: 'Track C', genres: ['techno'] }, 'web');
    const libraryAfterDig = initialLibrary; // dig does not touch library
    const tasteAfterDig = buildTasteState(libraryAfterDig, { decisions: [digDecision] });

    // Core genres should remain from library only
    assert.ok(!tasteAfterDig.coreGenres.some((g) => g.genre === 'techno'));
    // But exploration targets or frontier can react to dig
    assert.ok(tasteAfterDig.explorationTargets.some((g) => g.genre === 'techno'));
});
