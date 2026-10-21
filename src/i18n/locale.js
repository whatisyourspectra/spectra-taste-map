export const LOCALE_STORAGE_KEY = 'spectra-tastemap-lang-v1';
export const SUPPORTED_LANGUAGES = ['ko', 'en'];

export function resolveLanguage({ search = '', saved, languages = [] } = {}) {
    const requested = new URLSearchParams(search).get('lang');
    if (SUPPORTED_LANGUAGES.includes(requested)) return requested;
    if (SUPPORTED_LANGUAGES.includes(saved)) return saved;
    return languages[0]?.toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

function initialLanguage() {
    if (typeof window === 'undefined') return 'ko';
    let saved;
    try { saved = window.localStorage.getItem(LOCALE_STORAGE_KEY); } catch { /* Storage is optional. */ }
    const resolved = resolveLanguage({ search: window.location.search, saved, languages: window.navigator.languages || [window.navigator.language] });
    if (SUPPORTED_LANGUAGES.includes(new URLSearchParams(window.location.search).get('lang'))) {
        try { window.localStorage.setItem(LOCALE_STORAGE_KEY, resolved); } catch { /* Storage is optional. */ }
    }
    return resolved;
}

let language = initialLanguage();
const listeners = new Set();
export const getLanguage = () => language;
export const getIntlLocale = () => language === 'ko' ? 'ko-KR' : 'en-US';
export const subscribeLanguage = listener => { listeners.add(listener); return () => listeners.delete(listener); };

function syncDocument() {
    if (typeof document !== 'undefined') document.documentElement.lang = language;
}
syncDocument();

export function setLanguage(next) {
    if (!SUPPORTED_LANGUAGES.includes(next)) return;
    language = next;
    try { window.localStorage.setItem(LOCALE_STORAGE_KEY, next); } catch { /* The current session still works. */ }
    // Keep explicit entry links in sync with the visitor's choice on reload.
    if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        if (url.searchParams.has('lang')) {
            url.searchParams.set('lang', next);
            window.history.replaceState(window.history.state, '', url);
            window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
        }
    }
    syncDocument();
    listeners.forEach(listener => listener());
}

if (typeof window !== 'undefined') window.addEventListener('storage', event => {
    if (event.key !== LOCALE_STORAGE_KEY || !SUPPORTED_LANGUAGES.includes(event.newValue)) return;
    language = event.newValue;
    syncDocument();
    listeners.forEach(listener => listener());
});

export function languageUrl(value) {
    const url = new URL(value, typeof window === 'undefined' ? 'https://spectra.example' : window.location.origin);
    url.searchParams.set('lang', language);
    return url.href;
}
