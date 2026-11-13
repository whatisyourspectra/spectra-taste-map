import test from 'node:test';
import assert from 'node:assert/strict';
import { demoInviteUrl } from '../src/components/demoInviteModel.js';

test('exhibition QR opens public import, not the local demo or personal account', () => {
    assert.equal(demoInviteUrl('ko'), 'https://www.spectra-music.org/?lang=ko#import');
    assert.equal(demoInviteUrl('en'), 'https://www.spectra-music.org/?lang=en#import');
    assert.equal(demoInviteUrl('unexpected'), demoInviteUrl('ko'));
});

test('rehearsal origins cannot inject a protocol, credentials, or arbitrary destination', () => {
    assert.equal(demoInviteUrl('en', 'http://192.168.1.9:5188/demo?secret=1#old'), 'http://192.168.1.9:5188/?lang=en#import');
    for (const origin of ['javascript:alert(1)', 'data:text/html,wrong', 'https://name:secret@example.com', '/relative']) {
        assert.equal(demoInviteUrl('ko', origin), demoInviteUrl('ko'));
    }
});
