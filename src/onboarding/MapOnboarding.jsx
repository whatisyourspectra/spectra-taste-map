import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './MapOnboarding.css';
import { positionGuide } from './guidePosition';

const DESKTOP = [
  { target: '.tm-canvas-wrap', label: '별자리 항해', title: '좋아하는 곡에서 항해를 시작해요', action: '앨범이나 별을 누른 뒤', text: ' 곡 정보에서 ‘별자리 항해’를 선택해 보세요.', hint: '연결된 곡을 따라가며 새로운 음악을 발견할 수 있어요.' },
  { target: '.ccp-card', openTrack: true, label: '곡 정보와 듣기', title: '선택한 곡에서 다음 탐험으로', action: '우하단 곡 정보 패널에서', text: ' 곡과 별자리를 확인하고, YouTube로 듣거나 ‘별자리 항해’를 시작할 수 있어요.', hint: 'Spotify로 열기, 내 지도에 추가, 닮은 곡으로 확장도 이곳에서 할 수 있어요.' },
  { target: '.tm-view-switcher', label: '지도 바꾸기', title: '취향을 다른 시선으로 봐요', action: 'Taste Field와 Spectra', text: '를 바꿔 보며 닮은 곡과 연결을 살펴보세요.' },
  { target: '.tm-dock-actions .tm-dock-action:first-child', label: '새 음악 찾기', title: '내 취향에서 한 걸음 더', action: '새 음악 찾기를 누르면', text: ' 추천 목록에서 곡을 골라 들을 수 있어요.', hint: '한 번에 최대 8곡을 찾아요. 마음에 드는 곡만 추가 버튼으로 내 지도에 담아요.' },
  { target: '.tm-dock-actions .tm-dock-action:last-child', label: '곡 모으기', title: '좋아하는 곡끼리 모아봐요', action: '선택을 켠 뒤', text: ' 곡들을 드래그해 골라보세요.', hint: '이름을 붙여 나만의 그룹으로 저장할 수 있어요.' },
  { target: '.tm-dock-zoom', label: '확대·축소하기', title: '가까이 보고, 넓게 살펴봐요', action: '−와 +로', text: ' 지도를 축소하거나 확대해 보세요.', hint: '가운데 퍼센트를 누르면 전체 곡을 다시 볼 수 있어요.' },
];
const MOBILE = [
  { target: '.tmm-avatar-stage', label: '음악 살펴보기', title: '내 음악이 만든 모습을 봐요', action: '별을 누르면', text: ' 어떤 곡인지 확인할 수 있어요.' },
  { target: '.tmm-map-entry', label: '지도 탐색하기', title: '곡 사이의 연결을 따라가요', action: '내 음악 탐색하기', text: '를 눌러 상세 지도를 열어보세요.', hint: '지도에서 곡을 누르고 ‘별자리 항해’를 선택하면 연결된 곡을 따라 탐험할 수 있어요.' },
  { target: '.tmm-explore-toggle', label: '새 음악 찾기', title: '다음에 좋아할 음악을 만나요', action: '음악 더 탐색하기', text: '를 눌러 한 곡씩 만나보세요.', hint: 'Absorb는 내 취향에 담기, Dig는 더 탐색하기, Pop은 넘기기예요.' },
  { target: '.tmm-export', label: '취향 공유하기', title: '내 취향을 한 장에 담아요', action: '공유 카드 만들기', text: '를 눌러 나의 스펙트라를 이미지로 저장해 보세요.' },
];

export default function MapOnboarding({ mobile = false }) {
  const key = mobile ? 'spectra:map-guide:v1:mobile' : 'spectra:map-guide:v2:desktop';
  const steps = mobile ? MOBILE : DESKTOP;
  const [step, setStep] = useState(() => {
    try { return localStorage.getItem(key) ? null : 0; } catch { return 0; }
  });
  const [rect, setRect] = useState(null);
  const [placement, setPlacement] = useState(null);
  const panelRef = useRef(null);
  const [mobileHost, setMobileHost] = useState(null);
  const restoreFocus = useRef(null);
  const close = () => {
    try { localStorage.setItem(key, 'seen'); } catch { /* The guide still closes if storage is unavailable. */ }
    setStep(null);
    if (restoreFocus.current?.isConnected) restoreFocus.current.focus({ preventScroll: true });
  };
  useEffect(() => {
    if (step === null) return undefined;
    const previous = document.activeElement;
    if (step === 0) restoreFocus.current = previous;
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
      if (!target) { setRect(null); setPlacement(null); return; }
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
    const escape = event => { if (event.key === 'Escape') { event.stopPropagation(); close(); } };
    update();
    const timer = window.setInterval(update, 400);
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    const observer = new ResizeObserver(update);
    if (panelRef.current) observer.observe(panelRef.current);
    window.addEventListener('keydown', escape, true);
    return () => { host?.remove(); if (mobile) setMobileHost(null); if (openedTrack) document.querySelector('.ccp-close-btn')?.click(); window.clearInterval(timer); observer.disconnect(); window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); window.removeEventListener('keydown', escape, true); };
  }, [step, mobile]);
  if (step === null) return <button type="button" className="map-guide-reopen" onClick={() => setStep(0)} aria-label="취향 지도 사용 안내 다시 보기">? <span>사용 안내</span></button>;
  const panel = (
    <section ref={panelRef} tabIndex={-1} role="dialog" aria-labelledby="map-guide-title" aria-describedby="map-guide-description"
      className={`map-guide-panel${mobile ? ' is-mobile' : ''}`}
      data-side={!mobile ? placement?.side || undefined : undefined}
      style={mobile ? undefined : { left: placement?.left ?? 16, top: placement?.top ?? 16, visibility: placement ? 'visible' : 'hidden', '--guide-arrow': `${placement?.arrow || 24}px` }}>
      {!mobile && placement?.side && <span className="map-guide-arrow" aria-hidden="true" />}
      <div className="map-guide-meta">
        <span>{steps[step].label}<span className="map-guide-count" aria-live="polite">{step + 1}/{steps.length}</span></span>
        <button type="button" className="map-guide-dismiss" onClick={close}>나중에 보기</button>
      </div>
      <h2 id="map-guide-title">{steps[step].title}</h2>
      <p id="map-guide-description"><strong>{steps[step].action}</strong>{steps[step].text}</p>
      {steps[step].hint && <p className="map-guide-hint">{steps[step].hint}</p>}
      <div className="map-guide-footer">
        {step > 0 && <button type="button" className="map-guide-prev" onClick={() => setStep(step - 1)}>이전</button>}
        <button type="button" className="map-guide-next" onClick={() => step === steps.length - 1 ? close() : setStep(step + 1)}>{step === steps.length - 1 ? '시작하기' : '다음'}</button>
      </div>
    </section>
  );
  return <>
    {rect && <div className="map-guide-highlight" aria-hidden="true" style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }} />}
    {mobile ? mobileHost && createPortal(panel, mobileHost) : panel}
  </>;
}
