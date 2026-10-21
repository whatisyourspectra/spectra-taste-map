import { normalizeGenre, titleizeGenre } from './genreIdentity.js';
import { deduplicateTracks } from '../utils/trackIdentity.js';

/**
 * @typedef {{genre: string, strength: number}} GenreSignal
 * @typedef {{coreGenres: GenreSignal[], emergingGenres: GenreSignal[],
 * averageEnergy: number, averageValence: number, diversity: number,
 * explorationTargets: GenreSignal[]}} TasteState
 *
 * Strengths and dimensions are in [0, 1]. These are library/tag signals, not
 * measured listening frequency. Dates are optional; missing dates imply no trend.
 */
export function getTasteGenres(track) {
    return [...new Set((Array.isArray(track?.genres) ? track.genres : [])
        .filter((genre) => typeof genre === 'string').map(normalizeGenre).filter(Boolean))];
}

export function uniqueTracks(tracks = []) {
    return deduplicateTracks(tracks.filter((track) => track?.id && track?.name));
}

export function latestDecisions(decisions = []) {
    return [...new Map(decisions.filter((item) => item?.track?.id
        && ['absorb', 'dig', 'pop'].includes(item.action))
        .map((item) => [String(item.track.id), item])).values()];
}

const clamp = (value) => Math.max(0, Math.min(1, value));
const sortSignals = (signals) => signals.sort((a, b) => b.strength - a.strength || a.genre.localeCompare(b.genre));

function genreMass(tracks) {
    const counts = new Map();
    for (const track of tracks) {
        const genres = getTasteGenres(track);
        // A heavily tagged track has the same total influence as any other track.
        for (const genre of genres) counts.set(genre, (counts.get(genre) || 0) + 1 / genres.length);
    }
    return counts;
}

function average(tracks, key) {
    const values = tracks.map((track) => track[key])
        .filter((value) => typeof value === 'number' && Number.isFinite(value));
    return values.length ? values.reduce((sum, value) => sum + clamp(value), 0) / values.length : 0.5;
}

/** Pure derivation. Pass an explicit `now` to enable the 30-day emerging window. */
export function buildTasteState(tracks = [], { decisions = [], now = null } = {}) {
    const library = uniqueTracks(tracks);
    const choices = latestDecisions(decisions);
    const absorbed = choices.filter((item) => item.action === 'absorb').map((item) => item.track);
    const integrated = uniqueTracks([...library, ...absorbed]);
    const baseline = genreMass(library);
    const total = genreMass(integrated);
    const emerging = new Map();
    const windowStart = Number(now) - 30 * 86400000;
    const dated = library.map((track) => ({ track, time: Date.parse(track.addedAt || track.playedAt || '') }))
        .filter(({ time }) => Number.isFinite(time) && time <= Number(now));
    const historical = dated.filter(({ time }) => time < windowStart);
    // Avoid claiming an import of only recent dates is evidence of a new taste.
    if (now != null && historical.length >= 3) {
        const oldGenres = genreMass(historical.map(({ track }) => track));
        const recent = genreMass(dated.filter(({ time }) => time >= windowStart).map(({ track }) => track));
        for (const [genre, mass] of recent) {
            if (!oldGenres.has(genre)) emerging.set(genre, mass / (mass + 3));
        }
    }
    const libraryIds = new Set(library.map((track) => track.id));
    const newMass = genreMass(absorbed.filter((track) => !libraryIds.has(track.id)));
    for (const [genre, mass] of newMass) {
        if (!baseline.has(genre)) emerging.set(genre, mass / (mass + 3));
    }
    const totalMass = [...total.values()].reduce((sum, mass) => sum + mass, 0);
    const coreGenres = sortSignals([...total].filter(([genre]) => !emerging.has(genre)
        || emerging.get(genre) >= 0.55).map(([genre, mass]) => ({ genre, strength: mass / totalMass })));
    const emergingGenres = sortSignals([...emerging].filter(([, strength]) => strength < 0.55)
        .map(([genre, strength]) => ({ genre, strength })));
    const exploration = genreMass(choices.filter((item) => item.action === 'dig').map((item) => item.track));
    const explorationTargets = sortSignals([...exploration]
        .map(([genre, mass]) => ({ genre, strength: mass / (mass + 2) })));
    const entropy = [...total.values()].reduce((sum, mass) => {
        const p = mass / totalMass;
        return sum - p * Math.log(p);
    }, 0);
    return {
        coreGenres,
        emergingGenres,
        averageEnergy: average(integrated, 'energy'),
        averageValence: average(integrated, 'valence'),
        diversity: totalMass ? clamp(entropy / Math.log(8)) : 0,
        explorationTargets,
    };
}

export function describeTasteState(state, lang = 'ko') {
    const emerging = state.emergingGenres[0];
    const exploring = state.explorationTargets[0];
    const core = state.coreGenres[0];
    if (emerging) {
        const genre = titleizeGenre(emerging.genre);
        return lang === 'en' ? `${genre} is becoming part of your Spectra.` : `${genre}, 당신의 스펙트라에 조금씩 스며들고 있어요.`;
    }
    if (exploring) {
        const genre = titleizeGenre(exploring.genre);
        return lang === 'en' ? `A new orbit is opening toward ${genre}.` : `${genre} 쪽으로 새로운 궤도가 열리고 있어요.`;
    }
    if (core) {
        const genre = titleizeGenre(core.genre);
        return lang === 'en' ? `Your Spectra gathers around ${genre}.` : `당신의 스펙트라는 ${genre}를 중심으로 모여 있어요.`;
    }
    return lang === 'en' ? 'Your music is finding its own shape.' : '당신의 음악이 하나의 형태를 만들어가고 있어요.';
}
