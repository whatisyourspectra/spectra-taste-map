import { translate } from '../i18n/translate.js';
const KEY = String(import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY || '').trim();
let sdkPromise;
function withTimeout(promise, milliseconds, code) {
    let timer;
    return Promise.race([promise, new Promise((_, reject) => {
        timer = window.setTimeout(() => reject(new Error(code)), milliseconds);
    })]).finally(() => window.clearTimeout(timer));
}
export function kakaoShareError(error) {
    if (error?.code === -401 && /domain/i.test(error.msg || '')) return translate("현재 주소({0})가 카카오 공유 도메인에 등록되지 않았어요. 카카오 개발자 콘솔의 JavaScript 키 → SDK 도메인에 이 주소를 등록해 주세요.", [window.location.origin]);
    if (error?.code === -401) return translate("카카오 JavaScript 키 또는 앱 설정을 확인해 주세요.");
    if (/TIMEOUT|UNAVAILABLE/.test(error?.message || '')) return translate("카카오 연결이 지연되고 있어요. 네트워크를 확인하고 다시 시도해 주세요.");
    if (error?.message === 'KAKAO_IMAGE_FAILED') return translate("카카오에서 카드 이미지 주소를 받지 못했어요. 다시 시도해 주세요.");
    return translate("공유 카드를 준비하지 못했어요. 이미지 저장은 이용할 수 있어요.");
}
export const kakaoShareConfigured = Boolean(KEY);
export function loadKakaoShare() {
    if (!KEY) return Promise.reject(new Error('KAKAO_KEY_MISSING'));
    if (!sdkPromise) sdkPromise = new Promise((resolve, reject) => {
        const init = () => {
            try { if (!window.Kakao.isInitialized()) window.Kakao.init(KEY); resolve(window.Kakao); }
            catch (error) { reject(error); }
        };
        if (window.Kakao) { init(); return; }
        const script = document.createElement('script');
        script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.8.3/kakao.min.js';
        script.crossOrigin = 'anonymous';
        script.onload = init;
        script.onerror = () => { script.remove(); sdkPromise = null; reject(new Error('KAKAO_SDK_UNAVAILABLE')); };
        document.head.append(script);
    });
    const pending = sdkPromise;
    return withTimeout(pending, 10000, 'KAKAO_SDK_TIMEOUT').catch(error => {
        if (sdkPromise === pending) sdkPromise = null;
        throw error;
    });
}
export function validCardImage(value) {
    try {
        const url = new URL(value);
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !url.hostname.endsWith('.kakaocdn.net')) return null;
        // Kakao uploadImage returns HTTP URLs; use HTTPS for cards and embeds.
        url.protocol = 'https:';
        return url.href;
    }
    catch { return null; }
}
export async function prepareKakaoCard(file, title, shareId = null) {
    const kakao = await loadKakaoShare();
    const files = new DataTransfer(); files.items.add(file);
    const uploaded = await withTimeout(kakao.Share.uploadImage({ file: files.files }), 15000, 'KAKAO_UPLOAD_TIMEOUT');
    const image = validCardImage(uploaded?.infos?.original?.url);
    if (!image) throw new Error('KAKAO_IMAGE_FAILED');
    const origin = import.meta.env.PROD ? 'https://www.spectra-music.org' : (import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin);
    const url = new URL(shareId ? `/share/map/${shareId}` : '/share/card', origin);
    if (!shareId) { url.searchParams.set('image', image); url.searchParams.set('title', title.slice(0, 80)); }
    return { kakao, settings: { objectType: 'feed', content: { title, description: translate("음악으로 만든 나의 취향 공간 · SPECTRA"), imageUrl: image, link: { mobileWebUrl: url.href, webUrl: url.href } }, buttons: [{ title: shareId ? translate("친구의 취향 구경하기") : translate("취향 카드 보기"), link: { mobileWebUrl: url.href, webUrl: url.href } }] } };
}
