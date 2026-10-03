import React, { useEffect, useRef, useState } from 'react';
import { DEMO_UNIVERSES } from '../taste/demoUniverses';
import { generateAestheticCoverSvg } from '../taste/demoArtwork';
import SpectraSymbol from '../components/SpectraSymbol';
import './LaunchTasteJourney.css';

const MOODS = ['몽환적인', '에너지 넘치는', '그루브 있는'];
const TRACKS = DEMO_UNIVERSES.flatMap((universe, group) =>
  universe.tracks.slice(0, 6).map((track, local) => ({
    ...track, id: `landing-preview-${group}-${local}`, group, local, color: universe.color,
    coverUrl: generateAestheticCoverSvg({ ...track, color: universe.color, index: local }),
  })));
const ARTWORK_REQUESTS = new Map();
const normalize = (value) => String(value || '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

async function resolveArtwork(track) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 6000);
  try {
    const query = encodeURIComponent(`${track.artists} ${track.name}`);
    const response = await fetch(`https://itunes.apple.com/search?term=${query}&entity=song&limit=8`, { signal: controller.signal });
    if (!response.ok) return null;
    const data = await response.json();
    const artist = normalize(track.artists.split(/[,;&]/)[0]);
    const title = normalize(track.name);
    // Search results can include tribute recordings. Only use artwork whose
    // credited artist and song match this preview's actual demo track.
    const match = data.results?.find(result => normalize(result.artistName).includes(artist) && normalize(result.trackName).startsWith(title));
    return match?.artworkUrl100?.replace('100x100bb', '300x300bb') || null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}
const CHAPTERS = [
  { label: 'BUBBLES', title: '한 곡, 하나의 작은 세계.', text: '사랑하는 음악이 앨범을 품은 버블로 떠오릅니다. 익숙한 커버를 눌러, 그 안의 곡을 만나보세요.', hint: '버블을 선택하면 곡 정보가 나타나요.', symbol: 'sparkle' },
  { label: 'TASTE FIELD', title: '닮은 취향은 가까이.', text: '몽환적인 밤부터 에너지 넘치는 오후까지. 비슷한 분위기의 곡들이 모여 나만의 음악 지형을 만듭니다.', hint: '무드 태그를 눌러 한 영역에 집중해 보세요.', symbol: 'wave' },
  { label: 'CONSTELLATION', title: '다음 음악으로 이어지는 선.', text: '하나의 곡을 중심으로 연결이 펼쳐집니다. 별에서 별로 이동하며, 익숙한 음악 사이의 새로운 길을 발견하세요.', hint: '다른 별을 선택하면 연결의 중심이 바뀝니다.', symbol: 'matrix' },
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

function useArtwork(mountRef, tracks) {
  const [artwork, setArtwork] = useState({});
  useEffect(() => {
    let active = true;
    const observer = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      // Only resolve covers once the preview approaches the viewport. Shared
      // promises avoid duplicate requests between the journey and demo portals.
      for (let index = 0; index < tracks.length && active; index += 3) {
        const batch = await Promise.all(tracks.slice(index, index + 3).map(async (track) => {
          if (!ARTWORK_REQUESTS.has(track.id)) ARTWORK_REQUESTS.set(track.id, resolveArtwork(track));
          return [track.id, await ARTWORK_REQUESTS.get(track.id)];
        }));
        if (active) setArtwork(current => ({ ...current, ...Object.fromEntries(batch.filter(([, url]) => url)) }));
      }
    }, { rootMargin: '150px' });
    if (mountRef.current) observer.observe(mountRef.current);
    return () => { active = false; observer.disconnect(); };
  }, [mountRef, tracks]);
  return artwork;
}

function BubbleAtlas({ stage, onOpen, busy }) {
  const mountRef = useRef(null);
  const artwork = useArtwork(mountRef, TRACKS);
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
    <div ref={mountRef} className={`lj-atlas lj-atlas--${stage}`}>
      <div className="lj-atlas-heading"><span>SPECTRA / LIVE DEMO</span><span>18 SONGS</span></div>
      <div className="lj-regions" role="group" aria-label="지도 무드 선택">
        {DEMO_UNIVERSES.map((universe, group) => <button type="button" key={universe.id} style={{ '--region': universe.color }} aria-pressed={region === group} onClick={() => selectRegion(group)}><SpectraSymbol symbol={universe.symbol} />{MOODS[group]}</button>)}
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
            <span className="lj-bubble-cover"><img src={artwork[track.id] || track.coverUrl} alt="" loading="lazy" decoding="async" /></span>
            <span className="lj-bubble-label">{track.name}</span>
          </button>;
        })}
        <div className="lj-map-axis" aria-hidden="true"><span>SOFT</span><span>ENERGETIC →</span></div>
      </div>
      <div className="lj-track-detail" style={{ '--region': selected.color }}>
        <img src={artwork[selected.id] || selected.coverUrl} alt="" decoding="async" />
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
      <header className="lj-intro"><span className="lj-kicker">01 / FROM SOUND TO SHAPE</span><h2>흐르던 음악이,<br /><span>당신의 지도가 됩니다.</span></h2><p>버블을 건드리고, 무드를 좁히고, 연결을 따라가세요.</p></header>
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
  const mountRef = useRef(null);
  const tracks = PORTAL_TRACKS[group];
  const artwork = useArtwork(mountRef, tracks);
  const [selected, setSelected] = useState(0);
  return <div className="lj-demo-portal" ref={mountRef}>
    <div className="lj-demo-orbit" aria-hidden="true" />
    {tracks.map((track, i) => {
      const angle = (i - 1) * Math.PI / 3;
      return <button type="button" key={track.id} className={`lj-demo-bubble${selected === i ? ' is-picked' : ''}`} style={{ left: `${50 + Math.cos(angle) * 32}%`, top: `${47 + Math.sin(angle) * 30}%`, '--region': track.color }} aria-label={`${track.name} 보기`} aria-pressed={selected === i} onClick={() => { setSelected(i); onSelect?.(); }}><img src={artwork[track.id] || track.coverUrl} alt="" loading="lazy" decoding="async" /></button>;
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
