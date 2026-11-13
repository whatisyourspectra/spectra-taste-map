export const DEMO_INVITE_DELAY_MS = 45_000;

// The exhibition computer may use localhost. Its QR must still open on a
// visitor's phone; use the public app unless a rehearsal origin is configured.
export function demoInviteUrl(lang = 'ko', publicOrigin = '') {
    let origin = 'https://www.spectra-music.org';
    try {
        const configured = new URL(publicOrigin);
        if (['https:', 'http:'].includes(configured.protocol) && !configured.username && !configured.password) origin = configured.origin;
    } catch { /* The public site is the default. */ }
    const url = new URL('/', origin);
    url.searchParams.set('lang', lang === 'en' ? 'en' : 'ko');
    url.hash = 'import';
    return url.href;
}
