import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { useLocale } from '../i18n/useLocale';
import { DEMO_INVITE_DELAY_MS, demoInviteUrl } from './demoInviteModel';
import './DemoMapInvite.css';

function hasOpenOverlay() {
    return [...document.querySelectorAll('dialog[open], [role="dialog"], .map-guide-panel, .ccp-card')]
        .some(node => !node.classList.contains('demo-map-invite') && node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden');
}

function LittleRecord() {
    return <svg className="demo-invite-friend" viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <path d="m6 28-3-4m56 2 3-4M14 52l-4 6m39-6 5 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="32" cy="32" r="25" fill="#29223f" stroke="#bca1f5" strokeWidth="1.5" />
        <circle cx="32" cy="32" r="20" stroke="#82649f" strokeOpacity=".6" />
        <circle cx="32" cy="32" r="15" fill="#c8a6f5" />
        <path d="M26 29v3m12-3v3m-11 5q5 5 10 0" stroke="#30213e" strokeWidth="2.5" strokeLinecap="round" />
        <path d="m52 2 1.8 5.2L59 9l-5.2 1.8L52 16l-1.8-5.2L45 9l5.2-1.8L52 2Z" fill="#f298c5" />
        <circle cx="11" cy="10" r="2" fill="#81d6ed" />
    </svg>;
}

export default function DemoMapInvite({ enabled = true }) {
    const { lang } = useLocale();
    const en = lang === 'en';
    const [visible, setVisible] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [qr, setQr] = useState(null);
    const card = useRef(null);
    const previousFocus = useRef(null);
    const elapsed = useRef(0);
    const url = useMemo(() => demoInviteUrl(lang, import.meta.env.VITE_PUBLIC_APP_URL), [lang]);

    useEffect(() => {
        if (!enabled || dismissed) return undefined;
        let last = performance.now(), lastGesture = last, pointerDown = false, revealed = false;
        const tick = () => {
            const now = performance.now();
            const blocked = document.hidden || hasOpenOverlay();
            if (!blocked) elapsed.current += Math.max(0, now - last);
            last = now;
            if (!revealed && elapsed.current >= DEMO_INVITE_DELAY_MS && !pointerDown && now - lastGesture >= 1800) revealed = true;
            setVisible(revealed && !blocked);
        };
        const visibility = () => { last = performance.now(); tick(); };
        const gesture = event => {
            if (event.target?.closest?.('.demo-map-invite')) return;
            if (event.type === 'pointerdown') pointerDown = true;
            if (event.type === 'pointerup' || event.type === 'pointercancel') pointerDown = false;
            lastGesture = performance.now();
        };
        const events = ['pointerdown', 'pointerup', 'pointercancel', 'wheel', 'keydown'];
        const timer = window.setInterval(tick, 500);
        document.addEventListener('visibilitychange', visibility);
        events.forEach(name => window.addEventListener(name, gesture, { capture: true, passive: true }));
        return () => {
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', visibility);
            events.forEach(name => window.removeEventListener(name, gesture, true));
        };
    }, [enabled, dismissed]);

    useEffect(() => {
        if (!enabled || !visible || dismissed || !card.current) return undefined;
        const dialog = card.current;
        previousFocus.current = document.activeElement;
        dialog.showModal();
        return () => {
            if (dialog.open) dialog.close();
            if (previousFocus.current?.isConnected) previousFocus.current.focus({ preventScroll: true });
        };
    }, [enabled, visible, dismissed]);

    useEffect(() => {
        if (!visible) return undefined;
        let current = true;
        QRCode.toDataURL(url, {
            width: 640, margin: 3, errorCorrectionLevel: 'M', color: { dark: '#20172e', light: '#ffffff' },
        }).then(image => { if (current) setQr({ url, image }); })
            .catch(() => { if (current) setQr({ url, image: null }); });
        return () => { current = false; };
    }, [visible, url]);

    function dismiss() {
        setDismissed(true);
    }

    if (!enabled || !visible || dismissed) return null;
    return <dialog className="demo-map-invite" ref={card} aria-labelledby="demo-invite-title" aria-describedby="demo-invite-description" onCancel={event => {
        event.preventDefault(); dismiss();
    }} onClick={event => {
        if (event.target !== event.currentTarget) return;
        const box = event.currentTarget.getBoundingClientRect();
        if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dismiss();
    }}>
        <button className="demo-invite-close" type="button" autoFocus aria-label={en ? 'Dismiss invitation' : '내 지도 만들기 안내 닫기'} onClick={dismiss}>×</button>
        <div className="demo-invite-hello"><LittleRecord /><div><span>YOUR TURN, MUSIC LOVER</span><h2 id="demo-invite-title">{en ? <>Next up?<br />Your music. ✦</> : <>다음엔,<br />당신의 음악 차례예요 ✦</>}</h2></div></div>
        <p className="demo-invite-copy" id="demo-invite-description">{en ? 'Enjoyed this little universe? Make one with the songs you love.' : '이 작은 우주, 재밌었나요?\n좋아하는 곡들로 나만의 지도를 만들어봐요.'}</p>
        <div className="demo-invite-handoff"><a className="demo-invite-qr" href={url} target="_blank" rel="noreferrer" aria-label={en ? 'Open music import on SPECTRA' : '스펙트라 음악 가져오기 열기'}>
            {qr?.url === url && qr.image ? <img src={qr.image} alt={en ? 'QR code to create your music map' : '내 음악으로 지도 만드는 QR 코드'} />
                : <span>{qr?.url === url ? (en ? 'Open link ↗' : '링크 열기 ↗') : (en ? 'Preparing QR…' : 'QR 준비 중…')}</span>}
        </a><div><span className="demo-invite-phone" aria-hidden="true">↳</span><strong>{en ? 'Scan. Bring your music.' : '폰으로 찍고,\n내 음악 가져오기.'}</strong><p>{en ? 'Your playlist,\nyour own SPECTRA.' : '플레이리스트 하나면\n새로운 우주가 열려요.'}</p></div></div>
        <Link className="demo-invite-create" to="/#import">{en ? 'Make my own map' : '여기서 내 지도 만들기'}<span aria-hidden="true">↗</span></Link>
        <p className="demo-invite-services">Spotify <span>·</span> Apple Music <span>·</span> YouTube Music</p>
    </dialog>;
}
