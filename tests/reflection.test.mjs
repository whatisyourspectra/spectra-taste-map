import test from 'node:test';
import assert from 'node:assert/strict';
import { loadReflection, saveReflection, reflectionKey, reflectionChanges } from '../src/reflection/reflectionStorage.js';
const track = { id: 'a', name: 'A', genres: ['ambient'] };
const snapshot = { at: 123, ids: ['a'], decisions: [], avatar: { nodes: [], edges: [], orbits: [], regions: [] } };
test('reflection persists across visits and is scoped to owner and map', () => {
    const data = new Map();
    const storage = { getItem: (key) => data.get(key), setItem: (key, value) => data.set(key, value) };
    const key = reflectionKey('one', 'map');
    const decisions = [{ action: 'dig', track, at: 125 }];
    assert.equal(saveReflection(storage, key, decisions, snapshot), true);
    assert.deepEqual(loadReflection(storage, key), { decisions, snapshot });
    assert.equal(loadReflection(storage, reflectionKey('two', 'map')).snapshot, null);
    assert.equal(loadReflection(storage, reflectionKey('one', 'other')).snapshot, null);
});
test('first visit has no invented changes; unchanged choices are not new activity', () => {
    assert.deepEqual(reflectionChanges(null, [track], []), { added: [], removed: [], choices: [] });
    const choice = { action: 'dig', track, at: 125 };
    assert.equal(reflectionChanges({ ...snapshot, decisions: [choice] }, [track], [choice]).choices.length, 0);
    const absorb = { ...choice, action: 'absorb', at: 150 };
    assert.deepEqual(reflectionChanges({ ...snapshot, decisions: [choice] }, [], [absorb]), { added: [], removed: ['a'], choices: [absorb] });
});
test('storage failures and malformed snapshots have safe fallbacks', () => {
    const storage = { getItem: () => '{broken', setItem: () => { throw new Error('quota'); } };
    assert.deepEqual(loadReflection(storage, 'key'), { decisions: [], snapshot: null });
    assert.equal(saveReflection(storage, 'key', [], snapshot), false);
    assert.equal(loadReflection({ getItem: () => JSON.stringify({ version: 1, snapshot: {} }) }, 'key').snapshot, null);
});
