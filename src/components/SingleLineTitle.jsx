import { useLayoutEffect, useRef } from 'react';

export default function SingleLineTitle({ children, className }) {
    const ref = useRef(null);
    useLayoutEffect(() => {
        const element = ref.current;
        const context = document.createElement('canvas').getContext('2d');
        if (!context) return;
        let active = true;
        const fit = () => {
            if (!active || !element.clientWidth) return;
            const style = getComputedStyle(element);
            context.font = `${style.fontWeight} 18px ${style.fontFamily}`;
            const width = context.measureText(children).width;
            element.style.fontSize = `${Math.min(18, 18 * (element.clientWidth - 2) / Math.max(1, width))}px`;
        };
        const observer = new ResizeObserver(fit);
        observer.observe(element);
        fit();
        document.fonts.ready.then(fit);
        document.fonts.addEventListener('loadingdone', fit);
        return () => { active = false; observer.disconnect(); document.fonts.removeEventListener('loadingdone', fit); };
    }, [children]);
    return <h3 ref={ref} className={className}>{children}</h3>;
}
