import SpectraLogo from '../components/SpectraLogo';
import React, { useEffect, useRef, useState } from 'react';
import { DEMO_UNIVERSES } from '../taste/demoUniverses';
import { generateAestheticCoverSvg } from '../taste/demoArtwork';
import { getDemoCover } from '../taste/demoCoverAssets';
import SpectraSymbol from '../components/SpectraSymbol';
import './LaunchTasteJourney.css';

const REGIONS = ['드림 팝 · 인디', '신스웨이브 · 일렉트로', '재즈 · 알앤비'];
const TRACKS = DEMO_UNIVERSES.flatMap((universe, group) =>
  universe.tracks.slice(0, 6).map((track, local) => ({
    ...track, id: `landing-preview-${group}-${local}`, group, local, color: universe.color,
    coverUrl: getDemoCover(track.artists, track.name) || generateAestheticCoverSvg({ ...track, color: universe.color, index: local }),
  })));
const CHAPTERS = [
  { label: '이해', title: '좋아한 음악에서 나를 이해해요.', text: '내가 모아 온 곡을 한눈에 살펴보세요. 곡 정보와 장르, 곡 사이의 연결이 내가 좋아하는 음악의 공통점을 보여줍니다.', hint: '버블을 선택하면 곡 정보가 나타나요.', symbol: 'sparkle' },
  { label: '분류', title: '닮은 곡을 모아 취향을 읽어요.', text: '장르와 음악적 특징이 닮은 곡들이 가까이 모입니다. 흩어져 있던 플레이리스트를 취향의 영역으로 살펴보세요.', hint: '장르 영역을 눌러 곡들이 어떻게 모이는지 살펴보세요.', symbol: 'wave' },
  { label: '확장', title: '내 취향에서 새로운 음악으로.', text: '좋아하는 한 곡을 출발점으로 연결을 따라가세요. 실제 지도에서는 탐색 버튼으로 새로운 곡을 발견하고, 마음에 드는 곡을 내 지도에 담을 수 있어요.', hint: '다른 별을 선택하면 연결의 중심이 바뀝니다.', symbol: 'matrix' },
];

function position(track, stage) {
  const i = track.group * 6 + track.local;
  if (stage === 0) {
    const angle = i * 2.39996;
    const radius = 9 + Math.sqrt(i) * 8.1;
    return [50 + Math.cos(angle) * radius, 50 + Math.sin(angle) * radius * 0.83];
  }
  const centers = [[28, 35], [73, 37], [49, 73]];
  const [x, y] = centers[track.group];
  const angle = track.local * Math.PI / 3 - 0.6;
  return [x + Math.cos(angle) * (stage === 2 ? 19 : 13), y + Math.sin(angle) * (stage === 2 ? 18 : 12)];
}

function BubbleAtlas({ stage, onOpen, busy }) {
  const [selectedId, setSelectedId] = useState(TRACKS[0].id);
  const [region, setRegion] = useState(null);
  const [hovered, setHovered] = useState(null);
  const selected = TRACKS.find(track => track.id === selectedId) || TRACKS[0];
  const focus = TRACKS.find(track => track.id === hovered) || selected;
  const origin = position(focus, stage);
  const neighbors = TRACKS.filter(track => track.id !== focus.id)
    .map(track => ({ track, point: position(track, stage) }))
    .sort((a, b) => Math.hypot(a.point[0] - origin[0], a.point[1] - origin[1]) - Math.hypot(b.point[0] - origin[0], b.point[1] - origin[1]))
    .slice(0, 5);
  const selectRegion = (group) => {
    setRegion(region === group ? null : group);
    if (region !== group) setSelectedId(TRACKS.find(track => track.group === group).id);
  };
  return (
    <div className={`lj-atlas lj-atlas--${stage}`}>
      <div className="lj-atlas-heading"><span className="spectra-logo-caption"><SpectraLogo />LIVE DEMO</span><span>18 SONGS</span></div>
      <div className="lj-regions" role="group" aria-label="데모 장르 영역 선택">
        {DEMO_UNIVERSES.map((universe, group) => <button type="button" key={universe.id} style={{ '--region': universe.color }} aria-pressed={region === group} onClick={() => selectRegion(group)}><SpectraSymbol symbol={universe.symbol} />{REGIONS[group]}</button>)}
      </div>
      <div className="lj-map" aria-label="18곡의 인터랙티브 데모 지도">
        <div className="lj-map-grid" aria-hidden="true" />
        {stage > 0 && DEMO_UNIVERSES.map((universe, group) => <div key={universe.id} className={`lj-region-cloud lj-region-cloud--${group}`} style={{ '--region': universe.color }} aria-hidden="true" />)}
        <svg className="lj-connections" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {neighbors.map(({ track, point }) => <line key={track.id} x1={origin[0]} y1={origin[1]} x2={point[0]} y2={point[1]} style={{ stroke: focus.color }} />)}
        </svg>
        {TRACKS.map((track) => {
          const [x, y] = position(track, stage);
          const picked = track.id === selectedId;
          return <button type="button" key={track.id}
            className={`lj-bubble${picked ? ' is-picked' : ''}${region !== null && region !== track.group ? ' is-muted' : ''}`}
            style={{ left: `${x}%`, top: `${y}%`, '--region': track.color, '--delay': `${-(track.local * 0.8)}s`, '--bubble-size': `${track.local === 0 ? 64 : 42 + track.local * 3}px` }}
            aria-label={`${track.name} · ${track.artists}`} aria-pressed={picked}
            onClick={() => { setSelectedId(track.id); if (region !== null) setRegion(track.group); }}
            onPointerEnter={() => setHovered(track.id)} onPointerLeave={() => setHovered(null)}
            onFocus={() => setHovered(track.id)} onBlur={() => setHovered(null)}>
            <span className="lj-bubble-cover"><img src={track.coverUrl} alt="" loading="lazy" decoding="async" /></span>
            <span className="lj-bubble-label">{track.name}</span>
          </button>;
        })}
        <div className="lj-map-axis" aria-hidden="true"><span>SOFT</span><span>ENERGETIC →</span></div>
      </div>
      <div className="lj-track-detail" style={{ '--region': selected.color }}>
        <img src={selected.coverUrl} alt="" decoding="async" />
        <div aria-live="polite"><span>SELECTED TRACK</span><strong>{selected.name}</strong><small>{selected.artists}</small></div>
        <button type="button" onClick={() => onOpen(DEMO_UNIVERSES[selected.group])} disabled={busy} aria-label={`${selected.name}의 데모 taste맵 열기`}>탐험 ↗</button>
      </div>
      <p className="lj-preview-note">데모 곡으로 구성한 인터랙티브 프리뷰</p>
    </div>
  );
}

