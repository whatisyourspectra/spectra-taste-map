import { useState } from 'react';

function DrivingView() {
  return <section className="pc-driving" aria-label="Pleos 주행 정보 모의 화면">
    <div className="pc-driving-heading"><span>주행 예시</span><span className="pc-driving-eco">ECO</span></div>
    <div className="pc-driving-speed"><strong>48</strong><span>km/h</span><small>P R N <b>D</b></small></div>
    <div className="pc-driving-battery"><span>▰ 78%</span><span>312 km</span></div>
    <div className="pc-driving-assist"><span>◉</span><span>차로 유지</span><span className="pc-speed-limit">50</span></div>
    <svg className="pc-driving-road" viewBox="0 0 320 460" fill="none" aria-hidden="true"><defs><linearGradient id="pc-lane-fade" x1="160" y1="0" x2="160" y2="460" gradientUnits="userSpaceOnUse"><stop stopColor="#887aff" stopOpacity="0" /><stop offset="1" stopColor="#887aff" stopOpacity=".23" /></linearGradient><linearGradient id="pc-car-body" x2=".6" y2="1"><stop stopColor="#728092" /><stop offset=".6" stopColor="#273344" /><stop offset="1" stopColor="#4b586a" /></linearGradient></defs><path d="M139 2 61 460h198L181 2Z" fill="url(#pc-lane-fade)" /><path d="M138 2 62 460M182 2l76 458" stroke="#b5b2e9" strokeWidth="2" /><path d="m118 2-107 458m191-458 107 458" stroke="#d7dbe3" strokeWidth="2" /><path d="M160 4v50m0 35v65m0 50v92" stroke="#e1e3ed" strokeWidth="2" strokeDasharray="10 16" /><g transform="translate(131 292)"><ellipse cx="29" cy="58" rx="41" ry="67" fill="#a2a9b9" opacity=".13" /><path d="m7 10 8-10h28l8 10 7 85q-29 11-58 0Z" fill="url(#pc-car-body)" stroke="#8896a7" strokeWidth="1.5" /><path d="m12 22 5-12h24l5 12Z" fill="#c5d6e0" opacity=".7" /><path d="M9 72h40l-4 15H13Z" fill="#9cabb8" opacity=".5" /><path d="M6 91h46" stroke="#de8286" strokeWidth="2" /><path d="M7 27 5 63m46-36 2 36" stroke="#b4bfc9" strokeWidth="1" /></g></svg>
    <div className="pc-driving-trip"><span>↗ 집까지 24분</span><small>모의 주행 데이터</small></div>
  </section>;
}

function NavigationPreview() {
  return <section className="pc-navigation" aria-label="내비게이션 경로 예시">
    <svg viewBox="0 0 500 740" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true"><path fill="#f0f1ed" d="M0 0h500v740H0z" />
      <g fill="#e1e5e1">{Array.from({ length: 28 }, (_, i) => <rect key={i} x={i % 4 * 137 - 18} y={Math.floor(i / 4) * 112 + 15} width="110" height="85" rx="8" />)}</g>
      <path d="M-60 370q150-175 290-60t330 22v140q-175 70-330-25T-60 500Z" fill="#c7dce7" /><path d="M-40 336q150-160 290-44t290 2m-580 220q150-120 290-18t290-8" stroke="#c8d5bf" strokeWidth="18" />
      <g stroke="#fff" strokeWidth="14"><path d="M0 132h500M0 242h500M0 576h500M118 0v245m142-245v246m133-246v230M118 533v207m142-207v207m133-207v207" /><path d="m142 257 141 260" strokeWidth="23" /></g><g stroke="#d0d3d1" strokeWidth="2"><path d="M0 132h500M0 242h500M0 576h500M118 0v245m142-245v246m133-246v230M118 533v207m142-207v207m133-207v207" /><path d="m142 257 141 260" strokeWidth="3" /></g>
      <path d="M260 661v-85h84V516l-129-209v-65h178V152" stroke="#fff" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" /><path d="M260 661v-85h84V516l-129-209v-65h178V152" stroke="#7d6af4" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="393" cy="152" r="12" fill="#fff" stroke="#7d6af4" strokeWidth="5" /><path d="m260 645-15 29 15-6 15 6Z" fill="#6953e2" stroke="#fff" strokeWidth="3" />
      <g fontFamily="sans-serif" fill="#7c909f" fontSize="17"><text x="320" y="398">한강</text><text x="59" y="547" fontSize="13">강변로</text><text x="29" y="219" fontSize="13">한강변 경로 예시</text></g>
    </svg>
    <div className="pc-nav-turn"><span>↱</span><div><strong>250 m</strong><small>오른쪽 방향</small></div></div><div className="pc-nav-arrival"><strong>집으로</strong><span>24분 · 12.8 km</span><small>경로 예시 · 실제 내비 미연결</small></div>
  </section>;
}

// The system shell is an actual vector excerpt of the public Pleos display guide.
// Native OS services are not implemented by this web presentation.
export default function PleosDisplay({ children, split, onSplitChange, onMic, listening }) {
  const [libraryOpen, setLibraryOpen] = useState(false);
  return <section className={`pc-display ${split ? 'pc-split' : 'pc-single'}`} aria-label={`Pleos Connect-S 17인치 ${split ? '1:1 분할' : '단독'} 화면 템플릿`} data-layout={split ? 'split' : 'single'}>
    <img className="pc-official-shell" src={`/pleos/connect-s-17-${split ? 'split' : 'landscape'}.svg`} alt="" aria-hidden="true" />
    <header className="pc-status-bar" aria-label="Pleos 시스템 상태바 모의 화면"><div className="pc-status-left"><span className="pc-door-lock">▣</span><span>PLEOS CONNECT</span></div><div className="pc-status-right"><button onClick={onMic} aria-label="Pleos 템플릿 음성 입력" aria-pressed={listening}><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.7" /><path d="m12 12 5 5" stroke="currentColor" strokeWidth="1.7" /></svg><span>{listening ? '마이크 사용 중' : '음성'}</span></button><span aria-label="모의 네트워크 상태">▥</span><span className="pc-profile">S</span><time>18:32</time></div></header>
    <DrivingView />
    <div className={`pc-app-window ${split ? 'pc-app-portrait' : ''}`}>{children}</div>
    {split && <><div className="pc-nav-window"><NavigationPreview /></div><button className="pc-window-bar" onClick={() => onSplitChange(false)} aria-label="SPECTRA 단독 화면으로 확대"><i /></button></>}
    <button className="pc-spectra-launcher" aria-label="Pleos 즐겨찾기에서 SPECTRA 열기" onClick={() => { setLibraryOpen(false); onSplitChange(false); }}><img src="/spectra-mark.svg" alt="" /></button>
    <button className="pc-library-button" aria-label="Pleos 앱 라이브러리 시안 열기" aria-expanded={libraryOpen} onClick={() => setLibraryOpen(value => !value)}><span aria-hidden="true">{Array.from({ length: 4 }, (_, i) => <i key={i} />)}</span></button>
    {libraryOpen && <aside className="pc-library-panel" aria-label="앱 라이브러리 시안"><header><strong>앱 라이브러리</strong><button onClick={() => setLibraryOpen(false)} aria-label="앱 라이브러리 닫기">×</button></header><button className="pc-library-spectra" onClick={() => { setLibraryOpen(false); onSplitChange(false); }}><img src="/spectra-mark.svg" alt="" /><span>SPECTRA Drive</span></button><p>웹 시안 · 설치 앱 목록 예시</p></aside>}
  </section>;
}
