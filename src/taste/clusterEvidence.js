import { titleizeGenre } from './genreIdentity.js';
import { deduplicateTracks } from '../utils/trackIdentity.js';
import { trackGenreTags } from './musicTags.js';

export function clusterGenreName(genres = []) {
    return trackGenreTags({ genres }).slice(0, 2).map(titleizeGenre).join(' · ') || 'Mixed / Other';
}

export function rankClusterGenres(members = []) {
    const counts = new Map();
    for (const track of members) {
        for (const genre of trackGenreTags(track)) counts.set(genre, (counts.get(genre) || 0) + 1);
    }
    return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export function representativeClusterGenres(members = []) {
    // A popular tag is not necessarily representative of the whole region.
    // Keep minority tags in the evidence, but don't name everyone after them.
    const scenePrefix = /^(?:taiwanese|chinese|japanese|korean|american|british|french|german|canadian|swedish|australian|hong kong|taiwan|japan|china)\b/;
    return rankClusterGenres(members).filter(([genre, count]) =>
        count / members.length >= (scenePrefix.test(genre) ? 1 : 0.6))
        .slice(0, 2).map(([genre]) => genre);
}

export function getClusterEvidence(cluster, source = 'lastfm') {
    const members = deduplicateTracks(cluster?.members || []);
    const genres = rankClusterGenres(members).slice(0, 4)
        .map(([genre, count]) => ({ genre, label: titleizeGenre(genre), count }));
    return { genres, count: members.length || cluster?.count || 0,
        // Cluster members are ordered by their distance to the cluster centre.
        examples: members.slice(0, 3), source,
        nickname: cluster?.label?.nickname || '',
    };
}
