import test from 'node:test';
import assert from 'node:assert/strict';
import { feedbackClientId, feedbackPayload, feedbackUuid, sendFeedback } from '../src/feedback/feedback.js';

const form = { category: 'bug', subject: '  지도 오류  ', message: '지도를 확대하면 곡을 선택할 수 없어요.', email: '', consent: true };
test('LAN HTTP generates valid v4 IDs without crypto.randomUUID', () => {
    assert.equal(feedbackUuid({ getRandomValues: bytes => bytes.fill(0) }), '00000000-0000-4000-8000-000000000000');
    assert.equal(feedbackUuid({ getRandomValues: bytes => bytes.fill(255) }), 'ffffffff-ffff-4fff-bfff-ffffffffffff');
    assert.equal(feedbackUuid({ randomUUID: () => 'native' }), 'native');
    assert.throws(() => feedbackUuid({}), /다른 브라우저/);
});
test('feedback validates input and strips query/hash from collected paths', () => {
    const payload = feedbackPayload(form, { pagePath: '/taste-map?token=private#secret', deviceType: 'mobile' });
    assert.equal(payload.p_subject, '지도 오류');
    assert.equal(payload.p_page_path, '/taste-map');
    assert.equal(payload.p_email, null);
    assert.equal(payload.p_device_type, 'mobile');
    for (const change of [{ consent: false }, { category: 'admin' }, { subject: 'a' }, { message: ' ' }, { message: 'a'.repeat(4001) }, { email: 'bad@email' }]) {
        assert.throws(() => feedbackPayload({ ...form, ...change }));
    }
});
test('session ID is reused and disabled browser storage does not prevent feedback', () => {
    let value;
    const id = 'c0777b1a-df22-456b-a2c1-ad69585279ae';
    const store = { getItem: () => value, setItem: (_, next) => { value = next; } };
    assert.equal(feedbackClientId(store, () => id), id);
    assert.equal(feedbackClientId(store, () => { throw Error('must reuse'); }), id);
    assert.equal(feedbackClientId({ getItem() { throw Error('disabled'); }, setItem() { throw Error('disabled'); } }, () => id), id);
});
test('submission sends only the allowed payload and never requests table reads', async () => {
    let sent;
    const client = { rpc(name, payload) {
        assert.equal(name, 'submit_user_feedback'); sent = payload;
        return { abortSignal: async () => ({ data: 'saved-id', error: null }) };
    } };
    assert.equal(await sendFeedback(client, feedbackPayload(form), { clientId: 'session', requestId: 'request' }), 'saved-id');
    assert.equal(sent.p_client_id, 'session');
    assert.equal(sent.p_request_id, 'request');
    assert.equal('user_id' in sent, false);
    assert.equal('status' in sent, false);
});
test('unconfigured, unavailable and rate-limited storage never returns success', async () => {
    await assert.rejects(sendFeedback(null, {}, {}), /접수할 수 없어요/);
    for (const error of [{ message: 'table missing' }, { message: 'feedback_rate_limited' }]) {
        const client = { rpc: () => ({ abortSignal: async () => ({ data: null, error }) }) };
        await assert.rejects(sendFeedback(client, {}, {}), error.message.includes('rate_limited') ? /15분/ : /확인하지 못했어요/);
    }
});
test('a timed-out request is aborted and can be retried without claiming success', async () => {
    let aborted = false;
    const client = { rpc: () => ({ abortSignal: signal => new Promise(resolve => {
        signal.addEventListener('abort', () => { aborted = true; resolve({ error: { message: 'aborted' } }); });
    }) }) };
    await assert.rejects(sendFeedback(client, {}, { timeoutMs: 5 }), /연결이 지연/);
    assert.equal(aborted, true);
});
