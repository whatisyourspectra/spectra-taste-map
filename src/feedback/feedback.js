export const FEEDBACK_CATEGORIES = [
    ['question', '서비스 문의'], ['bug', '오류 신고'], ['suggestion', '기능 제안'], ['other', '기타 의견'],
];

export function feedbackPayload(values, { pagePath = '/', deviceType = 'desktop' } = {}) {
    const category = String(values.category || '');
    const subject = String(values.subject || '').trim();
    const message = String(values.message || '').trim();
    const email = String(values.email || '').trim();
    if (!FEEDBACK_CATEGORIES.some(([key]) => key === category)) throw new Error('문의 유형을 선택해 주세요.');
    if (subject.length < 2 || subject.length > 120) throw new Error('제목을 2~120자로 입력해 주세요.');
    if (message.length < 10 || message.length > 4000) throw new Error('내용을 10~4,000자로 입력해 주세요.');
    if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new Error('답변받을 이메일 주소를 확인해 주세요.');
    if (values.consent !== true) throw new Error('문의 처리를 위한 정보 수집에 동의해 주세요.');
    const pathname = String(pagePath).split(/[?#]/)[0];
    return {
        p_category: category, p_subject: subject, p_message: message, p_email: email || null,
        p_page_path: pathname.startsWith('/') ? pathname.slice(0, 200) : '/',
        p_device_type: deviceType === 'mobile' ? 'mobile' : 'desktop', p_consent: true,
    };
}

// LAN HTTP previews do not expose randomUUID; getRandomValues is available there.
export function feedbackUuid(cryptoApi = globalThis.crypto) {
    if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID();
    if (typeof cryptoApi?.getRandomValues !== 'function') throw new Error('현재 브라우저에서 문의를 보낼 수 없어요. 다른 브라우저에서 다시 시도해 주세요.');
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function feedbackClientId(storage, randomUUID = feedbackUuid) {
    const key = 'spectra:feedback-client:v1';
    try {
        const existing = storage?.getItem(key);
        if (/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(existing || '')) return existing;
    } catch { /* Private browsing can disable storage. */ }
    const id = randomUUID();
    try { storage?.setItem(key, id); } catch { /* A component-scoped ID still works. */ }
    return id;
}

export async function sendFeedback(client, payload, { clientId, requestId, timeoutMs = 15000 }) {
    if (!client) throw new Error('지금은 문의를 접수할 수 없어요. 잠시 후 다시 시도해 주세요.');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const { data, error } = await client.rpc('submit_user_feedback', {
            ...payload, p_client_id: clientId, p_request_id: requestId,
        }).abortSignal(controller.signal);
        if (error?.message?.includes('feedback_rate_limited')) throw new Error('최근에 여러 의견을 보내주셨어요. 15분 후 다시 시도해 주세요.');
        if (error || !data) throw new Error('문의 접수를 확인하지 못했어요. 입력 내용은 유지됩니다. 다시 시도해 주세요.');
        return data;
    } catch (error) {
        if (controller.signal.aborted) throw new Error('연결이 지연되고 있어요. 입력 내용은 유지됩니다. 다시 시도해 주세요.');
        if (error instanceof TypeError) throw new Error('인터넷 연결을 확인한 뒤 다시 시도해 주세요.');
        throw error;
    } finally { clearTimeout(timer); }
}
