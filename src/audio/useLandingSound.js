import { useCallback, useEffect, useRef, useState } from 'react';
import { createLandingSound } from './landingSound';

export default function useLandingSound() {
    const engineRef = useRef(null);
    const enabledRef = useRef(false);
    const [enabled, setEnabled] = useState(false);
    const [unavailable, setUnavailable] = useState(false);

    const handleFailure = useCallback(() => {
        enabledRef.current = false;
        engineRef.current?.disable();
        setEnabled(false);
        setUnavailable(true);
    }, []);

    const play = useCallback((cue) => {
        if (!enabledRef.current || document.hidden) return;
        void engineRef.current?.play(cue).catch(handleFailure);
    }, [handleFailure]);

    const toggle = useCallback(() => {
        if (enabledRef.current) {
            enabledRef.current = false;
            engineRef.current?.disable();
            setEnabled(false);
            return;
        }
        try {
            const Context = window.AudioContext || window.webkitAudioContext;
            if (!Context) { setUnavailable(true); return; }
            engineRef.current ||= createLandingSound(Context);
            enabledRef.current = true;
            setEnabled(true);
            setUnavailable(false);
            void engineRef.current.enable().catch(handleFailure);
        } catch { handleFailure(); }
    }, [handleFailure]);

    useEffect(() => {
        const pause = () => {
            if (document.hidden) engineRef.current?.pause();
            else if (enabledRef.current) void engineRef.current?.resume().catch(handleFailure);
        };
        document.addEventListener('visibilitychange', pause);
        return () => {
            document.removeEventListener('visibilitychange', pause);
            engineRef.current?.dispose();
            engineRef.current = null;
            enabledRef.current = false;
        };
    }, [handleFailure]);

    const handleClick = useCallback((event) => {
        const button = event.target.closest?.('button, a');
        if (!button || button.disabled || button.hasAttribute('data-sound-toggle')) return;
        // The pulse button emits its cue through the canvas pulse callback.
        if (button.dataset.sound === 'pulse') return;
        play(button.dataset.sound || 'tap');
    }, [play]);

    return { enabled, unavailable, toggle, play, handleClick };
}
