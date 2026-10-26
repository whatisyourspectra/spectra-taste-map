import LanguageSwitcher from './i18n/LanguageSwitcher.jsx';
import { useLocale } from './i18n/useLocale.js';
import { translate } from './i18n/translate.js';
import React, { useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { TasteDataProvider, useTasteData, MAX_IMPORT_TRACKS } from './context/TasteDataContext';
import TasteMapPage from './pages/TasteMapPage';
import MobileMusicMap from './pages/MobileMusicMap';
import './LoginOverlay.css';
import { AuthProvider, useAuth } from './auth/AuthContext';
import AuthPage, { AuthCallback, AuthLoading } from './auth/AuthPage';
import AccountButton from './auth/AccountButton';
import HelpCenter from './components/HelpCenter';

import LaunchLandingPage from './pages/LaunchLandingPage';
import { DEMO_UNIVERSES, getCombinedDemoTracks } from './taste/demoUniverses';
import SharedMapPage from './share/SharedMapPage';
import SharedCardPage from './share/SharedCardPage';
import MapOnboarding from './onboarding/MapOnboarding';
import SpectraLogo from './components/SpectraLogo';
import { isDemoTaste } from './taste/tasteStorage';

function AppInner({ onRestorePersonalMap }) {
  const { hasTaste, tracks, stats, cloudSyncing, importTracks, status, progress, error, reset } = useTasteData();
  const { user } = useAuth();
  const emptyMap = user ? <EmptyPersonalMap /> : <Navigate to="/" replace />;

  if (cloudSyncing) {
    return <AuthLoading title={translate("취향 지도를 불러오고 있어요")} message={translate("저장된 나의 우주를 안전하게 연결하고 있습니다.")} />;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <LaunchLandingPage
            onImportTracks={importTracks}
            importStatus={status}
            progress={progress}
            error={error}
            hasTaste={hasTaste}
            onReset={reset}
            onOpenPersonalMap={() => {
              if (user && isDemoTaste({ tracks, stats })) onRestorePersonalMap();
            }}
          />
        }
      />
      <Route
        path="/taste-map"
        element={hasTaste ? <ResponsiveTasteMapRoute /> : emptyMap}
      />
      <Route
        path="/taste-map/mobile"
        element={hasTaste ? <LegacyMobileTasteRoute /> : emptyMap}
      />
      <Route path="/mobile-start" element={<MobileStart />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function EmptyPersonalMap() {
  return <main className="sa-page tm-empty-account"><div className="sa-card">
    <LanguageSwitcher />
    <Link to="/" className="sa-wordmark" aria-label="SPECTRA home"><SpectraLogo decorative /></Link>
    <span className="sa-eyebrow">YOUR MUSIC TASTE MAP</span>
    <h1>{translate("나의 취향 지도")}</h1>
    <p>{translate("아직 이 계정에 저장된 곡이 없어요.")}<br />{translate("좋아하는 음악을 가져오면 이곳에 내 지도가 펼쳐집니다.")}</p>
    <Link to="/" className="sa-primary">{translate("음악 가져오기")}</Link>
    <AccountButton showSaveStatus />
  </div></main>;
}

function MobileStart() {
  const { hasTaste, importTracks } = useTasteData();
  const { user } = useAuth();
  const started = useRef(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (user || hasTaste || started.current) return;
    started.current = true;
    importTracks(getCombinedDemoTracks(), { preEnriched: true, demoUniverse: DEMO_UNIVERSES[0].id })
      .then(result => { if (result?.ok === false) setError(true); }).catch(() => setError(true));
  }, [user, hasTaste, importTracks]);
  if (user || hasTaste) return <Navigate to="/taste-map" replace />;
  if (error) return <main className="sa-page"><div className="sa-card"><h1>{translate("데모를 열지 못했어요")}</h1><a href="/">{translate("시작 페이지로 돌아가기")}</a></div></main>;
  return <AuthLoading title={translate("모바일 취향 지도를 준비하고 있어요")} message={translate("예시 음악으로 먼저 체험해 보세요.")} />;
}

function LegacyMobileTasteRoute() {
  const location = useLocation();
  const today = new URLSearchParams(location.search).get('oracle') === '1';
  return <Navigate to={today ? '/taste-map?tab=today' : '/taste-map?view=immersive'} replace />;
}

function ResponsiveTasteMapRoute() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const mobileDestination = ['map', 'today', 'discover'].includes(params.get('tab')) || params.get('view') === 'immersive';
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 900px)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia('(max-width: 900px)');
    const onChange = (e) => setIsMobile(e.matches);
    if (mq.addEventListener) {
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, []);

  return <>{isMobile || mobileDestination ? <MobileMusicMap /> : <TasteMapPage />}{!isMobile && !mobileDestination && <MapOnboarding />}</>;
}

function TasteSession() {
  const { user, ready, error, retrySession } = useAuth();
  const [personalMapRevision, setPersonalMapRevision] = useState(0);
  if (!ready) return <AuthLoading />;
  if (error) return <main className="sa-page"><div className="sa-card">
    <LanguageSwitcher /><h1>{translate("계정을 확인하지 못했어요")}</h1>
    <p role="alert">{translate("연결을 확인한 뒤 다시 시도해 주세요.")}</p>
    <button type="button" className="sa-primary" onClick={retrySession}>{translate("다시 시도")}</button>
  </div></main>;
  // Re-entering a personal map after an explicit demo restores its own cache and cloud data.
  return <TasteDataProvider key={`${user?.id || 'guest'}:${personalMapRevision}`} ownerId={user?.id || null}>
    <AppInner onRestorePersonalMap={() => setPersonalMapRevision(revision => revision + 1)} />
  </TasteDataProvider>;
}

function App() {
  useLocale();
  return (
    <Router>
      <AuthProvider>
        <HelpCenter />
        <Routes>
          <Route path="/share/map/:id" element={<SharedMapPage />} />
          <Route path="/share/card" element={<SharedCardPage />} />
          <Route path="/auth/login" element={<AuthPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="*" element={<TasteSession />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
