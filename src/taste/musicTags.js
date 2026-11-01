// Product taxonomy: explicit aliases and conservative genre relations, not an
// audio classifier. Unknown community tags stay available for later review.
export const MUSIC_TAG_VERSION = 1;

const aliases = new Map(Object.entries({
    'hip-hop': 'hip hop', hiphop: 'hip hop', 'hip hop music': 'hip hop',
    rnb: 'r&b', 'r n b': 'r&b', 'r & b': 'r&b', 'r and b': 'r&b',
    'rhythm and blues': 'r&b', 'rhythm & blues': 'r&b',
    dnb: 'drum and bass', 'd&b': 'drum and bass', 'drum & bass': 'drum and bass', 'drum&bass': 'drum and bass',
    "drum 'n' bass": 'drum and bass', 'drum n bass': 'drum and bass',
    lofi: 'lo-fi', 'lo fi': 'lo-fi', kpop: 'k-pop', 'k pop': 'k-pop',
    jpop: 'j-pop', 'j pop': 'j-pop', 'alt rock': 'alternative rock',
    'indie-rock': 'indie rock', 'indie-pop': 'indie pop', 'dream-pop': 'dream pop',
    'bedroom-pop': 'bedroom pop', 'synth-pop': 'synthpop', 'synth pop': 'synthpop',
    'electro-pop': 'electropop', 'electro pop': 'electropop',
    indiepop: 'indie pop', bedroompop: 'bedroom pop', dreampop: 'dream pop',
    'alt-pop': 'alternative pop', 'alt pop': 'alternative pop',
    postrock: 'post-rock', postpunk: 'post-punk',
    'post rock': 'post-rock', 'post punk': 'post-punk', 'trip-hop': 'trip hop',
    'neo-soul': 'neo soul', 'bossa-nova': 'bossa nova', 'nu-disco': 'nu disco',
    'deep-house': 'deep house', 'tech-house': 'tech house',
}));

export function canonicalMusicTag(value) {
    if (typeof value !== 'string') return '';
    const key = value.normalize('NFKC').toLowerCase().trim()
        .replace(/[‐‑‒–—−]/g, '-').replace(/[’‘]/g, "'").replace(/\s+/g, ' ');
    const canonical = aliases.get(key) || key;
    return canonical.replace(/\bhip[- ]?hop\b/g, 'hip hop')
        .replace(/\blo[ -]?fi\b/g, 'lo-fi')
        .replace(/\br\s*(?:&|and|\/)\s*b\b/g, 'r&b')
        .replace(/\bdrum\s*(?:&|and|'n'|n)\s*bass\b/g, 'drum and bass')
        .replace(/\brnb\b/g, 'r&b').replace(/\b(?:dnb|d&b)\b/g, 'drum and bass');
}

const moods = new Set(('happy|sad|melancholic|melancholy|chill|chillout|relaxing|relax|mellow|calm|energetic|upbeat|dark|dreamy|aggressive|angry|romantic|sexy|party|peaceful|uplifting|nostalgic|emotional|moody|feel good|summer|sentimental|atmospheric|beautiful|soothing|epic').split('|'));
const styles = new Set(['acoustic', 'instrumental', 'vocal', 'vocals', 'piano', 'guitar', 'female vocals', 'male vocals']);
const contexts = new Set(('favorites|favourites|favorite|favourite|love|loved|seen live|female vocalists|male vocalists|female vocalist|male vocalist|singer|american|british|korean|japanese|french|german|canadian|taiwanese|korea|japan|english|korean language|spotify|last.fm|music').split('|'));
const standaloneGenres = new Set(('indie|alternative|electronic|electronica|edm|idm|ebm|electro|experimental|avant-garde|ambient|downtempo|chillout|chillwave|vaporwave|synthwave|retrowave|synthpop|electropop|hyperpop|artpop|citypop|sophisti-pop|shoegaze|grunge|emo|screamo|hardcore|post-hardcore|metalcore|deathcore|grindcore|ska|reggae|dub|dancehall|reggaeton|reggaetón|soca|afrobeat|afrobeats|highlife|amapiano|bossa nova|samba|salsa|tango|flamenco|fado|bhangra|klezmer|qawwali|gamelan|skweee|bluegrass|americana|singer-songwriter|chanson|new age|drone|breakbeat|breaks|jungle|dubstep|brostep|garage|ukg|2-step|future bass|bass music|grime|trap|rap|boom bap|phonk|g-funk|r&b|drum and bass|lo-fi|soundtrack|score|cinematic|orchestral|opera|baroque|romantic classical|classical piano|minimalism|world|world music|gospel|spiritual|ballad|trot|comedy|spoken word|a cappella|acapella').split('|'));
const genreEnding = /(?:^|[\s-])(?:pop|rock|metal|punk|jazz|blues|soul|funk|disco|house|techno|trance|folk|country|classical|indie|ambient|electronic|electronica|rap|hip hop|r&b|drum and bass|garage|dubstep|reggae|soundtrack|swing|bossa nova|shoegaze|afrobeats|afrobeat|dancehall)$/;
const contextPattern = /^(?:i (?:love|like)|my |best |favorite |favourite |seen |music for |songs? for |albums? of |\d+ stars?\b)|\b(?:to check out|to listen|seen live)\b/;

