import { getTasteGenres, uniqueTracks } from './buildTasteState.js';
import { getGenreIdentity, titleizeGenre } from './genreIdentity.js';
import { hash01 } from './constellationTopology.js';
import { importTrackKey } from '../utils/parseTrackList.js';

const bounded = value => Math.max(0, Math.min(1, value));

/** A genre layout, not a claim of measured listening frequency or acoustic distance. */
export function buildMobileMapModel(library = [], recommendations = []) {
    const songs = uniqueTracks(library);
    const counts = new Map();
    for (const track of songs) for (const genre of getTasteGenres(track)) counts.set(genre, (counts.get(genre) || 0) + 1);
    const genres = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 6).map(([key, count]) => ({ key, count, label: titleizeGenre(key), color: `rgb(${getGenreIdentity(key).tone.rgb})` }));
    const layoutGenres = [...genres].sort((a, b) => a.key.localeCompare(b.key));
    const anchors = new Map(layoutGenres.map((genre, index) => {
        const angle = index / Math.max(3, genres.length) * Math.PI * 2 - Math.PI / 2;
        return [genre.key, { x: .5 + Math.cos(angle) * .3, y: .5 + Math.sin(angle) * .3 }];
    }));
    const normalize = (track, recommended = false) => {
        const tags = getTasteGenres(track);
        const primary = layoutGenres.find(genre => tags.includes(genre.key));
        const anchor = anchors.get(primary?.key) || { x: .5, y: .5 };
        const identity = importTrackKey(track);
        const angle = hash01(`${identity}:angle`) * Math.PI * 2;
        const radius = .045 + Math.sqrt(hash01(`${identity}:radius`)) * .13;
        // Missing metadata remains visible, with deterministic positions and an explicit pending state.
        const validFeatures = !track.metadataPending && Number.isFinite(track.valence) && Number.isFinite(track.energy);
        return { ...track,
            x: bounded(anchor.x + Math.cos(angle) * radius + (validFeatures ? (bounded(track.valence) - .5) * .08 : 0)),
            y: bounded(anchor.y + Math.sin(angle) * radius + (validFeatures ? (bounded(track.energy) - .5) * .08 : 0)),
            mapColor: primary?.color || '#a3b4d4',
            mapGroup: primary?.label || (track.metadataPending ? '분석 중인 곡' : '더 알아가는 음악'),
            mapRecommended: recommended,
        };
    };
    const knownIds = new Set(songs.map(track => track.id));
    const knownSongs = new Set(songs.map(importTrackKey));
    const seen = new Set();
    const discovered = uniqueTracks(recommendations).filter(track => {
        const key = importTrackKey(track);
        if (knownIds.has(track.id) || knownSongs.has(key) || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    return { genres, library: songs.map(track => normalize(track)), recommendations: discovered.map(track => normalize(track, true)) };
}

export function mobileDiscoveryQuery(track, featuresSource = 'lastfm') {
    if (!track?.name || !track?.artists) return '';
    const params = new URLSearchParams({
        xAxis: 'valence', yAxis: 'energy',
        targetX: String(Number.isFinite(track.valence) ? bounded(track.valence) : .5),
        targetY: String(Number.isFinite(track.energy) ? bounded(track.energy) : .5),
        seedGenres: getTasteGenres(track).slice(0, 3).join(','),
        seedTracks: `${track.artists}|${track.name}`,
        source: featuresSource === 'spotify' ? 'spotify' : 'lastfm',
        limit: '12',
    });
    return params.toString();
}
