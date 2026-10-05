import test from 'node:test';
import assert from 'node:assert/strict';
import {
    getContextMoments,
    ARCHETYPE_MIRRORS,
    ORACLE_CONSTELLATIONS,
    prescribeTrack,
    getMoonPhase,
    localDay,
    rankMoodTracks,
    getMoodMirror,
    moodDirection,
    moodTrackDescription,
    loadOracleRecords,
    saveOracleRecord,
} from '../src/oracle/constellationOracleData.js';
import { buildOracleResult } from '../src/oracle/oracleResult.js';

test('getContextMoments returns 3 moments with valid metadata', () => {
    const morning = getContextMoments(new Date('2026-09-22T08:00:00'));
    assert.equal(morning.length, 3);
    assert.ok(morning[0].label);
    assert.ok(morning[0].emoji);
    assert.ok(morning[0].archetypeKey);

    const afternoon = getContextMoments(new Date('2026-09-22T14:30:00'));
    assert.equal(afternoon.length, 3);

    const night = getContextMoments(new Date('2026-09-22T23:15:00'));
    assert.equal(night.length, 3);
});

test('mood ranking responds to tone independently of energy and leaves the library unchanged', () => {
    const library = [
        { id: 'reflective', energy: .4, valence: .2 },
        { id: 'bright', energy: .4, valence: .8 },
        { id: 'unknown' },
    ];
    const before = structuredClone(library);
    assert.equal(rankMoodTracks(library, { targetEnergy: .4, targetValence: .2 })[0].id, 'reflective');
    assert.equal(rankMoodTracks(library, { targetEnergy: .4, targetValence: .8 })[0].id, 'bright');
    assert.deepEqual(library, before);
    assert.deepEqual(rankMoodTracks(null), []);
    assert.equal(rankMoodTracks([null, ...library, library[0]], {}).length, 3);
    assert.equal(moodTrackDescription(library[2]), '직접 듣고 느낌을 골라보세요');
});

test('each time-of-day context has meaningful contrasting directions', () => {
    for (const hour of [8, 14, 23]) {
        for (const moment of getContextMoments(new Date(2026, 9, 5, hour))) {
            const directions = getMoodMirror(moment).shifts.map(moodDirection);
            assert.notEqual(directions[0].targetEnergy, directions[1].targetEnergy);
            assert.notEqual(directions[0].targetValence, directions[1].targetValence);
        }
    }
    assert.equal(getMoodMirror({ archetypeKey: 'custom' }), ARCHETYPE_MIRRORS.custom);
});

