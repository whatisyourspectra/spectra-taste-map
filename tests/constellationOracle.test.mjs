import test from 'node:test';
import assert from 'node:assert/strict';
import {
    getContextMoments,
    ARCHETYPE_MIRRORS,
    ORACLE_CONSTELLATIONS,
    prescribeTrack,
    getMoonPhase,
    localDay,
} from '../src/oracle/constellationOracleData.js';

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
