import { useLocale } from '../i18n/useLocale.js';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { safeReturnTo } from './authRouting';
import './AuthPage.css';

export default function AccountButton() {
    const { lang } = useLocale();
    const { user, ready } = useAuth();
    const location = useLocation();
    const returnTo = safeReturnTo(location.pathname + location.search);
    const name = user?.user_metadata?.full_name || user?.email || (lang === 'en' ? 'Account' : '계정');
    return <Link className="sa-account-button" to={`/auth/login?returnTo=${encodeURIComponent(returnTo)}`}
        aria-label={user ? (lang === 'en' ? 'Open my account' : '내 계정 열기') : (lang === 'en' ? 'Sign in' : '로그인')}>
        {user ? <span className="sa-account-initial" aria-hidden="true">{String(name).slice(0, 1).toUpperCase()}</span>
            : <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="3.5" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></svg>}
        <span>{!ready ? '…' : user ? (lang === 'en' ? 'Account' : '내 계정') : (lang === 'en' ? 'Sign in' : '로그인')}</span>
    </Link>;
}
