import { useSyncExternalStore } from 'react';
import { getLanguage, setLanguage, subscribeLanguage } from './locale.js';

export function useLocale() {
    const lang = useSyncExternalStore(subscribeLanguage, getLanguage, () => 'ko');
    return { lang, setLang: setLanguage, locale: lang === 'ko' ? 'ko-KR' : 'en-US' };
}
