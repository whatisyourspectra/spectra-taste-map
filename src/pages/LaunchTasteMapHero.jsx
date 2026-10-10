import React, { useEffect, useRef, useState } from 'react';

const TAU = Math.PI * 2;
const random = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// An artistic interpretation of a music atlas, not measured song coordinates.
export default function LaunchTasteMapHero({ onTry }) {
  const canvasRef = useRef(null);
  const modeRef = useRef(0);
  const pulseRef = useRef(null);
  const [mode, setMode] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return undefined;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 1, height = 1, frame = 0, last = 0, clock = 0;
    let visible = true, dirty = true, blend = 0, scroll = 0;
    let dragRotation = 0, velocity = 0, waves = [];
    const drag = { active: false, id: null, lastX: 0, startX: 0, startY: 0 };
    const pointer = { x: 0, y: 0, tx: 0, ty: 0, active: false };
    const resize = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width;
      height = entry.contentRect.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      dirty = true;
    });
    resize.observe(canvas);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; dirty = true; });
    observer.observe(canvas);
    const move = (event) => {
      if (drag.active && event.pointerId === drag.id) {
        velocity = (event.clientX - drag.lastX) / width * 4;
        dragRotation += velocity;
        drag.lastX = event.clientX;
      }
      const box = canvas.getBoundingClientRect();
      pointer.tx = (event.clientX - box.left) / width - 0.5;
      pointer.ty = (event.clientY - box.top) / height - 0.5;
      pointer.active = true;
      dirty = true;
    };
    const pulse = (x = 0.68, y = 0.49) => {
      waves.push({ x, y, start: performance.now() });
      waves = waves.slice(-4);
      dirty = true;
    };
    pulseRef.current = () => pulse(width < 700 ? 0.53 : 0.68, width < 700 ? 0.66 : 0.49);
    const down = (event) => {
      if (!event.isPrimary || event.button !== 0) return;
      Object.assign(drag, { active: true, id: event.pointerId, lastX: event.clientX, startX: event.clientX, startY: event.clientY });
      velocity = 0;
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = 'grabbing';
      move(event);
    };
    const up = (event) => {
      if (event.pointerId !== drag.id) return;
      if (event.type === 'pointerup' && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 8) {
        const box = canvas.getBoundingClientRect();
        pulse((event.clientX - box.left) / width, (event.clientY - box.top) / height);
      }
      drag.active = false;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      canvas.style.cursor = 'grab';
    };
    const leave = () => { if (drag.active) return; pointer.active = false; pointer.tx = 0; pointer.ty = 0; dirty = true; };
    const onScroll = () => { scroll = Math.min(1, window.scrollY / height); dirty = true; };
    canvas.addEventListener('pointermove', move, { passive: true });
    canvas.addEventListener('pointerleave', leave);
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    window.addEventListener('scroll', onScroll, { passive: true });

    const draw = (now) => {
      frame = requestAnimationFrame(draw);
      if (!visible || document.hidden || now - last < 32) return;
      const targetBlend = modeRef.current;
      const changed = Math.abs(blend - targetBlend) > 0.001;
      if (reduced.matches && !dirty && !changed) return;
      last = now;
      if (!reduced.matches) clock += 0.018;
      if (!drag.active && !reduced.matches) { dragRotation += velocity; velocity *= 0.94; }
      waves = waves.filter((wave) => now - wave.start < 1400);
      pointer.x += (pointer.tx - pointer.x) * 0.06;
      pointer.y += (pointer.ty - pointer.y) * 0.06;
      blend += (targetBlend - blend) * (reduced.matches ? 1 : 0.035);
      dirty = false;
      context.clearRect(0, 0, width, height);
      const mobile = width < 700;
      const cx = width * (mobile ? 0.53 : 0.68);
      const cy = height * (mobile ? 0.66 : 0.49);
      const scale = Math.min(width * (mobile ? 0.235 : 0.195), height * 0.32);
      const rotation = -0.38 + pointer.x * 0.9 + scroll * 0.75 + dragRotation + Math.sin(clock * 0.4) * 0.3;
      const tilt = 0.8 + pointer.y * 0.65 + Math.sin(clock * 0.65) * 0.2;
      const project = (x, y, z) => {
        const rx = x * Math.cos(rotation) - z * Math.sin(rotation);
        const rz = x * Math.sin(rotation) + z * Math.cos(rotation);
        const ry = y * Math.cos(tilt) - rz * Math.sin(tilt);
        const depth = y * Math.sin(tilt) + rz * Math.cos(tilt);
        const perspective = 5 / (5 + depth);
        let px = cx + rx * scale * perspective;
        let py = cy + ry * scale * perspective;
        if (pointer.active && !reduced.matches) {
          const dx = px - (pointer.x + 0.5) * width;
          const dy = py - (pointer.y + 0.5) * height;
          const distance = Math.hypot(dx, dy);
          const force = Math.max(0, 1 - distance / 190) ** 2 * 48;
          px += dx / (distance || 1) * force;
          py += dy / (distance || 1) * force;
        }
        if (!reduced.matches) for (const wave of waves) {
          const age = (now - wave.start) / 1400;
          const dx = px - wave.x * width, dy = py - wave.y * height;
          const distance = Math.hypot(dx, dy);
          const force = Math.exp(-(((distance - age * 650) / 55) ** 2)) * (1 - age) * 55;
          px += dx / (distance || 1) * force;
          py += dy / (distance || 1) * force;
        }
        return [px, py, depth];
      };
      const strands = mobile ? 42 : 64;
      const samples = mobile ? 100 : 140;
      for (let strand = 0; strand < strands; strand++) {
        const v = strand / strands * TAU;
        context.beginPath();
        for (let step = 0; step <= samples; step++) {
          const t = step / samples * TAU;
          const pulse = 0.13 * Math.sin(t * 3 + clock);
          const radius = 1.25 + (0.43 + pulse) * Math.cos(t * 3 + v);
          const orbit = [radius * Math.cos(t * 2), radius * Math.sin(t * 2), 0.62 * Math.sin(t * 3 + v)];
          const field = [(t / TAU - 0.5) * 4.6, Math.sin(t * 1.7 + v * 0.38) * 0.7 + Math.cos(v) * 0.55, Math.sin(v) * 0.7 + Math.cos(t * 2 + clock) * 0.3];
          const point = project(...orbit.map((n, i) => n + (field[i] - n) * blend));
          if (step === 0) context.moveTo(point[0], point[1]);
          else context.lineTo(point[0], point[1]);
        }
        const light = 67 + 12 * Math.sin(v + clock * 0.4);
        context.strokeStyle = `hsla(${195 + strand / strands * 130}, 88%, ${light}%, ${0.32 + 0.24 * Math.sin(v) ** 2})`;
        context.lineWidth = strand % 8 === 0 ? 0.85 : 0.45;
        context.stroke();
      }
      for (let i = 0; i < 800; i++) {
        const t = random(i + 13) * TAU + clock * 0.18;
        const v = random(i + 3000) * TAU;
        const radius = 1.25 + 0.43 * Math.cos(t * 3 + v);
        const orbit = [radius * Math.cos(t * 2), radius * Math.sin(t * 2), 0.62 * Math.sin(t * 3 + v)];
        const field = [(random(i + 13) - 0.5) * 4.6, Math.sin(t * 1.7 + v * 0.38) * 0.7 + Math.cos(v) * 0.55, Math.sin(v) * 0.7 + Math.cos(t * 2 + clock) * 0.3];
        const [x, y, depth] = project(...orbit.map((n, j) => n + (field[j] - n) * blend));
        context.fillStyle = `hsla(${195 + random(i + 60) * 130}, 90%, 84%, ${0.35 + random(i + 80) * 0.6})`;
        const size = Math.max(0.4, (1.7 - depth * 0.35) * random(i + 30));
        context.fillRect(x, y, size, size);
      }
      if (!reduced.matches) for (const wave of waves) {
        const age = (now - wave.start) / 1400;
        context.strokeStyle = `rgba(112,214,255,${(1 - age) * 0.45})`;
        context.lineWidth = 1;
        context.beginPath(); context.arc(wave.x * width, wave.y * height, age * 650, 0, TAU); context.stroke();
      }
      if (pointer.active) {
        const x = (pointer.x + 0.5) * width, y = (pointer.y + 0.5) * height;
        context.strokeStyle = 'rgba(112,214,255,.5)';
        context.lineWidth = 0.6;
        context.beginPath(); context.arc(x, y, 24, 0, TAU); context.stroke();
        context.fillStyle = '#b9cbeb'; context.font = '9px monospace';
        if (width >= 700) context.fillText(drag.active ? 'SHAPING YOUR SPECTRA' : 'DRAG TO ROTATE · CLICK TO PULSE', Math.min(x + 35, width - 245), y + 3);
      }
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect(); observer.disconnect();
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerleave', leave);
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      pulseRef.current = null;
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const selectMode = (next) => { modeRef.current = next; setMode(next); };
  return (
    <div className="llp-sculpture">
      <div className="llp-sculpture-backdrop"><canvas ref={canvasRef} aria-hidden="true" /></div>
      <div className="llp-sculpture-caption"><span>FIG. 01 — THE SHAPE OF TASTE</span><span>드래그로 회전 · 클릭으로 파동 · 아래에서 실제 곡 탐색</span></div>
      <div className="llp-sculpture-controls" role="group" aria-label="음악 조형물 형태">
        <button type="button" aria-pressed={mode === 0} onClick={() => selectMode(0)}><span>01</span> 펼치기</button>
        <button type="button" aria-pressed={mode === 1} onClick={() => selectMode(1)}><span>02</span> 모아보기</button>
        <button type="button" onClick={() => pulseRef.current?.()} aria-label="빛의 파동 만들기"><span>↗</span> 파동</button>
        <button type="button" onClick={onTry}>곡으로 직접 체험 ↗</button>
      </div>
    </div>
  );
}
