import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTasteState, describeTasteState } from '../src/taste/buildTasteState.js';
import { buildAvatarState, buildAvatarReaction, AVATAR_NODE_LIMIT, AVATAR_ORBIT_LIMIT } from '../src/avatar/buildAvatarState.js';

const track = (id, genres = ['indie'], extra = {}) => ({ id, name: `Track ${id}`, artists: 'Artist', genres, energy: 0.4, valence: 0.3, ...extra });
const library = Array.from({ length: 20 }, (_, index) => track(`base-${index}`));

test('empty, missing and invalid features remain finite; real zeros survive', () => {
    assert.deepEqual(buildTasteState([]), { coreGenres: [], emergingGenres: [], averageEnergy: 0.5, averageValence: 0.5, diversity: 0, explorationTargets: [] });
    const state = buildTasteState([track('zero', [], { energy: 0, valence: 0 }), track('missing', [], { energy: null, valence: NaN })]);
    assert.equal(state.averageEnergy, 0);
    assert.equal(state.averageValence, 0);
    assert.deepEqual(state.coreGenres, []);
    assert.equal(buildAvatarState(state, [track('zero', [])]).nodes.length, 1);
});

test('genre normalization, deduplication and per-track mass avoid tag-count bias', () => {
    const state = buildTasteState([track('a', [' Pop ', 'pop', 'house']), track('b', ['rock']), track('b', ['rock'])]);
    assert.equal(state.coreGenres.find((item) => item.genre === 'rock').strength, 0.5);
    assert.equal(state.coreGenres.find((item) => item.genre === 'pop').strength, 0.25);
    assert.equal(state.emergingGenres.length, 0);
});

test('Dig only changes frontier, Pop does not erase established library taste', () => {
    const base = buildTasteState(library);
    const decision = { action: 'dig', track: track('discovery', ['techno'], { energy: 1, valence: 1 }) };
    const dig = buildTasteState(library, { decisions: [decision] });
    assert.deepEqual({ ...dig, explorationTargets: [] }, base);
    assert.equal(dig.explorationTargets[0].genre, 'techno');
    const graph = buildAvatarState(dig, library, [decision]);
    assert.equal(graph.orbits.length, 1);
    assert.equal(graph.nodes.some((node) => node.id === 'discovery'), false);
    assert.equal(graph.edges.some((edge) => edge.from === 'discovery' || edge.to === 'discovery'), false);
    assert.deepEqual(buildTasteState(library, { decisions: [{ action: 'pop', track: library[0] }] }), base);
});

test('Absorb introduces a connected emerging star, then gradual strength moves its region inward', () => {
    const decisions = [1, 2, 3, 4].map((id) => ({ action: 'absorb', track: track(`new-${id}`, ['shoegaze']) }));
    const first = buildTasteState(library, { decisions: decisions.slice(0, 1) });
    const later = buildTasteState(library, { decisions: decisions.slice(0, 3) });
    assert.equal(first.coreGenres[0].genre, 'indie');
    assert.ok(later.emergingGenres[0].strength > first.emergingGenres[0].strength);
    const firstAvatar = buildAvatarState(first, library, decisions.slice(0, 1));
    const laterAvatar = buildAvatarState(later, library, decisions.slice(0, 3));
    const regionRadius = (avatar) => { const r = avatar.regions.find((item) => item.genre === 'shoegaze'); return Math.hypot(r.x - 180, r.y - 166); };
    assert.ok(regionRadius(laterAvatar) < regionRadius(firstAvatar));
    assert.equal(firstAvatar.edges.filter((edge) => edge.from === 'new-1' || edge.to === 'new-1').length, 1);
    const promoted = buildTasteState(library, { decisions });
    assert.ok(promoted.coreGenres.some((item) => item.genre === 'shoegaze'));
    assert.equal(promoted.emergingGenres.length, 0);
    assert.ok(describeTasteState(first, 'en').includes('Shoegaze'));
});

test('recent emergence requires dated historical evidence; dates in the future do not count', () => {
    const now = Date.parse('2026-09-09T00:00:00Z');
    const old = library.map((item) => ({ ...item, addedAt: '2025-01-01' }));
    const newTrack = track('recent', ['ambient'], { addedAt: '2026-09-01' });
    assert.equal(buildTasteState([newTrack], { now }).emergingGenres.length, 0);
    assert.equal(buildTasteState([...old, newTrack], { now }).emergingGenres[0].genre, 'ambient');
    assert.equal(buildTasteState([...old, { ...newTrack, addedAt: '2030-01-01' }], { now }).emergingGenres.length, 0);
});

test('different libraries change shape, color, spread and pulse; reordering is stable', () => {
    const quiet = library.map((item) => ({ ...item, genres: ['ambient'], energy: 0.1 }));
    const diverse = library.map((item, index) => ({ ...item, genres: [['house', 'soul', 'rock', 'pop'][index % 4]], energy: 0.9 }));
    const a = buildAvatarState(buildTasteState(quiet), quiet);
    const b = buildAvatarState(buildTasteState(diverse), diverse);
    assert.notDeepEqual(a.nodes, b.nodes);
    assert.ok(a.pulseSeconds > b.pulseSeconds);
    assert.deepEqual(a, buildAvatarState(buildTasteState([...quiet].reverse()), [...quiet].reverse()));
});

test('large libraries remain bounded with no dangling edges and preserve latest choices', () => {
    const big = Array.from({ length: 5000 }, (_, index) => track(`library-${index}`, [`genre-${index % 20}`]));
    const choices = Array.from({ length: 40 }, (_, index) => ({ action: index < 20 ? 'absorb' : 'dig', track: track(`choice-${index}`, ['new-genre']) }));
    const avatar = buildAvatarState(buildTasteState(big, { decisions: choices }), big, choices);
    assert.equal(avatar.nodes.length, AVATAR_NODE_LIMIT);
    assert.equal(avatar.orbits.length, AVATAR_ORBIT_LIMIT);
    assert.ok(avatar.nodes.some((node) => node.id === 'choice-19'));
    assert.ok(avatar.edges.every((edge) => edge.a && edge.b));
    assert.ok(avatar.edges.length < AVATAR_NODE_LIMIT * 2);
    const reaction = buildAvatarReaction('dig', choices[39].track, avatar);
    assert.equal(reaction.trackId, 'choice-39');
});
