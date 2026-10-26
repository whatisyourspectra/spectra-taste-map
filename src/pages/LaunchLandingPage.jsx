import LanguageSwitcher from '../i18n/LanguageSwitcher.jsx';
import { useLocale } from '../i18n/useLocale.js';
import { translate } from '../i18n/translate.js';
import { BRAND_TAGLINE } from '../brand/drawSpectraLogo';
import SpectraLogo from '../components/SpectraLogo';
import React, { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LaunchLandingPage.css';
import LaunchTasteMapHero from './LaunchTasteMapHero';
import { DEMO_UNIVERSES, getCombinedDemoTracks } from '../taste/demoUniverses';
import { parseTrackList, parseTrackListDetailed, readTrackFile } from '../utils/parseTrackList';
import { MAX_IMPORT_TRACKS } from '../context/TasteDataContext';
import AccountButton from '../auth/AccountButton';
import { useAuth } from '../auth/AuthContext';
import SingleLineTitle from '../components/SingleLineTitle';
import MobileEntryCard from '../components/MobileEntryCard';
import PlaylistExportHelp from '../components/PlaylistExportHelp.jsx';
import { LANDING_SECTIONS, DEMO_CTA } from './landingContent.js';
import LaunchTasteJourney, { LaunchDemoPortal, LaunchImportOrbit } from './LaunchTasteJourney';
import useLandingSound from '../audio/useLandingSound';

export default function LaunchLandingPage({
  onImportTracks,
  importStatus = 'idle',
  progress = { done: 0, total: 0 },
  error = null,
  hasTaste = false,
  onReset = null,
  onOpenPersonalMap,
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  useLocale();
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
  const [activeTab, setActiveTab] = useState('paste');
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
    const report = parseTrackListDetailed(text);
    setParseInfo({ ...report, count: report.tracks.length });
  }, []);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setFileName(file.name);
    try { updateFromText(await readTrackFile(file)); }
    catch (error) { setParseInfo({count:0, tracks:[], warnings:[error.message]}); }
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

  const openPersonalMap = () => {
    onOpenPersonalMap?.();
    navigate('/taste-map');
  };
  const primaryLabel = user ? '내 지도로 가기' : DEMO_CTA;
  const openPrimaryMap = () => user ? openPersonalMap() : handleSelectDemo(DEMO_UNIVERSES[0]);

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
            <button type="button" className="llp-nav-link" onClick={() => scrollToSection('demo')}> {translate('데모 지도')} </button>
            <button type="button" className="llp-nav-link" onClick={() => scrollToSection('features')}> {translate('지도 작동 방식')} </button>
            <button type="button" className="llp-nav-link" onClick={() => scrollToSection('import')}> {translate("음악 가져오기")} </button>
          </div>

          <div className="llp-nav-actions">
            <LanguageSwitcher />
            <button
              type="button"
              className="llp-sound-toggle"
              data-sound-toggle
              aria-pressed={sound.enabled}
              aria-label={sound.enabled ? translate("사운드 끄기") : translate("사운드 켜기")}
              title={sound.unavailable ? translate("이 브라우저에서는 사운드를 재생할 수 없어요") : sound.enabled ? translate("사운드 끄기") : translate("몽환적인 BGM과 효과음 켜기")}
              onClick={sound.toggle}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M11 5 6 9H3v6h3l5 4V5Z" />
                {sound.enabled ? <path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" /> : <path d="m16 9 5 6m0-6-5 6" />}
              </svg>
            </button>
            {sound.unavailable && <span className="llp-sound-status" role="status">{translate("사운드를 재생할 수 없어요.")}</span>}
            {hasTaste && !user && (
              <button
                type="button"
                className="llp-nav-return-btn"
                onClick={() => navigate('/taste-map')}
                title={translate("현재 열려 있는 3D taste맵으로 돌아가기")}
                aria-label={translate("현재 취향 지도로 돌아가기")}
              >
                <span>{translate("taste맵으로 돌아가기")}{importStatus === 'enriching' && pct > 0 ? ` (${pct}%)` : ''}</span>
                <span className="llp-nav-return-arrow">↗</span>
              </button>
            )}
            <button
              type="button"
              className={user ? 'llp-nav-return-btn' : 'llp-nav-demo-btn'}
              aria-label={translate(primaryLabel)}
              disabled={busy}
              onClick={openPrimaryMap}
            >
              <span>{translate(primaryLabel)}</span>
              <span aria-hidden="true">↗</span>
            </button>
            <div className="llp-nav-auth">
              <AccountButton showSaveStatus />
            </div>
          </div>
        </nav>
      </header>

      {/* Main Scroll Storytelling Content */}
      <main className="llp-content">
        {/* ── Section 1: Hero Section ── */}
        <section className="llp-hero-section" id="hero">
          <div className="llp-hero-copy">
            <p className="llp-art-eyebrow"><span className="llp-section-number">{LANDING_SECTIONS[0].number}</span> / {translate(LANDING_SECTIONS[0].heading)}</p>
            <h1 className="llp-hero-title">
              <span>Your taste.</span>
              <em>In spectra.</em>
            </h1>
            <p className="llp-hero-desc">{translate('좋아하는 음악을 장르별 지도로 펼치고, 새로 발견한 곡도 내 SPECTRA 지도에 모아보세요.')}</p>
            <div className="llp-hero-cta-group">
              <button type="button" className="llp-btn-primary" onClick={openPrimaryMap} disabled={busy}>
                <span>{translate(primaryLabel)}</span><span aria-hidden="true">↗</span>
              </button>
              <button type="button" className="llp-btn-secondary" onClick={() => scrollToSection('import')}>{translate("음악 가져오기")}</button>
            </div>
          </div>
          <div className="llp-hero-footnote"><span>EVERY SONG HAS A PLACE.</span><button type="button" onClick={() => scrollToSection('features')}>SCROLL TO EXPLORE <span aria-hidden="true">↓</span></button></div>
        </section>

        <LaunchTasteJourney onOpen={handleSelectDemo} busy={busy} />
        <MobileEntryCard />

        {/* ── Section 3: One-Click Demo Universes ── */}
        <section className="llp-section" id="demo">
          <div className="llp-section-header">
            <span className="llp-section-eyebrow">{LANDING_SECTIONS[2].number} / {translate(LANDING_SECTIONS[2].heading)}</span>
            <h2 className="llp-section-title">
              <span className="llp-title-chunk">{translate("익숙한 음악에서")}</span>{' '}
              <span className="llp-title-chunk">{translate("시작해 볼까요?")}</span>
            </h2>
            <p className="llp-section-sub"> {translate("아래는 예시 곡으로 만든 취향 지도입니다. 내 음악을 가져오면 나만의 지도가 만들어져요.")} </p>
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
                  <SingleLineTitle className="llp-demo-title">{universe.name}</SingleLineTitle>
                  <p className="llp-demo-desc">{translate(universe.summary)}</p>

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
                    <span>{translate(DEMO_CTA)}</span>
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
            <span className="llp-section-eyebrow">{LANDING_SECTIONS[3].number} / {translate(LANDING_SECTIONS[3].heading)}</span>
            <h2 className="llp-section-title">
              <span className="llp-title-chunk">{translate("당신의 음악을")}</span>{' '}
              <span className="llp-title-chunk">{translate("하나의 지도로")}</span>
            </h2>
            <p className="llp-section-sub">{translate('좋아하는 곡 몇 개로도 시작할 수 있어요. 곡 목록을 붙여넣거나 가지고 있는 파일을 올려보세요.')}</p>
            <p className="llp-save-note">{translate('지도는 이 브라우저에 저장되고, 로그인하면 계정에도 저장돼요.')}</p>
          </div>

          <LaunchImportOrbit count={parseInfo?.count || 0} active={dragActive || Boolean(parseInfo)} onChoose={() => {
            if (activeTab === 'file') fileInputRef.current?.click();
            else landingRef.current.querySelector('.llp-textarea')?.focus();
          }} />
          <div className={`llp-import-box${dragActive ? ' is-receiving' : ''}${parseInfo ? ' has-music' : ''}`}>

            {/* Input Mode Selector */}
            <div className="llp-tabs" role="group" aria-label={translate('음악 가져오기 방식')}>
              <button type="button" className={`llp-tab${activeTab === 'paste' ? ' active' : ''}`} aria-pressed={activeTab === 'paste'} onClick={() => setActiveTab('paste')}>
                <span>{translate('텍스트 직접 붙여넣기')}</span>
              </button>
              <button type="button" className={`llp-tab${activeTab === 'file' ? ' active' : ''}`} aria-pressed={activeTab === 'file'} onClick={() => setActiveTab('file')}>
                <span>{translate('파일 업로드 (CSV / TXT)')}</span>
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
                  accept=".csv,.txt,.tsv,.json,text/csv,text/plain,application/json"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
                <div className="llp-dropzone-icon">⤓</div>
                <div className="llp-dropzone-text">
                  {fileName ? (
                    <strong className="llp-file-name">{fileName}</strong>
                  ) : (
                    <span>{translate("다운로드한 파일 선택")}</span>
                  )}
                </div>
                <div className="llp-dropzone-hint">
                  {parseInfo
                    ? translate("✦ 총 {0}곡 인식됨 (다른 파일로 바꾸려면 클릭)", [parseInfo.count.toLocaleString()])
                    : translate("CSV, TXT · 최대 {0}곡 전체 가져오기", [MAX_IMPORT_TRACKS.toLocaleString()])}
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
                    <span>{translate("✦ 예시 곡 목록 자동 채우기")}</span>
                  </button>
                </div>
                <label className="llp-paste-label" htmlFor="import-track-list">{translate('아티스트 - 곡 제목을 한 줄에 하나씩 붙여넣으세요.')}</label>
                <textarea
                  id="import-track-list"
                  className="llp-textarea"
                  placeholder={translate("한 줄에 한 곡씩 입력해 주세요:\nDaft Punk - Around the World\nTame Impala - The Less I Know the Better\nBeach House - Space Song")}
                  value={rawText}
                  onChange={(e) => updateFromText(e.target.value)}
                  disabled={busy}
                  spellCheck={false}
                />
                {parseInfo && (
                  <div className="llp-paste-count"> {translate('✦ 총 {0}곡이 인식되었습니다.', [parseInfo.count.toLocaleString()])} </div>
                )}
              </div>
            )}

            {activeTab === 'file' && !fileName && <p className="llp-file-location">{translate("파일을 찾기 어렵나요? 모바일에서는 파일 선택기의 ‘다운로드’ 폴더를 확인해 주세요. PC에서는 파일을 위 영역에 끌어다 놓아도 됩니다.")}</p>}

            {parseInfo?.warnings?.map(warning => <p className="llp-import-notice" role="status" key={warning}>{translate(warning)}</p>)}
            {parseInfo?.duplicates > 0 && <p className="llp-file-location">{translate('중복된 {0}곡을 하나로 합쳤어요.', [parseInfo.duplicates])}</p>}
            {parseInfo && parseInfo.count > MAX_IMPORT_TRACKS && (
              <div className="llp-import-notice">{translate('한 번에 최대 {0}곡까지 가져올 수 있습니다. 총 {1}곡 중 목록 순서대로 앞의 {0}곡을 모두 넣습니다.', [MAX_IMPORT_TRACKS.toLocaleString(), parseInfo.count.toLocaleString()])}</div>
            )}

            <button
              type="button"
              className="llp-submit-btn"
              onClick={handleGenerate}
              disabled={busy || !parseInfo?.count}
            >
              {busy
                ? translate("취향 은하수 분석 중… {0}%", [pct])
                : parseInfo?.count
                ? (parseInfo.count > MAX_IMPORT_TRACKS
                  ? translate("앞의 {0}곡으로 나의 taste맵 생성하기", [MAX_IMPORT_TRACKS.toLocaleString()])
                  : translate("{0}곡으로 나의 taste맵 생성하기", [parseInfo.count.toLocaleString()]))
                : translate("곡 목록을 입력하거나 파일을 선택하세요")}
            </button>

            {error && <div className="llp-import-error">{translate(error)}</div>}

            <PlaylistExportHelp onChooseFile={() => { setActiveTab('file'); requestAnimationFrame(() => fileInputRef.current?.click()); }} />
            <p className="llp-map-destination">{translate('새로 찾은 곡은 SPECTRA 지도에 추가돼요. Spotify·Apple Music 플레이리스트로 내보내기는 아직 지원하지 않아요.')}</p>
            <p className="llp-privacy-note"> {translate("🔒 파일을 가져올 때 스트리밍 계정을 연결할 필요가 없습니다.")} </p>
          </div>
        </section>
      </main>

      <nav className="llp-chapter-nav" aria-label={translate("랜딩 탐색 단계")}>
        {LANDING_SECTIONS.map(({ id, number, label }) => (
          <button type="button" key={id} aria-current={chapter === id ? 'step' : undefined} onClick={() => scrollToSection(id)}><span>{number}</span><span>{translate(label)}</span></button>
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
            <h3 className="import-analyzing__title">{translate("나만의 음악 우주를 생성하는 중…")}</h3>
            <p className="import-analyzing__sub"> {translate('곡 이름과 아티스트를 연결하고 장르 태그로 지도를 정리하고 있어요.')} </p>
            <div className="import-analyzing__bar" aria-hidden>
              <span style={{ width: `${pct}%` }} />
            </div>
            <span className="import-analyzing__pct">
              {translate('{0}곡 · {1}%', [`${progress.done}/${progress.total}`, pct])}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
