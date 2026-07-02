import React, { useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { SpotifyAuthProvider, useSpotifyAuth } from './context/SpotifyAuthContext';
import TasteMapPage from './pages/TasteMapPage';
import TasteMapMobilePage from './pages/TasteMapMobilePage';
import './LoginOverlay.css';

function seeded01(seed) {
  const raw = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return raw - Math.floor(raw);
}

const TASTE_BUBBLES = [
  { id: 'b-0', x: 20, y: 26, size: 148, delay: -4.2, duration: 24.4, hue: 0, depth: 'near', cluster: 'a' },
  { id: 'b-1', x: 28, y: 24, size: 76, delay: -7.1, duration: 21.1, hue: 2, depth: 'mid', cluster: 'a' },
  { id: 'b-2', x: 24, y: 34, size: 92, delay: -9.3, duration: 26.3, hue: 1, depth: 'far', cluster: 'a' },
  { id: 'b-3', x: 38, y: 40, size: 132, delay: -5.7, duration: 25.8, hue: 0, depth: 'near', cluster: 'a' },
  { id: 'b-4', x: 63, y: 20, size: 124, delay: -3.8, duration: 22.6, hue: 1, depth: 'mid', cluster: 'b' },
  { id: 'b-5', x: 70, y: 30, size: 88, delay: -8.4, duration: 24.2, hue: 2, depth: 'far', cluster: 'b' },
  { id: 'b-6', x: 76, y: 22, size: 58, delay: -11.8, duration: 19.2, hue: 0, depth: 'far', cluster: 'b' },
  { id: 'b-7', x: 56, y: 62, size: 172, delay: -2.1, duration: 27.1, hue: 0, depth: 'near', cluster: 'c' },
  { id: 'b-8', x: 64, y: 66, size: 95, delay: -6.5, duration: 22.4, hue: 1, depth: 'mid', cluster: 'c' },
  { id: 'b-9', x: 73, y: 58, size: 82, delay: -9.9, duration: 25.3, hue: 2, depth: 'far', cluster: 'c' },
  { id: 'b-10', x: 84, y: 50, size: 118, delay: -5.1, duration: 23.7, hue: 1, depth: 'mid', cluster: 'd' },
  { id: 'b-11', x: 89, y: 58, size: 68, delay: -8.8, duration: 20.6, hue: 2, depth: 'far', cluster: 'd' },
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

function LoginOverlay() {
  const { login } = useSpotifyAuth();

  return (
    <div className="login-overlay taste">
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
      <div className="login-overlay__taste-layout">
        <section className="login-overlay__hero-copy">
          <h1 className="login-overlay__brand">S P E C T R A</h1>
          <h2 className="login-overlay__headline">
            Explore the shape
            <br />
            of your music taste.
          </h2>
          <p className="login-overlay__lead">
            SPECTRA transforms your listening history into a living spatial experience.
            Discover emotional patterns, hidden clusters, and the evolution of your musical identity.
          </p>
        </section>
        <section className="login-overlay__hero-stage">
          <div className="login-overlay__portal taste">
            <span className="login-overlay__portal-core" aria-hidden />
            <span className="login-overlay__portal-ripple ripple-a" aria-hidden />
            <span className="login-overlay__portal-ripple ripple-b" aria-hidden />
            <button
              onClick={login}
              className="login-overlay__enter taste"
            >
              Enter SPECTRA
            </button>
          </div>
          <span className="login-overlay__subtext">Connect with Spotify to generate your personal taste field.</span>
        </section>
      </div>
      <div className="login-overlay__edge-glow" aria-hidden />
    </div>
  );
}

function AppInner() {
  const { loading, loggedIn } = useSpotifyAuth();
  const location = useLocation();
  const path = location.pathname;
  // The mobile companion view authenticates via its own QR/bridge flow,
  // so it should not be gated by the desktop login overlay.
  const isTasteMapMobilePath = path.startsWith('/taste-map/mobile');
  const needsAuth = !isTasteMapMobilePath;

  if (loading) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: '#0d0f12',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 28, height: 28,
          border: '2px solid rgba(167,139,250,0.15)',
          borderTopColor: '#a78bfa',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (needsAuth && !loggedIn) {
    return <LoginOverlay />;
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

  return isMobile ? <TasteMapMobilePage /> : <TasteMapPage />;
}

function App() {
  return (
    <SpotifyAuthProvider>
      <Router>
        <AppInner />
      </Router>
    </SpotifyAuthProvider>
  );
}

export default App;
