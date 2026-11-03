import { getTasteGenres, uniqueTracks } from './buildTasteState.js';
import { getGenreIdentity } from './genreIdentity.js';
import { partitionGenreTracks } from './genreClustering.js';
import { hash01 } from './constellationTopology.js';
import { importTrackKey } from '../utils/parseTrackList.js';

const bounded = value => Math.max(0, Math.min(1, value));

/** A genre layout, not a claim of measured listening frequency or acoustic distance. */
export function buildMobileMapModel(library = [], recommendations = []) {
    const songs = uniqueTracks(library);
    const partition = partitionGenreTracks(songs);
    const genres = partition.groups.map(group => ({ key: group.key, count: group.count, label: group.name, kind: group.kind,
        color: group.kind === 'unknown' ? '#a3b4d4' : `rgb(${getGenreIdentity(group.name).tone.rgb})` }));
    const groupById = new Map(songs.map((track, index) => [track.id, genres[partition.labels[index]]]));
    const layoutGenres = [...genres].sort((a, b) => a.key.localeCompare(b.key));
    const anchors = new Map(layoutGenres.map((genre, index) => {
        const angle = index / Math.max(3, genres.length) * Math.PI * 2 - Math.PI / 2;
        return [genre.key, { x: .5 + Math.cos(angle) * .3, y: .5 + Math.sin(angle) * .3 }];
    }));
    const normalize = (track, recommended = false) => {
        const tags = getTasteGenres(track);
        const primary = groupById.get(track.id) || layoutGenres.find(genre => tags.some(tag => genre.key.endsWith(`/${tag}`)));
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
            mapGroup: primary?.label || 'Genre Unknown',
            mapGenreKey: primary?.key || null,
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
