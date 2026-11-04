// Small vector marks keep the supported services legible at every screen size.
export default function MusicServiceIcon({ service }) {
    return <svg className={`music-service-icon music-service-icon--${service}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        {service === 'spotify' ? <>
            <circle cx="12" cy="12" r="11" fill="currentColor" />
            <path d="M6 9c4-1.2 8-1 12 1M7 12c3.5-1 6.5-.6 10 1M8 15c2.7-.6 5-.3 8 1" stroke="#08120d" strokeWidth="1.7" strokeLinecap="round" />
        </> : service === 'apple' ? <>
            <rect x="1" y="1" width="22" height="22" rx="6" fill="currentColor" />
            <path d="M10 16V7l8-1v9M10 10l8-1" stroke="white" strokeWidth="1.7" strokeLinejoin="round" />
            <ellipse cx="7.8" cy="16.6" rx="3" ry="2.2" fill="white" transform="rotate(-18 7.8 16.6)" />
            <ellipse cx="15.8" cy="15.6" rx="3" ry="2.2" fill="white" transform="rotate(-18 15.8 15.6)" />
        </> : <>
            <circle cx="12" cy="12" r="11" fill="currentColor" />
            <circle cx="12" cy="12" r="7.5" stroke="white" strokeWidth="1" />
            <path d="m10 8 6 4-6 4Z" fill="white" />
        </>}
    </svg>;
}
