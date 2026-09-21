import { useEffect, useMemo, useRef, useState } from 'react';
import LivingConstellationAvatar from '../avatar/LivingConstellationAvatar';
import { clampZoom, DEFAULT_CAMERA, projectPoint, projectSpectra } from './projectSpectra';

export default function ImmersiveSpectra({ avatar, previous, comparison, reaction, lang, stageRef, onSelect, tourCameraTarget }) {
    const camera = useRef({ ...DEFAULT_CAMERA });
    const [view, setView] = useState({ ...DEFAULT_CAMERA });
    const pointers = useRef(new Map());
    const velocity = useRef({ yaw: 0, pitch: 0 });
    const lastMove = useRef(0);
    const frame = useRef(0);
    const moved = useRef(false);
    const [moving, setMoving] = useState(false);
    const en = lang === 'en';
    const current = useMemo(() => projectSpectra(avatar, view), [avatar, view]);
    const past = useMemo(() => previous ? projectSpectra(previous, view) : null, [previous, view]);
    const projectedReaction = reaction ? { ...reaction, ...projectPoint(reaction, view, reaction.trackId) } : null;
    const paint = () => setView({ ...camera.current });
    const stop = () => { cancelAnimationFrame(frame.current); velocity.current = { yaw: 0, pitch: 0 }; };
    const queuePaint = () => {
        cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(paint);
    };

    // Smoothly animate 3D camera with cinematic arc zoom when tourCameraTarget changes
    useEffect(() => {
        if (!tourCameraTarget) return undefined;
        stop();
        const start = { ...camera.current };
        const target = {
            yaw: tourCameraTarget.yaw ?? start.yaw,
            pitch: tourCameraTarget.pitch ?? start.pitch,
            zoom: clampZoom(tourCameraTarget.zoom ?? start.zoom),
        };
        const startTime = performance.now();
        const duration = 900;

        const step = (now) => {
            const elapsed = now - startTime;
            const t = Math.min(1, elapsed / duration);
            const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            camera.current.yaw = start.yaw + (target.yaw - start.yaw) * ease;
            camera.current.pitch = start.pitch + (target.pitch - start.pitch) * ease;

            // Subtle, silky camera arc swoop
            const dip = Math.sin(t * Math.PI) * 0.16;
            camera.current.zoom = clampZoom((start.zoom + (target.zoom - start.zoom) * ease) - dip);

            paint();
            if (t < 1) {
                frame.current = requestAnimationFrame(step);
            }
        };

        frame.current = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frame.current);
    }, [tourCameraTarget]);
    useEffect(() => {
        const pause = () => {
            if (document.hidden) {
                cancelAnimationFrame(frame.current);
                pointers.current.clear();
                velocity.current = { yaw: 0, pitch: 0 };
                setMoving(false);
            }
        };
        const media = window.matchMedia('(prefers-reduced-motion: reduce)');
        const reduce = () => { if (media.matches) cancelAnimationFrame(frame.current); };
        media.addEventListener('change', reduce);
        document.addEventListener('visibilitychange', pause);
        return () => { cancelAnimationFrame(frame.current); media.removeEventListener('change', reduce); document.removeEventListener('visibilitychange', pause); };
    }, []);
    const finish = (event) => {
        if (!pointers.current.has(event.pointerId)) return;
        pointers.current.delete(event.pointerId);
        if (pointers.current.size) { velocity.current = { yaw: 0, pitch: 0 }; return; }
        setMoving(false);
        cancelAnimationFrame(frame.current);
        paint();
        if (event.type !== 'pointerup' || performance.now() - lastMove.current > 100
            || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { stop(); return; }
        let last = performance.now();
        const drift = (now) => {
            const dt = Math.min(32, now - last); last = now;
            const v = velocity.current;
            const decay = Math.pow(.93, dt / 16.67);
            v.yaw *= decay; v.pitch *= decay;
            camera.current.yaw += v.yaw * dt;
            camera.current.pitch += v.pitch * dt;
            paint();
            if (Math.abs(v.yaw) + Math.abs(v.pitch) > .000025) frame.current = requestAnimationFrame(drift);
        };
        frame.current = requestAnimationFrame(drift);
    };
    const adjust = (zoom, yaw = 0, pitch = 0) => {
        stop();
        camera.current.zoom = clampZoom(camera.current.zoom + zoom);
        camera.current.yaw += yaw; camera.current.pitch += pitch;
        paint();
    };
    const distance = () => {
        const [a, b] = [...pointers.current.values()];
        return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    };
    return <div className={`tmm-space${moving ? ' is-dragging' : ''}`}>
        <div className="tmm-space-dust" aria-hidden="true" />
        <div className="tmm-space-viewport" ref={stageRef} tabIndex={0} role="group"
            aria-label={en ? '3D Spectra. Swipe to rotate, pinch to zoom. Arrow keys rotate, plus and minus zoom.' : '3D 스펙트라. 한 손가락으로 회전하고 두 손가락으로 확대하세요. 방향키로 회전, 더하기와 빼기로 확대·축소할 수 있어요.'}
            onKeyDown={(event) => {
                const controls = { ArrowLeft: [0, -.15, 0], ArrowRight: [0, .15, 0], ArrowUp: [0, 0, -.15], ArrowDown: [0, 0, .15], '+': [.1], '=': [.1], '-': [-.1] };
                if (controls[event.key]) { event.preventDefault(); adjust(...controls[event.key]); }
            }}
            onPointerDown={(event) => {
                if (event.pointerType === 'mouse' && event.button !== 0) return;
                stop();
                if (!pointers.current.size) moved.current = false;
                pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY });
                if (pointers.current.size > 1) moved.current = true;
                lastMove.current = performance.now();
            }}
            onPointerMove={(event) => {
                const d = pointers.current.get(event.pointerId);
                if (!d) return;
                const oldDistance = distance();
                const dx = event.clientX - d.x, dy = event.clientY - d.y;
                d.x = event.clientX; d.y = event.clientY;
                if (!moved.current && Math.hypot(d.x - d.startX, d.y - d.startY) < 5) return;
                if (!moved.current) moved.current = true;
                setMoving(true);
                event.currentTarget.setPointerCapture(event.pointerId);
                const now = performance.now();
                const dt = Math.max(8, now - lastMove.current);
                lastMove.current = now;
                if (pointers.current.size > 1) {
                    const nextDistance = distance();
                    if (oldDistance > 5) camera.current.zoom = clampZoom(camera.current.zoom * nextDistance / oldDistance);
                    velocity.current = { yaw: 0, pitch: 0 };
                } else {
                    camera.current.yaw += dx * .009;
                    camera.current.pitch -= dy * .009;
                    velocity.current = { yaw: Math.max(-.015, Math.min(.015, dx * .009 / dt)), pitch: Math.max(-.015, Math.min(.015, -dy * .009 / dt)) };
                }
                queuePaint();
            }} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={(event) => { if (event.target === event.currentTarget && !event.currentTarget.hasPointerCapture(event.pointerId)) finish(event); }}
            onPointerLeave={(event) => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) finish(event); }}
            onClickCapture={(event) => { if (moved.current && event.detail !== 0) { event.preventDefault(); event.stopPropagation(); } }}>
            <div className="tmm-space-world" data-yaw={view.yaw} data-pitch={view.pitch} data-zoom={view.zoom}>
                <div className="tmm-space-present" style={{ opacity: 1 - comparison / 100 }}>
                    <LivingConstellationAvatar
                        avatar={current}
                        reaction={projectedReaction}
                        lang={lang}
                        showReceiver={false}
                        fixedFrame
                        spatial
                        onSelect={comparison < 50 ? onSelect : undefined}
                        activeGenre={tourCameraTarget?.targetGenre}
                    />
                </div>
                {past && <div className="tmm-space-past" style={{ opacity: comparison / 100, pointerEvents: 'none' }} aria-hidden="true">
                    <LivingConstellationAvatar
                        avatar={past}
                        lang={lang}
                        showReceiver={false}
                        fixedFrame
                        spatial
                        activeGenre={tourCameraTarget?.targetGenre}
                    />
                </div>}
            </div>
        </div>
        <div className="tmm-space-controls">
            <button type="button" aria-label={en ? 'Zoom out' : '축소'} onClick={() => adjust(-.15)}>−</button>
            <button type="button" onClick={() => { stop(); camera.current = { ...DEFAULT_CAMERA }; paint(); }}>{en ? 'Recenter' : '중심으로'}</button>
            <button type="button" aria-label={en ? 'Zoom in' : '확대'} onClick={() => adjust(.15)}>+</button>
        </div>
        <p className="tmm-space-hint">{en ? 'Swipe to rotate · Pinch to zoom · Tap a light' : '스와이프로 회전 · 두 손가락으로 확대 · 빛을 눌러 곡 보기'}</p>
    </div>;
}
