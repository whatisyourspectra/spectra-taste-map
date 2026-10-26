import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { initialState, executeAction, parseCommand, restoreState, normalizeLibrary } from '../src/moodEngine.js';
import { createSimulator } from '../src/platform/simulator.js';
import { performCommand, decodeGleoAction, buildGleoCallback, responseOwner } from '../src/platform/commands.js';
import { DEMO_PLACES, getCommuteSuggestion, identifyPlace } from '../src/platform/journey.js';
import { readAudioFiles } from '../src/platform/localAudio.js';

const saveCommute = state => executeAction(state, parseCommand('이거 퇴근 모드로 기억해')).state;

test('full mood applies music and simulated lighting; music-only refinement preserves lighting', async () => {
  const platform = createSimulator();
  const applied = await performCommand(initialState(), parseCommand('스펙트라 오늘은 편안하게 가자'), platform);
  assert.equal(applied.lightingResult.status, 'simulated');
  assert.deepEqual(platform.getSnapshot().appliedLighting, applied.state.lighting);
  const before = platform.getSnapshot();
  const action = parseCommand('음악만 조금 더 신나게. 조명은 그대로');
  const adjusted = await performCommand(applied.state, action, platform);
  assert.ok(adjusted.state.energy > applied.state.energy);
  assert.deepEqual(adjusted.state.lighting, applied.state.lighting);
  assert.equal(adjusted.lightingResult.status, 'not_requested');
  assert.deepEqual(platform.getSnapshot(), before);
});

test('lighting-only updates leave music unchanged and saved scenes restore both independently', async () => {
  const platform = createSimulator();
  const first = await performCommand(initialState(), parseCommand('조명만 보라색으로 바꿔줘'), platform);
  const second = await performCommand(first.state, parseCommand('조명만 조금 더 밝게'), platform);
  assert.equal(second.state.energy, initialState().energy);
  assert.equal(second.state.brightness, initialState().brightness);
  assert.ok(second.state.lighting.brightness > first.state.lighting.brightness);
  const saved = saveCommute(second.state);
  const changed = await performCommand(saved, parseCommand('활기 있게'), platform);
  const recalled = await performCommand(changed.state, parseCommand('스펙트라 퇴근 모드로 바꿔줘', saved.saved), platform);
  assert.equal(recalled.state.energy, second.state.energy);
  assert.deepEqual(recalled.state.lighting, second.state.lighting);
  assert.deepEqual(platform.getSnapshot().appliedLighting, second.state.lighting);
  assert.deepEqual(restoreState(JSON.stringify(recalled.state)), recalled.state);
});

test('legacy saved music moods receive default lighting without losing saved settings', () => {
  const restored = restoreState(JSON.stringify({ mood: 'calm', energy: .32, brightness: .61,
    saved: [{ name: '퇴근 모드', mood: 'familiar', energy: .4, brightness: .8 }] }));
  assert.equal(restored.energy, .32);
  assert.equal(restored.saved[0].brightness, .8);
  assert.equal(restored.saved[0].lighting.color, '#c084fc');
  assert.deepEqual(restoreState(JSON.stringify(restored)), restored);
});

test('unsupported, read-only, and failed lighting never write or report application success', async () => {
  for (const access of ['none', 'read', 'error']) {
    const platform = createSimulator();
    platform.configure({ lightingAccess: access });
    const before = platform.getSnapshot().appliedLighting;
    const action = parseCommand('활기 있게');
    const result = await performCommand(initialState(), action, platform);
    assert.equal(result.ok, true, 'Music settings can still change');
    assert.equal(result.state.mood, 'uplift');
    assert.equal(platform.getSnapshot().lightingWrites, 0);
    assert.deepEqual(platform.getSnapshot().appliedLighting, before);
    const callback = buildGleoCallback(action, result, 'unavailable');
    assert.equal(callback.status, 'fail');
    assert.equal(JSON.parse(callback.data)[0].playback, 'unavailable');
    assert.equal(JSON.parse(callback.data)[0].simulation, true);
  }
  const platform = { async checkLightingCapability() { throw new Error('disconnected'); }, async applyLighting() { assert.fail('Must not write after capability failure'); } };
  const result = await performCommand(initialState(), parseCommand('활기 있게'), platform);
  assert.equal(result.lightingResult.status, 'error');
});

test('lighting permission is rechecked at the write boundary', async () => {
  const platform = createSimulator();
  assert.equal((await platform.checkLightingCapability()).access, 'read_write');
  platform.configure({ lightingAccess: 'read' });
  assert.equal((await platform.applyLighting(initialState().lighting)).status, 'read_only');
  assert.equal(platform.getSnapshot().lightingWrites, 0);
  platform.configure({ lightingAccess: 'write' });
  assert.equal((await platform.applyLighting(initialState().lighting)).status, 'simulated');
  assert.equal(platform.getSnapshot().lightingWrites, 1);
});

