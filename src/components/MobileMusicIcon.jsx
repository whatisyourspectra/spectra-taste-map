const paths = {
    play: <path d="m9 5 10 7-10 7Z" />,
    external: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M10 5H5a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-5" /></>,
    heart: <path d="m12 20-8-7.6a5 5 0 0 1 7-7L12 6.5l1-1.1a5 5 0 0 1 7 7Z" />,
    check: <path d="m5 12 4 4L19 6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
    next: <path d="m9 5 7 7-7 7" />,
    previous: <path d="m15 5-7 7 7 7" />,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6 7a7 7 0 0 1 11-1l3 3M4 15l3 3a7 7 0 0 0 11-1" /></>,
    discover: <path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4Z" />,
    map: <><path d="m9 4-6 3v13l6-3 6 3 6-3V4l-6 3-6-3Z" /><path d="M9 4v13m6-10v13" /></>,
    compass: <><circle cx="12" cy="12" r="9" /><path className="mtm-icon-accent" d="m16 8-2.4 5.6L8 16l2.4-5.6L16 8Z" /></>,
    today: <><circle className="mtm-icon-accent" cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4m0-14.2-1.4 1.4M6.3 17.7l-1.4 1.4" /></>,
};

export default function MobileMusicIcon({ name, className = '' }) {
    return <svg className={`mtm-icon ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">{paths[name]}</svg>;
}