export default function LaunchTasteJourney({ onOpen, busy }) {
  const sectionRef = useRef(null);
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const section = sectionRef.current;
    let frame = 0;
    const update = () => {
      frame = 0;
      if (window.innerWidth < 900) return;
      const steps = [...section.querySelectorAll('.lj-step')];
      const middle = window.innerHeight * 0.52;
      const nearest = steps.map((step, i) => ({ i, distance: Math.abs(step.getBoundingClientRect().top + step.offsetHeight / 2 - middle) })).sort((a, b) => a.distance - b.distance)[0];
      setStage(current => current === nearest.i ? current : nearest.i);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, []);
  const chooseStage = (next) => {
    setStage(next);
    if (window.innerWidth >= 900) sectionRef.current.querySelectorAll('.lj-step')[next].scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
  };
  return (
    <section className="lj-journey llp-section" id="features" ref={sectionRef}>
      <header className="lj-intro"><span className="lj-kicker">01 / FROM SOUND TO SHAPE</span><h2>당신이 좋아한 음악을<br /><span>지도로 펼쳐보아요.</span></h2><p>이해 → 분류 → 확장. 아래 지도에서 직접 체험해 보세요.</p></header>
      <div className="lj-story-grid">
        <div className="lj-story-copy">
          {CHAPTERS.map((chapter, i) => <article key={chapter.label} className={`lj-step${stage === i ? ' is-current' : ''}`}>
            <span className="lj-step-number">0{i + 1}</span><span className="lj-kicker"><SpectraSymbol symbol={chapter.symbol} /> {chapter.label}</span>
            <h3>{chapter.title}</h3><p>{chapter.text}</p><small>{chapter.hint}</small>
          </article>)}
        </div>
        <div className="lj-stage">
          <div className="lj-stage-tabs" role="group" aria-label="지도 변화 단계">{CHAPTERS.map((chapter, i) => <button key={chapter.label} type="button" aria-pressed={stage === i} onClick={() => chooseStage(i)}><span>0{i + 1}</span>{chapter.label}</button>)}</div>
          <BubbleAtlas stage={stage} onOpen={onOpen} busy={busy} />
          <p className="lj-mobile-hint">{CHAPTERS[stage].hint}</p>
        </div>
      </div>
    </section>
  );
}

const PORTAL_TRACKS = DEMO_UNIVERSES.map((_, group) => TRACKS.filter(track => track.group === group));
export function LaunchDemoPortal({ group, onSelect }) {
  const tracks = PORTAL_TRACKS[group];
  const [selected, setSelected] = useState(0);
  return <div className="lj-demo-portal">
    <div className="lj-demo-orbit" aria-hidden="true" />
    {tracks.map((track, i) => {
      const angle = (i - 1) * Math.PI / 3;
      return <button type="button" key={track.id} className={`lj-demo-bubble${selected === i ? ' is-picked' : ''}`} style={{ left: `${50 + Math.cos(angle) * 32}%`, top: `${47 + Math.sin(angle) * 30}%`, '--region': track.color }} aria-label={`${track.name} 보기`} aria-pressed={selected === i} onClick={() => { setSelected(i); onSelect?.(); }}><img src={track.coverUrl} alt="" loading="lazy" decoding="async" /></button>;
    })}
    <span className="lj-demo-center" aria-hidden="true"><SpectraSymbol symbol={DEMO_UNIVERSES[group].symbol} /></span>
    <div className="lj-demo-track" aria-live="polite"><strong>{tracks[selected].name}</strong><span>{tracks[selected].artists}</span></div>
  </div>;
}

export function LaunchImportOrbit({ count, active, onChoose }) {
  return <button type="button" className={`lj-import-orbit${active ? ' is-active' : ''}`} onClick={onChoose} aria-label="내 음악 목록 선택하기">
    <span className="lj-import-ring" aria-hidden="true" /><span className="lj-import-ring lj-import-ring--two" aria-hidden="true" />
    {Array.from({ length: 8 }, (_, i) => <i key={i} style={{ '--angle': `${i * 45}deg`, '--dot-size': `${7 + i % 3 * 4}px` }} aria-hidden="true" />)}
    <span className="lj-import-core"><strong>{count ? count.toLocaleString() : '＋'}</strong><small>{count ? 'SONGS FOUND' : 'YOUR MUSIC'}</small></span>
  </button>;
}
