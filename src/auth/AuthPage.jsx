import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { consumeReturnTo, safeReturnTo, savedReturnTo } from './authRouting';
import { finishGoogleLogin } from './supabaseClient';
import './AuthPage.css';

function AuthSurface({ children }) {
    return <main className="sa-page"><div className="sa-card">
        <Link to="/taste-map" className="sa-wordmark">S P E C T R A</Link>
        <div className="sa-emblem" aria-hidden="true"><svg viewBox="0 0 160 110" fill="none">
            <path d="m23 68 27-44 44 14 38 41-70 15-12-70m12 70 32-56" />
            {[[23, 68], [50, 24], [94, 38], [132, 79], [62, 94]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="3" />)}
        </svg></div>
        {children}
    </div></main>;
}

export function AuthLoading({ title = '계정을 확인하고 있어요', message = '잠시만 기다려 주세요.' } = {}) {
    return <AuthSurface><h1>{title}</h1><p role="status">{message}</p></AuthSurface>;
}

export function AuthCallback() {
    const { configured } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [failed, setFailed] = useState(false);
    const params = new URLSearchParams(location.search);
    const hash = new URLSearchParams(location.hash.slice(1));
    const code = params.get('code');
    const denied = Boolean(params.get('error') || hash.get('error'));
    useEffect(() => {
        if (!configured || !code || denied) return undefined;
        let disposed = false;
        finishGoogleLogin(code).then(() => {
            if (disposed) return;
            navigate(consumeReturnTo(window.sessionStorage), { replace: true });
        }).catch(() => { if (!disposed) setFailed(true); });
        return () => { disposed = true; };
    }, [configured, code, denied, navigate]);
    const error = !configured || !code || denied || failed;
    return <AuthSurface>
        <h1>{error ? '로그인을 완료하지 못했어요' : 'SPECTRA에 연결하고 있어요'}</h1>
        <p role={error ? 'alert' : 'status'}>{error
            ? denied ? '로그인이 취소되었어요. 원할 때 다시 시작할 수 있어요.' : '로그인을 시작한 브라우저에서 다시 시도해 주세요.'
            : '인증을 마치면 원래 화면으로 돌아갑니다.'}</p>
        {error && <Link className="sa-primary" to={`/auth/login?returnTo=${encodeURIComponent(savedReturnTo(window.sessionStorage))}`} replace>로그인 다시 시도</Link>}
        {error && <Link className="sa-back" to="/taste-map" replace>지도로 돌아가기</Link>}
    </AuthSurface>;
}

export default function AuthPage() {
    const { configured, ready, user, error: sessionError, signIn, signInMock, isMock, signOut, retrySession } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const returnTo = safeReturnTo(new URLSearchParams(location.search).get('returnTo') || savedReturnTo(window.sessionStorage));

    const handleSignIn = async () => {
        if (busy) return;
        setBusy(true); setError('');
        try {
            await signIn(returnTo);
            if (isMock) {
                navigate(returnTo, { replace: true });
            }
        }
        catch { setError('로그인에 연결하지 못했어요. 브라우저의 저장 공간과 네트워크 연결을 확인한 뒤 다시 시도해 주세요.'); setBusy(false); }
    };

    const handleMockSignIn = async () => {
        if (busy) return;
        setBusy(true); setError('');
        try {
            await signInMock(returnTo);
            navigate(returnTo, { replace: true });
        } catch {
            setError('테스트 로그인에 실패했습니다.');
            setBusy(false);
        }
    };

    const handleSignOut = async () => {
        if (busy) return;
        setBusy(true); setError('');
        try { await signOut(); }
        catch { setError('로그아웃하지 못했어요. 연결을 확인한 뒤 다시 시도해 주세요.'); }
        finally { setBusy(false); }
    };

    return <AuthSurface>
        <span className="sa-eyebrow">YOUR SPECTRA ACCOUNT</span>
        <h1>{user ? '다시 만나서 반가워요' : '나의 SPECTRA로 연결'}</h1>
        <p>{user ? 'SPECTRA 계정에 로그인되어 있어요.' : 'Google 계정으로 간편하게 시작하세요.'}</p>
        {user ? <>
            <div className="sa-profile"><strong>{user.user_metadata?.full_name || 'SPECTRA 리스너'}</strong><span>{user.email}</span></div>
            <Link className="sa-primary" to={returnTo}>내 취향 공간으로</Link>
            <button type="button" className="sa-secondary" onClick={handleSignOut} disabled={busy}>{busy ? '로그아웃 중…' : '이 기기에서 로그아웃'}</button>
        </> : <>
            <button type="button" className="sa-google" disabled={(!configured && !isMock) || !ready || busy} onClick={handleSignIn}>
                <svg aria-hidden="true" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.3 2.9-7.5Z" /><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.3l-3.3-2.6c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.7-5.6-4H3v2.7A10 10 0 0 0 12 22Z" /><path fill="#FBBC05" d="M6.4 14a6 6 0 0 1 0-4V7.3H3a10 10 0 0 0 0 9.4L6.4 14Z" /><path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.8 9.8 0 0 0 12 2a10 10 0 0 0-9 5.3L6.4 10c.8-2.3 3-4 5.6-4Z" /></svg>
                {!ready ? '계정 확인 중…' : busy ? '이동 중…' : isMock ? '테스트 계정으로 계속하기 (Mock)' : 'Google로 계속하기'}
            </button>
            {!isMock && !configured && (
                <button type="button" className="sa-secondary" style={{ marginTop: '0.625rem', width: '100%' }} onClick={handleMockSignIn}>
                    테스트 계정으로 체험하기 (개발용)
                </button>
            )}
            {!configured && !isMock && <p className="sa-notice">Supabase 로그인 연결을 준비 중이에요.<br />.env 설정 전까지 위 테스트 계정 또는 로그인 없이 이용할 수 있어요.</p>}
            <Link className="sa-back" to={returnTo}>로그인 없이 계속하기</Link>
        </>}
        {(error || sessionError) && <p className="sa-error" role="alert">{error || '로그인 상태를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.'}</p>}
        {sessionError && <button className="sa-secondary" type="button" onClick={retrySession}>로그인 상태 다시 확인</button>}
        <p className="sa-footnote">곡 목록은 현재 브라우저에 보관됩니다.<br />기기 간 지도 동기화는 준비 중이에요.</p>
    </AuthSurface>;
}
