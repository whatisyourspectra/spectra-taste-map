import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDailyBundle, dailyTheme, localDay } from '../src/daily/buildDailyBundle.js';
const library = Array.from({ length: 10 }, (_, i) => ({ id: `l${i}`, name: `Song ${i}`, genres: ['ambient'], energy: i / 10 }));
test('daily selection is stable across reorder and includes at most three new discoveries', () => {
    const theme = dailyTheme('2026-09-15', 'user');
    const discoveries = Array.from({ length: 5 }, (_, i) => ({ ...library[i], id: `new${i}` }));
    const bundle = buildDailyBundle(library, discoveries, '2026-09-15', 'user', theme);
    assert.equal(bundle.length, 5);
    assert.equal(bundle.filter(t => t.dailyOrigin === 'discovery').length, 3);
    assert.equal(new Set(bundle.map(t => t.id)).size, 5);
    assert.deepEqual(bundle, buildDailyBundle([...library].reverse(), [...discoveries].reverse(), '2026-09-15', 'user', theme));
});
test('small library fallback never invents songs; day uses local calendar', () => {
    const theme = dailyTheme('2026-09-15', 'user');
    const bundle = buildDailyBundle([library[0], library[0]], [], '2026-09-15', 'user', theme);
    assert.equal(bundle.length, 1);
    assert.equal(bundle[0].dailyOrigin, 'library');
    assert.deepEqual(buildDailyBundle([], [], '2026-09-15', 'user', theme), []);
    assert.equal(localDay(new Date(2026, 8, 15, 0, 1)), '2026-09-15');
});
