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

const TUNE_MY_MUSIC_URL = 'https://www.tunemymusic.com/transfer';

function seeded01(seed) {
  const raw = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return raw - Math.floor(raw);
}

const TASTE_BUBBLES = [
  { id: 'b-0', x: 18, y: 24, size: 148, delay: -4.2, duration: 24.4, hue: 0, depth: 'near', cluster: 'a' },
  { id: 'b-1', x: 26, y: 20, size: 76, delay: -7.1, duration: 21.1, hue: 2, depth: 'mid', cluster: 'a' },
  { id: 'b-2', x: 22, y: 32, size: 92, delay: -9.3, duration: 26.3, hue: 1, depth: 'far', cluster: 'a' },
  { id: 'b-3', x: 34, y: 36, size: 132, delay: -5.7, duration: 25.8, hue: 0, depth: 'near', cluster: 'a' },
  { id: 'b-4', x: 44, y: 22, size: 110, delay: -3.8, duration: 22.6, hue: 1, depth: 'mid', cluster: 'b' },
  { id: 'b-5', x: 48, y: 34, size: 84, delay: -8.4, duration: 24.2, hue: 2, depth: 'far', cluster: 'b' },
  { id: 'b-6', x: 38, y: 16, size: 58, delay: -11.8, duration: 19.2, hue: 0, depth: 'far', cluster: 'b' },
  { id: 'b-7', x: 24, y: 68, size: 160, delay: -2.1, duration: 27.1, hue: 0, depth: 'near', cluster: 'c' },
  { id: 'b-8', x: 32, y: 72, size: 95, delay: -6.5, duration: 22.4, hue: 1, depth: 'mid', cluster: 'c' },
  { id: 'b-9', x: 42, y: 62, size: 82, delay: -9.9, duration: 25.3, hue: 2, depth: 'far', cluster: 'c' },
  { id: 'b-10', x: 48, y: 78, size: 105, delay: -5.1, duration: 23.7, hue: 1, depth: 'mid', cluster: 'd' },
  { id: 'b-11', x: 12, y: 52, size: 68, delay: -8.8, duration: 20.6, hue: 2, depth: 'far', cluster: 'd' },
];

const TASTE_PARTICLES = Array.from({ length: 34 }, (_, idx) => {
  const seed = idx + 21;
  return {
    id: `p-${idx}`,
    x: seeded01(seed * 2.97) * 100,
    y: seeded01(seed * 5.81) * 100,
    delay: -(seeded01(seed * 4.11) * 10),
    duration: 4 + seeded01(seed * 6.33) * 8,
    size: 1 + seeded01(seed * 8.77) * 2.6,
  };
});

const TASTE_CONSTELLATION = Array.from({ length: 9 }, (_, idx) => {
  const seed = idx + 51;
  return {
    id: `c-${idx}`,
    x: 12 + seeded01(seed * 2.17) * 74,
    y: 16 + seeded01(seed * 4.03) * 62,
    w: 48 + seeded01(seed * 5.49) * 112,
    r: -26 + seeded01(seed * 7.79) * 52,
    delay: -(seeded01(seed * 9.11) * 8),
    duration: 11 + seeded01(seed * 10.93) * 16,
  };
});

