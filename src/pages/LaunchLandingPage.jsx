import { BRAND_TAGLINE } from '../brand/drawSpectraLogo';
import SpectraLogo from '../components/SpectraLogo';
import React, { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LaunchLandingPage.css';
import LaunchTasteMapHero from './LaunchTasteMapHero';
import { DEMO_UNIVERSES, getCombinedDemoTracks } from '../taste/demoUniverses';
import { parseTrackList } from '../utils/parseTrackList';
import { MAX_IMPORT_TRACKS } from '../context/TasteDataContext';
import AccountButton from '../auth/AccountButton';
import MobileEntryCard from '../components/MobileEntryCard';
import LaunchTasteJourney, { LaunchDemoPortal, LaunchImportOrbit } from './LaunchTasteJourney';
import useLandingSound from '../audio/useLandingSound';

const TUNE_MY_MUSIC_URL = 'https://www.tunemymusic.com/transfer';

export default function LaunchLandingPage({
  onImportTracks,
  importStatus = 'idle',
  progress = { done: 0, total: 0 },
  error = null,
  hasTaste = false,
  onReset = null,
}) {
  const navigate = useNavigate();
  const sound = useLandingSound();
  const landingRef = useRef(null);
  const [chapter, setChapter] = useState('hero');
  React.useEffect(() => {
    const root = landingRef.current;
    const sections = [...root.querySelectorAll('main > section[id]')];
    const heroSize = new ResizeObserver(([entry]) => {
      root.style.setProperty('--hero-height', `${entry.borderBoxSize?.[0]?.blockSize || entry.target.getBoundingClientRect().height}px`);
    });
    heroSize.observe(root.querySelector('#hero'));
    let frame = 0;
    const update = () => {
      frame = 0;
      let current = 'hero';
      sections.forEach(section => { if (section.getBoundingClientRect().top < window.innerHeight * 0.42) current = section.id; });
      setChapter(previous => previous === current ? previous : current);
      root.style.setProperty('--journey-progress', Math.min(1, window.scrollY / Math.max(1, root.scrollHeight - window.innerHeight)));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    const reveal = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-revealed'); reveal.unobserve(entry.target); }
    }), { threshold: 0.08 });
    sections.forEach(section => reveal.observe(section));
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
    return () => { cancelAnimationFrame(frame); reveal.disconnect(); heroSize.disconnect(); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, []);
  const [activeTab, setActiveTab] = useState('file'); // 'file' | 'paste'
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState('');
  const [parseInfo, setParseInfo] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const dragDepthRef = useRef(0);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Screen is only blocked during initial import / preview calculation.
  // Once the preview is ready, status switches to 'enriching' and user enters the 3D map.
  const busy = isSubmitting || importStatus === 'importing';
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  // React to status transition as soon as preview is published
  React.useEffect(() => {
    if (isSubmitting && (importStatus === 'enriching' || importStatus === 'ready')) {
      setIsSubmitting(false);
      navigate('/taste-map');
    }
  }, [isSubmitting, importStatus, navigate]);

  const updateFromText = useCallback((text) => {
    setRawText(text);
    const parsed = parseTrackList(text);
    setParseInfo(parsed.length > 0 ? { count: parsed.length, tracks: parsed } : null);
  }, []);

  const handleFile = useCallback((file) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => updateFromText(String(reader.result || ''));
    reader.readAsText(file);
  }, [updateFromText]);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    dragDepthRef.current += 1;
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setDragActive(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    dragDepthRef.current = 0;
    setDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleGenerate = useCallback(() => {
    const parsed = parseInfo?.tracks || parseTrackList(rawText);
    if (!parsed || parsed.length === 0) return;
    setIsSubmitting(true);
    let navigated = false;
    const navigateToMap = () => {
      if (!navigated) {
        navigated = true;
        navigate('/taste-map');
      }
    };

    onImportTracks(parsed, {
      onPreviewReady: () => {
        setIsSubmitting(false);
        navigateToMap();
      },
    }).then((res) => {
      setIsSubmitting(false);
      if (res?.ok !== false) {
        navigateToMap();
      }
    }).catch((err) => {
      setIsSubmitting(false);
      console.error('[LaunchLandingPage] Import failed:', err);
    });
  }, [parseInfo, rawText, onImportTracks, navigate]);

  const handleSelectDemo = useCallback(async (universe) => {
    if (busy || !universe) return;
    setIsSubmitting(true);
    try {
      const enriched = getCombinedDemoTracks();
      const res = await onImportTracks(enriched, { preEnriched: true, demoUniverse: universe.id });
      if (res?.ok !== false) {
        navigate('/taste-map');
      }
    } catch (err) {
      console.error('[LaunchLandingPage] Demo select failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [busy, onImportTracks, navigate]);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      const navOffset = 90;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      });
    }
  };

  return (
    <div className="llp-root" ref={landingRef} data-chapter={chapter} onClickCapture={sound.handleClick}>
      <LaunchTasteMapHero onTry={() => scrollToSection('features')} onPulse={() => sound.play('pulse')} />
      {/* Ambient background fog layers */}
      <div className="llp-fog llp-fog-top" aria-hidden />
      <div className="llp-fog llp-fog-mid" aria-hidden />
      <div className="llp-fog llp-fog-bot" aria-hidden />

      {/* Top Floating Glass Navigation */}
      <header className="llp-nav-wrap">
        <nav className="llp-nav" aria-label="Main Navigation">
          <div className="llp-nav-brand">
            <SpectraLogo />
          </div>

          <div className="llp-nav-links">
            <button type="button" className="llp-nav-link" onClick={() => scrollToSection('demo')}>
              취향 지도 체험
            </button>
            <button type="button" className="llp-nav-link" onClick={() => scrollToSection('features')}>
              이해 · 분류 · 확장
            </button>
            <button type="button" className="llp-nav-link" onClick={() => scrollToSection('import')}>
              음악 가져오기
            </button>
          </div>

          <div className="llp-nav-actions">
            <button
              type="button"
              className="llp-sound-toggle"
              data-sound-toggle
              aria-pressed={sound.enabled}
              aria-label={sound.enabled ? '사운드 끄기' : '사운드 켜기'}
              title={sound.unavailable ? '이 브라우저에서는 사운드를 재생할 수 없어요' : sound.enabled ? '사운드 끄기' : '몽환적인 BGM과 효과음 켜기'}
              onClick={sound.toggle}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M11 5 6 9H3v6h3l5 4V5Z" />
                {sound.enabled ? <path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" /> : <path d="m16 9 5 6m0-6-5 6" />}
              </svg>
            </button>
            {sound.unavailable && <span className="llp-sound-status" role="status">사운드를 재생할 수 없어요.</span>}
            {hasTaste && (
              <button
                type="button"
                className="llp-nav-return-btn"
                onClick={() => navigate('/taste-map')}
                title="현재 열려 있는 3D taste맵으로 돌아가기"
                aria-label="현재 취향 지도로 돌아가기"
              >
                <span>taste맵으로 돌아가기{importStatus === 'enriching' && pct > 0 ? ` (${pct}%)` : ''}</span>
                <span className="llp-nav-return-arrow">↗</span>
              </button>
            )}
            <button
              type="button"
              className="llp-nav-demo-btn"
              onClick={() => handleSelectDemo(DEMO_UNIVERSES[0])}
            >
              <span>데모 체험</span>
              <span aria-hidden="true">↗</span>
            </button>
            <div className="llp-nav-auth">
              <AccountButton />
            </div>
          </div>
        </nav>
      </header>

      {/* Main Scroll Storytelling Content */}
      <main className="llp-content">
        {/* ── Section 1: Hero Section ── */}
        <section className="llp-hero-section" id="hero">
          <div className="llp-hero-copy">
            <p className="llp-art-eyebrow">음악 취향 관리 서비스</p>
            <h1 className="llp-hero-title">
              <span>Your taste.</span>
              <em>In spectra.</em>
            </h1>
            <p className="llp-hero-desc">당신의 취향을 이해하고,<br />닮은 곡을 모아 취향을 분류하고,<br />그 연결을 따라 새로운 음악으로 확장하세요.</p>
            <div className="llp-hero-cta-group">
              <button type="button" className="llp-btn-primary" onClick={() => handleSelectDemo(DEMO_UNIVERSES[0])} disabled={busy}>
                <span>데모 지도로 먼저 체험하기</span><span aria-hidden="true">↗</span>
              </button>
              <button type="button" className="llp-btn-secondary" onClick={() => scrollToSection('import')}>음악 가져오기</button>
            </div>
          </div>
          <div className="llp-hero-footnote"><span>EVERY SONG HAS A PLACE.</span><button type="button" onClick={() => scrollToSection('features')}>SCROLL TO EXPLORE <span aria-hidden="true">↓</span></button></div>
        </section>

        <LaunchTasteJourney onOpen={handleSelectDemo} busy={busy} />
        <MobileEntryCard />

        {/* ── Section 3: One-Click Demo Universes ── */}
        <section className="llp-section" id="demo">
          <div className="llp-section-header">
            <span className="llp-section-eyebrow">02 / BEFORE EXPLORE YOUR TASTE</span>
            <h2 className="llp-section-title">
              <span className="llp-title-chunk">익숙한 음악에서</span>{' '}
              <span className="llp-title-chunk">시작해 볼까요?</span>
            </h2>
            <p className="llp-section-sub">
              아래는 예시 곡으로 만든 취향 지도입니다. 내 음악을 가져오면 나만의 지도가 만들어져요.
            </p>
          </div>

          <div className="llp-demo-grid">
            {DEMO_UNIVERSES.map((universe, group) => (
              <article key={universe.id} className="llp-demo-card" style={{ '--demo-color': universe.color }}>
                <div className="llp-demo-card-inner">
                  <div className="llp-demo-header">
                    <span className="llp-demo-badge">{universe.badge}</span>
                    <span className="llp-demo-symbol" style={{ color: universe.color }}>✦</span>
                  </div>

                  <LaunchDemoPortal group={group} />
                  <h3 className="llp-demo-title">{universe.koreanName}</h3>
                  <p className="llp-demo-desc">{universe.summary}</p>

                  <div className="llp-demo-artists">
                    <span className="llp-artists-label">REPRESENTATIVE ARTISTS</span>
                    <div className="llp-artist-chips">
                      {universe.featuredArtists.map((artist) => (
                        <span key={artist} className="llp-artist-chip">{artist}</span>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="llp-demo-launch-btn"
                    onClick={() => handleSelectDemo(universe)}
                    disabled={busy}
                  >
                    <span>이 우주로 들어가기</span>
                    <span className="llp-launch-arrow">→</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ── Section 4: The Portal (Import Station) ── */}
        <section className="llp-section llp-import-section" id="import">
          <div className="llp-section-header">
            <span className="llp-section-eyebrow">03 / MAKE IT YOURS</span>
            <h2 className="llp-section-title">
              <span className="llp-title-chunk">당신의 음악을</span>{' '}
              <span className="llp-title-chunk">하나의 지도로</span>
            </h2>
            <p className="llp-section-sub">
              Apple Music, Spotify, YouTube Music 플레이리스트를 파일로 내보내어 끌어다 놓으세요.
            </p>
          </div>

          <LaunchImportOrbit count={parseInfo?.count || 0} active={dragActive || Boolean(parseInfo)} onChoose={() => {
            if (activeTab === 'file') fileInputRef.current?.click();
            else landingRef.current.querySelector('.llp-textarea')?.focus();
          }} />
          <div className={`llp-import-box${dragActive ? ' is-receiving' : ''}${parseInfo ? ' has-music' : ''}`}>

            {/* Platform Badges */}
            <div className="llp-platform-strip">
              <span className="llp-platform-chip">Apple Music 지원</span>
              <span className="llp-platform-chip">Spotify 지원</span>
              <span className="llp-platform-chip">YouTube Music 지원</span>
              <span className="llp-platform-chip">CSV · TXT 파일</span>
            </div>

            {/* Collapsible 3-Step Guide */}
            <details className="llp-guide-accordion">
              <summary className="llp-guide-summary">
                <span className="llp-guide-title">💡 스트리밍 서비스에서 곡 목록 파일(CSV) 가져오는 법</span>
                <span className="llp-guide-toggle">안내 보기 ▾</span>
              </summary>
              <div className="llp-guide-body">
                <ol className="llp-guide-steps">
                  <li>
                    무료 변환 도구인{' '}
                    <a href={TUNE_MY_MUSIC_URL} target="_blank" rel="noopener noreferrer" className="llp-guide-link">
                      Tune My Music ↗
                    </a>
                    을 엽니다.
                  </li>
                  <li>이용 중인 음악 서비스(Apple Music, Spotify, YouTube Music 등)를 소스로 연결합니다.</li>
                  <li>내보낼 보관함/플레이리스트를 고른 뒤, 목적지를 <b>Export to file (CSV)</b>로 선택해 다운로드합니다.</li>
                  <li>다운로드한 CSV 또는 TXT 파일을 아래 영역에 끌어다 놓으세요.</li>
                </ol>
              </div>
            </details>

            {/* Input Mode Selector */}
            <div className="llp-tabs">
              <button
                type="button"
                className={`llp-tab${activeTab === 'file' ? ' active' : ''}`}
                onClick={() => setActiveTab('file')}
              >
                <span>파일 업로드 (CSV / TXT)</span>
              </button>
              <button
                type="button"
                className={`llp-tab${activeTab === 'paste' ? ' active' : ''}`}
                onClick={() => setActiveTab('paste')}
              >
                <span>텍스트 직접 붙여넣기</span>
              </button>
            </div>

            {activeTab === 'file' ? (
              <div
                className={`llp-dropzone${dragActive ? ' dragging' : ''}`}
                onDragEnter={handleDragEnter}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); fileInputRef.current?.click(); } }}
                role="button"
                tabIndex={0}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt,text/csv,text/plain"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
                <div className="llp-dropzone-icon">⤓</div>
                <div className="llp-dropzone-text">
                  {fileName ? (
                    <strong className="llp-file-name">{fileName}</strong>
                  ) : (
                    <span>파일을 여기로 드래그하거나 클릭하여 업로드</span>
                  )}
                </div>
                <div className="llp-dropzone-hint">
                  {parseInfo
                    ? `✦ 총 ${parseInfo.count.toLocaleString()}곡 인식됨 (다른 파일로 바꾸려면 클릭)`
                    : `CSV, TXT · 최대 ${MAX_IMPORT_TRACKS.toLocaleString()}곡 전체 가져오기`}
                </div>
              </div>
            ) : (
              <div className="llp-paste-area">
                <div className="llp-paste-bar">
                  <button
                    type="button"
                    className="llp-sample-btn"
                    onClick={() => updateFromText("Daft Punk - Around the World\nTame Impala - The Less I Know the Better\nBeach House - Space Song\nNewJeans - Ditto\nIU - Love wins all\nTom Misch - South of the River\nFKJ - Ylang Ylang\nRadiohead - No Surprises\nThe Weeknd - Blinding Lights\nLaufey - From the Start")}
                  >
                    <span>✦ 예시 곡 목록 자동 채우기</span>
                  </button>
                </div>
                <textarea
                  className="llp-textarea"
                  placeholder={'한 줄에 한 곡씩 입력해 주세요:\nDaft Punk - Around the World\nTame Impala - The Less I Know the Better\nBeach House - Space Song'}
                  value={rawText}
                  onChange={(e) => updateFromText(e.target.value)}
                  disabled={busy}
                  spellCheck={false}
                />
                {parseInfo && (
                  <div className="llp-paste-count">
                    ✦ 총 {parseInfo.count.toLocaleString()}곡이 인식되었습니다.
                  </div>
                )}
              </div>
            )}

            {parseInfo && parseInfo.count > MAX_IMPORT_TRACKS && (
              <div className="llp-import-notice">
                한 번에 최대 {MAX_IMPORT_TRACKS.toLocaleString()}곡까지 가져올 수 있습니다. 총 {parseInfo.count.toLocaleString()}곡 중{' '}
                목록 순서대로 앞의 {MAX_IMPORT_TRACKS.toLocaleString()}곡을 모두 넣습니다.
              </div>
            )}

            <button
              type="button"
              className="llp-submit-btn"
              onClick={handleGenerate}
              disabled={busy || !parseInfo}
            >
              {busy
                ? `취향 은하수 분석 중… ${pct}%`
                : parseInfo
                ? (parseInfo.count > MAX_IMPORT_TRACKS
                  ? `앞의 ${MAX_IMPORT_TRACKS.toLocaleString()}곡으로 나의 taste맵 생성하기`
                  : `${parseInfo.count.toLocaleString()}곡으로 나의 taste맵 생성하기`)
                : '곡 목록을 입력하거나 파일을 선택하세요'}
            </button>

            {error && <div className="llp-import-error">{error}</div>}

            <p className="llp-privacy-note">
              🔒 모든 곡 목록 분석은 브라우저에서 안전하게 처리되며, 별도의 스트리밍 로그인이나 개인정보를 수집하지 않습니다.
            </p>
          </div>
        </section>
      </main>

      <nav className="llp-chapter-nav" aria-label="랜딩 탐색 단계">
        {[['hero', 'INTRO'], ['features', 'TASTE MAP'], ['demo', 'EXPLORE'], ['import', 'YOUR MUSIC']].map(([id, label], i) => (
          <button type="button" key={id} aria-current={chapter === id ? 'step' : undefined} onClick={() => scrollToSection(id)}><span>0{i + 1}</span><span>{label}</span></button>
        ))}
      </nav>

      {/* Footer */}
      <footer className="llp-footer">
        <div className="llp-footer-inner">
          <div className="llp-footer-brand">
            <SpectraLogo />
            <span className="llp-footer-tag">{BRAND_TAGLINE}</span>
          </div>
          <p className="llp-footer-copy">
            © 2026 SPECTRA. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Analyzing Progress Overlay */}
      {busy && (
        <div className="import-analyzing" role="status" aria-live="polite">
          <div className="import-analyzing__card">
            <span className="import-analyzing__spinner" aria-hidden />
            <h3 className="import-analyzing__title">나만의 음악 우주를 생성하는 중…</h3>
            <p className="import-analyzing__sub">
              음악의 5차원 특성과 taste맵 좌표를 계산하고 앨범 커버를 매칭하고 있어요.
            </p>
            <div className="import-analyzing__bar" aria-hidden>
              <span style={{ width: `${pct}%` }} />
            </div>
            <span className="import-analyzing__pct">
              {progress.done}/{progress.total}곡 · {pct}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
