import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { TasteDataProvider, useTasteData, MAX_IMPORT_TRACKS } from './context/TasteDataContext';
import { parseTrackList } from './utils/parseTrackList';
import TasteMapPage from './pages/TasteMapPage';
import TasteMapMobilePage from './pages/TasteMapMobilePage';
import './LoginOverlay.css';
import { AuthProvider, useAuth } from './auth/AuthContext';
import AuthPage, { AuthCallback, AuthLoading } from './auth/AuthPage';
import AccountButton from './auth/AccountButton';

import LaunchLandingPage from './pages/LaunchLandingPage';
import { DEMO_UNIVERSES, getCombinedDemoTracks } from './taste/demoUniverses';
import MapOnboarding from './onboarding/MapOnboarding';
import SpectraLogo from './components/SpectraLogo';
import TasteSaveStatus from './components/TasteSaveStatus';

function AppInner() {
  const { hasTaste, cloudSyncing, importTracks, status, progress, error, reset } = useTasteData();
  const { user } = useAuth();
  const emptyMap = user ? <EmptyPersonalMap /> : <Navigate to="/" replace />;

  if (cloudSyncing) {
    return <AuthLoading title="취향 지도를 불러오고 있어요" message="저장된 나의 우주를 안전하게 연결하고 있습니다." />;
  }

  return (
    <><TasteSaveStatus /><Routes>
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
          />
        }
      />
      <Route
        path="/taste-map"
        element={hasTaste ? <ResponsiveTasteMapRoute /> : emptyMap}
      />
      <Route
        path="/taste-map/mobile"
        element={hasTaste ? <TasteMapMobilePage /> : emptyMap}
      />
      <Route path="/mobile-start" element={<MobileStart />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes></>
  );
}

function EmptyPersonalMap() {
  return <main className="sa-page tm-empty-account"><div className="sa-card">
    <Link to="/" className="sa-wordmark" aria-label="SPECTRA home"><SpectraLogo decorative /></Link>
    <span className="sa-eyebrow">YOUR MUSIC TASTE MAP</span>
    <h1>나의 취향 지도</h1>
    <p>아직 이 계정에 저장된 곡이 없어요.<br />좋아하는 음악을 가져오면 이곳에 내 지도가 펼쳐집니다.</p>
    <Link to="/" className="sa-primary">음악 가져오기</Link>
    <AccountButton />
  </div></main>;
}

function MobileStart() {
  const { hasTaste, importTracks } = useTasteData();
  const started = useRef(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (hasTaste || started.current) return;
    started.current = true;
    importTracks(getCombinedDemoTracks(), { preEnriched: true, demoUniverse: DEMO_UNIVERSES[0].id })
      .then(result => { if (result?.ok === false) setError(true); }).catch(() => setError(true));
  }, [hasTaste, importTracks]);
  if (hasTaste) return <Navigate to="/taste-map/mobile" replace />;
  if (error) return <main className="sa-page"><div className="sa-card"><h1>데모를 열지 못했어요</h1><a href="/">시작 페이지로 돌아가기</a></div></main>;
  return <AuthLoading title="모바일 취향 지도를 준비하고 있어요" message="예시 음악으로 먼저 체험해 보세요." />;
}

function ResponsiveTasteMapRoute() {
  const location = useLocation();
  const openUniverse = new URLSearchParams(location.search).get('view') === 'constellation';
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

  const mobile = isMobile && !openUniverse;
  return <>{mobile ? <TasteMapMobilePage /> : <TasteMapPage />}{!isMobile && <MapOnboarding />}</>;
}

function TasteSession() {
  const { user, ready, error, retrySession } = useAuth();
  if (!ready) return <AuthLoading />;
  if (error) return <main className="sa-page"><div className="sa-card">
    <h1>계정을 확인하지 못했어요</h1>
    <p role="alert">연결을 확인한 뒤 다시 시도해 주세요.</p>
    <button type="button" className="sa-primary" onClick={retrySession}>다시 시도</button>
  </div></main>;
  return <TasteDataProvider key={user?.id || 'guest'} ownerId={user?.id || null}><AppInner /></TasteDataProvider>;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/auth/login" element={<AuthPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="*" element={<TasteSession />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