test('destination is matched to saved coordinates, and context only proposes a scene', () => {
  const state = saveCommute(initialState());
  const platform = createSimulator();
  platform.setDestination({ ...DEMO_PLACES.other, name: '집' });
  assert.equal(getCommuteSuggestion(state, platform.getSnapshot()), null, 'POI text must not identify home');
  platform.setDestination({ latitude: DEMO_PLACES.home.latitude + .0001, longitude: DEMO_PLACES.home.longitude });
  const before = JSON.stringify(state);
  const suggestion = getCommuteSuggestion(state, platform.getSnapshot());
  assert.equal(suggestion.source, 'navigation');
  assert.equal(suggestion.name, '퇴근 모드');
  assert.equal(JSON.stringify(state), before);
  assert.equal(platform.getSnapshot().lightingWrites, 0, 'Suggestions must not apply settings or play music');
  assert.equal(getCommuteSuggestion(initialState(), platform.getSnapshot()), null);
  assert.equal(identifyPlace({ latitude: Infinity, longitude: 0 }), null);
  assert.equal(identifyPlace({ latitude: 0, longitude: 0 }, { home: { latitude: .001, longitude: 0 }, work: { latitude: 0, longitude: 0 } }), 'work', 'Choose the nearest saved place when areas overlap');
});

test('geofence proposal is gated by support and stale location events cannot override another route', () => {
  const platform = createSimulator();
  const state = saveCommute(initialState());
  assert.equal(platform.emitWorkExit().ok, false);
  assert.equal(getCommuteSuggestion(state, platform.getSnapshot()), null);
  platform.configure({ locationSupported: true });
  assert.equal(platform.emitWorkExit().ok, true);
  assert.equal(getCommuteSuggestion(state, platform.getSnapshot()).source, 'location');
  platform.setDestination(DEMO_PLACES.other);
  platform.emitWorkExit();
  assert.equal(getCommuteSuggestion(state, platform.getSnapshot()), null);
  platform.configure({ locationSupported: false });
  assert.equal(platform.getSnapshot().locationEvent, null);
});

test('Gleo and app own separate voice responses; callbacks distinguish settings and playback', async () => {
  assert.equal(responseOwner('gleo', true), 'gleo');
  assert.equal(responseOwner('app', true), 'app');
  assert.equal(responseOwner('app', false), 'silent');
  const action = decodeGleoAction({ action: 'ADJUST_MOOD', actionParameters: { target: 'music', dimension: 'energy', direction: 'up' } });
  const result = await performCommand(initialState(), action, createSimulator());
  assert.equal(buildGleoCallback(action, result, 'unavailable', 'gleo').mode, 'voice');
  assert.equal(buildGleoCallback(action, result, 'unavailable', 'app').mode, 'silent');
  assert.equal(JSON.parse(buildGleoCallback(action, result, 'unavailable').data)[0].music, 'queue_updated');
  assert.throws(() => decodeGleoAction({ action: 'OPEN_DOOR', actionParameters: {} }));
  assert.throws(() => decodeGleoAction({ action: 'SET_MOOD', actionParameters: [] }));
});

test('Gleo schema supports the three callable actions, including scoped music/lighting adjustment', async () => {
  const schema = JSON.parse(await readFile(new URL('../integration/gleo/schema.json', import.meta.url)));
  assert.equal(schema.actionCalls.length, 3);
  for (const entry of schema.actionCalls) {
    const action = entry.function;
    assert.match(action.name, /^[A-Z]+(?:_[A-Z]+)+$/);
    assert.equal(action.component, 'activity');
  }
  const adjust = schema.actionCalls.find(item => item.function.name === 'ADJUST_MOOD').function;
  assert.deepEqual(adjust.parameters.properties.target.enum, ['music', 'lighting']);
  assert.ok(adjust.parameters.properties.dimension.enum.includes('color'));
});

test('local audio matches personal metadata and rejects ambiguous song-only filenames', () => {
  const library = normalizeLibrary({ tracks: [{ name: 'My song', artists: 'Artist A' }, { name: 'My song', artists: 'Artist B' }] });
  assert.throws(() => readAudioFiles([{ name: 'My song.mp3', type: 'audio/mpeg' }], library, () => 'blob:test'));
  const result = readAudioFiles([{ name: 'Artist B - My song.mp3', type: 'audio/mpeg' }], library, () => 'blob:test');
  assert.equal(result.matched, 1);
  assert.equal([...result.urls.keys()][0], library[1].id);
});
