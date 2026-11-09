import { translate } from '../i18n/translate.js';
import { useLocale } from '../i18n/useLocale.js';
import { desktopGuideSteps } from './guideContent.js';
import MobileMusicIcon from '../components/MobileMusicIcon';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './MapOnboarding.css';
import { positionGuide } from './guidePosition';
import { OPEN_MAP_GUIDE_EVENT } from './mapGuideEvents.js';

const MOBILE = [
  { target: '.tmm-avatar-stage', label: '음악 살펴보기', title: '내 음악이 만든 모습을 봐요', action: '별을 누르면', text: ' 어떤 곡인지 확인할 수 있어요.' },
  { target: '.tmm-map-entry', label: '지도 탐색하기', title: '곡 사이의 연결을 따라가요', action: '내 음악 탐색하기', text: '를 눌러 상세 지도를 열어보세요.', hint: '지도에서 곡을 누르고 ‘별자리 항해’를 선택하면 연결된 곡을 따라 탐험할 수 있어요.' },
  { target: '.tmm-explore-toggle', label: '새 음악 찾기', title: '다음에 좋아할 음악을 만나요', action: '음악 더 탐색하기', text: '를 눌러 한 곡씩 만나보세요.', hint: 'Absorb는 내 취향에 담기, Dig는 더 탐색하기, Pop은 넘기기예요.' },
  { target: '.tmm-export', label: '취향 공유하기', title: '내 취향을 한 장에 담아요', action: '공유 카드 만들기', text: '를 눌러 나의 스펙트라를 이미지로 저장해 보세요.' },
];

