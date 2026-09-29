import React, { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LaunchLandingPage.css';
import LaunchCosmicScene from './LaunchCosmicScene';
import { DEMO_UNIVERSES, getEnrichedDemoTracks } from '../taste/demoUniverses';
import { parseTrackList } from '../utils/parseTrackList';
import { MAX_IMPORT_TRACKS } from '../context/TasteDataContext';
import AccountButton from '../auth/AccountButton';
import SpectraSymbol from '../components/SpectraSymbol';

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
      const enriched = getEnrichedDemoTracks(universe);
      const res = await onImportTracks(enriched, { preEnriched: true });
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
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="llp-root">
      {/* 3D WebGL Lusion-inspired Interactive Particle & Nebula Canvas */}
      <LaunchCosmicScene />

      {/* Ambient background fog layers */}
      <div className="llp-fog llp-fog-top" aria-hidden />
      <div className="llp-fog llp-fog-mid" aria-hidden />
      <div className="llp-fog llp-fog-bot" aria-hidden />

      {/* Top Floating Glass Navigation */}
      <header className="llp-nav-wrap">
        <nav className="llp-nav" aria-label="Main Navigation">
          <div className="llp-nav-brand">
            <span className="llp-brand-symbol" aria-hidden>✦</span>
            <span className="llp-brand-title">SPECTRA</span>
          </div>

          <div className="llp-nav-links">
            <button type="button" className="llp-nav-link" onClick={() => scrollToSection('demo')}>
              데모 우주
            </button>
            <button type="button" className="llp-nav-link" onClick={() => scrollToSection('features')}>
              3D taste맵 기능
            </button>
            <button type="button" className="llp-nav-link" onClick={() => scrollToSection('import')}>
              음악 가져오기
            </button>
          </div>

          <div className="llp-nav-actions">
            {hasTaste && (
              <button
                type="button"
                className="llp-nav-return-btn"
                onClick={() => navigate('/taste-map')}
                title="현재 열려 있는 3D taste맵으로 돌아가기"
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
              <span>✨</span>
              <span>1초 체험</span>
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
          <div className="llp-hero-badge">
            <span className="llp-badge-pulse" aria-hidden />
            <span>ASTRONOMICAL MUSIC TOPOLOGY · 2026</span>
          </div>

          <h1 className="llp-hero-title">
            <span className="llp-hero-line-1">당신의 좋아요 음악기록을</span>
            <span className="llp-hero-line-2">살아나는 취향 지도로</span>
          </h1>

          <p className="llp-hero-desc">
            <span className="llp-title-chunk">SPECTRA는 흩어져 있던 음악 기록을</span>{' '}
            <span className="llp-title-chunk">3D taste맵과 별자리 항해 경험으로 바꿉니다.</span><br className="llp-br-desktop" />
            <span className="llp-title-chunk">감정의 궤도를 유영하고,</span>{' '}
            <span className="llp-title-chunk">우주선을 타고 새로운 멜로디를 발견하세요.</span>
          </p>

          <div className="llp-hero-cta-group">
            <button
              type="button"
              className="llp-btn-primary"
              onClick={() => handleSelectDemo(DEMO_UNIVERSES[0])}
              disabled={busy}
            >
              <span className="llp-btn-icon">✦</span>
              <span>원클릭 데모 taste맵 체험하기</span>
            </button>

            <button
              type="button"
              className="llp-btn-secondary"
              onClick={() => scrollToSection('import')}
            >
              <span>내 음악 목록으로 지도 만들기</span>
              <span className="llp-btn-arrow">↓</span>
            </button>
          </div>

          {/* Linear-style Interactive Feature Orbit Preview */}
          <div className="llp-hero-preview-dock">
            <div className="llp-preview-card">
              <div className="llp-preview-head">
                <span className="llp-preview-dot dot-red" />
                <span className="llp-preview-dot dot-yellow" />
                <span className="llp-preview-dot dot-green" />
                <span className="llp-preview-title">CELESTIAL TASTE PROJECTION · LIVE PREVIEW</span>
              </div>
              <div className="llp-preview-body">
                <div className="llp-stat-chip">
                  <span className="llp-stat-label">COSMIC NODES</span>
                  <span className="llp-stat-value">5D SPECTRUM</span>
                </div>
                <div className="llp-stat-chip">
                  <span className="llp-stat-label">TOPOLOGY</span>
                  <span className="llp-stat-value">PLANAR MST</span>
                </div>
                <div className="llp-stat-chip">
                  <span className="llp-stat-label">VOYAGER</span>
                  <span className="llp-stat-value">ORBIT CRUISE</span>
                </div>
                <div className="llp-stat-chip">
                  <span className="llp-stat-label">STREAMING</span>
                  <span className="llp-stat-value">ALL PLATFORMS</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 2: Linear Bento Grid Features ── */}
        <section className="llp-section" id="features">
          <div className="llp-section-header">
            <span className="llp-section-eyebrow">DEEP COSMIC ARCHITECTURE</span>
            <h2 className="llp-section-title">
              <span className="llp-title-chunk">취향을 읽는</span>{' '}
              <span className="llp-title-chunk">4가지 천체 차원</span>
            </h2>
            <p className="llp-section-sub">
              단순한 텍스트 플레이리스트를 넘어, 음악적 유대와 감정의 결을 천문학적 깊이로 시각화합니다.
            </p>
          </div>

          <div className="llp-bento-grid">
            {/* Bento Card 1: 3D Taste Field */}
            <div className="llp-bento-card bento-wide">
              <div className="llp-card-glow" style={{ background: 'radial-gradient(circle at 20% 20%, rgba(96, 165, 250, 0.2), transparent 70%)' }} />
              <div className="llp-card-content">
                <div className="llp-card-tag">
                  <SpectraSymbol symbol="sparkle" />
                  <span>3D TASTE FIELD</span>
                </div>
                <h3 className="llp-card-title">
                  <span className="llp-title-chunk">다차원 취향 성운</span>{' '}
                  <span className="llp-title-chunk">(Taste Nebula)</span>
                </h3>
                <p className="llp-card-desc">
                  에너지, 밝기(Valence), 댄서빌리티, 어쿠스틱 수치를 물리 좌표로 사상하여 형성되는 거대한 은하수.
                  비슷한 무드의 곡들이 자성을 띠고 모여 하나의 취향 행성계를 이룹니다.
                </p>
                <div className="llp-card-metrics">
                  <span className="llp-metric-pill">K-Means Spectral Cluster</span>
                  <span className="llp-metric-pill">5D Space Projection</span>
                  <span className="llp-metric-pill">Magnetic Bubble Physics</span>
                </div>
                <div className="llp-card-action">
                  <button
                    type="button"
                    className="llp-card-btn"
                    onClick={() => handleSelectDemo(DEMO_UNIVERSES[0])}
                    disabled={busy}
                  >
                    <span>성운 우주 탐험하기</span>
                    <span className="llp-card-btn-arrow">→</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bento Card 2: Seed Constellations */}
            <div className="llp-bento-card">
              <div className="llp-card-glow" style={{ background: 'radial-gradient(circle at 80% 20%, rgba(192, 132, 252, 0.2), transparent 70%)' }} />
              <div className="llp-card-content">
                <div className="llp-card-tag">
                  <SpectraSymbol symbol="matrix" />
                  <span>SEED CONSTELLATION</span>
                </div>
                <h3 className="llp-card-title">중심별 고유 별자리</h3>
                <p className="llp-card-desc">
                  곡 하나를 클릭하면 주변에서 가장 가까운 8개의 별이 유클리드 기하학으로 엮이며 절대 꼬이지 않는 북두칠성 같은 고유 별자리를 탄생시킵니다.
                </p>
                <div className="llp-card-metrics">
                  <span className="llp-metric-pill">Planar Topology</span>
                  <span className="llp-metric-pill">Zero Crossing Edges</span>
                </div>
                <div className="llp-card-action">
                  <button
                    type="button"
                    className="llp-card-btn"
                    onClick={() => handleSelectDemo(DEMO_UNIVERSES[1])}
                    disabled={busy}
                  >
                    <span>별자리 taste맵 열기</span>
                    <span className="llp-card-btn-arrow">→</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bento Card 3: Starlight Voyager */}
            <div className="llp-bento-card">
              <div className="llp-card-glow" style={{ background: 'radial-gradient(circle at 20% 80%, rgba(56, 189, 248, 0.2), transparent 70%)' }} />
              <div className="llp-card-content">
                <div className="llp-card-tag">
                  <SpectraSymbol symbol="orbit" />
                  <span>VOYAGER & CRUISE</span>
                </div>
                <h3 className="llp-card-title">별자리 궤도 순항 청음</h3>
                <p className="llp-card-desc">
                  우주선에 탑승해 별자리 궤도를 따라 별과 별 사이를 날아다니며 차례대로 음악을 감상합니다. 화면 전체가 시네마틱 천체 플레이어로 전환됩니다.
                </p>
                <div className="llp-card-metrics">
                  <span className="llp-metric-pill">Spaceship Audio Navigation</span>
                  <span className="llp-metric-pill">Focus Camera 줌인</span>
                </div>
                <div className="llp-card-action">
                  <button
                    type="button"
                    className="llp-card-btn"
                    onClick={() => handleSelectDemo(DEMO_UNIVERSES[2])}
                    disabled={busy}
                  >
                    <span>우주선 순항 탑승</span>
                    <span className="llp-card-btn-arrow">→</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bento Card 4: Cosmic Oracle */}
            <div className="llp-bento-card bento-wide">
              <div className="llp-card-glow" style={{ background: 'radial-gradient(circle at 80% 80%, rgba(244, 114, 182, 0.2), transparent 70%)' }} />
              <div className="llp-card-content">
                <div className="llp-card-tag">
                  <SpectraSymbol symbol="wave" />
                  <span>COSMIC ORACLE</span>
                </div>
                <h3 className="llp-card-title">
                  <span className="llp-title-chunk">천체 위상과</span>{' '}
                  <span className="llp-title-chunk">별자리 오라클</span>
                </h3>
                <p className="llp-card-desc">
                  실시간 달의 위상(Moon Phase)과 12개 별자리 거울을 통해 지금 이 순간 당신의 기분과 취향의 변화를 감응하고 오늘의 처방곡을 점칩니다.
                </p>
                <div className="llp-card-metrics">
                  <span className="llp-metric-pill">Daily Lunar Oracle</span>
                  <span className="llp-metric-pill">Archetype Mirror</span>
                  <span className="llp-metric-pill">Calendar Timeline</span>
                </div>
                <div className="llp-card-action">
                  <button
                    type="button"
                    className="llp-card-btn"
                    onClick={() => scrollToSection('demo')}
                  >
                    <span>taste맵 둘러보기</span>
                    <span className="llp-card-btn-arrow">↓</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 3: One-Click Demo Universes ── */}
        <section className="llp-section" id="demo">
          <div className="llp-section-header">
            <span className="llp-section-eyebrow">ONE-CLICK DEMO COSMOS</span>
            <h2 className="llp-section-title">
              <span className="llp-title-chunk">파일이 없어도 괜찮아요.</span>{' '}
              <span className="llp-title-chunk">먼저 둘러보세요.</span>
            </h2>
            <p className="llp-section-sub">
              SPECTRA가 엄선한 3가지 테마 성운을 클릭 한 번으로 즉시 펼칠 수 있습니다.
            </p>
          </div>

          <div className="llp-demo-grid">
            {DEMO_UNIVERSES.map((universe) => (
              <article key={universe.id} className="llp-demo-card" style={{ '--demo-color': universe.color }}>
                <div className="llp-demo-card-inner">
                  <div className="llp-demo-header">
                    <span className="llp-demo-badge">{universe.badge}</span>
                    <span className="llp-demo-symbol" style={{ color: universe.color }}>✦</span>
                  </div>

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
                    <span>이 taste맵으로 우주 탐험 시작</span>
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
            <span className="llp-section-eyebrow">THE GATEWAY PORTAL</span>
            <h2 className="llp-section-title">
              <span className="llp-title-chunk">당신의 음악을</span>{' '}
              <span className="llp-title-chunk">우주로 쏘아 올리세요</span>
            </h2>
            <p className="llp-section-sub">
              Apple Music, Spotify, YouTube Music 플레이리스트를 파일로 내보내어 끌어다 놓으세요.
            </p>
          </div>

          <div className="llp-import-box">
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
                    : 'CSV, TXT 형식 지원'}
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
                쾌적한 3D taste맵 탐색을 위해 총 {parseInfo.count.toLocaleString()}곡 중 전체 기간을 대표하는{' '}
                {MAX_IMPORT_TRACKS.toLocaleString()}곡을 균등 선별하여 지도를 구성합니다.
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
                  ? `대표 ${MAX_IMPORT_TRACKS.toLocaleString()}곡으로 나의 taste맵 생성하기`
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

      {/* Footer */}
      <footer className="llp-footer">
        <div className="llp-footer-inner">
          <div className="llp-footer-brand">
            <span>SPECTRA</span>
            <span className="llp-footer-tag">CELESTIAL MUSIC TOPOLOGY</span>
          </div>
          <p className="llp-footer-copy">
            © 2026 SPECTRA. All musical galaxies securely rendered on client.
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
