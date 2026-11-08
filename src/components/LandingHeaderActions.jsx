import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import AccountButton from '../auth/AccountButton';
import LanguageSwitcher from '../i18n/LanguageSwitcher';
import { useLocale } from '../i18n/useLocale';
import { translate } from '../i18n/translate';
import MobileMusicIcon from './MobileMusicIcon';
import TasteSaveStatus from './TasteSaveStatus';
import './LandingHeaderActions.css';

export default function LandingHeaderActions({ hasTaste, busy, progress, sound, onOpenMap, onTryDemo, onSection }) {
    const { user } = useAuth();
    const { lang } = useLocale();
    const navigate = useNavigate();
    const en = lang === 'en';
    const t = (ko, english) => en ? english : ko;
    const [open, setOpen] = useState(false);
    const hostRef = useRef(null);
    const triggerRef = useRef(null);
    const panelRef = useRef(null);
    const keyboardOpen = useRef(false);
    const focusFrame = useRef(null);
    const id = useId();
    const hasMap = Boolean(user || hasTaste);
    useEffect(() => () => cancelAnimationFrame(focusFrame.current), []);
    useEffect(() => {
        if (!open) return undefined;
        if (keyboardOpen.current) panelRef.current?.querySelector('button')?.focus();
        keyboardOpen.current = false;
        const outside = event => { if (!hostRef.current?.contains(event.target)) setOpen(false); };
        const escape = event => {
            if (event.key !== 'Escape') return;
            event.stopPropagation();
            setOpen(false);
            triggerRef.current?.focus({ preventScroll: true });
        };
        document.addEventListener('pointerdown', outside);
        document.addEventListener('focusin', outside);
        document.addEventListener('keydown', escape);
        return () => {
            document.removeEventListener('pointerdown', outside);
            document.removeEventListener('focusin', outside);
            document.removeEventListener('keydown', escape);
        };
    }, [open]);
    const act = (callback, section) => {
        setOpen(false);
        callback();
        if (section) focusFrame.current = requestAnimationFrame(() => {
            const heading = document.getElementById(section)?.querySelector('h2');
            heading?.setAttribute('tabindex', '-1');
            heading?.focus({ preventScroll: true });
        });
    };
    return <div className="llp-nav-actions">
        <button type="button" className={`llp-nav-map-entry ${hasMap ? 'llp-nav-return-btn' : 'llp-nav-demo-btn'}`}
            disabled={busy} onClick={hasMap ? onOpenMap : onTryDemo}
            aria-label={hasMap ? translate(user ? '내 지도로 가기' : '현재 취향 지도로 돌아가기') : translate('데모 지도 체험하기')}>
            <MobileMusicIcon name={hasMap ? 'map' : 'compass'} />
            <span>{hasMap ? t('내 지도', 'My map') : t('데모 체험', 'Try demo')}{progress ? ` ${progress}%` : ''}</span>
        </button>
        <div className="llp-nav-auth" title={user ? t('내 계정', 'My account') : t('로그인', 'Sign in')}><AccountButton /></div>
        <div ref={hostRef} className="llp-nav-utilities">
            <button ref={triggerRef} type="button" className="llp-nav-more" aria-label={t('추가 메뉴', 'More options')} aria-expanded={open} aria-controls={id}
                onClick={() => setOpen(value => !value)} onKeyDown={event => {
                    if (event.key === 'ArrowDown') { event.preventDefault(); keyboardOpen.current = true; setOpen(true); }
                }}>
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>
            </button>
            {open && <div ref={panelRef} id={id} className="llp-nav-utility-panel" role="group" aria-label={t('빠른 메뉴와 설정', 'Quick links and settings')}>
                <div className="llp-nav-utility-links">
                    <button type="button" onClick={() => act(() => navigate('/social'))}><MobileMusicIcon name="social" /><span>{t('소셜', 'Social')}</span><MobileMusicIcon name="next" /></button>
                    <button type="button" onClick={() => act(() => onSection('import'), 'import')}><MobileMusicIcon name="upload" /><span>{translate('음악 가져오기')}</span><MobileMusicIcon name="next" /></button>
                    <button type="button" onClick={() => act(() => onSection('features'), 'features')}><MobileMusicIcon name="map" /><span>{translate('지도 작동 방식')}</span><MobileMusicIcon name="next" /></button>
                    <button type="button" disabled={busy} onClick={() => act(onTryDemo)}><MobileMusicIcon name="compass" /><span>{translate('데모 지도 체험하기')}</span><MobileMusicIcon name="arrow" /></button>
                </div>
                <div className="llp-nav-preferences">
                    <div className="llp-nav-language"><span><MobileMusicIcon name="language" />{t('언어', 'Language')}</span><LanguageSwitcher /></div>
                    <button type="button" className="llp-sound-toggle" data-sound-toggle aria-pressed={sound.enabled}
                        aria-label={sound.enabled ? translate('사운드 끄기') : translate('사운드 켜기')} onClick={sound.toggle}>
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z" />{sound.enabled ? <path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" /> : <path d="m16 9 5 6m0-6-5 6" />}</svg>
                        <span>{t('사운드', 'Sound')}</span><small>{sound.enabled ? t('켜짐', 'On') : t('꺼짐', 'Off')}</small><i aria-hidden="true" /></button>
                    {sound.unavailable && <p className="llp-sound-status" role="status">{translate('사운드를 재생할 수 없어요.')}</p>}
                </div>
                <TasteSaveStatus />
            </div>}
        </div>
    </div>;
}
