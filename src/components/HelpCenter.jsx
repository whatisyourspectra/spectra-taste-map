import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { translate } from '../i18n/translate.js';
import { useLocale } from '../i18n/useLocale.js';
import FeedbackTab from '../feedback/FeedbackTab';
import { OPEN_MAP_GUIDE_EVENT } from '../onboarding/mapGuideEvents.js';
import { helpTopics } from '../onboarding/guideContent.js';
import GuideArtwork from './GuideArtwork';
import MobileMusicIcon from './MobileMusicIcon';
import './HelpCenter.css';

export default function HelpCenter({ inMenu = false, onOpened }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { lang } = useLocale();
    const en = lang === 'en';
    const t = (ko, english) => en ? english : ko;
    const dialogRef = useRef(null);
    const triggerRef = useRef(null);
    const tabsRef = useRef(null);
    const scrollRef = useRef(null);
    const actionFrame = useRef(null);
    const restoreOnClose = useRef(true);
    const id = useId();
    const [active, setActive] = useState('start');
    const [desktop, setDesktop] = useState(() => window.matchMedia('(min-width: 901px)').matches);
    useEffect(() => {
        const query = window.matchMedia('(min-width: 901px)');
        const update = () => setDesktop(query.matches);
        query.addEventListener('change', update);
        return () => { query.removeEventListener('change', update); cancelAnimationFrame(actionFrame.current); };
    }, []);
    const params = new URLSearchParams(location.search);
    const onMap = location.pathname === '/taste-map';
    const canTour = desktop && onMap
        && !['map', 'today', 'discover'].includes(params.get('tab')) && params.get('view') !== 'immersive';
    const mobileMap = !desktop || ['map', 'today', 'discover'].includes(params.get('tab')) || params.get('view') === 'immersive';
    const topics = helpTopics(en, mobileMap);
    const restoreFocus = () => {
        const menu = triggerRef.current?.closest('details');
        (menu && !menu.open ? menu.querySelector('summary') : triggerRef.current)?.focus({ preventScroll: true });
    };
    const close = () => dialogRef.current?.close();
    const selectTopic = topicId => {
        setActive(topicId);
        scrollRef.current?.scrollTo({ top: 0 });
    };
    const open = () => {
        restoreOnClose.current = true;
        selectTopic(onMap ? 'map' : 'start');
        dialogRef.current.showModal();
        onOpened?.();
    };
    const startTour = () => {
        close();
        actionFrame.current = requestAnimationFrame(() => window.dispatchEvent(new Event(OPEN_MAP_GUIDE_EVENT)));
    };
    const importMusic = () => {
        restoreOnClose.current = false;
        close();
        navigate('/#import');
    };
    const act = () => {
        if (active === 'start' || (!onMap && active !== 'share')) { importMusic(); return; }
        if (active === 'map' && canTour) { startTour(); return; }
        restoreOnClose.current = false;
        close();
        if (active === 'share') navigate('/social');
        else if (active === 'discover' && canTour) {
            actionFrame.current = requestAnimationFrame(() => {
                const button = document.querySelector('.tm-dock-actions .tm-dock-action:first-child');
                if (button?.getAttribute('aria-pressed') !== 'true') button?.click();
                button?.focus({ preventScroll: true });
            });
        } else navigate(`/taste-map?tab=${active === 'discover' ? 'discover' : 'map'}`);
    };
    const actionLabel = active === 'start' || (!onMap && active !== 'share')
        ? t('내 음악 가져오기', 'Import my music')
        : active === 'share' ? t('소셜 둘러보기', 'Explore Social')
            : active === 'discover' ? t('새 음악 찾아보기', 'Find new music')
                : canTour ? t('화면 보며 따라하기', 'Show me around') : t('내 지도로 돌아가기', 'Back to my map');
    if (location.pathname.startsWith('/auth/')) return null;
    return <>
        <button ref={triggerRef} type="button" className={inMenu ? 'help-center-menu-entry' : 'help-center-trigger'}
            aria-haspopup="dialog" aria-controls={`${id}-help`} onClick={open}>
            <span aria-hidden="true">?</span><span>{translate('사용 안내 · 문의')}</span>
        </button>
        {createPortal(<dialog ref={dialogRef} id={`${id}-help`} className="help-center-dialog" aria-labelledby={`${id}-title`}
            onClose={() => { if (restoreOnClose.current && !document.querySelector('.feedback-dialog[open]')) restoreFocus(); }}
            onClick={event => {
                if (event.target !== event.currentTarget) return;
                const box = event.currentTarget.getBoundingClientRect();
                if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close();
            }}>
            <header className="help-center-header"><div><span className="help-center-eyebrow">SPECTRA GUIDE</span><h2 id={`${id}-title`}>{t('이렇게 써보세요', 'How to use SPECTRA')}</h2></div><button type="button" onClick={close} aria-label={translate('사용 안내 닫기')}><MobileMusicIcon name="close" /></button></header>
            <div ref={tabsRef} className="help-center-tabs" role="tablist" aria-label={t('기능별 사용 안내', 'Feature guides')} onKeyDown={event => {
                const index = topics.findIndex(item => item.id === active);
                let next;
                if (event.key === 'ArrowRight') next = (index + 1) % topics.length;
                if (event.key === 'ArrowLeft') next = (index + topics.length - 1) % topics.length;
                if (event.key === 'Home') next = 0;
                if (event.key === 'End') next = topics.length - 1;
                if (next === undefined) return;
                event.preventDefault();
                selectTopic(topics[next].id);
                tabsRef.current.querySelectorAll('[role="tab"]')[next].focus();
            }}>
                {topics.map(item => <button key={item.id} type="button" role="tab" id={`${id}-tab-${item.id}`} aria-controls={`${id}-panel-${item.id}`} aria-selected={active === item.id} tabIndex={active === item.id ? 0 : -1} onClick={() => selectTopic(item.id)}><MobileMusicIcon name={item.icon} />{item.label}</button>)}
            </div>
            <div ref={scrollRef} className="help-center-scroll">
                {topics.map(item => <section key={item.id} id={`${id}-panel-${item.id}`} role="tabpanel" aria-labelledby={`${id}-tab-${item.id}`} hidden={active !== item.id} tabIndex={0}>
                    <GuideArtwork topic={item.id} en={en} />
                    <div className="help-center-intro"><h3>{item.title}</h3><p>{item.description}</p></div>
                    <ol className="help-center-steps">{item.steps.map(([title, text], index) => <li key={title}><span aria-hidden="true">{index + 1}</span><div><h4>{title}</h4><p>{text}</p></div></li>)}</ol>
                    <p className="help-center-note"><span aria-hidden="true">i</span>{item.note}</p>
                </section>)}
            </div>
            <div className="help-center-actions">
                <button type="button" className={`help-center-primary${active === 'map' && canTour ? ' help-center-tour' : ''}`} onClick={act}>{actionLabel}<MobileMusicIcon name="arrow" /></button>
                <div className="help-center-support"><span>{t('도움이 더 필요하신가요?', 'Need a hand?')}</span><FeedbackTab inMenu onBeforeOpen={close} onClosed={restoreFocus} /></div>
            </div>
        </dialog>, document.body)}
    </>;
}
