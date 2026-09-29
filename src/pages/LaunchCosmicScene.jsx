import React, { useEffect, useRef } from 'react';

function seeded01(seed) {
  const raw = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return raw - Math.floor(raw);
}

/**
 * Lusion-inspired Interactive 3D Cosmic Space for the Landing Page.
 * Responds smoothly to scroll depth and cursor parallax movement.
 */
export default function LaunchCosmicScene() {
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
    let constellationLines = null;
    const orbs = [];
    const softHalos = [];

    // Cursor tracking with spring/lerp
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    // Scroll tracking
    let scrollProgress = 0;
    let targetScrollProgress = 0;

    const onPointerMove = (e) => {
      const halfW = window.innerWidth / 2 || 1;
      const halfH = window.innerHeight / 2 || 1;
      mouse.targetX = (e.clientX - halfW) / halfW;
      mouse.targetY = (e.clientY - halfH) / halfH;
    };

    const onScroll = () => {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      targetScrollProgress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    (async () => {
      const THREE = await import('three');
      if (disposed || !mount) return;

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
      camera.position.set(0, 0, 14);

      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
      renderer.setClearColor(0x000000, 0);
      mount.appendChild(renderer.domElement);

      const resize = () => {
        if (!mount || !renderer || !camera) return;
        const w = Math.max(1, window.innerWidth);
        const h = Math.max(1, window.innerHeight);
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      resize();

      // Multi-layer organic starfield
      const makeCloud = (count, zRange, size, opacity, tintA, tintB) => {
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const cA = new THREE.Color(tintA);
        const cB = new THREE.Color(tintB);
        for (let i = 0; i < count; i++) {
          const idx = i * 3;
          const seed = i + count * 4.13;
          positions[idx] = (seeded01(seed * 2.3) - 0.5) * 32;
          positions[idx + 1] = (seeded01(seed * 3.9) - 0.5) * 22;
          positions[idx + 2] = zRange[0] + seeded01(seed * 5.7) * (zRange[1] - zRange[0]);
          const blend = seeded01(seed * 7.1);
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

      nearCloud = makeCloud(240, [-4.0, 3.5], 0.14, 0.65, '#93c5fd', '#e0e7ff');
      midCloud = makeCloud(320, [-9.0, -3.5], 0.10, 0.45, '#70d6ff', '#c084fc');
      farCloud = makeCloud(400, [-16.0, -8.5], 0.07, 0.28, '#3b82f6', '#818cf8');

      // Floating Celestial Constellation Web
      const constelPoints = [];
      const constelCount = 18;
      for (let i = 0; i < constelCount; i++) {
        const seed = i + 101;
        constelPoints.push(
          new THREE.Vector3(
            (seeded01(seed * 1.7) - 0.5) * 16,
            (seeded01(seed * 3.1) - 0.5) * 10,
            -2 + seeded01(seed * 5.3) * -6
          )
        );
      }
      const linePositions = [];
      for (let i = 0; i < constelPoints.length; i++) {
        for (let j = i + 1; j < constelPoints.length; j++) {
          const d = constelPoints[i].distanceTo(constelPoints[j]);
          if (d < 5.2) {
            linePositions.push(
              constelPoints[i].x, constelPoints[i].y, constelPoints[i].z,
              constelPoints[j].x, constelPoints[j].y, constelPoints[j].z
            );
          }
        }
      }
      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x70d6ff,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
      });
      constellationLines = new THREE.LineSegments(lineGeo, lineMat);
      scene.add(constellationLines);

      // Luminous Floating Orbs (Celestial Taste Centers)
      const orbGeo = new THREE.SphereGeometry(1.0, 32, 32);
      const makeOrb = (color, pos, scale, baseOpacity) => {
        const mat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: baseOpacity,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const mesh = new THREE.Mesh(orbGeo, mat);
        mesh.position.set(...pos);
        mesh.scale.setScalar(scale);
        mesh.userData = { baseY: pos[1], baseScale: scale, color };
        scene.add(mesh);
        orbs.push(mesh);
        return mesh;
      };

      makeOrb('#60a5fa', [-4.2, 2.2, -4.5], 2.6, 0.18);
      makeOrb('#c084fc', [4.8, -1.8, -7.5], 3.2, 0.14);
      makeOrb('#f472b6', [0.5, 3.2, -9.0], 2.0, 0.12);
      makeOrb('#34d399', [-2.8, -3.2, -6.0], 1.8, 0.15);

      // Ambient Atmosphere Halos
      const haloGeo = new THREE.SphereGeometry(1.2, 28, 28);
      const makeHalo = (color, pos, scale) => {
        const mat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.05,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const mesh = new THREE.Mesh(haloGeo, mat);
        mesh.position.set(...pos);
        mesh.scale.setScalar(scale);
        scene.add(mesh);
        softHalos.push(mesh);
      };

      makeHalo('#38bdf8', [-1.0, -1.5, -11.0], 5.5);
      makeHalo('#818cf8', [3.5, 2.0, -10.5], 4.5);

      const animate = () => {
        if (disposed) return;
        frame = requestAnimationFrame(animate);

        const motionScale = reduceMotion ? 0.2 : 1;
        const time = performance.now() * 0.00012;

        // Smooth cursor lag (Lerp)
        mouse.x += (mouse.targetX - mouse.x) * 0.05;
        mouse.y += (mouse.targetY - mouse.y) * 0.05;

        // Smooth scroll progress
        scrollProgress += (targetScrollProgress - scrollProgress) * 0.06;

        // Dynamic Camera navigation reacting to scroll and cursor
        // As user scrolls down, camera glides forward and pivots slightly
        camera.position.z = 14 - scrollProgress * 6.5;
        camera.position.x = mouse.x * 1.5 * motionScale;
        camera.position.y = -mouse.y * 1.2 * motionScale - scrollProgress * 1.8;
        camera.rotation.y = -mouse.x * 0.12 * motionScale;
        camera.rotation.x = mouse.y * 0.08 * motionScale;

        // Fluid Particle Cloud Drift & Rotation
        if (nearCloud) {
          nearCloud.rotation.y = time * 0.9 * motionScale;
          nearCloud.rotation.x = Math.sin(time * 0.4) * 0.06 * motionScale;
        }
        if (midCloud) {
          midCloud.rotation.y = -time * 0.55 * motionScale;
          midCloud.rotation.z = Math.cos(time * 0.35) * 0.04 * motionScale;
        }
        if (farCloud) {
          farCloud.rotation.y = -time * 0.25 * motionScale;
        }
        if (constellationLines) {
          constellationLines.rotation.y = time * 0.4 * motionScale;
          constellationLines.rotation.x = Math.sin(time * 0.25) * 0.05 * motionScale;
        }

        // Orb organic float & pulse
        orbs.forEach((orb, idx) => {
          const phase = time * (0.8 + idx * 0.22);
          const yOff = Math.sin(phase) * 0.28 * motionScale;
          orb.position.y = (orb.userData.baseY || 0) + yOff;
          orb.rotation.y += 0.002 * motionScale;
          const pulse = 1 + Math.sin(phase * 1.4) * 0.05 * motionScale;
          orb.scale.setScalar(orb.userData.baseScale * pulse);
        });

        renderer.render(scene, camera);
      };

      animate();

      ro = new ResizeObserver(resize);
      ro.observe(document.body);
    })();

    return () => {
      disposed = true;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', onScroll);
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

  return <div className="launch-cosmic-scene" ref={mountRef} aria-hidden />;
}
