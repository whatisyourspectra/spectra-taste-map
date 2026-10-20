// Read-only routing diagnostic. No account login, session exchange, or admin key.
import { config } from 'dotenv';
config({ quiet: true });

const production = 'https://www.spectra-music.org';
const authOrigin = new URL(process.env.VITE_SUPABASE_URL || 'https://owobetyvadebgzadtxgw.supabase.co').origin;
const entry = new URL('/auth/v1/callback', authOrigin);
entry.search = new URLSearchParams({ error: 'access_denied', error_description: 'redirect_diagnostic' });

const hops = [];
let current = entry;
let fallbackOrigin;
for (let index = 0; index < 6; index++) {
    const response = await fetch(current, { redirect: 'manual', signal: AbortSignal.timeout(12000) });
    // Report only host/path: OAuth state, tokens, and error text never reach logs.
    hops.push({ status: response.status, url: current.origin + current.pathname });
    const location = response.headers.get('location');
    await response.body?.cancel();
    if (!location || ![301, 302, 303, 307, 308].includes(response.status)) break;
    current = new URL(location, current);
    if (index === 0) fallbackOrigin = current.origin;
    // External deployment protection is diagnosed without loading its login form.
    if (current.hostname === 'vercel.com') {
        hops.push({ url: current.origin + current.pathname, deploymentProtection: true });
        break;
    }
    if (![new URL(production).hostname, 'spectra-music.org'].includes(current.hostname)
        && !current.hostname.endsWith('.vercel.app')) break;
}

const ready = fallbackOrigin === production;
console.log(JSON.stringify({ expectedFallback: production, observedFallback: fallbackOrigin || null, productionFallbackConfigured: ready, hops }, null, 2));
process.exitCode = ready ? 0 : 1;
