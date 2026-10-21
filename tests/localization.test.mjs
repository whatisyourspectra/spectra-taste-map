import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveLanguage, getLanguage, setLanguage, subscribeLanguage, languageUrl } from '../src/i18n/locale.js';
import { translate } from '../src/i18n/translate.js';
import { feedbackPayload } from '../src/feedback/feedback.js';

test('entry language follows a valid link, saved preference, then browser language', () => {
    assert.equal(resolveLanguage({ search: '?lang=en', saved: 'ko', languages: ['ko-KR'] }), 'en');
    assert.equal(resolveLanguage({ search: '?lang=ko', saved: 'en', languages: ['en-US'] }), 'ko');
    assert.equal(resolveLanguage({ search: '?lang=invalid', saved: 'ko', languages: ['en'] }), 'ko');
    assert.equal(resolveLanguage({ languages: ['ko-KR', 'en'] }), 'ko');
    assert.equal(resolveLanguage({ languages: ['fr-FR', 'ko'] }), 'en');
    assert.equal(resolveLanguage({ saved: 'invalid' }), 'en');
});

test('language changes notify subscribers, reject invalid values, and localize outgoing entry links', () => {
    const changes = [];
    const unsubscribe = subscribeLanguage(() => changes.push(getLanguage()));
    setLanguage('en');
    assert.equal(new URL(languageUrl('https://example.com/mobile-start?source=qr')).search, '?source=qr&lang=en');
    setLanguage('de');
    assert.equal(getLanguage(), 'en');
    setLanguage('ko');
    unsubscribe();
    assert.deepEqual(changes, ['en', 'ko']);
});

test('messages interpolate counters in both languages and preserve imported music metadata', () => {
    assert.equal(translate('{0}곡으로 나의 taste맵 생성하기', [12], 'en'), 'Create my map with 12 songs');
    assert.equal(translate('{0}곡으로 나의 taste맵 생성하기', [12], 'ko'), '12곡으로 나의 taste맵 생성하기');
    assert.equal(translate('✦ 총 {0}곡이 인식되었습니다.', [0], 'en'), '✦ 0 songs found.');
    assert.equal(translate('아이유 - 밤편지', [], 'en'), '아이유 - 밤편지');
    assert.equal(translate(null, [], 'en'), null);
});

test('stored parser warnings and feedback validation errors follow the current language', () => {
    assert.equal(translate('3개 행에서 아티스트·곡명을 확인하지 못했어요.', [], 'en'), 'Could not identify the artist or title in 3 rows.');
    let validation;
    try { feedbackPayload({ category: 'bug', subject: '', message: '' }); } catch (error) { validation = error.message; }
    assert.equal(translate(validation, [], 'en'), 'Enter a subject between 2 and 120 characters.');
    assert.equal(translate(validation, [], 'ko'), '제목을 2~120자로 입력해 주세요.');
});