export default function MapOnboarding({ mobile = false }) {
  const { lang } = useLocale();
  const en = lang === 'en';
  const key = mobile ? 'spectra:map-guide:v1:mobile' : 'spectra:map-guide:v2:desktop';
  const steps = useMemo(() => mobile ? MOBILE : desktopGuideSteps(en), [mobile, en]);
  const [step, setStep] = useState(() => {
    try { return localStorage.getItem(key) ? null : 0; } catch { return 0; }
  });
  const [rect, setRect] = useState(null);
  const [placement, setPlacement] = useState(null);
  const panelRef = useRef(null);
  const [mobileHost, setMobileHost] = useState(null);
  const restoreFocus = useRef(null);
  useEffect(() => {
    const open = () => {
      restoreFocus.current = document.activeElement;
      setStep(0);
    };
    window.addEventListener(OPEN_MAP_GUIDE_EVENT, open);
    return () => window.removeEventListener(OPEN_MAP_GUIDE_EVENT, open);
  }, []);
  const close = useCallback(() => {
    try { localStorage.setItem(key, 'seen'); } catch { /* The guide still closes if storage is unavailable. */ }
    setStep(null);
    if (restoreFocus.current?.isConnected) restoreFocus.current.focus({ preventScroll: true });
  }, [key]);
  useEffect(() => {
    if (step === null) return undefined;
    const previous = document.activeElement;
    if (step === 0 && !restoreFocus.current) restoreFocus.current = previous;
    panelRef.current?.focus({ preventScroll: true });
    let target;
    let scrolled = false;
    let openedTrack = false;
    let triedTrack = false;
    let host = null;
    const update = () => {
      target = document.querySelector(steps[step].target);
      if (!target && steps[step].openTrack && !triedTrack) {
        const trackButton = document.querySelector('.tm-bubble-item:not(.muted) .tm-bubble');
        if (trackButton) {
          triedTrack = true;
          openedTrack = true;
          trackButton.click();
        }
      }
      // Keep navigation available while the track panel opens or if no track is visible.
      if (!target && steps[step].openTrack) target = document.querySelector('.tm-canvas-wrap');
      if (!target) {
        setRect(null);
        const panel = panelRef.current?.getBoundingClientRect();
        if (panel) setPlacement({ left: Math.max(16, (innerWidth - panel.width) / 2), top: Math.max(16, (innerHeight - panel.height) / 2), side: null });
        return;
      }
      if (mobile && !host) {
        host = document.createElement('div');
        host.className = 'map-guide-inline-host';
        target.insertAdjacentElement('afterend', host);
        setMobileHost(host);
      }
      if (!scrolled) { target.scrollIntoView({ block: mobile ? 'start' : 'center', behavior: 'instant' }); scrolled = true; }
      const box = target.getBoundingClientRect();
      const panel = panelRef.current?.getBoundingClientRect();
      if (panel) setPlacement(positionGuide(box, panel, { width: window.innerWidth, height: window.innerHeight }));
      setRect({ left: Math.max(6, box.left - 6), top: Math.max(6, box.top - 6), width: Math.min(box.width + 12, window.innerWidth - 12), height: Math.min(box.height + 12, window.innerHeight - 12), bottom: box.bottom });
    };
    const handleKeyDown = event => {
      if (event.defaultPrevented || event.isComposing) return;
      if (event.key === 'Escape') { event.stopPropagation(); close(); return; }
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target;
      if (target?.isContentEditable || target?.closest?.('input, textarea, select, [role="textbox"], [role="slider"], [role="combobox"], [role="tablist"], [role="listbox"], [role="menu"], [role="tree"]')) return;
      const dialog = target?.closest?.('[role="dialog"], dialog[open]');
      if (dialog && dialog !== panelRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.repeat) return;
      if (event.key === 'ArrowLeft') setStep(current => current === null ? null : Math.max(0, current - 1));
      else if (step === steps.length - 1) close();
      else setStep(current => current === null ? null : Math.min(steps.length - 1, current + 1));
    };
    update();
    const timer = window.setInterval(update, 400);
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    const observer = new ResizeObserver(update);
    if (panelRef.current) observer.observe(panelRef.current);
    window.addEventListener('keydown', handleKeyDown, true);
    return () => { host?.remove(); if (mobile) setMobileHost(null); if (openedTrack) document.querySelector('.ccp-close-btn')?.click(); window.clearInterval(timer); observer.disconnect(); window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); window.removeEventListener('keydown', handleKeyDown, true); };
  }, [step, mobile, steps, close]);
  if (step === null) return null;
  const panel = (
    <section ref={panelRef} tabIndex={-1} role="dialog" aria-labelledby="map-guide-title" aria-describedby="map-guide-description" aria-keyshortcuts="ArrowLeft ArrowRight"
      className={`map-guide-panel${mobile ? ' is-mobile' : ''}`}
      data-side={!mobile ? placement?.side || undefined : undefined}
      style={mobile ? undefined : { left: placement?.left ?? 16, top: placement?.top ?? 16, visibility: placement ? 'visible' : 'hidden', '--guide-arrow': `${placement?.arrow || 24}px` }}>
      {!mobile && placement?.side && <span className="map-guide-arrow" aria-hidden="true" />}
      <div className="map-guide-meta">
        <span className="map-guide-count" aria-live="polite">{step + 1}/{steps.length}<span>{en ? 'Quick tour' : '빠른 사용 안내'}</span></span>
        <button type="button" className="map-guide-dismiss" onClick={close} aria-label={en ? 'Close walkthrough' : '따라하기 안내 닫기'}><MobileMusicIcon name="close" /></button>
      </div>
      <div className="map-guide-step" key={`${step}:${lang}`}>
        <div className="map-guide-label"><span><MobileMusicIcon name={steps[step].icon || 'discover'} /></span>{translate(steps[step].label)}</div>
        <h2 id="map-guide-title">{translate(steps[step].title)}</h2>
        <p id="map-guide-description">{steps[step].action && <strong>{translate(steps[step].action)}</strong>}{translate(steps[step].text)}</p>
        {steps[step].gesture && <div className="map-guide-gesture"><MobileMusicIcon name="arrow" /><span>{steps[step].gesture}</span></div>}
        {steps[step].hint && <p className="map-guide-hint">{translate(steps[step].hint)}</p>}
      </div>
      <div className="map-guide-footer">
        {step > 0 && <button type="button" className="map-guide-prev" aria-keyshortcuts="ArrowLeft" title={en ? 'Previous (←)' : '이전 (←)'} onClick={() => setStep(step - 1)}>{translate("이전")}</button>}
        <button type="button" className="map-guide-next" aria-keyshortcuts="ArrowRight" title={en ? 'Next (→)' : '다음 (→)'} onClick={() => step === steps.length - 1 ? close() : setStep(step + 1)}>{step === steps.length - 1 ? (en ? 'Explore my map' : '내 지도 둘러보기') : <>{translate("다음")}<MobileMusicIcon name="arrow" /></>}</button>
      </div>
    </section>
  );
  return <>
    {rect && <div className="map-guide-highlight" aria-hidden="true" style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }} />}
    {mobile ? mobileHost && createPortal(panel, mobileHost) : panel}
  </>;
}
