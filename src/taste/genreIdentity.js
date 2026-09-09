export function normalizeGenre(genre) {
    return String(genre || '').trim().toLowerCase();
}

const GENRE_FAMILY_TONES = {
    house: { rgb: '116, 154, 255', text: '#e4eeff' },
    disco: { rgb: '255, 163, 112', text: '#ffe8d8' },
    bass: { rgb: '115, 223, 235', text: '#dbfcff' },
    ambient: { rgb: '158, 181, 255', text: '#e7efff' },
    pop: { rgb: '232, 137, 204', text: '#ffe6f7' },
    indie: { rgb: '155, 197, 255', text: '#e5f3ff' },
    rock: { rgb: '144, 167, 232', text: '#e8efff' },
    soul: { rgb: '255, 201, 112', text: '#fff0d3' },
    global: { rgb: '168, 214, 255', text: '#eaf7ff' },
    cinematic: { rgb: '188, 174, 255', text: '#f0ebff' },
    alt: { rgb: '167, 198, 255', text: '#eaf3ff' },
    default: { rgb: '182, 206, 248', text: '#edf5ff' },
};

const GENRE_IDENTITY_RULES = [
    { test: /(lo[\s-]?fi\s+house)/i, short: 'Velvet Lo-Fi House', family: 'house' },
    { test: /(french\s+house)/i, short: 'Chrome French House', family: 'house' },
    { test: /(nu\s*disco)/i, short: 'Neon Nu Disco', family: 'disco' },
    { test: /(disco\s+house)/i, short: 'Solar Disco House', family: 'disco' },
    { test: /(stutter\s+house)/i, short: 'Stutter House', family: 'house' },
    { test: /(tech\s*house)/i, short: 'Pulse Tech House', family: 'house' },
    { test: /(\bhouse\b)/i, short: 'Pulse House', family: 'house' },
    { test: /(drum\s*(?:and|&)\s*bass|dnb|drum[\s-]?n[\s-]?bass)/i, short: 'Aero Drum & Bass', family: 'bass' },
    { test: /(garage)/i, short: 'Night Garage', family: 'bass' },
    { test: /(techno)/i, short: 'Neon Techno', family: 'bass' },
    { test: /(ambient|chillwave|downtempo)/i, short: 'Cloud Ambient', family: 'ambient' },
    { test: /(dream\s*pop)/i, short: 'Halo Dream Pop', family: 'pop' },
    { test: /(hyperpop)/i, short: 'Hyperpop Flux', family: 'pop' },
    { test: /(k[\s-]?pop)/i, short: 'K-Pop Prism', family: 'pop' },
    { test: /(\bpop\b)/i, short: 'Prism Pop', family: 'pop' },
    { test: /(bedroom\s*pop)/i, short: 'Bedroom Pop', family: 'indie' },
    { test: /(taiwanese\s+indie|indie)/i, short: 'Indie Haze', family: 'indie' },
    { test: /(rock)/i, short: 'Granite Rock', family: 'rock' },
    { test: /(r[\s&/]*b|soul|funk)/i, short: 'Velvet Soul', family: 'soul' },
    { test: /(jazz)/i, short: 'Noir Jazz', family: 'soul' },
    { test: /(soundtrack|score|cinematic)/i, short: 'Cinematic Score', family: 'cinematic' },
    { test: /(ballad)/i, short: 'Lumen Ballad', family: 'alt' },
    { test: /(electronic|idm|electronica)/i, short: 'Signal Electronic', family: 'alt' },
];

export function titleizeGenre(genre) {
    return String(genre || '')
        .split(/[\s-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

export function getGenreIdentity(genre) {
    const normalized = normalizeGenre(genre);
    if (!normalized) {
        return {
            key: '',
            short: 'Untitled Genre',
            display: 'Untitled Genre',
            family: 'default',
            tone: GENRE_FAMILY_TONES.default,
        };
    }
    const base = titleizeGenre(normalized);
    const matched = GENRE_IDENTITY_RULES.find((rule) => rule.test.test(normalized));
    const short = matched?.short || base;
    const family = matched?.family || 'default';
    return {
        key: normalized,
        short,
        display: short === base ? short : `${short} · ${base}`,
        family,
        tone: GENRE_FAMILY_TONES[family] || GENRE_FAMILY_TONES.default,
    };
}

