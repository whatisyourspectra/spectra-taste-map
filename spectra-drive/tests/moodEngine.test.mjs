import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initialState, executeAction, parseCommand, normalizeLibrary, rankTracks, restoreState } from '../src/moodEngine.js';
import { demoLibrary } from '../src/demoLibrary.js';

test('commute request → relative adjustment → save → recall preserves personal settings', () => {
  let state = executeAction(initialState(), parseCommand('퇴근했어. 좀 편안하게 가자')).state;
  const previous = state;
  state = executeAction(state, parseCommand('조금 더 밝게')).state;
  assert.equal(state.mood, 'calm');
  assert.equal(state.energy, previous.energy);
  assert.ok(state.brightness > previous.brightness);
  state = executeAction(state, parseCommand('이거 퇴근 모드로 기억해')).state;
  assert.equal(state.saved[0].name, '퇴근 모드');
  const remembered = state.brightness;
  state = executeAction(state, parseCommand('활기 있게')).state;
  state = executeAction(state, parseCommand('퇴근 모드로 바꿔줘', state.saved)).state;
  assert.equal(state.brightness, remembered);
  assert.equal(state.mood, 'calm');
  assert.deepEqual(restoreState(JSON.stringify(state)), state);
});

test('unrecognized or negated requests do not mutate the mood', () => {
  const state = initialState();
  for (const input of ['편안하게 하지 마', '기억하지마', '저장하지 말아', '밝게 말고 익숙하게', '삭제해줘', '']) {
    const result = executeAction(state, parseCommand(input));
    assert.equal(result.ok, false, input);
    assert.strictEqual(result.state, state);
  }
  assert.equal(executeAction(state, { name: 'SET_MOOD', parameters: { mood: '__proto__' } }).ok, false);
  assert.equal(executeAction(state, { name: 'ADJUST_MOOD', parameters: { dimension: 'volume', direction: 'up' } }).ok, false);
});

test('relative adjustments stay within bounds and saved names update rather than duplicate', () => {
  let state = initialState();
  for (let index = 0; index < 20; index++) state = executeAction(state, parseCommand('조금만 신나게')).state;
  assert.equal(state.energy, 1);
  for (let index = 0; index < 20; index++) state = executeAction(state, parseCommand('에너지 줄여줘')).state;
  assert.equal(state.energy, 0);
  for (let index = 0; index < 2; index++) state = executeAction(state, { name: 'SAVE_MOOD', parameters: { name: '나의 무드' } }).state;
  assert.equal(state.saved.length, 1);
  assert.equal(executeAction(state, { name: 'SAVE_MOOD', parameters: { name: 'calm' } }).ok, false);
});

test('recommendations change with the target and include only imported tracks', () => {
  const tracks = normalizeLibrary(demoLibrary);
  const calm = rankTracks(tracks, initialState());
  const upliftState = executeAction(initialState(), parseCommand('활기 있게')).state;
  const uplift = rankTracks(tracks, upliftState);
  assert.notEqual(calm[0].id, uplift[0].id);
  assert.ok(calm[0].energy < uplift[0].energy);
  assert.ok(uplift.every(track => tracks.some(item => item.id === track.id)));
});

test('personal import deduplicates tracks and explains unavailable mood metadata', () => {
  const tracks = normalizeLibrary({ tracks: [
    { name: 'My song', artists: [{ name: 'My artist' }], genres: ['ambient'], energy: null, valence: 0.6 },
    { name: 'MY SONG', artists: 'MY ARTIST' },
    { name: 'Unknown mood', artists: 'Other artist', energy: 'high' },
    { invalid: true },
  ] });
  assert.equal(tracks.length, 2);
  assert.equal(tracks[0].artist, 'My artist');
  assert.equal(tracks[0].energy, 0.25);
  assert.equal(tracks[1].basis, '무드 정보 없음 · 중간값 적용');
  assert.throws(() => normalizeLibrary({ tracks: [] }));
  assert.throws(() => normalizeLibrary({ tracks: Array(5001).fill({ name: 'Song' }) }));
  assert.deepEqual(restoreState('{broken'), initialState());
  assert.deepEqual(restoreState(JSON.stringify({ mood: '__proto__', energy: 0.5, brightness: 0.5 })), initialState());
});
