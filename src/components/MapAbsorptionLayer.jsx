import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './MapAbsorptionLayer.css';

function AbsorbingTrack({ flight, containerRef, onComplete }) {
    const spriteRef = useRef(null);

    useEffect(() => {
        const sprite = spriteRef.current;
        const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
        let frame, travellingAt = null, disposed = false, targetNode = null;
        const startedAt = performance.now();
        const finish = () => {
            if (disposed) return;
            disposed = true;
            cancelAnimationFrame(frame);
            onComplete(flight.token);
        };
        const visibility = () => { if (document.hidden) finish(); };
        document.addEventListener('visibilitychange', visibility);

        const tick = now => {
            if (disposed) return;
            if (!sprite || !containerRef.current || motion.matches) { finish(); return; }
            if (!targetNode?.isConnected) {
                const node = [...containerRef.current.querySelectorAll('[data-bubble-id]')]
                    .find(element => element.dataset.bubbleId === String(flight.track.id));
                targetNode = node?.querySelector('.tm-bubble');
            }
            const target = targetNode?.getBoundingClientRect();
            if (!target?.width || now - startedAt < 110) {
                // Layout runs in a worker. Keep the pressed source in place
                // until the actual saved node is ready; never delay persistence.
                if (now - startedAt > 1200) { finish(); return; }
                frame = requestAnimationFrame(tick);
                return;
            }
            const x = target.left + target.width / 2, y = target.top + target.height / 2;
            if (x < 0 || x > innerWidth || y < 0 || y > innerHeight) { finish(); return; }
            travellingAt ??= now;
            const t = Math.min(1, (now - travellingAt) / 660);
            // A damped spring gives a soft overshoot. Re-read the destination
            // each frame so panning, zooming and floating bubbles stay connected.
            const spring = 1 - Math.exp(-7.5 * t) * Math.cos(10 * t);
            const dx = x - flight.origin.x, dy = y - flight.origin.y;
            const distance = Math.hypot(dx, dy) || 1;
            const arc = Math.sin(Math.PI * t) * Math.min(48, distance * .15);
            const px = flight.origin.x + dx * spring - dy / distance * arc;
            const py = flight.origin.y + dy * spring + dx / distance * arc;
            const scale = 1 + (target.width / flight.origin.size - 1) * Math.min(1.1, spring);
            const stretch = Math.sin(Math.PI * t) * .12;
            sprite.style.transform = `translate3d(${px}px, ${py}px, 0) translate(-50%, -50%) scale(${scale * (1 + stretch)}, ${scale * (1 - stretch * .6)})`;
            sprite.dataset.phase = t > .72 ? 'landing' : 'flying';
            if (t === 1) finish();
            else frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => {
            disposed = true;
            cancelAnimationFrame(frame);
            document.removeEventListener('visibilitychange', visibility);
        };
    }, [flight, containerRef, onComplete]);

    return <div ref={spriteRef} className="tm-absorption-sprite" data-absorption-id={flight.track.id} data-phase="pressing"
        style={{ width: flight.origin.size, height: flight.origin.size,
            transform: `translate3d(${flight.origin.x}px, ${flight.origin.y}px, 0) translate(-50%, -50%)` }}>
        <div className="tm-absorption-art" style={{ backgroundImage: flight.track.coverUrl ? `url(${flight.track.coverUrl})` : undefined }} />
        <span className="tm-absorption-confirm"><svg viewBox="0 0 16 16" fill="none"><path d="m4 8 3 3 5-6" /></svg></span>
    </div>;
}

export default function MapAbsorptionLayer({ flights, containerRef, onComplete }) {
    if (!flights.length) return null;
    // Share the canvas stacking context: a travelling song can pass behind
    // menus and headers, rather than floating over unrelated interface panels.
    const canvas = flights[0].canvas;
    return createPortal(<div className="tm-absorption-layer" aria-hidden="true">
        {flights.map(flight => <AbsorbingTrack key={flight.token} flight={flight} containerRef={containerRef} onComplete={onComplete} />)}
    </div>, canvas || document.body);
}