function TasteDepthScene() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    let disposed = false;
    let renderer = null;
    let scene = null;
    let camera = null;
    let frame = 0;
    let ro = null;
    let nearCloud = null;
    let midCloud = null;
    let farCloud = null;
    const orbs = [];
    const softHalos = [];

    (async () => {
      const THREE = await import('three');
      if (disposed || !mount) return;
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(48, 1, 0.1, 80);
      camera.position.set(0, 0, 12);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
      renderer.setClearColor(0x000000, 0);
      mount.appendChild(renderer.domElement);

      const resize = () => {
        if (!mount || !renderer || !camera) return;
        const w = Math.max(1, mount.clientWidth);
        const h = Math.max(1, mount.clientHeight);
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      resize();

      const makeCloud = (count, zRange, size, opacity, tintA, tintB) => {
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const cA = new THREE.Color(tintA);
        const cB = new THREE.Color(tintB);
        for (let i = 0; i < count; i++) {
          const idx = i * 3;
          const seed = i + count * 3.17;
          positions[idx] = (seeded01(seed * 2.1) - 0.5) * 26;
          positions[idx + 1] = (seeded01(seed * 3.7) - 0.5) * 16;
          positions[idx + 2] = zRange[0] + seeded01(seed * 5.3) * (zRange[1] - zRange[0]);
          const blend = seeded01(seed * 7.9);
          const c = cA.clone().lerp(cB, blend);
          colors[idx] = c.r;
          colors[idx + 1] = c.g;
          colors[idx + 2] = c.b;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        const mat = new THREE.PointsMaterial({
          size,
          vertexColors: true,
          transparent: true,
          opacity,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const points = new THREE.Points(geo, mat);
        scene.add(points);
        return points;
      };

      nearCloud = makeCloud(180, [-4.5, 2.0], 0.1, 0.48, '#8fb4ff', '#dae8ff');
      midCloud = makeCloud(210, [-8.1, -3.9], 0.08, 0.38, '#7da4ef', '#c4dafc');
      farCloud = makeCloud(250, [-12.2, -7.8], 0.06, 0.24, '#6f93d6', '#b7cff2');

      const orbGeo = new THREE.SphereGeometry(0.9, 30, 30);
      const orbMatA = new THREE.MeshBasicMaterial({
        color: '#8aaef2',
        transparent: true,
        opacity: 0.16,
      });
      const orbMatB = new THREE.MeshBasicMaterial({
        color: '#c8ddff',
        transparent: true,
        opacity: 0.11,
      });

      const orbA = new THREE.Mesh(orbGeo, orbMatA);
      orbA.position.set(-3.6, 1.8, -3.4);
      orbA.scale.setScalar(2.3);
      orbA.userData.baseY = orbA.position.y;
      scene.add(orbA);
      orbs.push(orbA);

      const orbB = new THREE.Mesh(orbGeo, orbMatB);
      orbB.position.set(4.1, -1.4, -6.4);
      orbB.scale.setScalar(2.8);
      orbB.userData.baseY = orbB.position.y;
      scene.add(orbB);
      orbs.push(orbB);

      const orbC = new THREE.Mesh(orbGeo, orbMatA.clone());
      orbC.position.set(0.8, 2.4, -8.2);
      orbC.scale.setScalar(1.55);
      orbC.material.opacity = 0.1;
      orbC.userData.baseY = orbC.position.y;
      scene.add(orbC);
      orbs.push(orbC);

      const haloGeo = new THREE.SphereGeometry(1, 24, 24);
      const haloMat = new THREE.MeshBasicMaterial({
        color: '#9abdf8',
        transparent: true,
        opacity: 0.06,
        depthWrite: false,
      });
      const haloA = new THREE.Mesh(haloGeo, haloMat.clone());
      haloA.position.set(-1.4, -2.4, -10.2);
      haloA.scale.setScalar(3.6);
      scene.add(haloA);
      softHalos.push(haloA);

      const haloB = new THREE.Mesh(haloGeo, haloMat.clone());
      haloB.position.set(3.8, 2.3, -9.2);
      haloB.scale.setScalar(3.0);
      haloB.material.opacity = 0.045;
      scene.add(haloB);
      softHalos.push(haloB);

      const animate = () => {
        if (disposed) return;
        frame = requestAnimationFrame(animate);
        const t = performance.now() * 0.00011;
        const motionScale = reduceMotion ? 0.3 : 1;
        if (nearCloud) {
          nearCloud.rotation.y = t * 1.2 * motionScale;
          nearCloud.rotation.x = Math.sin(t * 0.5) * 0.05 * motionScale;
        }
        if (midCloud) {
          midCloud.rotation.y = -t * 0.76 * motionScale;
          midCloud.rotation.x = Math.sin(t * 0.3) * 0.03 * motionScale;
        }
        if (farCloud) {
          farCloud.rotation.y = -t * 0.44 * motionScale;
          farCloud.rotation.z = Math.sin(t * 0.45) * 0.045 * motionScale;
        }
        orbs.forEach((orb, idx) => {
          const phase = t * (0.7 + idx * 0.18);
          const baseY = orb.userData.baseY ?? orb.position.y;
          orb.position.y = baseY + Math.sin(phase) * 0.18 * motionScale;
          orb.rotation.y += (0.0012 + idx * 0.0003) * motionScale;
        });
        softHalos.forEach((halo, idx) => {
          const pulse = 0.98 + Math.sin(t * (0.52 + idx * 0.1)) * 0.02 * motionScale;
          halo.scale.setScalar((idx === 0 ? 3.6 : 3.0) * pulse);
        });
        renderer.render(scene, camera);
      };
      animate();

      ro = new ResizeObserver(resize);
      ro.observe(mount);
    })();

    return () => {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      if (ro) ro.disconnect();
      if (scene) {
        scene.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
            else obj.material.dispose();
          }
        });
      }
      if (renderer) renderer.dispose();
      if (renderer?.domElement && mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div className="login-overlay__three" ref={mountRef} aria-hidden />;
}

function ImportOverlay() {
  const { importTracks, status, progress, error } = useTasteData();
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState('');
  const [parseInfo, setParseInfo] = useState(null); // { count } | null
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const dragDepthRef = useRef(0);

  const busy = status === 'importing';

  const updateFromText = useCallback((text) => {
    setRawText(text);
    const parsed = parseTrackList(text);
    setParseInfo(parsed.length > 0 ? { count: parsed.length } : null);
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

  const openFilePicker = useCallback(() => {
    if (!busy) fileInputRef.current?.click();
  }, [busy]);

  const handleGenerate = useCallback(() => {
    const parsed = parseTrackList(rawText);
    if (parsed.length === 0) return;
    importTracks(parsed);
  }, [rawText, importTracks]);

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="login-overlay taste">
      <div className="sa-import-account"><AccountButton /></div>
      <TasteDepthScene />
      <div className="login-overlay__fog fog-a" aria-hidden />
      <div className="login-overlay__fog fog-b" aria-hidden />
      <div className="login-overlay__fog fog-c" aria-hidden />
      <div className="login-overlay__field" aria-hidden>
        {TASTE_BUBBLES.map((bubble) => (
          <span
            key={bubble.id}
            className={`login-overlay__bubble hue-${bubble.hue} depth-${bubble.depth} cluster-${bubble.cluster}`}
            style={{
              '--lo-x': `${bubble.x}%`,
              '--lo-y': `${bubble.y}%`,
              '--lo-size': `${bubble.size}px`,
              '--lo-delay': `${bubble.delay.toFixed(2)}s`,
              '--lo-duration': `${bubble.duration.toFixed(2)}s`,
            }}
          />
        ))}
        {TASTE_PARTICLES.map((particle) => (
          <span
            key={particle.id}
            className="login-overlay__particle"
            style={{
              '--lo-x': `${particle.x}%`,
              '--lo-y': `${particle.y}%`,
              '--lo-size': `${particle.size.toFixed(2)}px`,
              '--lo-delay': `${particle.delay.toFixed(2)}s`,
              '--lo-duration': `${particle.duration.toFixed(2)}s`,
            }}
          />
        ))}
        {TASTE_CONSTELLATION.map((line) => (
          <span
            key={line.id}
            className="login-overlay__line"
            style={{
              '--lo-x': `${line.x}%`,
              '--lo-y': `${line.y}%`,
              '--lo-width': `${line.w.toFixed(2)}px`,
              '--lo-rotate': `${line.r.toFixed(2)}deg`,
              '--lo-delay': `${line.delay.toFixed(2)}s`,
              '--lo-duration': `${line.duration.toFixed(2)}s`,
            }}
          />
        ))}
      </div>
      <div className="login-overlay__taste-layout import">
        <section className="login-overlay__hero-copy">
          <h1 className="login-overlay__brand">S P E C T R A</h1>
          <h2 className="login-overlay__headline">
            Explore the shape
            <br />
            of your music taste.
          </h2>
          <p className="login-overlay__lead">
            SPECTRA는 당신의 감상 이력을 살아 움직이는 공간 경험으로 바꿉니다.
            감정의 결, 숨은 군집, 그리고 취향의 흐름을 발견해 보세요.
          </p>
        </section>
        <section className="login-overlay__hero-stage">
          <div className="import-stage">
            {/* 내보내는 법 접이식 가이드 */}
            <details className="import-guide-accordion">
              <summary className="import-guide-accordion__summary">
                <div className="import-guide-accordion__left">
                  <div className="import-guide-accordion__title-group">
                    <span className="import-guide-accordion__title">Apple Music · Spotify 등에서 목록 가져오는 법</span>
                    <span className="import-guide-accordion__subtitle">Apple Music · Spotify · YouTube Music 등 전 기종 지원</span>
                  </div>
                </div>
                <span className="import-guide-accordion__badge">안내 보기 ▾</span>
              </summary>
              <div className="import-guide-accordion__content">
                <ol className="import-guide">
                  <li>
                    <div className="import-guide__step-header">
                      <a
                        className="import-guide__tmm"
                        href={TUNE_MY_MUSIC_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Tune My Music 열기 ↗
                      </a>
                      <span className="import-guide__hint">무료 파일 변환 도구 (새 창)</span>
                    </div>
                  </li>
                  <li>
                    소스로 <b>Apple Music</b>, <b>Spotify</b>, <b>YouTube Music</b> 등 이용 중인 서비스를 연결합니다.
                  </li>
                  <li>
                    내보낼 곡 목록(보관함 / 플레이리스트) 선택 후, 목적지를 <b>Export to file (CSV)</b>로 골라 다운로드합니다.
                  </li>
                  <li>
                    다운로드한 CSV 또는 TXT 파일을 아래 영역에 끌어다 놓거나 클릭해 업로드합니다.
                  </li>
                </ol>
              </div>
            </details>

            <div
              className={`import-panel${dragActive ? ' dragging' : ''}`}
              onDragEnter={handleDragEnter}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <button
                type="button"
                className="import-dropzone"
                onClick={openFilePicker}
                disabled={busy}
              >
                <span className="import-dropzone__icon" aria-hidden>⤓</span>
                <span className="import-dropzone__title">
                  {fileName ? fileName : '파일을 여기로 드래그하거나 클릭해서 선택'}
                </span>
                <span className="import-dropzone__hint">
                  {fileName
                    ? (parseInfo ? `${parseInfo.count}곡 인식됨 · 다른 파일로 바꾸려면 클릭` : '인식된 곡이 없어요 · 다시 시도')
                    : 'CSV · TXT 파일 지원'}
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
                style={{ display: 'none' }}
                onChange={(e) => handleFile(e.target.files?.[0])}
              />

              <div className="import-panel__or"><span>또는 목록 붙여넣기</span></div>

              <textarea
                className="import-panel__textarea"
                placeholder={'한 줄에 한 곡씩:\nDaft Punk - Around the World\nTame Impala - The Less I Know the Better'}
                value={rawText}
                onChange={(e) => updateFromText(e.target.value)}
                disabled={busy}
                spellCheck={false}
              />

              {parseInfo && parseInfo.count > MAX_IMPORT_TRACKS && (
                <div className="import-panel__notice">
                  안정적이고 쾌적한 3D 탐색을 위해 총 {parseInfo.count.toLocaleString()}곡 중 전체 기간을 고르게 대표하는 {MAX_IMPORT_TRACKS.toLocaleString()}곡을 균등 선별하여 지도를 구성합니다.
                </div>
              )}

              <button
                type="button"
                className="login-overlay__enter taste import-panel__cta"
                onClick={handleGenerate}
                disabled={busy || !parseInfo}
              >
                {busy
                  ? `분석 중… ${pct}%`
                  : parseInfo
                    ? (parseInfo.count > MAX_IMPORT_TRACKS
                      ? `대표 ${MAX_IMPORT_TRACKS.toLocaleString()}곡으로 지도 만들기`
                      : `${parseInfo.count.toLocaleString()}곡으로 지도 만들기`)
                    : '곡 목록을 입력하세요'}
              </button>
              {error && <span className="import-panel__error">{error}</span>}

              {dragActive && (
                <div className="import-panel__dropveil" aria-hidden>
                  <span>여기에 파일을 놓으세요</span>
                </div>
              )}
            </div>
            <span className="login-overlay__subtext">
              곡 목록은 음악 특성 분석 및 커버 매칭을 위해 안전하게 처리되며, 별도의 스트리밍 서비스 로그인은 필요 없습니다.
            </span>
          </div>
        </section>
      </div>

      {busy && (
        <div className="import-analyzing" role="status" aria-live="polite">
          <div className="import-analyzing__card">
            <span className="import-analyzing__spinner" aria-hidden />
            <h3 className="import-analyzing__title">취향을 분석하는 중…</h3>
            <p className="import-analyzing__sub">
              음악의 장르와 분위기를 분석하고 앨범 커버를 함께 매칭하고 있어요.
            </p>
            <div className="import-analyzing__bar" aria-hidden>
              <span style={{ width: `${pct}%` }} />
            </div>
            <span className="import-analyzing__pct">
              {progress.done}/{progress.total}곡 · {pct}%
              {progress.originalTotal > progress.total && (
                <span className="import-analyzing__subpct">
                  (총 {progress.originalTotal.toLocaleString()}곡 중 대표 {progress.total.toLocaleString()}곡 선별)
                </span>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function AppInner() {
  const { hasTaste, cloudSyncing } = useTasteData();

  if (cloudSyncing) {
    return <AuthLoading title="취향 지도를 불러오고 있어요" message="저장된 나의 우주를 안전하게 연결하고 있습니다." />;
  }

  if (!hasTaste) {
    return <ImportOverlay />;
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/taste-map" replace />} />
      <Route path="/taste-map" element={<ResponsiveTasteMapRoute />} />
      <Route path="/taste-map/mobile" element={<TasteMapMobilePage />} />
      <Route path="*" element={<Navigate to="/taste-map" replace />} />
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
