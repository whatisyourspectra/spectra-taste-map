import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTasteState } from '../../src/taste/buildTasteState.js';
import { normalizeLibrary } from '../src/moodEngine.js';
import { demoLibrary } from '../src/demoLibrary.js';
import { applyDriveCommand, baselineMood, buildDriveTaste, selectDriveQueue } from '../src/cockpit/queue.js';

test('driver mood reranks upcoming tracks without changing the SPECTRA profile or current track', () => {
  const library = normalizeLibrary(demoLibrary);
  const profile = buildDriveTaste(library);
  assert.deepEqual(profile, buildTasteState(library.map(track => ({ ...track, genres: track.tags, valence: track.brightness }))));
  const baseline = structuredClone(profile);
  const original = structuredClone(library);
  const current = library.find(track => track.name === '익숙한 거리');
  const initial = baselineMood(profile);
  const before = selectDriveQueue(library, profile, initial, current.id);
  const calm = applyDriveCommand(initial, profile, '퇴근길이니까 좀 편안하게');
  assert.equal(calm.ok, true);
  const after = selectDriveQueue(library, profile, calm.state, current.id);
  assert.notDeepEqual(before.map(track => track.id), after.map(track => track.id));
  assert.equal(after.some(track => track.id === current.id), false);
  assert.deepEqual(profile, baseline);
  assert.deepEqual(library, original);
  assert.deepEqual(calm.state.lighting, initial.lighting);
  const restored = applyDriveCommand(calm.state, profile, '기본 취향으로');
  assert.deepEqual(selectDriveQueue(library, profile, restored.state, current.id).map(track => track.id), before.map(track => track.id));
});

test('unsupported, negated and lighting requests cannot mutate the music session', () => {
  const profile = buildDriveTaste(normalizeLibrary(demoLibrary));
  const initial = baselineMood(profile);
  for (const text of ['편안하게 하지 마', '조명만 보라색으로 바꿔줘', '모르는 요청']) {
    const result = applyDriveCommand(initial, profile, text);
    assert.equal(result.ok, false);
    assert.deepEqual(result.state, initial);
  }
});
