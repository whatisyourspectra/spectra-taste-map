import { translate } from '../i18n/translate.js';
import React, { useEffect, useRef } from 'react';

const TAU = Math.PI * 2;
const random = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const clamp = (n) => Math.max(0, Math.min(1, n));
const smooth = (n) => { const t = clamp(n); return t * t * (3 - 2 * t); };
const FORMATION_SECONDS = 2.65;
// A return from the map keeps the sculpture assembled; a reload starts anew.
let formationPlayed = false;

// An artistic interpretation of a music atlas, not measured song coordinates.
export default function LaunchTasteMapHero({ onPulse }) {
  const canvasRef = useRef(null);
  const modeRef = useRef(0);
  const pulseRef = useRef(null);
  const onPulseRef = useRef(onPulse);
  useEffect(() => { onPulseRef.current = onPulse; }, [onPulse]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return undefined;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const root = canvas.closest('.llp-root');
    const navigation = performance.getEntriesByType('navigation')[0];
    let formationTime = formationPlayed || window.location.hash || navigation?.type === 'back_forward'
      ? FORMATION_SECONDS : 0;
    let width = 1, height = 1, frame = 0, last = 0, clock = 0;
    let copyBottom = 0;
    let visible = true, dirty = true, blend = 0, scroll = 0;
    let dragRotation = 0, velocity = 0, waves = [];
    const drag = { active: false, id: null, lastX: 0, startX: 0, startY: 0 };
    const pointer = { x: 0, y: 0, tx: 0, ty: 0, active: false };
    const lighting = { x: 0.68, y: 0.49, hovered: false, strength: 0, time: 0, next: 0 };
    let filaments = [];
    canvas.dataset.lightActive = 'false';
    canvas.dataset.filamentCount = '0';
    canvas.dataset.formation = 'waiting';
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
    const copy = canvas.closest('.llp-root')?.querySelector('.llp-hero-copy');
    const copySize = new ResizeObserver(() => {
      copyBottom = copy.getBoundingClientRect().bottom + window.scrollY;
      dirty = true;
    });
    if (copy) copySize.observe(copy);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; last = 0; dirty = true; });
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
      const hovered = event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
      if (!lighting.hovered && hovered) { lighting.x = pointer.tx + 0.5; lighting.y = pointer.ty + 0.5; }
      lighting.hovered = hovered;
      pointer.active = true;
      dirty = true;
    };
    const pulse = (x = 0.68, y = 0.49) => {
      onPulseRef.current?.();
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
      if (event.pointerType === 'touch' || event.type === 'pointercancel') lighting.hovered = false;
      if (event.type === 'pointerup' && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 8) {
        const box = canvas.getBoundingClientRect();
        pulse((event.clientX - box.left) / width, (event.clientY - box.top) / height);
      }
      drag.active = false;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      canvas.style.cursor = 'grab';
    };
    const leave = () => { lighting.hovered = false; dirty = true; if (drag.active) return; pointer.active = false; pointer.tx = 0; pointer.ty = 0; };
    const toggleShape = () => {
      modeRef.current = modeRef.current === 0 ? 1 : 0;
      dirty = true;
    };
    const keydown = (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleShape();
      }
    };
    const onScroll = () => { scroll = Math.min(1, window.scrollY / height); dirty = true; };
    const onMotionChange = () => { if (reduced.matches) formationTime = FORMATION_SECONDS; filaments = []; dirty = true; };
    const onVisibilityChange = () => { last = 0; dirty = true; };
    canvas.addEventListener('dblclick', toggleShape);
    canvas.addEventListener('keydown', keydown);
    canvas.addEventListener('pointermove', move, { passive: true });
    canvas.addEventListener('pointerleave', leave);
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    window.addEventListener('scroll', onScroll, { passive: true });
    reduced.addEventListener('change', onMotionChange);
    document.addEventListener('visibilitychange', onVisibilityChange);

    const draw = (now) => {
      frame = requestAnimationFrame(draw);
      if (!visible || document.hidden || width <= 1 || height <= 1 || (copy && !copyBottom) || now - last < 32) return;
      const targetBlend = modeRef.current;
      const changed = Math.abs(blend - targetBlend) > 0.001;
      if (reduced.matches && !dirty && !changed) return;
      const elapsed = last ? Math.min((now - last) / 1000, 0.064) : 0;
      last = now;
      lighting.time += elapsed;
      lighting.strength += ((lighting.hovered ? 1 : 0) - lighting.strength) * (reduced.matches ? 1 : 0.18);
      if (lighting.hovered) {
        lighting.x += (pointer.tx + 0.5 - lighting.x) * (reduced.matches ? 1 : 0.16);
        lighting.y += (pointer.ty + 0.5 - lighting.y) * (reduced.matches ? 1 : 0.16);
      }
      filaments = reduced.matches || lighting.strength < 0.002 ? [] : filaments.filter(filament => lighting.time - filament.born < 1.05);
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
      const scale = Math.min(width * (mobile ? 0.235 : 0.195), height * 0.32);
      // Leave space for the file CTA, including translated copy.
      const cy = mobile ? Math.max(height * 0.66, copyBottom - window.scrollY + scale * 1.9 + 24) : height * 0.49;
      // Use visible drawing time, independently of the shorter text entrance.
      // Pointer input never cancels formation, and a background tab cannot use it up.
      const sculptureInView = cy - scale * 1.65 < height * 0.94 && cy + scale * 1.65 > 96;
      if (reduced.matches || root?.dataset.chapter !== 'hero') formationTime = FORMATION_SECONDS;
      else if (sculptureInView && width > 1 && height > 1) {
        formationTime = Math.min(FORMATION_SECONDS, formationTime + elapsed);
        formationPlayed = true;
      }
      const forming = formationTime < FORMATION_SECONDS;
      const phase = !sculptureInView && forming ? 'waiting' : formationTime < 0.45 ? 'gathering' : forming ? 'weaving' : 'settled';
      if (canvas.dataset.formation !== phase) canvas.dataset.formation = phase;
      const formationPercent = String(Math.round(formationTime / FORMATION_SECONDS * 100));
      if (canvas.dataset.formationProgress !== formationPercent) canvas.dataset.formationProgress = formationPercent;
      // A shared camera move turns both the growing weave and its particles.
      // All offsets end at zero so hand-driven rotation keeps its own momentum.
      const spin = forming ? smooth((formationTime - 0.1) / 2.35) : 1;
      const impact = forming ? Math.sin(Math.PI * clamp((formationTime - 1.8) / 0.85)) ** 2 : 0;
      const anticipation = forming ? Math.sin(Math.PI * clamp((formationTime - 1.4) / 0.4)) ** 2 : 0;
      const projectionScale = scale * (1 + impact * (mobile ? 0.08 : 0.14) - anticipation * 0.045);
      const unfolding = forming ? smooth((formationTime - 0.12) / 1.85) : 1;
      const turn = (1 - unfolding) * 1.2;
      const turnCos = Math.cos(turn), turnSin = Math.sin(turn);
      const spread = 0.32 + unfolding * 0.68;
      const uncoil = (point) => {
        if (!forming) return point;
        return [(point[0] * turnCos - point[1] * turnSin) * spread,
          (point[0] * turnSin + point[1] * turnCos) * spread,
          point[2] * (0.35 + unfolding * 0.65)];
      };
      const rotation = -0.38 + pointer.x * 0.9 + scroll * 0.75 + dragRotation + Math.sin(clock * 0.4) * 0.3 - TAU * 0.85 * (1 - spin);
      const tilt = 0.8 + pointer.y * 0.65 + Math.sin(clock * 0.65) * 0.2 - 0.35 * (1 - spin) + Math.sin(Math.PI * spin) * 0.18;
      const roll = -0.45 * (1 - spin);
      const rollCos = Math.cos(roll), rollSin = Math.sin(roll);
      const project = (x, y, z) => {
        const rx = x * Math.cos(rotation) - z * Math.sin(rotation);
        const rz = x * Math.sin(rotation) + z * Math.cos(rotation);
        const ry = y * Math.cos(tilt) - rz * Math.sin(tilt);
        const depth = y * Math.sin(tilt) + rz * Math.cos(tilt);
        const perspective = 5 / (5 + depth);
        let px = cx + (rx * rollCos - ry * rollSin) * projectionScale * perspective;
        let py = cy + (rx * rollSin + ry * rollCos) * projectionScale * perspective;
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
      const lightX = lighting.x * width, lightY = lighting.y * height;
      const lightRadius = mobile ? 95 : 145;
      context.save();
      let nearest = { distance: Infinity, strand: 0, step: 0 };
      for (let strand = 0; strand < strands; strand++) {
        const v = strand / strands * TAU;
        const delay = 0.18 + (strand % 8) / 7 * 0.34 + Math.floor(strand / 8) / (strands / 8) * 0.22;
        const growth = forming ? smooth((formationTime - delay) / 1.65) : 1;
        const birthEnergy = forming ? Math.sin(Math.PI * growth) : 0;
        const seed = forming ? Math.floor(random(strand + 820) * samples) : 0;
        const points = [];
        for (let step = 0; step <= samples; step++) {
          const t = step / samples * TAU;
          const pulse = 0.13 * Math.sin(t * 3 + clock);
          const radius = 1.25 + (0.43 + pulse) * Math.cos(t * 3 + v);
          const orbit = [radius * Math.cos(t * 2), radius * Math.sin(t * 2), 0.62 * Math.sin(t * 3 + v)];
          const field = [(t / TAU - 0.5) * 4.6, Math.sin(t * 1.7 + v * 0.38) * 0.7 + Math.cos(v) * 0.55, Math.sin(v) * 0.7 + Math.cos(t * 2 + clock) * 0.3];
          const point = project(...uncoil(orbit.map((n, i) => n + (field[i] - n) * blend)));
          points.push(point);
          if (lighting.hovered && (step - seed + samples) % samples / samples <= growth) {
            const distance = Math.hypot(point[0] - lightX, point[1] - lightY);
            if (distance < nearest.distance) nearest = { distance, strand, step };
          }
        }
        const light = 67 + 12 * Math.sin(v + clock * 0.4);
        const hue = 195 + strand / strands * 130;
        const opacity = 0.32 + 0.24 * Math.sin(v) ** 2;
        const lineWidth = strand % 8 === 0 ? 0.85 : 0.45;
        const thread = new Path2D();
        const depthBands = Array.from({ length: 8 }, () => new Path2D());
        const rim = new Path2D();
        for (let step = 1; step < points.length; step++) {
          // Every strand starts at its own seed. Never bridge an unbuilt gap.
          if ((step - 1 - seed + samples) % samples / samples >= growth) continue;
          const previous = points[step - 1], point = points[step];
          thread.moveTo(previous[0], previous[1]); thread.lineTo(point[0], point[1]);
          const front = Math.max(0, Math.min(1, (1.8 - (previous[2] + point[2]) / 2) / 3.6));
          const path = depthBands[Math.min(7, Math.floor(front * 8))];
          path.moveTo(previous[0], previous[1]); path.lineTo(point[0], point[1]);
          if (strand % 8 === 0 && front > 0.78) {
            rim.moveTo(previous[0], previous[1]); rim.lineTo(point[0], point[1]);
          }
        }
        // The rear foundation grows with the threads rather than revealing the
        // complete silhouette underneath the generation sequence.
        context.strokeStyle = `hsla(${hue},88%,${light}%,${opacity * 0.12})`;
        context.lineWidth = lineWidth * 0.7;
        context.stroke(thread);
        context.save();
        context.lineCap = 'round';
        depthBands.forEach((path, band) => {
          const front = (band + 0.5) / depthBands.length;
          context.strokeStyle = `hsla(${hue},88%,${light + front * 6 + birthEnergy * 8 + impact * 7}%,${opacity * (0.25 + front * 0.95) * (1 + birthEnergy * 0.85 + impact * 0.4)})`;
          context.lineWidth = lineWidth * (0.6 + front * 0.85 + birthEnergy * 0.2);
          context.stroke(path);
        });
        context.strokeStyle = `hsla(${hue},88%,88%,0.13)`;
        context.lineWidth = lineWidth + 0.35;
        context.shadowColor = `hsla(${hue},88%,78%,0.18)`;
        context.shadowBlur = 4;
        context.stroke(rim);
        context.restore();
        if (lighting.strength > 0.002) {
          const glow = context.createRadialGradient(lightX, lightY, 0, lightX, lightY, lightRadius);
          glow.addColorStop(0, `hsla(${hue},90%,88%,${lighting.strength * 0.8})`);
          glow.addColorStop(0.35, `hsla(${hue},88%,78%,${lighting.strength * 0.38})`);
          glow.addColorStop(1, `hsla(${hue},88%,78%,0)`);
          context.save();
          context.globalCompositeOperation = 'screen';
          context.strokeStyle = glow;
          context.lineWidth = 1.15;
          context.stroke(thread);
          if (!reduced.matches) for (const filament of filaments) {
            if (filament.strand !== strand) continue;
            const age = lighting.time - filament.born;
            const head = filament.step / samples + filament.direction * age * 0.24;
            for (let tail = 0; tail < 9; tail++) {
              const index = Math.round((head - filament.direction * tail * 0.006) * samples);
              const next = index + filament.direction;
              if (index < 0 || index > samples || next < 0 || next > samples) continue;
              const alpha = (1 - age / 1.05) * (1 - tail / 9) ** 2 * lighting.strength;
              context.beginPath(); context.moveTo(points[index][0], points[index][1]); context.lineTo(points[next][0], points[next][1]);
              context.strokeStyle = `hsla(${hue},95%,90%,${alpha})`;
              context.shadowColor = `hsla(${hue},90%,75%,${alpha * 0.75})`;
              context.shadowBlur = 7;
              context.lineWidth = 1.65;
              context.stroke();
            }
          }
          context.restore();
        }
        // Restrained glowing tips make the actual drawing of the weave legible.
        if (forming && strand % 4 === 0 && growth > 0 && growth < 1) {
          const head = (seed + growth * samples) % samples;
          const index = Math.floor(head), fraction = head - index;
          const a = points[index], b = points[index + 1];
          const x = a[0] + (b[0] - a[0]) * fraction, y = a[1] + (b[1] - a[1]) * fraction;
          const glow = Math.sin(Math.PI * growth) ** 0.5;
          context.save();
          context.fillStyle = `hsla(${hue},95%,92%,${glow})`;
          context.shadowColor = `hsla(${hue},95%,72%,${glow})`;
          context.shadowBlur = 12;
          context.beginPath(); context.arc(x, y, 1.8, 0, TAU); context.fill();
          context.restore();
        }
      }
      if (!reduced.matches && lighting.hovered && nearest.distance < lightRadius * 0.65 && lighting.time >= lighting.next) {
        filaments = [...filaments.slice(-4), ...[-1, 1].map(direction => ({ strand: nearest.strand, step: nearest.step, direction, born: lighting.time }))];
        lighting.next = lighting.time + 0.24;
      }
      const lightActive = String(lighting.strength > 0.002 && (nearest.distance < lightRadius || !lighting.hovered));
      if (canvas.dataset.lightActive !== lightActive) canvas.dataset.lightActive = lightActive;
      if (canvas.dataset.filamentCount !== String(filaments.length)) canvas.dataset.filamentCount = String(filaments.length);
      const appearance = forming ? 0.3 + smooth(formationTime / 0.7) * 0.7 : 1;
      for (let i = 0; i < 800; i++) {
        const t = random(i + 13) * TAU + clock * 0.18;
        const v = random(i + 3000) * TAU;
        const radius = 1.25 + 0.43 * Math.cos(t * 3 + v);
        const orbit = [radius * Math.cos(t * 2), radius * Math.sin(t * 2), 0.62 * Math.sin(t * 3 + v)];
        const field = [(random(i + 13) - 0.5) * 4.6, Math.sin(t * 1.7 + v * 0.38) * 0.7 + Math.cos(v) * 0.55, Math.sin(v) * 0.7 + Math.cos(t * 2 + clock) * 0.3];
        const target = orbit.map((n, j) => n + (field[j] - n) * blend);
        let arrival = 1, spawn, position = target;
        if (forming) {
          arrival = smooth((formationTime - random(i + 900) * 0.45) / 1.65);
          const angle = random(i + 1000) * TAU + (1 - arrival) * 1.1;
          spawn = [Math.cos(angle) * (1.7 + random(i + 1100) * 0.6), Math.sin(angle) * (0.95 + random(i + 1200) * 0.7), (random(i + 1300) - 0.5) * 1.8];
          position = spawn.map((n, j) => n + (target[j] - n) * arrival);
        }
        const [x, y, depth] = project(...position);
        const hue = 195 + random(i + 60) * 130;
        const alpha = (0.35 + random(i + 80) * 0.6) * appearance;
        if (forming && arrival > 0 && arrival < 1 && i % 13 === 0) {
          const tail = project(...position.map((n, j) => n + (spawn[j] - target[j]) * 0.035 * Math.sin(arrival * Math.PI)));
          context.strokeStyle = `hsla(${hue},90%,80%,${alpha * 0.45})`;
          context.lineWidth = 0.7;
          context.beginPath(); context.moveTo(tail[0], tail[1]); context.lineTo(x, y); context.stroke();
        }
        context.fillStyle = `hsla(${hue}, 90%, 84%, ${alpha})`;
        const size = Math.max(0.4, (1.7 - depth * 0.35) * random(i + 30));
        context.fillRect(x, y, size, size);
      }
      context.restore();
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
        context.fillStyle = '#dbe8ff'; context.font = '10px monospace';
        if (width >= 700) {
          const label = drag.active ? 'ROTATING' : `DRAG TO ROTATE · CLICK TO PULSE · DOUBLE CLICK TO ${modeRef.current ? 'COLLECT' : 'EXPAND'}`;
          const labelWidth = context.measureText(label).width;
          const labelX = Math.max(12, Math.min(x + 35, width - labelWidth - 12));
          const labelY = Math.max(22, Math.min(y + 4, height - 16));
          context.fillText(label, labelX, labelY);
        }
      }
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect(); copySize.disconnect(); observer.disconnect();
      canvas.removeEventListener('dblclick', toggleShape);
      canvas.removeEventListener('keydown', keydown);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerleave', leave);
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      pulseRef.current = null;
      window.removeEventListener('scroll', onScroll);
      reduced.removeEventListener('change', onMotionChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return (
    <div className="llp-sculpture">
      <div className="llp-sculpture-backdrop"><canvas ref={canvasRef} tabIndex={0} role="button" aria-label={translate("음악 조형물: 드래그로 회전, 클릭으로 파동, 더블클릭 또는 Enter로 펼치기·모아보기 전환")} /></div>
    </div>
  );
}
