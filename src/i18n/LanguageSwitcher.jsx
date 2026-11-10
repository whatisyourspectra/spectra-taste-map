import { useLocale } from './useLocale.js';
import './LanguageSwitcher.css';

export default function LanguageSwitcher({ className = '', compact = false }) {
    const { lang, setLang } = useLocale();
    return <div className={`language-switcher${compact ? ' language-switcher--compact' : ''} ${className}`} role="group" aria-label={lang === 'en' ? 'Language' : '언어'}>
        <button type="button" lang="ko" aria-label={compact ? '한국어' : undefined} aria-pressed={lang === 'ko'} onClick={() => setLang('ko')}>{compact ? 'KO' : '한국어'}</button>
        <button type="button" lang="en" aria-label={compact ? 'English' : undefined} aria-pressed={lang === 'en'} onClick={() => setLang('en')}>EN</button>
    </div>;
}
