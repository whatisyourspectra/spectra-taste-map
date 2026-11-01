import { titleizeGenre } from './genreIdentity.js';
import { deduplicateTracks } from '../utils/trackIdentity.js';
import { trackGenreTags } from './musicTags.js';

export function clusterGenreName(genres = []) {
    return trackGenreTags({ genres }).slice(0, 2).map(titleizeGenre).join(' · ') || 'Mixed / Other';
}

export function getClusterEvidence(cluster, source = 'lastfm') {
    const members = deduplicateTracks(cluster?.members || []);
    const counts = new Map();
    for (const track of members) {
        for (const genre of trackGenreTags(track)) {
            counts.set(genre, (counts.get(genre) || 0) + 1);
        }
    }
    const genres = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 4)
        .map(([genre, count]) => ({ genre, label: titleizeGenre(genre), count }));
    return { genres, count: members.length || cluster?.count || 0,
        // Cluster members are ordered by their distance to the cluster centre.
        examples: members.slice(0, 3), source,
        nickname: cluster?.label?.nickname || '',
    };
}