test('calendar reports failed writes and preserves previous records', () => {
    const oldWindow = globalThis.window;
    const oldStorage = globalThis.localStorage;
    const values = new Map();
    try {
        globalThis.window = {};
        globalThis.localStorage = {
            getItem: key => values.get(key) || null,
            setItem: (key, value) => values.set(key, value),
        };
        const record = { day: '2026-10-05', track: { id: 'chosen' } };
        assert.equal(saveOracleRecord('review', record).length, 1);
        assert.equal(saveOracleRecord('review', { ...record, track: { id: 'changed' } }).length, 1);
        globalThis.localStorage.setItem = () => { throw new Error('quota'); };
        assert.equal(saveOracleRecord('review', { day: '2026-10-06' }), null);
        assert.equal(loadOracleRecords('review')[0].track.id, 'changed');
        values.set('spectra_oracle_log_review', '{}');
        assert.deepEqual(loadOracleRecords('review'), []);
    } finally {
        if (oldWindow === undefined) delete globalThis.window; else globalThis.window = oldWindow;
        if (oldStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = oldStorage;
    }
});

test('similar songs still create separated, bounded constellation stars', () => {
    const library = Array.from({ length: 8 }, (_, i) => ({ id: `same-${i}`, energy: .5, valence: .5 }));
    const result = buildOracleResult(library, { archetypeKey: 'custom' }, { targetEnergy: .5 }, library[0], '2026-10-05');
    result.nodes.forEach((node, i) => {
        assert.ok(node.x >= 46 && node.x <= 314 && node.y >= 60 && node.y <= 260);
        result.nodes.slice(i + 1).forEach(other => assert.ok(Math.hypot(node.x - other.x, node.y - other.y) > 40));
    });
});

test('ARCHETYPE_MIRRORS contains complete mirror text and 2 contrasting shifts', () => {
    const keys = Object.keys(ARCHETYPE_MIRRORS);
    assert.ok(keys.length >= 4);

    for (const key of keys) {
        const mirror = ARCHETYPE_MIRRORS[key];
        assert.ok(mirror.tarot);
        assert.ok(mirror.element);
        assert.ok(mirror.korean);
        assert.ok(mirror.english);
        assert.equal(mirror.shifts.length, 2);

        for (const shift of mirror.shifts) {
            assert.ok(shift.id);
            assert.ok(shift.name);
            assert.ok(shift.desc);
            assert.ok(shift.color);
            assert.ok(Number.isFinite(shift.targetEnergy));
            assert.ok(shift.camera);
            assert.ok(ORACLE_CONSTELLATIONS[shift.constellation]);
        }
    }
});

test('ORACLE_CONSTELLATIONS contains valid nodes and edge connections', () => {
    const constellations = Object.values(ORACLE_CONSTELLATIONS);
    assert.ok(constellations.length >= 4);

    for (const c of constellations) {
        assert.ok(c.id);
        assert.ok(c.name);
        assert.ok(c.symbol);
        assert.ok(c.poem);
        assert.ok(c.nodes.length >= 4);

        for (const [from, to] of c.edges) {
            assert.ok(c.nodes[from] !== undefined, `Node index ${from} in edge must exist`);
            assert.ok(c.nodes[to] !== undefined, `Node index ${to} in edge must exist`);
        }
    }
});

test('prescribeTrack matches closest energy and handles empty library safely', () => {
    const library = [
        { id: 'track-calm', name: 'Calm River', energy: 0.15 },
        { id: 'track-mid', name: 'Mid Rhythm', energy: 0.5 },
        { id: 'track-hype', name: 'Fast Beat', energy: 0.85 },
    ];

    const calmShift = { id: 'shift-calm', targetEnergy: 0.2 };
    const prescribedCalm = prescribeTrack(library, calmShift, '2026-09-22');
    assert.equal(prescribedCalm.id, 'track-calm');

    const hypeShift = { id: 'shift-hype', targetEnergy: 0.8 };
    const prescribedHype = prescribeTrack(library, hypeShift, '2026-09-22');
    assert.equal(prescribedHype.id, 'track-hype');

    assert.equal(prescribeTrack([], calmShift), null);
    assert.equal(prescribeTrack(null, calmShift), null);
});

test('getMoonPhase returns valid moon symbol and name', () => {
    const moon = getMoonPhase(new Date());
    assert.ok(moon.symbol);
    assert.ok(moon.name);
});

test('today’s constellation uses library tracks and keeps its own geometry stable', () => {
    const library = Array.from({ length: 9 }, (_, index) => ({
        id: `track-${index}`,
        name: `Track ${index}`,
        artists: `Artist ${index}`,
        coverUrl: index === 0 ? 'https://example.com/cover.jpg' : null,
        valence: index / 8,
        energy: (8 - index) / 8,
    }));
    const context = { id: 'ctx_burnout', label: '일하다 집중이 깨졌어요', archetypeKey: 'burnout' };
    const shift = { id: 'shift_calm', targetEnergy: 0.25, color: '#60a5fa' };
    const result = buildOracleResult(library, context, shift, library[0], '2026-09-28');
    const repeated = buildOracleResult([...library].reverse(), context, shift, library[0], '2026-09-28');

    assert.equal(result.name, '숨 고르는 파도자리');
    assert.equal(result.nodes[0].id, library[0].id);
    assert.equal(result.nodes[0].coverUrl, library[0].coverUrl);
    assert.equal(result.nodes.length, 8);
    assert.equal(new Set(result.nodes.map((node) => node.id)).size, 8);
    assert.ok(result.nodes.every((node) => {
        const track = library.find((item) => item.id === node.id);
        return track && node.name === track.name && node.artists === track.artists;
    }));
    assert.equal(result.edges.length, 7);
    assert.deepEqual(result.nodes, repeated.nodes);
    assert.deepEqual(result.edges, repeated.edges);
    assert.ok(result.nodes.every((node) => Number.isFinite(node.x) && Number.isFinite(node.y)));
    assert.ok(result.edges.every(([from, to]) => result.nodes[from] && result.nodes[to]));

    const changedLibrary = library.map((track, index) => index === 6 ? { ...track, valence: 0.03 } : track);
    const changed = buildOracleResult(changedLibrary, context, shift, library[0], '2026-09-28');
    assert.notDeepEqual(result.nodes.map(({ x, y }) => [x, y]), changed.nodes.map(({ x, y }) => [x, y]));
    assert.equal(buildOracleResult([], context, shift, null, '2026-09-28'), null);
});
