import { useLocale } from './useLocale.js';
import './LanguageSwitcher.css';

export default function LanguageSwitcher({ className = '' }) {
    const { lang, setLang } = useLocale();
    return <div className={`language-switcher ${className}`} role="group" aria-label={lang === 'en' ? 'Language' : '언어'}>
        <button type="button" lang="ko" aria-pressed={lang === 'ko'} onClick={() => setLang('ko')}>한국어</button>
        <button type="button" lang="en" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>EN</button>
    </div>;
}
