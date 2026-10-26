import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { translate } from '../i18n/translate.js';
import FeedbackTab from '../feedback/FeedbackTab';
import { OPEN_MAP_GUIDE_EVENT } from '../onboarding/mapGuideEvents.js';
import './HelpCenter.css';

export default function HelpCenter({ inMenu = false, onOpened }) {
    const location = useLocation();
    const dialogRef = useRef(null);
    const triggerRef = useRef(null);
    const id = useId();
    const [desktop, setDesktop] = useState(() => window.matchMedia('(min-width: 901px)').matches);
    useEffect(() => {
        const query = window.matchMedia('(min-width: 901px)');
        const update = () => setDesktop(query.matches);
        query.addEventListener('change', update);
        return () => query.removeEventListener('change', update);
    }, []);
    const params = new URLSearchParams(location.search);
    const canTour = desktop && location.pathname === '/taste-map'
        && !['map', 'today', 'discover'].includes(params.get('tab')) && params.get('view') !== 'immersive';
    const restoreFocus = () => {
        const menu = triggerRef.current?.closest('details');
        (menu && !menu.open ? menu.querySelector('summary') : triggerRef.current)?.focus({ preventScroll: true });
    };
    const close = () => dialogRef.current?.close();
    if (location.pathname.startsWith('/auth/')) return null;
    return <>
        <button ref={triggerRef} type="button" className={inMenu ? 'help-center-menu-entry' : 'help-center-trigger'}
            aria-haspopup="dialog" aria-controls={`${id}-help`} onClick={() => { dialogRef.current.showModal(); onOpened?.(); }}>
            <span aria-hidden="true">?</span><span>{translate('사용 안내 · 문의')}</span>
        </button>
        {createPortal(<dialog ref={dialogRef} id={`${id}-help`} className="help-center-dialog" aria-labelledby={`${id}-title`}
            onClose={() => { if (!document.querySelector('.feedback-dialog[open]')) restoreFocus(); }}
            onClick={event => {
                if (event.target !== event.currentTarget) return;
                const box = event.currentTarget.getBoundingClientRect();
                if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close();
            }}>
            <header><h2 id={`${id}-title`}>{translate('사용 안내 · 문의')}</h2><button type="button" onClick={close} aria-label={translate('사용 안내 닫기')}>×</button></header>
            <div className="help-center-topics">
                <section><h3>{translate('음악 가져오기')}</h3><p>{translate('좋아하는 곡 몇 개로도 시작할 수 있어요. 곡 목록을 붙여넣거나 가지고 있는 파일을 올려보세요.')}</p></section>
                <section><h3>{translate('지도 탐색하기')}</h3><p>{translate('곡을 선택해 듣고, 비슷한 곡을 찾아 내 지도에 추가해 보세요.')}</p></section>
                <section><h3>{translate('저장과 공유')}</h3><p>{translate('지도는 이 브라우저에 저장되고, 로그인하면 계정에도 저장돼요.')}</p><p>{translate('공유 버튼에서 취향 카드를 저장하거나 친구에게 지도를 보낼 수 있어요.')}</p></section>
            </div>
            <div className="help-center-actions">
                {canTour && <button type="button" className="help-center-tour" onClick={() => {
                    close();
                    requestAnimationFrame(() => window.dispatchEvent(new Event(OPEN_MAP_GUIDE_EVENT)));
                }}>{translate('취향 지도 사용 안내 다시 보기')} <span aria-hidden="true">↗</span></button>}
                <FeedbackTab inMenu onBeforeOpen={close} onClosed={restoreFocus} />
            </div>
        </dialog>, document.body)}
    </>;
}
