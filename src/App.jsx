import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { TasteDataProvider, useTasteData, MAX_IMPORT_TRACKS } from './context/TasteDataContext';
import { parseTrackList } from './utils/parseTrackList';
import TasteMapPage from './pages/TasteMapPage';
import TasteMapMobilePage from './pages/TasteMapMobilePage';
import './LoginOverlay.css';
import { AuthProvider, useAuth } from './auth/AuthContext';
import AuthPage, { AuthCallback, AuthLoading } from './auth/AuthPage';
import AccountButton from './auth/AccountButton';

import LaunchLandingPage from './pages/LaunchLandingPage';

function AppInner() {
  const { hasTaste, cloudSyncing, importTracks, status, progress, error, reset } = useTasteData();

  if (cloudSyncing) {
    return <AuthLoading title="취향 지도를 불러오고 있어요" message="저장된 나의 우주를 안전하게 연결하고 있습니다." />;
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
          />
        }
      />
      <Route
        path="/taste-map"
        element={hasTaste ? <ResponsiveTasteMapRoute /> : <Navigate to="/" replace />}
      />
      <Route
        path="/taste-map/mobile"
        element={hasTaste ? <TasteMapMobilePage /> : <Navigate to="/" replace />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
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

  return isMobile && !openUniverse ? <TasteMapMobilePage /> : <TasteMapPage />;
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