export function classifyMusicTags(values = [], { exclude = [] } = {}) {
    const rawTags = [...new Set((Array.isArray(values) ? values : []).filter(value => typeof value === 'string' && value.trim()))];
    const result = { rawTags, genres: [], moodTags: [], eraTags: [], styleTags: [], contextTags: [], otherTags: [] };
    const blocked = new Set(exclude.map(canonicalMusicTag).filter(Boolean));
    const normalized = rawTags.flatMap(value => {
        const tag = canonicalMusicTag(value);
        const parts = tag.split(/\s*\/\s*/).map(canonicalMusicTag);
        return parts.length > 1 && parts.every(part => standaloneGenres.has(part) || genreEnding.test(part)) ? parts : [tag];
    });
    for (const tag of new Set(normalized)) {
        // A song/artist called "Jazz" must not erase a legitimate Jazz tag.
        if (blocked.has(tag) && !standaloneGenres.has(tag) && !genreEnding.test(tag)) { result.contextTags.push(tag); continue; }
        const era = tag.match(/^(?:(\d{4})|['’]?(\d{2}))'?s$/);
        if (era) {
            const year = era[1] || `${Number(era[2]) >= 30 ? '19' : '20'}${era[2]}`;
            result.eraTags.push(`${year}s`); continue;
        }
        if (contexts.has(tag) || contextPattern.test(tag)) { result.contextTags.push(tag); continue; }
        if (styles.has(tag)) { result.styleTags.push(tag); continue; }
        const isMood = moods.has(tag);
        if (isMood) result.moodTags.push(tag);
        if (standaloneGenres.has(tag) || genreEnding.test(tag)) result.genres.push(tag);
        else if (!isMood) result.otherTags.push(tag);
    }
    for (const key of Object.keys(result)) result[key] = [...new Set(result[key])];
    return result;
}

export function trackGenreTags(track) {
    return classifyMusicTags(track?.genres, { exclude: [track?.artists, track?.artist, track?.name, track?.title] }).genres;
}

// Parent signals connect nearby subgenres without replacing their own labels.
// These are intentionally weak relationships and never added to stored genres.
export function genreParents(value) {
    const tag = canonicalMusicTag(value);
    if (tag !== 'house' && /(?:^| )house$/.test(tag)) return ['house', 'electronic'];
    if (tag !== 'techno' && /(?:^| )techno$/.test(tag)) return ['techno', 'electronic'];
    if (tag !== 'drum and bass' && /(?:^| )drum and bass$/.test(tag)) return ['drum and bass', 'electronic'];
    if (/^(?:house|techno|trance|drum and bass|dubstep|garage|ukg|2-step|ambient|drone|downtempo|chillwave|chillout|vaporwave|synthwave|electronica|idm|edm|electro|breakbeat|jungle)$/.test(tag)) return ['electronic'];
    if (tag !== 'rock' && /(?:^|[\s-])rock$/.test(tag)) return ['rock'];
    if (tag !== 'metal' && /(?:^|[\s-])metal$/.test(tag)) return ['metal', 'rock'];
    if (tag !== 'punk' && /(?:^|[\s-])punk$/.test(tag)) return ['punk', 'rock'];
    if (['metal', 'punk', 'shoegaze', 'grunge', 'emo', 'post-hardcore', 'metalcore', 'hardcore'].includes(tag)) return ['rock'];
    if ((tag !== 'pop' && /(?:^|[\s-])pop$/.test(tag)) || ['synthpop', 'electropop', 'hyperpop'].includes(tag)) return ['pop'];
    if (tag !== 'jazz' && /(?:^| )jazz$/.test(tag)) return ['jazz'];
    if (tag !== 'soul' && /(?:^|[\s-])soul$/.test(tag)) return ['soul'];
    if (tag !== 'r&b' && /(?:^| )r&b$/.test(tag)) return ['r&b'];
    if ((tag !== 'hip hop' && /(?:^| )hip hop$/.test(tag)) || ['rap', 'boom bap', 'trap', 'grime'].includes(tag)) return ['hip hop'];
    if ((tag !== 'folk' && /(?:^| )folk$/.test(tag)) || ['singer-songwriter', 'bluegrass', 'americana'].includes(tag)) return ['folk'];
    if (['baroque', 'orchestral', 'opera', 'romantic classical'].includes(tag)) return ['classical'];
    if (['score', 'cinematic'].includes(tag)) return ['soundtrack'];
    return [];
}

// Exact and longest suffix matches prevent "rock" from shadowing "indie rock"
// and keep mood words such as "happy" from matching "unhappy".
export function findMusicTagScore(value, entries) {
    const tag = canonicalMusicTag(value);
    const exact = entries.find(([key]) => canonicalMusicTag(key) === tag);
    if (exact) return exact[1];
    if (!genreEnding.test(tag)) return null;
    return entries.filter(([key]) => tag.endsWith(` ${canonicalMusicTag(key)}`))
        .sort((a, b) => b[0].length - a[0].length || a[0].localeCompare(b[0]))[0]?.[1] || null;
}
