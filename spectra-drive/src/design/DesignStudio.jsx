import { useEffect, useId, useRef, useState } from 'react';
import TasteConstellation from '../TasteConstellation.jsx';
import { MoodGlyph, TrackArtwork } from '../BrandElements.jsx';
import { DESIGN_SCENES, buildDesignScene, designLibrary } from './scenario.js';
import { MOODS } from '../moodEngine.js';
import './design.css';

function VoiceMark({ active = false }) {
  return <span className={`ds-voice-mark ${active ? 'is-active' : ''}`} aria-hidden="true">{Array.from({ length: 7 }, (_, index) => <i key={index} />)}</span>;
}

function RoutePreview({ parked }) {
  return <div className="ds-route-card"><div className="ds-card-top"><span>{parked ? 'NEXT JOURNEY' : 'YOUR WAY HOME'}</span><span className="ds-small-dot" />{parked ? '정차' : '경로 예시'}</div><div className="ds-route-content"><div><span className="ds-home-icon" aria-hidden="true">⌂</span><strong>{parked ? '다음 이동을 준비해요' : '집으로 가는 길'}</strong><small>{parked ? '출발 전에 나만의 무드를 저장하세요' : '저장한 집 위치와 목적지가 일치해요'}</small></div><svg viewBox="0 0 150 86" fill="none" aria-hidden="true"><g stroke="#34455c" strokeWidth="1"><path d="M0 18h150M0 45h150M0 73h150M24 0v86M66 0v86M112 0v86M148 0v86" /></g><path d="M24 72V45H66V18H112" stroke={parked ? '#91a4c2' : '#9bcbff'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><circle cx="24" cy="72" r="5" fill="#cee0ff" stroke="#0f1a2b" strokeWidth="3" /><circle cx="112" cy="18" r="6" fill="#0f1a2b" stroke="#c1b0f3" strokeWidth="2" /></svg></div></div>;
}

function CabinScene({ state, isApplied, isRefined }) {
  const id = useId().replaceAll(':', '');
  const light = state.lighting;
  return <div className="ds-cabin-card" style={{ '--cabin-light': light.color }}>
    <div className="ds-card-top"><span>CABIN AMBIENCE</span><span className={`ds-cabin-pill ${isRefined ? 'is-locked' : ''}`}>{isRefined ? '조명 유지' : isApplied ? '무드에 맞춘 빛' : '현재 조명'}</span></div>
    <svg className="ds-cabin-scene" viewBox="0 0 400 200" fill="none" aria-hidden="true">
      <defs><linearGradient id={`${id}-dash`} x1="200" y1="62" x2="200" y2="175" gradientUnits="userSpaceOnUse"><stop stopColor="#233147" /><stop offset=".4" stopColor="#101a2a" /><stop offset="1" stopColor="#070d18" /></linearGradient><radialGradient id={`${id}-window`}><stop stopColor="#1a2c42" /><stop offset="1" stopColor="#0a1423" /></radialGradient><radialGradient id={`${id}-ambience`}><stop stopColor={light.color} stopOpacity=".22" /><stop offset="1" stopColor={light.color} stopOpacity="0" /></radialGradient><linearGradient id={`${id}-metal`}><stop stopColor="#46546a" /><stop offset=".5" stopColor="#8a98ac" /><stop offset="1" stopColor="#364459" /></linearGradient></defs>
      <ellipse cx="200" cy="115" rx="190" ry="80" fill={`url(#${id}-ambience)`} />
      <path d="M28 137L61 36Q67 24 85 23H315Q333 24 339 36L372 137" fill="#080f1b" stroke="#35445b" strokeWidth="1.2" />
      <path d="M53 99L72 43Q75 36 87 35H313Q325 36 328 43L347 99Q200 76 53 99Z" fill={`url(#${id}-window)`} />
      <path d="M86 35L62 103M314 35L338 103" stroke="#576176" opacity=".4" />
      <path d="M55 87h290M116 35l14 47m154-47-14 47" stroke="#28435c" strokeWidth=".5" opacity=".4" />
      <path d="M30 125Q200 77 370 125L379 162Q200 135 21 162Z" fill={`url(#${id}-dash)`} stroke="#344157" />
      <path className="ds-ambient-line ds-ambient-line-glow" d="M33 126Q200 79 367 126" stroke={light.color} strokeWidth="5" opacity=".23" />
      <path className="ds-ambient-line" d="M33 126Q200 79 367 126" stroke={light.color} strokeWidth="1.8" />
      <rect x="165" y="101" width="86" height="38" rx="5" fill="#08111f" stroke="#55657a" />
      <path d="M174 112h30m-30 7h17m22-5h29m-29 6h20" stroke={light.color} strokeWidth="1.2" opacity=".7" />
      <path d="M93 139v13m-26-19a26 26 0 1 1 52 0" stroke="#080d17" strokeWidth="9" />
      <circle cx="93" cy="131" r="26" stroke={`url(#${id}-metal)`} strokeWidth="3" />
      <path d="M69 130h48m-24-24v48" stroke="#5e6d82" strokeWidth="2" /><ellipse cx="93" cy="131" rx="8" ry="6" fill="#172337" stroke="#5e6d82" />
      <path d="M12 176Q76 150 135 166L146 198H8Zm242 22 11-32q59-16 123 10l4 22Z" fill="#101a29" stroke="#344157" />
      <path d="M40 175q44-13 82 0m155 0q38-13 82 0" stroke={light.color} opacity=".22" />
    </svg>
    <div className="ds-cabin-values"><div><i style={{ background: light.color }} /><strong>{isApplied ? '하늘빛' : '은은한 화이트'}</strong><span>{Math.round(light.brightness * 100)}%</span></div><small>조명 상태 예시 · 실제 차량 미연결</small></div>
  </div>;
}

export function VehicleConcept({ sceneId = 'ready', onSceneChange, listening = false }) {
  const { scene, state, queue, isApplied, isRefined, parked } = buildDesignScene(sceneId);
  const interactive = Boolean(onSceneChange);
  return <section className={`ds-vehicle-screen ds-scene-${scene.id}`} data-scene={scene.id} style={{ '--mood': MOODS[state.mood].color, '--music-accent': isRefined ? '#d0a8f5' : '#a5d6f0' }} aria-label={`${scene.number} ${scene.title} 차량 화면 시안`}>
    <header className="ds-screen-header"><div className="ds-screen-brand"><img src="/spectra-wordmark.svg" alt="SPECTRA" /><span>DRIVE</span></div><div className="ds-drive-status"><span className="ds-status-dot" />{parked ? '출발 전 · 정차' : '집으로 가는 길'}</div><div className="ds-header-meta"><span>18:32</span><span>UI CONCEPT</span></div></header>
    <div className="ds-universe-panel"><div className="ds-universe-copy"><span className="ds-kicker">{scene.label}</span><h2>{scene.headline[0]}<br />{scene.headline[1]}</h2><p>{parked ? '좋아하는 음악, 머물고 싶은 빛. 하나의 무드로 기억해요.' : isRefined ? '좋아하는 분위기는 이어가며, 음악의 활기만 조금 더.' : isApplied ? '저장한 취향과 빛으로, 익숙한 길을 나만의 시간으로.' : '익숙한 취향으로, 오늘의 이동을 조금 더 나답게.'}</p></div>
      <div className="ds-universe-map"><TasteConstellation library={designLibrary} queue={queue} mood={MOODS[state.mood]} listening={listening} /><div className="ds-field-caption"><span><i />MY TASTE CONSTELLATION</span><span>샘플 취향 · 12곡</span></div></div>
      <div className="ds-scene-footer"><div className="ds-saved-mood"><MoodGlyph mood="calm" /><div><small>{isApplied ? '지금의 무드' : '저장한 나의 무드'}</small><strong>퇴근 모드{isRefined && <span> · 음악 조정</span>}</strong></div></div><div className="ds-music-level"><small>음악 활기 설정</small><div><meter min="0" max="1" value={state.energy} aria-label="시안 음악 활기 설정" /><strong>{Math.round(state.energy * 100)}%</strong></div></div></div>
    </div>
    <aside className="ds-ambience-panel"><RoutePreview parked={parked} /><CabinScene state={state} isApplied={isApplied} isRefined={isRefined} />
      {scene.id === 'suggestion' ? <div className="ds-proposal-card"><span>오늘의 이동에 맞춰</span><strong>저장한 퇴근 모드로<br />바꿔볼까요?</strong><button disabled={!interactive} onClick={() => onSceneChange?.('applied')} aria-label="시안에서 퇴근 모드 적용">퇴근 모드 적용 <span>↗</span></button></div>
        : <div className={`ds-voice-card ${isApplied ? 'is-applied' : ''}`}><VoiceMark active={listening} /><div><small>{listening ? '음성 입력 장면 예시' : isRefined ? '원하는 부분만 조정' : isApplied ? '음악과 조명 설정 전환' : '한마디로 기억하는 분위기'}</small><strong>{isRefined ? '음악만 바꿨어요.' : isApplied ? '퇴근 무드로 맞췄어요.' : '나의 음악과 빛을 함께.'}</strong><span>{isRefined ? '조명은 하늘빛 42% 그대로' : isApplied ? '음악 설정 + 하늘빛 조명 42%' : '취향과 조명을 하나의 무드로 저장'}</span></div></div>}
    </aside>
    <div className="ds-bottom-bar"><div className="ds-sample-track"><TrackArtwork track={queue[0]} /><div><span>무드에 맞춘 추천 · 샘플 곡</span><strong>{queue[0].name}</strong><small>{queue[0].artist} · 재생 미연결</small></div></div><button className="ds-voice-command" disabled={!interactive} onClick={() => onSceneChange?.(scene.id === 'refined' ? 'ready' : scene.id === 'applied' ? 'refined' : scene.id === 'ready' ? 'suggestion' : 'applied', true)} aria-label="시안 음성 명령 장면 보기"><VoiceMark active={listening} /><span>{listening ? '요청을 듣는 장면이에요' : scene.voice}</span><span className="ds-example-label">요청 예시</span></button><span className="ds-demo-label">인터랙션 시안<br />Gleo·차량 미연결</span></div>
  </section>;
}

export function DesignBoard() {
  return <main className="ds-board"><header className="ds-board-heading"><div><img src="/spectra-wordmark.svg" alt="SPECTRA" /><span>DRIVE / EXPERIENCE CONCEPT</span></div><h1>내 취향과 이동 상황을 이해하고,<br />한마디로 차 안의 분위기를 바꾸다.</h1><p>음악과 빛을 함께, 마음에 드는 분위기는 그대로.</p></header><div className="ds-board-grid">{DESIGN_SCENES.map(scene => <figure key={scene.id}><figcaption><strong>{scene.number} / {scene.title}</strong><span>{scene.summary}</span></figcaption><VehicleConcept sceneId={scene.id} /></figure>)}</div><footer className="ds-board-footer"><span>SPECTRA DRIVE · DESIGN STUDY 01</span><span>샘플 음악·경로·음성 요청과 조명 상태를 사용한 UI 시안입니다. 실제 Gleo·Pleos SDK·차량 제어·음원 재생은 연결되지 않았습니다.</span></footer></main>;
}

export default function DesignStudio() {
  const params = new URLSearchParams(window.location.search);
  const initial = DESIGN_SCENES.findIndex(scene => scene.id === params.get('scene'));
  const [index, setIndex] = useState(initial >= 0 ? initial : 0);
  const [auto, setAuto] = useState(false);
  const [listening, setListening] = useState(false);
  const transitionRef = useRef(null);
  const scene = DESIGN_SCENES[index];
  const capture = params.get('capture') === '1';
  const board = window.location.pathname === '/design/board';
  useEffect(() => () => clearTimeout(transitionRef.current), []);
  useEffect(() => {
    if (!auto) return undefined;
    const timer = setInterval(() => setIndex(current => {
      if (current === DESIGN_SCENES.length - 1) return 0;
      return current + 1;
    }), 8000);
    return () => clearInterval(timer);
  }, [auto]);
  function changeScene(id, withVoice = false) {
    const next = DESIGN_SCENES.findIndex(item => item.id === id);
    if (next < 0) return;
    setAuto(false);
    clearTimeout(transitionRef.current);
    setListening(withVoice);
    if (withVoice && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) transitionRef.current = setTimeout(() => { setIndex(next); setListening(false); }, 1000);
    else { setIndex(next); setListening(false); }
  }
  if (board) return <DesignBoard />;
  if (capture) return <div className="ds-capture"><VehicleConcept sceneId={scene.id} /></div>;
  return <main className="ds-studio"><header className="ds-studio-header"><div><span className="ds-kicker">SPECTRA DRIVE / DESIGN STUDY 01</span><h1>한마디에, 음악과 빛이 함께.</h1><p>차량용 화면과 핵심 사용자 경험을 검토하는 네 장면의 인터랙션 시안.</p></div><div className="ds-studio-links"><a href="/">기능 시제품 ↗</a><a href="/design/board">전체 시안 보기 ↗</a></div></header><div className="ds-scene-tabs" role="group" aria-label="시안 장면 선택">{DESIGN_SCENES.map((item, sceneIndex) => <button key={item.id} aria-pressed={index === sceneIndex} onClick={() => changeScene(item.id)}><span>{item.number}</span>{item.title}</button>)}</div><div className="ds-stage"><div className="ds-device-frame"><VehicleConcept sceneId={scene.id} onSceneChange={changeScene} listening={listening} /></div><div className="ds-device-ambience" style={{ '--device-glow': buildDesignScene(scene.id).state.lighting.color }} aria-hidden="true" /></div><div className="ds-presenter"><div><strong>{scene.number} / {scene.title}</strong><span>{scene.note}</span></div><button aria-pressed={auto} onClick={() => { clearTimeout(transitionRef.current); setListening(false); if (!auto) setIndex(0); setAuto(!auto); }}>{auto ? '자동 재생 멈추기' : '32초 시나리오 자동 재생'}</button></div><p className="ds-prototype-note">이 화면은 UI·인터랙션 검토용 시안입니다. 음성 요청·경로·조명은 예시이며 실제 SDK나 음원 재생을 호출하지 않습니다. 로컬 음원과 권한 분기는 기능 시제품에서 확인할 수 있습니다.</p></main>;
}
