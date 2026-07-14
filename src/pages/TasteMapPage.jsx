import React, { useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useTasteData } from '../context/TasteDataContext';
import TasteMapSubwayGenerator from './TasteMapSubwayGenerator';
import './TasteMapPage.css';

const API_BASE = import.meta?.env?.VITE_API_BASE || '';
const api = (path) => `${API_BASE}${path}`;
const TM_FETCH_CACHE_TTL_MS = 10 * 60 * 1000;
const TM_CLUSTER_CACHE_TTL_MS = 10 * 60 * 1000;
const TM_LIBRARY_CACHE_TTL_MS = 10 * 60 * 1000;
const TM_FETCH_CACHE_PREFIX = 'taste-map-fetch-v7';
const TM_CLUSTER_CACHE_PREFIX = 'taste-map-cluster-v3';
const TM_LIBRARY_CACHE_PREFIX = 'taste-map-library-v1';
const TM_LOCALE_STORAGE_KEY = 'spectra-tastemap-lang-v1';
const TM_THEME_STORAGE_KEY = 'spectra-tastemap-theme-v1';

const TM_I18N = {
    ko: {
        mappedSubtitle: 'Listening history, mapped in space.',
        explorerLabel: 'EXPLORER',
        explorerMeta: 'Last.fm taste signals · Spotify cover matching.',
        langKo: '한국어',
        langEn: 'English',
        analyzingTitle: '취향 분석 진행 중',
        analyzingStep1: '목록 불러오기',
        analyzingStep2: 'Last.fm 태그 · Spotify 커버 매칭',
        analyzingStep3: '내 취향 지도 생성',
        loginRequired: '먼저 곡 목록을 가져와 주세요.',
        loginAction: '목록 가져오기',
        noAudioData: '오디오 분석 데이터를 가져오지 못했습니다.',
        genreFallback: '장르 데이터가 충분하지 않아 audio 기반으로 클러스터링 중입니다.',
        emptyMap1: '아직 취향 지도를 만들 만큼의 곡이 없습니다.',
        emptyMap2: 'Digging에서 ♡를 눌러 내 지도를 채워보세요.',
        memoryVolumeSuffix: '곡',
        memoryMeta: '개의 청취 기억이 만든 분포 · 취향 영역',
        regionsSuffix: '개',
        memoryShelf: 'Memory Shelf',
        partialLoaded: '일부만 불러옴',
        loadingLibrary: '팔로우 아티스트와 저장 앨범을 정리 중입니다.',
        libraryError: '팔로우/앨범 정보를 가져오지 못했어요. Spotify 재로그인 후 다시 시도해 주세요.',
        utilityOpen: '고급 열기',
        utilityClose: '고급 닫기',
        dashboardShow: 'Dashboard ON',
        dashboardHide: 'Dashboard OFF',
        mobileSyncSend: '모바일로 보내기',
        mobileSyncSending: '전송 중…',
        axisPresetLabel: '추천 축',
        axisX: 'X축',
        axisY: 'Y축',
        axisGuide: '드래그로 이동, 휠/핀치로 확대·축소 가능합니다.',
        genreBasis: '차원 기준',
        audioBasis: 'Audio features 5차원 기준',
        exploreCount: '빈영역 추천',
        inViewCount: '화면 내',
        exploreLoading: '빈영역 추천 계산 중…',
        exploreFailed: '추천 실패',
        clearFilter: '필터 해제',
        mapZoomOut: '축소',
        mapZoomIn: '확대',
        recOn: '추천 ON',
        recOff: '추천 OFF',
        recFocus: '추천 위치 보기',
        spectraExit: 'spectra 모드 종료',
        recListen: '외부에서 찾기',
        recAdd: '내 버블 추가',
        recAdded: '추가됨',
        recSaving: '저장 중…',
        recAddSuccess: '내 Taste Field에 추가했어요.',
        recAddFail: '저장 실패',
        contextMenuExpand: '이 곡을 중심으로 spectra 확장',
        contextMenuFocus: '이 곡으로 이동',
        contextMenuPlay: '외부에서 찾기',
        contextMenuSaved: '필드에 있음',
        contextMenuSave: '내 필드에 추가',
        contextMenuNoCluster: '클러스터 정보를 찾지 못했습니다.',
        discoveryLens: '탐색 기준',
        discoveryTrackBasis: '이 곡을 기준으로 탐색',
        discoveryGapBasis: '내 취향의 빈 영역 탐색',
        discoveryTrackDesc: 'Last.fm 유사곡 · 태그 후보 · 현재 축 거리순',
        discoveryGapDesc: 'Last.fm 대표 태그 후보 · 현재 축의 저밀도 영역 우선',
        discoverySpotifyTrackDesc: 'Spotify 아티스트·장르 후보 · 현재 축 거리순',
        discoverySpotifyGapDesc: 'Spotify 대표 장르 후보 · 현재 축의 저밀도 영역 우선',
        discoveryCurrentAxes: '현재 축',
        discoverySeedTags: '기준 태그',
        discoveryMyBubble: '내 취향',
        discoveryRecommendation: '추천',
        discoveryFocusAnchor: '기준 곡으로 이동',
        trackExploreAction: '이 곡 기준으로 탐색',
        trackAddAction: '내 필드에 추가',
        spotifySearch: 'Spotify에서 찾기',
        youtubeSearch: 'YouTube에서 찾기',
        shareOn: '공유 ON',
        share: '공유',
        subwayGenerator: '노선도 생성기',
        currentBubble: '현재 버블',
        scrollHint: '마우스 휠로 확대 / 축소',
        navigator: 'Navigator',
        yearCompareDesc: '현재 vs 과거의 취향 장르 겹침 비교',
        overlap: '겹침',
        current: '현재',
        sharedTaste: '겹치는 취향',
        noTrackInGenre: '해당 장르 곡 없음',
        sourceRecent: '최근',
        sourceLiked: '좋아요',
        sourceTop: 'TOP',
        representativeTracks: '대표곡',
    },
    en: {
        mappedSubtitle: 'Listening history, mapped in space.',
        explorerLabel: 'CURRENT EXPLORER',
        explorerMeta: 'Last.fm taste signals · Spotify cover matching.',
        langKo: '한국어',
        langEn: 'English',
        analyzingTitle: 'Analyzing your taste field',
        analyzingStep1: 'Import your list',
        analyzingStep2: 'Match Last.fm tags and Spotify covers',
        analyzingStep3: 'Build taste map',
        loginRequired: 'Import a track list first.',
        loginAction: 'Import list',
        noAudioData: 'Could not load audio analysis data.',
        genreFallback: 'Not enough genre data. Falling back to audio-based clustering.',
        emptyMap1: 'Not enough tracks yet to build your taste map.',
        emptyMap2: 'Press ♡ in Digging to grow your map.',
        memoryVolumeSuffix: 'tracks',
        memoryMeta: 'listening memories shaped this field ·',
        regionsSuffix: 'regions',
        memoryShelf: 'Memory Shelf',
        partialLoaded: 'Partially loaded',
        loadingLibrary: 'Organizing followed artists and saved albums.',
        libraryError: 'Could not load followed artists/albums. Please re-login to Spotify and try again.',
        utilityOpen: 'Show advanced',
        utilityClose: 'Hide advanced',
        dashboardShow: 'Dashboard ON',
        dashboardHide: 'Dashboard OFF',
        mobileSyncSend: 'Send to mobile',
        mobileSyncSending: 'Sending…',
        axisPresetLabel: 'Axis presets',
        axisX: 'X Axis',
        axisY: 'Y Axis',
        axisGuide: 'Drag to move, wheel/pinch to zoom.',
        genreBasis: 'dimensions',
        audioBasis: 'Audio features (5D)',
        exploreCount: 'Recommendations',
        inViewCount: 'in view',
        exploreLoading: 'Calculating recommendations…',
        exploreFailed: 'Recommendation failed',
        clearFilter: 'Clear filter',
        mapZoomOut: 'Shrink',
        mapZoomIn: 'Expand',
        recOn: 'Rec ON',
        recOff: 'Rec OFF',
        recFocus: 'Focus rec area',
        spectraExit: 'Exit spectra mode',
        recListen: 'Open externally',
        recAdd: 'Add to bubble',
        recAdded: 'Added',
        recSaving: 'Saving…',
        recAddSuccess: 'Added to your Taste Field.',
        recAddFail: 'Save failed',
        contextMenuExpand: 'Expand spectra around this track',
        contextMenuFocus: 'Focus this track',
        contextMenuPlay: 'Open externally',
        contextMenuSaved: 'Already in field',
        contextMenuSave: 'Add to my field',
        contextMenuNoCluster: 'No cluster data for this track.',
        discoveryLens: 'Discovery basis',
        discoveryTrackBasis: 'Explore from this track',
        discoveryGapBasis: 'Explore gaps in your taste',
        discoveryTrackDesc: 'Last.fm similar tracks and tags · current-axis distance',
        discoveryGapDesc: 'Last.fm leading-tag candidates · sparse regions on the current axes',
        discoverySpotifyTrackDesc: 'Spotify artist and genre candidates · current-axis distance',
        discoverySpotifyGapDesc: 'Spotify leading-genre candidates · sparse regions on the current axes',
        discoveryCurrentAxes: 'Current axes',
        discoverySeedTags: 'Seed tags',
        discoveryMyBubble: 'Your taste',
        discoveryRecommendation: 'Recommendation',
        discoveryFocusAnchor: 'Focus seed track',
        trackExploreAction: 'Explore from this track',
        trackAddAction: 'Add to my field',
        spotifySearch: 'Find on Spotify',
        youtubeSearch: 'Find on YouTube',
        shareOn: 'Share ON',
        share: 'Share',
        subwayGenerator: 'Subway Generator',
        currentBubble: 'Current bubble',
        scrollHint: 'Use the mouse wheel to zoom',
        navigator: 'Navigator',
        yearCompareDesc: 'Current vs past genre overlap',
        overlap: 'Overlap',
        current: 'Current',
        sharedTaste: 'Shared taste',
        noTrackInGenre: 'No tracks in this genre',
        sourceRecent: 'Recent',
        sourceLiked: 'Liked',
        sourceTop: 'Top',
        representativeTracks: 'representative tracks',
    },
};

function hashText(value) {
    const text = String(value || '');
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
}

function readSessionCache(key, ttlMs) {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    try {
        const raw = window.sessionStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.savedAt || !parsed?.payload) {
            window.sessionStorage.removeItem(key);
            return null;
        }
        if (Date.now() - parsed.savedAt > ttlMs) {
            window.sessionStorage.removeItem(key);
            return null;
        }
        return parsed.payload;
    } catch {
        return null;
    }
}

function writeSessionCache(key, payload) {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    try {
        window.sessionStorage.setItem(key, JSON.stringify({
            savedAt: Date.now(),
            payload,
        }));
    } catch {
        // ignore quota / serialization errors
    }
}

const FEATURE_KEYS = ['valence', 'energy', 'danceability', 'acousticness', 'instrumentalness'];
const FEATURE_META = {
    valence: { label: 'Valence', short: 'V', low: 'Sad', high: 'Happy', fallback: 0.5 },
    energy: { label: 'Energy', short: 'E', low: 'Calm', high: 'Intense', fallback: 0.5 },
    danceability: { label: 'Danceability', short: 'D', low: 'Loose', high: 'Groovy', fallback: 0.5 },
    acousticness: { label: 'Acousticness', short: 'A', low: 'Electronic', high: 'Acoustic', fallback: 0.5 },
    instrumentalness: { label: 'Instrumentalness', short: 'I', low: 'Vocal', high: 'Instrumental', fallback: 0 },
};
const FEATURE_INDEX = FEATURE_KEYS.reduce((acc, key, idx) => {
    acc[key] = idx;
    return acc;
}, {});
const AXIS_PRESETS = [
    {
        key: 'mood',
        label: '기분 맵',
        x: 'valence',
        y: 'energy',
        hint: '행복도 x 에너지',
    },
    {
        key: 'dance',
        label: '댄스 맵',
        x: 'danceability',
        y: 'energy',
        hint: '그루브 x 에너지',
    },
    {
        key: 'acoustic',
        label: '어쿠스틱 맵',
        x: 'acousticness',
        y: 'valence',
        hint: '어쿠스틱 x 긍정감',
    },
];

// Map surfaces are registered here so future spatial views can be added
// without reshaping the shared navigation and floating tool dock.
const MAP_VIEW_DEFINITIONS = [
    { id: 'field', label: 'Taste Field', available: true },
    { id: 'spotify', label: 'Spotify Field', available: true },
    { id: 'metro', label: 'Metro Map', available: false },
];

// ─── Clustering helpers ────────────────────────────────────────────────────────
function euclidDist(a, b) {
    return Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0));
}

// ─── Cluster namer ────────────────────────────────────────────────────────────
// Features order: [valence, energy, danceability, acousticness, instrumentalness]
const CLUSTER_COLORS = ['#a78bfa', '#93c5fd', '#f87171', '#fbbf24', '#60a5fa', '#f472b6'];

const FEATURE_COLORS = {
    valence:          { low: '#4f46e5', high: '#f59e0b' },
    energy:           { low: '#0ea5e9', high: '#ef4444' },
    danceability:     { low: '#8b5cf6', high: '#93c5fd' },
    acousticness:     { low: '#6366f1', high: '#f97316' },
    instrumentalness: { low: '#ec4899', high: '#67e8f9' },
};

function getClusterLabel(centroid) {
    const [valence, energy, danceability, acousticness, instrumentalness] = centroid;
    if (instrumentalness > 0.5) return { name: 'Instrumental', symbol: 'reverb' };
    if (acousticness > 0.6 && energy < 0.55) return { name: 'Acoustic & Mellow', symbol: 'chime' };
    if (acousticness > 0.5 && valence > 0.6) return { name: 'Warm & Bright', symbol: 'halo' };
    if (energy > 0.8 && valence > 0.65) return { name: 'Happy & Energetic', symbol: 'flare' };
    if (energy > 0.75 && valence > 0.5) return { name: 'Hype', symbol: 'pulse' };
    if (energy > 0.75 && valence < 0.35) return { name: 'Dark & Intense', symbol: 'void' };
    if (energy > 0.75 && danceability > 0.72) return { name: 'Rave', symbol: 'prism' };
    if (energy > 0.6 && danceability > 0.75 && valence > 0.55) return { name: 'Dance Floor', symbol: 'orbit' };
    if (energy > 0.6 && danceability > 0.72 && valence < 0.5) return { name: 'Dark Groove', symbol: 'drift' };
    if (energy > 0.6 && danceability > 0.6) return { name: 'Groovy', symbol: 'flow' };
    if (energy < 0.4 && valence > 0.6) return { name: 'Chill & Positive', symbol: 'mist' };
    if (energy < 0.45 && valence < 0.38) return { name: 'Melancholic', symbol: 'rain' };
    if (energy < 0.55 && valence > 0.5) return { name: 'Easy Listening', symbol: 'veil' };
    if (valence > 0.68) return { name: 'Uplifting', symbol: 'lift' };
    if (valence < 0.35) return { name: 'Brooding', symbol: 'dusk' };
    return { name: 'Balanced', symbol: 'headset' };
}

function deduplicateClusterLabels(clusters) {
    const nameCounts = new Map();
    clusters.forEach(({ label }) => {
        nameCounts.set(label.name, (nameCounts.get(label.name) || 0) + 1);
    });

    const nameSeenIdx = new Map();
    return clusters.map((cluster) => {
        if (nameCounts.get(cluster.label.name) <= 1) return cluster;

        // Distinguish duplicates by the feature that most characterises each cluster
        const [valence, energy, danceability, acousticness] = cluster.centroid;
        const idx = (nameSeenIdx.get(cluster.label.name) || 0) + 1;
        nameSeenIdx.set(cluster.label.name, idx);

        const qualifiers = [
            energy > 0.7 ? 'Intense' : energy < 0.45 ? 'Mellow' : null,
            valence > 0.65 ? 'Bright' : valence < 0.38 ? 'Dark' : null,
            danceability > 0.75 ? 'Groovier' : null,
            acousticness > 0.55 ? 'Acoustic' : null,
        ].filter(Boolean);

        const qualifier = qualifiers[idx - 1] || qualifiers[0] || `${idx}`;
        return {
            ...cluster,
            label: { ...cluster.label, name: `${qualifier} ${cluster.label.name}` },
        };
    });
}

function getTrackFeature(track, featureKey) {
    const value = track?.[featureKey];
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    return FEATURE_META[featureKey]?.fallback ?? 0.5;
}

function getTrackVector(track) {
    return FEATURE_KEYS.map((key) => getTrackFeature(track, key));
}

function getCentroidFeature(centroid, featureKey) {
    const idx = FEATURE_INDEX[featureKey];
    return centroid?.[idx] ?? FEATURE_META[featureKey]?.fallback ?? 0.5;
}

function resolveAxisPreset(xAxis, yAxis) {
    return AXIS_PRESETS.find((preset) => preset.x === xAxis && preset.y === yAxis) || null;
}

function hash01(str) {
    let h = 0;
    const s = String(str);
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return (h % 10_000) / 10_000;
}

function pickInRange(seed, min, max) {
    return min + (max - min) * seed;
}

function clamp01(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
}

function rectsOverlap(a, b, pad = 0) {
    return !(
        a.right + pad < b.left
        || b.right + pad < a.left
        || a.bottom + pad < b.top
        || b.bottom + pad < a.top
    );
}

function sampleTracksForBubbleView(list, maxCount) {
    if (list.length <= maxCount) return list;
    const shuffled = [...list].sort((a, b) => hash01(a.id) - hash01(b.id));
    return shuffled.slice(0, maxCount);
}

function normalizeGenre(genre) {
    return String(genre || '').trim().toLowerCase();
}

function normalizeTrackTitle(title) {
    return String(title || '')
        .toLowerCase()
        .replace(/\[[^\]]*]/g, ' ')
        .replace(/\([^)]*\)/g, ' ')
        .replace(/\b(feat|ft)\.?\b.*$/g, ' ')
        .replace(/[^a-z0-9가-힣]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function getRecommendationDedupKey(track) {
    if (!track) return '';
    const title = normalizeTrackTitle(track.name);
    const artists = String(track.artists || '')
        .toLowerCase()
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
        .slice(0, 2)
        .join('|');
    const durationMs = Number(track.durationMs);
    const durationBucket = Number.isFinite(durationMs) && durationMs > 0
        ? Math.round(durationMs / 4000)
        : 0;
    if (!title && !artists) return `id:${track.id || ''}`;
    return `${title}::${artists}::${durationBucket}`;
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

function titleizeGenre(genre) {
    return String(genre || '')
        .split(/[\s-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function getGenreIdentity(genre) {
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

function getGenreSymbol(genre) {
    const identity = getGenreIdentity(genre);
    switch (identity.family) {
    case 'house': return 'orbit';
    case 'disco': return 'flare';
    case 'bass': return 'pulse';
    case 'ambient': return 'mist';
    case 'pop': return 'prism';
    case 'indie': return 'veil';
    case 'rock': return 'dusk';
    case 'soul': return 'halo';
    case 'cinematic': return 'reverb';
    case 'alt': return 'drift';
    default: return 'headset';
    }
}

function getRegionFieldVars(seedSource) {
    const seed = hash01(String(seedSource || 'region'));
    return {
        '--tm-region-depth': (0.82 + seed * 0.36).toFixed(3),
        '--tm-region-glow': (0.34 + seed * 0.44).toFixed(3),
        '--tm-region-delay': `${(-seed * 7.2).toFixed(2)}s`,
        '--tm-region-speed': `${(8.8 + seed * 5.8).toFixed(2)}s`,
        '--tm-region-warp': `${(seed * 10 - 5).toFixed(2)}deg`,
    };
}

function getGenreChipStyle(genre) {
    const identity = getGenreIdentity(genre);
    return {
        ...getRegionFieldVars(`genre-${identity.key || identity.short}`),
        '--tm-genre-rgb': identity.tone.rgb,
        '--tm-genre-text': identity.tone.text,
        '--tm-region-color': `rgb(${identity.tone.rgb})`,
    };
}

function getEmotionRegionStyle(color, regionKey) {
    return {
        ...getRegionFieldVars(`emotion-${regionKey || color}`),
        '--tm-region-color': color,
        '--cluster-color': color,
    };
}

function parseRgbString(rgbText) {
    const parts = String(rgbText || '')
        .split(',')
        .map((v) => Number(v.trim()))
        .filter((n) => Number.isFinite(n));
    if (parts.length < 3) return [182, 206, 248];
    return parts.slice(0, 3).map((n) => Math.max(0, Math.min(255, Math.round(n))));
}

function hexToRgbArray(hex) {
    const value = String(hex || '').replace('#', '').trim();
    if (value.length === 3) {
        const r = parseInt(value[0] + value[0], 16);
        const g = parseInt(value[1] + value[1], 16);
        const b = parseInt(value[2] + value[2], 16);
        if ([r, g, b].every(Number.isFinite)) return [r, g, b];
        return null;
    }
    if (value.length === 6) {
        const r = parseInt(value.slice(0, 2), 16);
        const g = parseInt(value.slice(2, 4), 16);
        const b = parseInt(value.slice(4, 6), 16);
        if ([r, g, b].every(Number.isFinite)) return [r, g, b];
        return null;
    }
    return null;
}

function mixRgb(items) {
    if (!items.length) return [182, 206, 248];
    const sum = items.reduce((acc, item) => acc + item.weight, 0) || 1;
    const mixed = [0, 0, 0];
    items.forEach((item) => {
        const ratio = item.weight / sum;
        mixed[0] += item.rgb[0] * ratio;
        mixed[1] += item.rgb[1] * ratio;
        mixed[2] += item.rgb[2] * ratio;
    });
    return mixed.map((n) => Math.max(0, Math.min(255, Math.round(n))));
}

function buildTimelineCardPalette(topGenreEntries, dominantColor) {
    const genres = Array.isArray(topGenreEntries) ? topGenreEntries : [];
    const a = genres[0] ? parseRgbString(getGenreIdentity(genres[0].genre).tone.rgb) : [132, 158, 212];
    const b = genres[1] ? parseRgbString(getGenreIdentity(genres[1].genre).tone.rgb) : a;
    const c = genres[2] ? parseRgbString(getGenreIdentity(genres[2].genre).tone.rgb) : b;
    const mixed = mixRgb(genres.map((item) => ({
        rgb: parseRgbString(getGenreIdentity(item.genre).tone.rgb),
        weight: item.share || item.count || 1,
    })));
    const dominant = hexToRgbArray(dominantColor) || mixed;
    return {
        a: `${a[0]}, ${a[1]}, ${a[2]}`,
        b: `${b[0]}, ${b[1]}, ${b[2]}`,
        c: `${c[0]}, ${c[1]}, ${c[2]}`,
        mixed: `${mixed[0]}, ${mixed[1]}, ${mixed[2]}`,
        dominant: `${dominant[0]}, ${dominant[1]}, ${dominant[2]}`,
    };
}

function formatDateLabel(raw) {
    if (!raw) return '-';
    const d = new Date(raw);
    if (!Number.isFinite(d.getTime())) return '-';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}.${m}.${day}`;
}

function getTrackGenres(track) {
    if (!Array.isArray(track?.genres)) return [];
    return [...new Set(track.genres.map(normalizeGenre).filter(Boolean))];
}

function getTrackTimeMs(track) {
    const raw = track?.addedAt || track?.playedAt || null;
    if (!raw) return null;
    const ts = Date.parse(raw);
    return Number.isFinite(ts) ? ts : null;
}

function getTimeBucket(ts, granularity) {
    const d = new Date(ts);
    const year = d.getFullYear();
    const month = d.getMonth(); // 0-11
    if (granularity === 'quarter') {
        const q = Math.floor(month / 3) + 1;
        return {
            key: `${year}-Q${q}`,
            label: `${year} Q${q}`,
            startTs: Date.UTC(year, (q - 1) * 3, 1),
        };
    }
    const monthNum = month + 1;
    return {
        key: `${year}-${String(monthNum).padStart(2, '0')}`,
        label: `${year}.${String(monthNum).padStart(2, '0')}`,
        startTs: Date.UTC(year, month, 1),
    };
}

function getGenreClusterLabel(topGenres) {
    if (!topGenres?.length) return { name: 'Mixed Genre', symbol: 'headset' };
    if (topGenres.length === 1) return { name: getGenreIdentity(topGenres[0]).short, symbol: 'headset' };
    return { name: `${getGenreIdentity(topGenres[0]).short} + ${getGenreIdentity(topGenres[1]).short}`, symbol: 'headset' };
}

function compactCompareTracks(tracks, limit = 24) {
    if (!Array.isArray(tracks)) return [];
    const out = [];
    const seen = new Set();
    for (const track of tracks) {
        if (!track?.id || !track?.name || seen.has(track.id)) continue;
        seen.add(track.id);
        out.push({
            id: String(track.id),
            name: String(track.name),
            artists: track.artists ? String(track.artists) : '',
            coverUrl: track.coverUrl ? String(track.coverUrl) : null,
            genres: Array.isArray(track.genres)
                ? [...new Set(track.genres.map((g) => String(g || '').trim()).filter(Boolean))].slice(0, 8)
                : [],
            popularity: Number(track.popularity) || 0,
            addedAt: track.addedAt || null,
            playedAt: track.playedAt || null,
        });
        if (out.length >= limit) break;
    }
    return out;
}

function getTrackYearFromValue(raw) {
    if (!raw) return null;
    const ts = Date.parse(raw);
    if (!Number.isFinite(ts)) return null;
    return new Date(ts).getUTCFullYear();
}

function buildTopGenresFromTracks(tracks, limit = 12) {
    const genreCount = new Map();
    (Array.isArray(tracks) ? tracks : []).forEach((track) => {
        const genres = Array.isArray(track?.genres) ? track.genres : [];
        genres.forEach((genre) => {
            const key = normalizeGenre(genre);
            if (!key) return;
            genreCount.set(key, (genreCount.get(key) || 0) + 1);
        });
    });
    return [...genreCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([genre]) => genre);
}

function buildCurrentPersonaFromTracks(tracks, profileName) {
    const source = Array.isArray(tracks) ? tracks.filter((track) => track?.id && track?.name) : [];
    if (!source.length) return null;
    const sortedByTime = [...source].sort((a, b) => (getTrackTimeMs(b) || 0) - (getTrackTimeMs(a) || 0));
    const sortedByPopularity = [...source].sort((a, b) => (Number(b?.popularity) || 0) - (Number(a?.popularity) || 0));
    return {
        id: 'self-current',
        year: null,
        displayName: `${String(profileName || '나').split(/\s+/)[0] || '나'} (현재)`,
        topGenres: buildTopGenresFromTracks(source, 12),
        bubbleTracks: {
            recent: compactCompareTracks(sortedByTime, 24),
            liked: compactCompareTracks(sortedByTime, 24),
            top: compactCompareTracks(sortedByPopularity, 18),
        },
    };
}

function buildYearlyPersonasFromFeatureTracks(tracks) {
    if (!Array.isArray(tracks) || tracks.length === 0) return [];
    const byYear = new Map();
    tracks.forEach((track) => {
        const year = getTrackYearFromValue(track?.addedAt || track?.playedAt);
        if (!year) return;
        const key = String(year);
        if (!byYear.has(key)) byYear.set(key, []);
        byYear.get(key).push(track);
    });

    const personas = [];
    for (const [yearKey, yearTracksRaw] of byYear.entries()) {
        const yearTracks = yearTracksRaw
            .filter((track) => track?.id && track?.name)
            .slice()
            .sort((a, b) => (getTrackTimeMs(b) || 0) - (getTrackTimeMs(a) || 0));
        if (!yearTracks.length) continue;

        const topGenres = buildTopGenresFromTracks(yearTracks, 10);
        const bubbleTracks = {
            recent: compactCompareTracks(yearTracks.slice(0, 24), 24),
            liked: compactCompareTracks(yearTracks.slice(0, 24), 24),
            top: compactCompareTracks(
                [...yearTracks]
                    .sort((a, b) => (Number(b?.popularity) || 0) - (Number(a?.popularity) || 0))
                    .slice(0, 18),
                18,
            ),
        };

        if (topGenres.length === 0 && bubbleTracks.top.length === 0) continue;
        personas.push({
            id: `self-year-${yearKey}`,
            year: Number(yearKey) || null,
            displayName: `나 (${yearKey})`,
            topGenres,
            bubbleTracks,
        });
    }

    return personas.sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0));
}

function buildGenreWeightMapForCompare(genres, maxCount = 8) {
    const map = new Map();
    if (!Array.isArray(genres)) return map;
    genres.slice(0, maxCount).forEach((genre, idx) => {
        const key = normalizeGenre(genre);
        if (!key) return;
        map.set(key, {
            key,
            label: getGenreIdentity(genre).short,
            weight: maxCount - idx,
        });
    });
    return map;
}

function compareOverlapStrength(myWeight, otherWeight) {
    const a = Number(myWeight) || 0;
    const b = Number(otherWeight) || 0;
    if (a <= 0 || b <= 0) return 0;
    const high = Math.max(a, b);
    const low = Math.min(a, b);
    const presence = low / high;
    const closeness = 1 - (Math.abs(a - b) / Math.max(high - 1, 1));
    return Math.max(0, Math.min(1, 0.7 * presence + 0.3 * closeness));
}

function compareWeightToSize(weight) {
    const n = Number(weight) || 0;
    return Math.max(26, Math.min(58, 24 + n * 4.4));
}

function filterCompareTracksByGenre(tracks, genreKey) {
    if (!Array.isArray(tracks) || !tracks.length) return [];
    const key = normalizeGenre(genreKey);
    if (!key) return [];
    return tracks.filter((track) => {
        const genres = Array.isArray(track?.genres)
            ? track.genres.map((genre) => normalizeGenre(genre)).filter(Boolean)
            : [];
        return genres.some((genre) => genre === key || genre.includes(key) || key.includes(genre));
    });
}

function resolveCompareBubbleCollisions(bubbles, mode) {
    if (!Array.isArray(bubbles) || bubbles.length <= 1) return bubbles || [];

    const canvasW = 1000;
    const canvasH = 340;
    const nodes = bubbles.map((bubble) => ({
        ...bubble,
        x: Number(bubble.x) || 50,
        y: Number(bubble.y) || 50,
        anchorX: Number(bubble.x) || 50,
        anchorY: Number(bubble.y) || 50,
    }));

    const boundsFor = (node) => {
        if (mode === 'split') {
            return node.owner === 'me'
                ? { minX: 6, maxX: 44, minY: 12, maxY: 88 }
                : { minX: 56, maxX: 94, minY: 12, maxY: 88 };
        }
        if (node.shared) return { minX: 34, maxX: 66, minY: 12, maxY: 88 };
        return node.owner === 'me'
            ? { minX: 6, maxX: 52, minY: 12, maxY: 88 }
            : { minX: 48, maxX: 94, minY: 12, maxY: 88 };
    };

    const toPxX = (x) => (x / 100) * canvasW;
    const toPxY = (y) => (y / 100) * canvasH;
    const toPctX = (px) => (px / canvasW) * 100;
    const toPctY = (px) => (px / canvasH) * 100;

    for (let step = 0; step < 85; step += 1) {
        for (let i = 0; i < nodes.length; i += 1) {
            const a = nodes[i];
            for (let j = i + 1; j < nodes.length; j += 1) {
                const b = nodes[j];
                const dxPx = toPxX(b.x - a.x);
                const dyPx = toPxY(b.y - a.y);
                const dist = Math.hypot(dxPx, dyPx) || 0.0001;
                const sameGenrePair = a.genreKey === b.genreKey;
                const pad = sameGenrePair ? 2 : 10;
                const minDist = (a.size + b.size) * 0.5 + pad;
                if (dist >= minDist) continue;
                const push = (minDist - dist) * 0.52;
                const nx = dxPx / dist;
                const ny = dyPx / dist;
                a.x -= toPctX(nx * push);
                a.y -= toPctY(ny * push);
                b.x += toPctX(nx * push);
                b.y += toPctY(ny * push);
            }
        }

        for (const node of nodes) {
            node.x += (node.anchorX - node.x) * 0.03;
            node.y += (node.anchorY - node.y) * 0.03;

            const bounds = boundsFor(node);
            const rx = toPctX((node.size / 2) + 4);
            const ry = toPctY((node.size / 2) + 4);
            node.x = Math.max(bounds.minX + rx, Math.min(bounds.maxX - rx, node.x));
            node.y = Math.max(bounds.minY + ry, Math.min(bounds.maxY - ry, node.y));
        }
    }

    return nodes;
}

function compareSourceLabel(source, lang = 'ko') {
    const copy = TM_I18N[lang] || TM_I18N.ko;
    if (source === 'liked') return copy.sourceLiked;
    if (source === 'top') return copy.sourceTop;
    return copy.sourceRecent;
}

function YearCompareDepthScene({ sceneKey }) {
    const mountRef = useRef(null);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return undefined;

        let disposed = false;
        let renderer = null;
        let scene = null;
        let camera = null;
        let frame = 0;
        let ro = null;
        let nearCloud = null;
        let midCloud = null;
        let farCloud = null;
        const halos = [];
        const glows = [];

        (async () => {
            const THREE = await import('three');
            if (disposed || !mount) return;

            const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            const seedBase = String(sceneKey || 'yearcmp');

            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(46, 1, 0.1, 60);
            camera.position.set(0, 0, 10);

            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
            renderer.setClearColor(0x000000, 0);
            mount.appendChild(renderer.domElement);

            const resize = () => {
                if (!mount || !renderer || !camera) return;
                const w = Math.max(1, mount.clientWidth);
                const h = Math.max(1, mount.clientHeight);
                renderer.setSize(w, h, false);
                camera.aspect = w / h;
                camera.updateProjectionMatrix();
            };
            resize();

            const makeCloud = (count, zMin, zMax, size, opacity, colorA, colorB) => {
                const positions = new Float32Array(count * 3);
                const colors = new Float32Array(count * 3);
                const cA = new THREE.Color(colorA);
                const cB = new THREE.Color(colorB);

                for (let i = 0; i < count; i += 1) {
                    const idx = i * 3;
                    const s = `${seedBase}:${count}:${i}`;
                    positions[idx] = (hash01(`${s}:x`) - 0.5) * 22;
                    positions[idx + 1] = (hash01(`${s}:y`) - 0.5) * 11;
                    positions[idx + 2] = zMin + hash01(`${s}:z`) * (zMax - zMin);
                    const blend = hash01(`${s}:mix`);
                    const c = cA.clone().lerp(cB, blend);
                    colors[idx] = c.r;
                    colors[idx + 1] = c.g;
                    colors[idx + 2] = c.b;
                }

                const geo = new THREE.BufferGeometry();
                geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
                const mat = new THREE.PointsMaterial({
                    size,
                    vertexColors: true,
                    transparent: true,
                    opacity,
                    depthWrite: false,
                    blending: THREE.AdditiveBlending,
                });
                const points = new THREE.Points(geo, mat);
                scene.add(points);
                return points;
            };

            const createSoftTexture = (stops) => {
                const c = document.createElement('canvas');
                c.width = 256;
                c.height = 256;
                const ctx = c.getContext('2d');
                if (!ctx) return null;
                const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
                stops.forEach((item) => g.addColorStop(item.stop, item.color));
                ctx.fillStyle = g;
                ctx.fillRect(0, 0, 256, 256);
                const tx = new THREE.CanvasTexture(c);
                tx.needsUpdate = true;
                return tx;
            };

            nearCloud = makeCloud(160, -3.4, 1.5, 0.1, 0.5, '#9ec2ff', '#e3eeff');
            midCloud = makeCloud(200, -6.8, -2.8, 0.08, 0.34, '#83a8eb', '#c5dafc');
            farCloud = makeCloud(220, -10.5, -5.6, 0.06, 0.2, '#7397d8', '#b5cdf1');

            const orbGeo = new THREE.SphereGeometry(1, 28, 28);
            const haloDefs = [
                { x: -3.2, y: 1.4, z: -5.4, scale: 2.0, color: '#8daff4', opacity: 0.11 },
                { x: 2.8, y: -1.0, z: -6.1, scale: 2.5, color: '#9fc0ff', opacity: 0.08 },
                { x: 0.1, y: 1.9, z: -7.0, scale: 1.5, color: '#7e9bdd', opacity: 0.07 },
            ];
            haloDefs.forEach((def, idx) => {
                const mat = new THREE.MeshBasicMaterial({
                    color: def.color,
                    transparent: true,
                    opacity: def.opacity,
                    depthWrite: false,
                });
                const mesh = new THREE.Mesh(orbGeo, mat);
                mesh.position.set(def.x, def.y, def.z);
                mesh.scale.setScalar(def.scale);
                mesh.userData.baseY = def.y;
                mesh.userData.wave = 0.52 + idx * 0.12;
                scene.add(mesh);
                halos.push(mesh);
            });

            const glowTexA = createSoftTexture([
                { stop: 0, color: 'rgba(222,235,255,0.88)' },
                { stop: 0.42, color: 'rgba(138,175,241,0.34)' },
                { stop: 1, color: 'rgba(20,34,62,0)' },
            ]);
            const glowTexB = createSoftTexture([
                { stop: 0, color: 'rgba(255,216,182,0.5)' },
                { stop: 0.48, color: 'rgba(176,124,228,0.22)' },
                { stop: 1, color: 'rgba(18,23,48,0)' },
            ]);

            const makeGlow = (tx, x, y, z, scale, opacity) => {
                if (!tx) return;
                const mat = new THREE.SpriteMaterial({
                    map: tx,
                    transparent: true,
                    opacity,
                    depthWrite: false,
                    blending: THREE.AdditiveBlending,
                });
                const sprite = new THREE.Sprite(mat);
                sprite.position.set(x, y, z);
                sprite.scale.set(scale, scale * 0.68, 1);
                sprite.userData.baseY = y;
                sprite.userData.baseScale = scale;
                scene.add(sprite);
                glows.push(sprite);
            };
            makeGlow(glowTexA, -1.9, -0.4, -6.8, 6.3, 0.32);
            makeGlow(glowTexB, 2.9, 0.9, -8.4, 5.1, 0.24);
            makeGlow(glowTexA, 0.8, -1.5, -9.2, 4.8, 0.2);

            const animate = () => {
                if (disposed) return;
                frame = requestAnimationFrame(animate);
                const t = performance.now() * 0.00012;
                const motion = reduceMotion ? 0.28 : 1;

                if (nearCloud) {
                    nearCloud.rotation.y = t * 1.05 * motion;
                    nearCloud.rotation.x = Math.sin(t * 0.42) * 0.05 * motion;
                }
                if (midCloud) {
                    midCloud.rotation.y = -t * 0.62 * motion;
                    midCloud.rotation.x = Math.sin(t * 0.31) * 0.03 * motion;
                }
                if (farCloud) {
                    farCloud.rotation.y = -t * 0.4 * motion;
                    farCloud.rotation.z = Math.sin(t * 0.34) * 0.03 * motion;
                }
                halos.forEach((halo) => {
                    const baseY = halo.userData.baseY ?? halo.position.y;
                    const wave = halo.userData.wave ?? 0.6;
                    halo.position.y = baseY + Math.sin(t * wave) * 0.16 * motion;
                });
                glows.forEach((glow, idx) => {
                    const baseY = glow.userData.baseY ?? glow.position.y;
                    const baseScale = glow.userData.baseScale ?? 5;
                    glow.position.y = baseY + Math.sin(t * (0.34 + idx * 0.09)) * 0.24 * motion;
                    const pulse = 0.96 + Math.sin(t * (0.53 + idx * 0.12)) * 0.04 * motion;
                    glow.scale.set(baseScale * pulse, baseScale * 0.68 * pulse, 1);
                });

                renderer.render(scene, camera);
            };
            animate();

            ro = new ResizeObserver(resize);
            ro.observe(mount);
        })();

        return () => {
            disposed = true;
            if (frame) cancelAnimationFrame(frame);
            if (ro) ro.disconnect();
            if (scene) {
                scene.traverse((obj) => {
                    if (obj.geometry) obj.geometry.dispose();
                    if (obj.material) {
                        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
                        else obj.material.dispose();
                    }
                });
            }
            if (renderer) renderer.dispose();
            if (renderer?.domElement && mount.contains(renderer.domElement)) {
                mount.removeChild(renderer.domElement);
            }
        };
    }, [sceneKey]);

    return <div className="tm-yearcmp-depth" ref={mountRef} aria-hidden />;
}

function TasteYearComparePanel({ tracks, profileName, lang = 'ko' }) {
    const copy = TM_I18N[lang] || TM_I18N.ko;
    const [targetId, setTargetId] = useState('');
    const [source, setSource] = useState('recent');
    const [mode, setMode] = useState('blend');
    const [selectedGenreKey, setSelectedGenreKey] = useState(null);

    const currentYear = new Date().getFullYear();
    const currentPersona = useMemo(() => buildCurrentPersonaFromTracks(tracks, profileName), [tracks, profileName]);
    const yearlyPersonas = useMemo(() => buildYearlyPersonasFromFeatureTracks(tracks), [tracks]);

    const compareCandidates = useMemo(() => {
        const byYear = new Map(yearlyPersonas.map((persona) => [Number(persona.year), persona]));
        const ordered = [];
        [currentYear - 1, currentYear - 2].forEach((year) => {
            if (byYear.has(year)) ordered.push(byYear.get(year));
        });
        yearlyPersonas.forEach((persona) => {
            if (!ordered.some((item) => item.id === persona.id)) ordered.push(persona);
        });
        return ordered;
    }, [currentYear, yearlyPersonas]);

    useEffect(() => {
        if (!compareCandidates.length) {
            setTargetId('');
            return;
        }
        if (!targetId || !compareCandidates.some((item) => item.id === targetId)) {
            setTargetId(compareCandidates[0].id);
        }
    }, [compareCandidates, targetId]);

    const comparePersona = useMemo(
        () => compareCandidates.find((item) => item.id === targetId) || compareCandidates[0] || null,
        [compareCandidates, targetId],
    );

    const getTracksBySource = useCallback((persona) => {
        if (!persona) return [];
        const bubble = persona.bubbleTracks || { recent: [], liked: [], top: [] };
        if (source === 'liked') return bubble.liked || [];
        if (source === 'top') return bubble.top || [];
        return bubble.recent?.length ? bubble.recent : (bubble.top || []);
    }, [source]);

    const myTracks = getTracksBySource(currentPersona);
    const otherTracks = getTracksBySource(comparePersona);

    const viz = useMemo(() => {
        const myMap = buildGenreWeightMapForCompare(currentPersona?.topGenres || []);
        const otherMap = buildGenreWeightMapForCompare(comparePersona?.topGenres || []);
        const allKeys = [...new Set([...myMap.keys(), ...otherMap.keys()])];
        const bubbles = [];
        const sharedCores = [];
        const links = [];

        allKeys.forEach((key) => {
            const myEntry = myMap.get(key) || null;
            const otherEntry = otherMap.get(key) || null;
            const shared = Boolean(myEntry && otherEntry);
            const label = myEntry?.label || otherEntry?.label || key;
            const overlap = shared ? compareOverlapStrength(myEntry?.weight, otherEntry?.weight) : 0;

            let myX = 50;
            let myY = 50;
            let otherX = 50;
            let otherY = 50;

            if (mode === 'split') {
                myX = 8 + hash01(`${key}:mx`) * 34;
                otherX = 58 + hash01(`${key}:ox`) * 34;
                myY = 16 + hash01(`${key}:my`) * 68;
                otherY = 16 + hash01(`${key}:oy`) * 68;
            } else if (shared) {
                const centerSpread = 4 + (1 - overlap) * 20;
                const centerX = 50 + (hash01(`${key}:cx`) - 0.5) * 2 * centerSpread;
                const centerYRaw = 18 + hash01(`${key}:cy`) * 66;
                const centerY = centerYRaw + (50 - centerYRaw) * (0.28 + overlap * 0.22);
                const pairGap = 2.1 + (1 - overlap) * 5.1;
                myX = centerX - pairGap;
                otherX = centerX + pairGap;
                myY = centerY;
                otherY = centerY;
                sharedCores.push({
                    key: `core:${key}`,
                    genreKey: key,
                    label,
                    x: centerX,
                    y: centerY,
                    size: Math.max(18, Math.min(38, 18 + overlap * 22)),
                    overlap,
                });
            } else if (myEntry) {
                myX = 10 + hash01(`${key}:lx`) * 30;
                myY = 18 + hash01(`${key}:ly`) * 66;
            } else {
                otherX = 60 + hash01(`${key}:rx`) * 30;
                otherY = 18 + hash01(`${key}:ry`) * 66;
            }

            if (myEntry) {
                bubbles.push({
                    id: `my:${key}`,
                    genreKey: key,
                    label,
                    owner: 'me',
                    shared,
                    size: compareWeightToSize(myEntry.weight),
                    x: myX,
                    y: myY,
                });
            }
            if (otherEntry) {
                bubbles.push({
                    id: `other:${key}`,
                    genreKey: key,
                    label,
                    owner: 'other',
                    shared,
                    size: compareWeightToSize(otherEntry.weight),
                    x: otherX,
                    y: otherY,
                });
            }
            if (shared && mode === 'split') {
                links.push({ key: `link:${key}`, x1: myX, y1: myY, x2: otherX, y2: otherY });
            }
        });

        const relaxed = resolveCompareBubbleCollisions(bubbles, mode).sort((a, b) => {
            if (a.shared !== b.shared) return a.shared ? 1 : -1;
            return b.size - a.size;
        });

        const enhancedCores = sharedCores.map((core) => {
            const overlapDepth = core.overlap;
            const depth = 0.65 + overlapDepth * 0.28;
            const scale = 0.98 + overlapDepth * 0.12;
            const blur = Math.max(0, 1.1 - overlapDepth * 1.1);
            return {
                ...core,
                depth,
                scale,
                blur,
                z: Math.round(depth * 54),
            };
        });

        const enhancedBubbles = relaxed.map((bubble) => {
            const overlap = bubble.shared
                ? compareOverlapStrength(myMap.get(bubble.genreKey)?.weight, otherMap.get(bubble.genreKey)?.weight)
                : 0;
            const sizeNorm = Math.max(0, Math.min(1, (bubble.size - 26) / (58 - 26)));
            const ownerBias = bubble.owner === 'me' ? 0.1 : 0.04;
            const sharedBoost = bubble.shared ? 0.28 : 0;
            const depth = Math.max(0.08, Math.min(0.96, 0.16 + sizeNorm * 0.46 + sharedBoost + ownerBias + overlap * 0.16));
            const blur = Math.max(0, (1 - depth) * 2.1);
            const scale = 0.9 + depth * 0.2;
            const alpha = 0.62 + depth * 0.38;
            return {
                ...bubble,
                depth,
                blur,
                scale,
                alpha,
                z: Math.round(depth * 68),
            };
        }).sort((a, b) => a.depth - b.depth);

        return {
            allKeys,
            bubbles: enhancedBubbles,
            sharedCores: enhancedCores,
            links,
            myMap,
            otherMap,
            sharedCount: allKeys.filter((key) => myMap.has(key) && otherMap.has(key)).length,
        };
    }, [comparePersona?.topGenres, currentPersona?.topGenres, mode]);

    const activeGenreKey = useMemo(() => {
        if (!viz.allKeys.length) return null;
        if (selectedGenreKey && viz.allKeys.includes(selectedGenreKey)) return selectedGenreKey;
        return viz.allKeys[0];
    }, [selectedGenreKey, viz.allKeys]);

    const selectedMy = activeGenreKey ? viz.myMap.get(activeGenreKey) : null;
    const selectedOther = activeGenreKey ? viz.otherMap.get(activeGenreKey) : null;
    const selectedLabel = selectedMy?.label || selectedOther?.label || '-';
    const selectedOverlap = selectedMy && selectedOther
        ? Math.round(compareOverlapStrength(selectedMy.weight, selectedOther.weight) * 100)
        : null;
    const myGenreTracks = filterCompareTracksByGenre(myTracks, activeGenreKey).slice(0, 4);
    const otherGenreTracks = filterCompareTracksByGenre(otherTracks, activeGenreKey).slice(0, 4);
    const depthSceneKey = `${mode}:${source}:${comparePersona?.id || 'none'}:${activeGenreKey || 'none'}`;

    if (!currentPersona || compareCandidates.length === 0) {
        return (
            <section className="tm-yearcmp-panel">
                <div className="tm-yearcmp-head">
                    <h3>Year Persona Compare</h3>
                    <span>{lang === 'en' ? 'Preparing year comparison data' : '연도별 비교 데이터 준비 중'}</span>
                </div>
                <div className="tm-yearcmp-empty">
                    {lang === 'en'
                        ? 'Not enough tracks with year data to build this comparison.'
                        : '연도 정보가 포함된 트랙이 충분하지 않아서 비교를 만들 수 없습니다.'}
                </div>
            </section>
        );
    }

    return (
        <section className="tm-yearcmp-panel">
            <div className="tm-yearcmp-head">
                <h3>Year Persona Compare</h3>
                <span>{copy.yearCompareDesc}</span>
            </div>

            <div className="tm-yearcmp-targets">
                {compareCandidates.map((item) => (
                    <button
                        key={item.id}
                        className={`tm-yearcmp-target-btn${comparePersona?.id === item.id ? ' active' : ''}`}
                        onClick={() => setTargetId(item.id)}
                    >
                        {item.displayName}
                    </button>
                ))}
            </div>

            <div className="tm-yearcmp-controls">
                <div className="tm-yearcmp-seg">
                    {[
                        { id: 'blend', label: 'Blend' },
                        { id: 'split', label: 'Split' },
                    ].map((item) => (
                        <button
                            key={item.id}
                            className={`tm-yearcmp-seg-btn${mode === item.id ? ' active' : ''}`}
                            onClick={() => setMode(item.id)}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
                <div className="tm-yearcmp-seg">
                    {[
                        { id: 'recent', label: '최근' },
                        { id: 'liked', label: '좋아요' },
                        { id: 'top', label: 'TOP' },
                    ].map((item) => (
                        <button
                            key={item.id}
                            className={`tm-yearcmp-seg-btn${source === item.id ? ' active' : ''}`}
                            onClick={() => setSource(item.id)}
                        >
                            {compareSourceLabel(item.id, lang)}
                        </button>
                    ))}
                </div>
                <div className="tm-yearcmp-count">
                    {copy.overlap} {viz.sharedCount} · {copy.current} {viz.myMap.size} · {comparePersona.displayName} {viz.otherMap.size}
                </div>
            </div>

            <div className={`tm-yearcmp-canvas mode-${mode}`}>
                <YearCompareDepthScene sceneKey={depthSceneKey} />
                {viz.sharedCores.map((core) => (
                    <span
                        key={core.key}
                        className="tm-yearcmp-float"
                        style={{
                            left: `${core.x}%`,
                            top: `${core.y}%`,
                            zIndex: 40 + (core.z || 0),
                            '--tm-cmp-float-dur': `${(11 + hash01(`${core.key}:dur`) * 9).toFixed(2)}s`,
                            '--tm-cmp-float-delay': `${(-7 + hash01(`${core.key}:delay`) * 6).toFixed(2)}s`,
                            '--tm-cmp-float-dx': `${(-5 + hash01(`${core.key}:dx`) * 10).toFixed(2)}px`,
                            '--tm-cmp-float-dy': `${(-7 + hash01(`${core.key}:dy`) * 12).toFixed(2)}px`,
                            '--tm-cmp-z': `${Math.round(core.z || 0)}px`,
                            '--tm-cmp-scale': `${(core.scale || 1).toFixed(3)}`,
                            '--tm-cmp-blur': `${(core.blur || 0).toFixed(3)}px`,
                            '--tm-cmp-alpha': '1',
                        }}
                    >
                        <button
                            className={`tm-yearcmp-core${activeGenreKey === core.genreKey ? ' active' : ''}`}
                            style={{ width: `${core.size}px`, height: `${core.size}px` }}
                            onClick={() => setSelectedGenreKey(core.genreKey)}
                            title={`${core.label} · ${copy.overlap} ${Math.round(core.overlap * 100)}%`}
                        >
                            <span>{Math.round(core.overlap * 100)}%</span>
                        </button>
                    </span>
                ))}
                {viz.bubbles.map((bubble) => (
                    <span
                        key={bubble.id}
                        className="tm-yearcmp-float"
                        style={{
                            left: `${bubble.x}%`,
                            top: `${bubble.y}%`,
                            zIndex: 20 + (bubble.z || 0),
                            '--tm-cmp-float-dur': `${(11 + hash01(`${bubble.id}:dur`) * 9).toFixed(2)}s`,
                            '--tm-cmp-float-delay': `${(-7 + hash01(`${bubble.id}:delay`) * 6).toFixed(2)}s`,
                            '--tm-cmp-float-dx': `${(-5 + hash01(`${bubble.id}:dx`) * 10).toFixed(2)}px`,
                            '--tm-cmp-float-dy': `${(-7 + hash01(`${bubble.id}:dy`) * 12).toFixed(2)}px`,
                            '--tm-cmp-z': `${Math.round(bubble.z || 0)}px`,
                            '--tm-cmp-scale': `${(bubble.scale || 1).toFixed(3)}`,
                            '--tm-cmp-blur': `${(bubble.blur || 0).toFixed(3)}px`,
                            '--tm-cmp-alpha': `${(bubble.alpha || 1).toFixed(3)}`,
                        }}
                    >
                        <button
                            className={`tm-yearcmp-bubble ${bubble.owner}${bubble.shared ? ' shared' : ''}${activeGenreKey === bubble.genreKey ? ' active' : ''}`}
                            style={{ width: `${bubble.size}px`, height: `${bubble.size}px` }}
                            onClick={() => setSelectedGenreKey(bubble.genreKey)}
                            title={bubble.label}
                        >
                            <span>{bubble.label}</span>
                        </button>
                    </span>
                ))}
            </div>

            <div className="tm-yearcmp-legend">
                <span className="tm-yearcmp-chip me">{currentPersona.displayName}</span>
                <span className="tm-yearcmp-chip shared">{copy.sharedTaste}</span>
                <span className="tm-yearcmp-chip other">{comparePersona.displayName}</span>
            </div>

            {activeGenreKey && (
                <div className="tm-yearcmp-detail">
                    <div className="tm-yearcmp-detail-head">
                        <strong>{selectedLabel}</strong>
                        <span>
                            {selectedMy
                                ? `${currentPersona.displayName} ${selectedMy.weight}`
                                : `${currentPersona.displayName} ${lang === 'en' ? 'none' : '없음'}`} · {' '}
                            {selectedOther
                                ? `${comparePersona.displayName} ${selectedOther.weight}`
                                : `${comparePersona.displayName} ${lang === 'en' ? 'none' : '없음'}`}
                            {selectedOverlap !== null ? ` · ${copy.overlap} ${selectedOverlap}%` : ''}
                        </span>
                    </div>
                    <div className="tm-yearcmp-track-cols">
                        <div className="tm-yearcmp-track-col">
                            <p>{currentPersona.displayName} · {compareSourceLabel(source, lang)} {copy.representativeTracks}</p>
                            <ul>
                                {myGenreTracks.map((track) => (
                                    <li key={`my-${track.id}`}>{track.name}</li>
                                ))}
                                {myGenreTracks.length === 0 && <li>{copy.noTrackInGenre}</li>}
                            </ul>
                        </div>
                        <div className="tm-yearcmp-track-col">
                            <p>{comparePersona.displayName} · {compareSourceLabel(source, lang)} {copy.representativeTracks}</p>
                            <ul>
                                {otherGenreTracks.map((track) => (
                                    <li key={`other-${track.id}`}>{track.name}</li>
                                ))}
                                {otherGenreTracks.length === 0 && <li>{copy.noTrackInGenre}</li>}
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

// ─── Canvas renderer ──────────────────────────────────────────────────────────
const PADDING = { top: 48, right: 32, bottom: 56, left: 56 };
const BUBBLE_BASE_WORLD_SCALE = 5.0;
const BUBBLE_MAX_COUNT = 2000;
// Allow pulling far enough back to see the taste field with generous context.
const BUBBLE_ZOOM_MIN = 0.1;
const BUBBLE_ZOOM_MAX = 5.0;

function drawMap(canvas, tracks, assignments, centroids, hoveredIdx, activeTrackIds, xAxis, yAxis, clusterLabels) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const pw = W - PADDING.left - PADDING.right;
    const ph = H - PADDING.top - PADDING.bottom;
    const xMeta = FEATURE_META[xAxis];
    const yMeta = FEATURE_META[yAxis];

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#12161d';
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const x = PADDING.left + (pw / 4) * i;
        const y = PADDING.top + (ph / 4) * i;
        ctx.beginPath();
        ctx.moveTo(x, PADDING.top);
        ctx.lineTo(x, PADDING.top + ph);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(PADDING.left, y);
        ctx.lineTo(PADDING.left + pw, y);
        ctx.stroke();
    }

    // Axis labels
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '11px "Pretendard Variable", "Pretendard", "Noto Sans KR", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(xMeta.low.toUpperCase(), PADDING.left, PADDING.top - 8);
    ctx.textAlign = 'right';
    ctx.fillText(xMeta.high.toUpperCase(), PADDING.left + pw, PADDING.top - 8);

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillText(`${xMeta.label} Axis`, PADDING.left + pw / 2, H - 16);

    ctx.save();
    ctx.translate(14, PADDING.top + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillText(`${yMeta.low.toUpperCase()}  →  ${yMeta.high.toUpperCase()}`, 0, 0);
    ctx.restore();

    // Axis arrow
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PADDING.left, PADDING.top + ph);
    ctx.lineTo(PADDING.left + pw, PADDING.top + ph);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(PADDING.left, PADDING.top + ph);
    ctx.lineTo(PADDING.left, PADDING.top);
    ctx.stroke();

    // Draw cluster regions (soft glow behind dots)
    const clusterBounds = centroids.map((c, j) => ({
        x: PADDING.left + getCentroidFeature(c, xAxis) * pw,
        y: PADDING.top + (1 - getCentroidFeature(c, yAxis)) * ph,
        color: CLUSTER_COLORS[j % CLUSTER_COLORS.length],
    }));

    clusterBounds.forEach(({ x, y, color }) => {
        const grad = ctx.createRadialGradient(x, y, 10, x, y, 100);
        grad.addColorStop(0, `${color}22`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, 100, 0, Math.PI * 2);
        ctx.fill();
    });

    const hasActiveFilter = activeTrackIds instanceof Set;
    const activeClusterIds = new Set();
    if (hasActiveFilter) {
        tracks.forEach((track, idx) => {
            if (activeTrackIds.has(track.id)) {
                const clusterId = assignments[idx];
                if (Number.isInteger(clusterId)) activeClusterIds.add(clusterId);
            }
        });
    }

    // Draw dots
    tracks.forEach((t, i) => {
        const cx = PADDING.left + getTrackFeature(t, xAxis) * pw;
        const cy = PADDING.top + (1 - getTrackFeature(t, yAxis)) * ph;
        const clusterIdx = assignments[i];
        const color = CLUSTER_COLORS[clusterIdx % CLUSTER_COLORS.length];
        const isHovered = hoveredIdx === i;
        const isActive = !hasActiveFilter || activeTrackIds.has(t.id);
        const alpha = isActive ? 1 : 0.15;
        const r = isHovered ? 7 : 4.5;

        ctx.globalAlpha = alpha;
        if (isHovered) {
            ctx.shadowColor = color;
            ctx.shadowBlur = 14;
        } else {
            ctx.shadowBlur = 0;
        }
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    });

    // Cluster centroids labels
    centroids.forEach((c, j) => {
        const x = PADDING.left + getCentroidFeature(c, xAxis) * pw;
        const y = PADDING.top + (1 - getCentroidFeature(c, yAxis)) * ph;
        const color = CLUSTER_COLORS[j % CLUSTER_COLORS.length];
        const label = clusterLabels?.[j] || getClusterLabel(c);
        const isActive = !hasActiveFilter || activeClusterIds.has(j);
        ctx.globalAlpha = isActive ? 1 : 0.25;

        ctx.fillStyle = color;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-5, -5, 10, 10);
        ctx.restore();

        ctx.fillStyle = color;
        ctx.font = 'bold 10px "Neue Montreal", "Pretendard Variable", "Noto Sans KR", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${label.name}`, x, y - 12);
        ctx.globalAlpha = 1;
    });
}

function SpectraSymbol({ symbol = 'headset', className = '' }) {
    return (
        <span className={`tm-symbol tm-symbol-${symbol}${className ? ` ${className}` : ''}`} aria-hidden>
            <span className="tm-symbol-core" />
        </span>
    );
}

// ─── Main Page Component ──────────────────────────────────────────────────────
export default function TasteMapPage() {
    const {
        tracks: importedTracks,
        stats: importedStats,
        mapId,
        reset,
    } = useTasteData();
    const user = null; // no account model — taste comes from the imported list
    const login = reset; // "re-import" replaces the old "re-login"
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const bubbleFieldRef = useRef(null);
    const bubbleLayerRef = useRef(null);
    const heatmapCanvasRef = useRef(null);
    const heatmapSpritesRef = useRef(new Map());
    const threeFieldRef = useRef(null);
    const followedListRef = useRef(null);
    const savedAlbumListRef = useRef(null);
    const timelineRowRef = useRef(null);
    const mapTagStripRef = useRef(null);
    const mapTagDragRef = useRef({ dragging: false, moved: false, pointerId: null, startX: 0, scrollLeft: 0 });
    const panRef = useRef({ dragging: false, moved: false, startX: 0, startY: 0, camX: 0, camY: 0, lastMoveAt: 0 });
    const panVisualFrameRef = useRef(0);
    const panVisualOffsetRef = useRef({ x: 0, y: 0 });
    const pendingPanCommitRef = useRef(false);
    const pinchRef = useRef({ pointers: new Map(), active: false, startDist: 0, startZoom: 1, anchorX: 0, anchorY: 0 });
    const pendingAxisFocusRef = useRef(false);
    const bubbleAutoCenteredRef = useRef(false);
    const ambientUiTimerRef = useRef(null);
    const timelineMorphTimerRef = useRef(null);
    const formationTimersRef = useRef([]);
    const expandHighlightTimerRef = useRef(null);
    const magneticActiveIdsRef = useRef(new Set());
    const magneticFrameRef = useRef(0);
    const magneticPointerRef = useRef({ x: 0, y: 0 });
    const magneticCursorRef = useRef(null);
    const bubbleDragRef = useRef({
        pointerId: null,
        trackId: null,
        element: null,
        startX: 0,
        startY: 0,
        moved: false,
        lastMoveAt: 0,
    });
    const bubbleSpringTimersRef = useRef(new Map());

    const [activeMapView, setActiveMapView] = useState('field');
    const [tracks, setTracks] = useState([]);
    const [tracksSource, setTracksSource] = useState('lastfm');
    const [assignments, setAssignments] = useState([]);
    const [centroids, setCentroids] = useState([]);
    const [clusterVectors, setClusterVectors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dataStats, setDataStats] = useState(null);
    const source = activeMapView === 'spotify' ? 'spotify' : 'lastfm';
    const clusterBasis = 'genre'; // fixed
    const [effectiveClusterBasis, setEffectiveClusterBasis] = useState('genre');
    const [noiseClusterId, setNoiseClusterId] = useState(null);
    const viewMode = 'bubble';
    const [xAxis, setXAxis] = useState('valence');
    const [yAxis, setYAxis] = useState('energy');
    const [zAxis, setZAxis] = useState('danceability');
    const [axisPreset, setAxisPreset] = useState('mood');
    const [genreVocab, setGenreVocab] = useState([]);
    const [timelineGranularity, setTimelineGranularity] = useState('month'); // 'month' | 'quarter'
    const [timelineRange, setTimelineRange] = useState('12m'); // '6m' | '12m' | '24m' | 'all'
    const [cacheUserId, setCacheUserId] = useState('guest');
    const [cacheReady, setCacheReady] = useState(false);

    const [hoveredIdx, setHoveredIdx] = useState(null);
    const [hoveredTrack, setHoveredTrack] = useState(null);
    const [hoveredPos, setHoveredPos] = useState({ x: 0, y: 0 });
    const [selectedCluster, setSelectedCluster] = useState(null);
    const [selectedPeriodKey, setSelectedPeriodKey] = useState(null);
    const [canvasSize, setCanvasSize] = useState({ w: 800, h: 520 });
    const [bubbleFieldSize, setBubbleFieldSize] = useState({ w: 0, h: 0 });
    const [threeFieldSize, setThreeFieldSize] = useState({ w: 0, h: 0 });
    const [camera, setCamera] = useState({ x: 0, y: 0 });
    const [bubbleZoom, setBubbleZoom] = useState(0.6);
    const [hoveredBubbleId, setHoveredBubbleId] = useState(null);
    const [nowPlayingTrackId, setNowPlayingTrackId] = useState(null);
    const [scrollHint, setScrollHint] = useState(false);
    const [clusterLoading, setClusterLoading] = useState(false);
    const [bubbleNodesResult, setBubbleNodesResult] = useState([]);
    const [recentPlayMap] = useState(() => new Map()); // Spotify recently-played is gone; stays empty.
    const [analysisProgress, setAnalysisProgress] = useState(0);
    const analysisProgressRef = useRef(0);
    // Followed artists / saved albums were Spotify-only — these stay empty now.
    const librarySummary = null;
    const libraryLoading = false;
    const libraryError = null;
    const [mapFullscreen, setMapFullscreen] = useState(false);
    const [exploreEnabled, setExploreEnabled] = useState(false);
    const [exploreLoading, setExploreLoading] = useState(false);
    const [exploreError, setExploreError] = useState(null);
    const [exploreRecs, setExploreRecs] = useState([]);
    const [hoveredExploreId, setHoveredExploreId] = useState(null);
    const [savingLibraryTrackIds] = useState({}); // no async library save anymore; stays empty.
    const [savedFromRecIds, setSavedFromRecIds] = useState({});
    const [recActionMessage, setRecActionMessage] = useState(null);
    const [bubbleContextMenu, setBubbleContextMenu] = useState(null);
    const [selectedTrackCard, setSelectedTrackCard] = useState(null);
    const [expandedClusterPulseId, setExpandedClusterPulseId] = useState(null);
    const [spectraExpandTrackId, setSpectraExpandTrackId] = useState(null);
    const [spectraAffinityMap, setSpectraAffinityMap] = useState({});
    const [shareMode, setShareMode] = useState(false);
    const [shareSelectedMap, setShareSelectedMap] = useState({});
    const [expandPinMap, setExpandPinMap] = useState({});
    const [shareMessage, setShareMessage] = useState(null);
    const [showUtilityControls, setShowUtilityControls] = useState(false);
    const [dashboardOpen, setDashboardOpen] = useState(false);
    const [subwayGeneratorOpen, setSubwayGeneratorOpen] = useState(false);
    const [ambientUiVisible, setAmbientUiVisible] = useState(false);
    const [timelineMorphing, setTimelineMorphing] = useState(false);
    const [formationPhase, setFormationPhase] = useState('idle'); // idle | dark | seed | organize | labels | settled
    const [formationPlayed, setFormationPlayed] = useState(false);
    const [activeGenreFamily, setActiveGenreFamily] = useState('');
    const [activeEmotionRegion, setActiveEmotionRegion] = useState('');
    const [deepAnalysisOpen, setDeepAnalysisOpen] = useState(false);
    const [magneticPullEnabled, setMagneticPullEnabled] = useState(() => {
        if (typeof window === 'undefined') return true;
        return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    });
    const [lang, setLang] = useState(() => {
        if (typeof window === 'undefined') return 'ko';
        const saved = window.localStorage.getItem(TM_LOCALE_STORAGE_KEY);
        return saved === 'en' ? 'en' : 'ko';
    });
    const [mapTheme, setMapTheme] = useState(() => {
        if (typeof window === 'undefined') return 'dark';
        const saved = window.localStorage.getItem(TM_THEME_STORAGE_KEY);
        return saved === 'day' ? 'day' : 'dark';
    });
    const scrollHintTimerRef = useRef(null);
    const bubbleZoomRef = useRef(bubbleZoom);
    const cameraRef = useRef(camera);
    const queuedCameraRef = useRef(null);
    const cameraRafRef = useRef(0);
    const queuedZoomCameraRef = useRef(null);
    const zoomCameraRafRef = useRef(0);
    const cameraAnimationRafRef = useRef(0);
    const kmeansWorkerRef = useRef(null);
    const bubbleLayoutWorkerRef = useRef(null);
    const copy = TM_I18N[lang] || TM_I18N.ko;

    const handleMapTagPointerDown = useCallback((event) => {
        if (event.button !== undefined && event.button !== 0) return;
        const strip = mapTagStripRef.current;
        if (!strip) return;
        mapTagDragRef.current = {
            dragging: true,
            moved: false,
            pointerId: event.pointerId,
            startX: event.clientX,
            scrollLeft: strip.scrollLeft,
        };
        strip.classList.add('is-dragging');
        try { strip.setPointerCapture(event.pointerId); } catch { /* ignore */ }
    }, []);

    const handleMapTagPointerMove = useCallback((event) => {
        const drag = mapTagDragRef.current;
        const strip = mapTagStripRef.current;
        if (!strip || !drag.dragging || drag.pointerId !== event.pointerId) return;
        const dx = event.clientX - drag.startX;
        if (!drag.moved && Math.abs(dx) > 4) drag.moved = true;
        if (!drag.moved) return;
        strip.scrollLeft = drag.scrollLeft - dx;
        if (event.cancelable) event.preventDefault();
    }, []);

    const handleMapTagPointerEnd = useCallback((event) => {
        const drag = mapTagDragRef.current;
        const strip = mapTagStripRef.current;
        if (!drag.dragging || drag.pointerId !== event.pointerId) return;
        drag.dragging = false;
        strip?.classList.remove('is-dragging');
        try { strip?.releasePointerCapture(event.pointerId); } catch { /* ignore */ }
        window.setTimeout(() => { mapTagDragRef.current.moved = false; }, 0);
    }, []);

    const handleMapTagClickCapture = useCallback((event) => {
        if (!mapTagDragRef.current.moved) return;
        event.preventDefault();
        event.stopPropagation();
    }, []);

    const handleMapViewChange = useCallback((nextView) => {
        if (nextView === activeMapView) return;
        bubbleAutoCenteredRef.current = false;
        setSelectedCluster(null);
        setSelectedPeriodKey(null);
        setSpectraExpandTrackId(null);
        setExploreEnabled(false);
        setExploreRecs([]);
        setActiveMapView(nextView);
    }, [activeMapView]);

    const triggerExpandedClusterHighlight = useCallback((clusterId) => {
        if (!Number.isInteger(clusterId)) return;
        if (expandHighlightTimerRef.current) {
            window.clearTimeout(expandHighlightTimerRef.current);
        }
        setExpandedClusterPulseId(clusterId);
        expandHighlightTimerRef.current = window.setTimeout(() => {
            setExpandedClusterPulseId((prev) => (prev === clusterId ? null : prev));
            expandHighlightTimerRef.current = null;
        }, 2200);
    }, []);

    useEffect(() => () => {
        if (expandHighlightTimerRef.current) {
            window.clearTimeout(expandHighlightTimerRef.current);
        }
    }, []);

    useEffect(() => () => {
        bubbleSpringTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
        bubbleSpringTimersRef.current.clear();
    }, []);

    useEffect(() => {
        setCacheUserId(mapId || 'guest');
        setCacheReady(true);
    }, [mapId]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(TM_LOCALE_STORAGE_KEY, lang);
        }
        if (typeof document !== 'undefined') {
            document.documentElement.lang = lang === 'en' ? 'en' : 'ko';
        }
    }, [lang]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(TM_THEME_STORAGE_KEY, mapTheme);
    }, [mapTheme]);

    // Followed-artists / saved-albums came from Spotify and no longer apply.
    // recentPlayMap stays empty; librarySummary stays null (UI renders empty).

    // ── Taste data (Last.fm field + Spotify field, from TasteDataContext) ──
    const fetchTracks = useCallback(async () => {
        const mapped = (importedTracks || []).map((track) => {
            if (activeMapView !== 'spotify') return track;
            const spotifyFeatures = track?.spotifyFeatures || {};
            return {
                ...track,
                ...spotifyFeatures,
                genres: Array.isArray(track?.spotifyGenres) ? track.spotifyGenres : [],
                featuresSource: 'spotify-genres',
            };
        });
        const usable = mapped.filter(
            (t) => t.valence !== null && t.valence !== undefined,
        );
        return {
            tracks: usable,
            source: activeMapView === 'spotify' ? 'spotify' : 'lastfm',
            stats: importedStats || {
                fetchedCount: usable.length,
                totalAvailable: usable.length,
            },
        };
    }, [importedTracks, importedStats, activeMapView]);

    useEffect(() => {
        if (!cacheReady) return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        fetchTracks().then((data) => {
            if (cancelled) return;
            setTracks(data.tracks);
            setTracksSource(data.source);
            setDataStats(data.stats);
            setSelectedCluster(null);
            setLoading(false);
        });
        return () => { cancelled = true; };
    }, [fetchTracks, cacheReady]);

    useEffect(() => {
        const matched = resolveAxisPreset(xAxis, yAxis);
        setAxisPreset(matched?.key || 'custom');
    }, [xAxis, yAxis]);

    // ── Run clustering via Web Worker (automatic cluster count) ─────────────
    useEffect(() => {
        // During a map-tab transition, `source` changes one render before the
        // mapped track set. Do not launch a worker against the previous field.
        if (tracksSource !== source) {
            setClusterLoading(false);
            return;
        }
        if (tracks.length < 2) {
            setAssignments([]);
            setCentroids([]);
            setClusterVectors([]);
            setGenreVocab([]);
            setNoiseClusterId(null);
            setEffectiveClusterBasis('audio');
            setClusterLoading(false);
            return;
        }

        // Build cache key before dispatching to worker
        const trackSignature = `${tracks.length}:${hashText(tracks.map((track) => {
            if (clusterBasis === 'genre') return `${track.id}:${getTrackGenres(track).join(',')}`;
            const fv = FEATURE_KEYS.map((key) => Math.round(getTrackFeature(track, key) * 1000)).join(',');
            return `${track.id}:${fv}`;
        }).join('|'))}`;
        const clusterCacheKey = `${TM_CLUSTER_CACHE_PREFIX}|u:${cacheUserId}|s:${source}|b:${clusterBasis}|alg:dbscan-v3|sig:${trackSignature}`;
        const clusterHit = readSessionCache(clusterCacheKey, TM_CLUSTER_CACHE_TTL_MS);
        if (clusterHit && Array.isArray(clusterHit.assignments) && Array.isArray(clusterHit.centroids)) {
            // Recompute audio points for clusterVectors (needed downstream) — cheap
            const audioPoints = tracks.map((t) => getTrackVector(t));
            setClusterVectors(audioPoints);
            setAssignments(clusterHit.assignments);
            setCentroids(clusterHit.centroids);
            setGenreVocab(Array.isArray(clusterHit.genreVocab) ? clusterHit.genreVocab : []);
            setNoiseClusterId(Number.isInteger(clusterHit.noiseClusterId) ? clusterHit.noiseClusterId : null);
            setEffectiveClusterBasis(clusterHit.effectiveClusterBasis === 'genre' ? 'genre' : 'audio');
            setClusterLoading(false);
            return;
        }

        // Terminate any in-flight worker before starting a new one
        kmeansWorkerRef.current?.terminate();
        const worker = new Worker(new URL('../workers/kmeansWorker.js', import.meta.url), { type: 'module' });
        kmeansWorkerRef.current = worker;
        setClusterLoading(true);

        worker.onmessage = ({ data }) => {
            if (kmeansWorkerRef.current !== worker) return;
            setClusterVectors(data.points);
            setAssignments(data.assignments);
            setCentroids(data.centroids);
            setEffectiveClusterBasis(data.effectiveClusterBasis);
            setGenreVocab(data.genreVocab);
            setNoiseClusterId(Number.isInteger(data.noiseClusterId) ? data.noiseClusterId : null);
            writeSessionCache(clusterCacheKey, {
                assignments: data.assignments,
                centroids: data.centroids,
                genreVocab: data.genreVocab,
                noiseClusterId: Number.isInteger(data.noiseClusterId) ? data.noiseClusterId : null,
                effectiveClusterBasis: data.effectiveClusterBasis,
            });
            setClusterLoading(false);
            kmeansWorkerRef.current = null;
            worker.terminate();
        };
        worker.onerror = () => {
            if (kmeansWorkerRef.current === worker) {
                kmeansWorkerRef.current = null;
                setClusterLoading(false);
            }
            worker.terminate();
        };

        worker.postMessage({ tracks, clusterBasis });
        return () => {
            worker.terminate();
            if (kmeansWorkerRef.current === worker) kmeansWorkerRef.current = null;
        };
    }, [tracks, tracksSource, clusterBasis, cacheUserId, source]);

    const clusterStats = useMemo(() => {
        if (tracks.length === 0 || assignments.length === 0 || centroids.length === 0) return [];

        const sorted = centroids
            .map((c, j) => {
                const memberIdx = tracks
                    .map((_, i) => i)
                    .filter((i) => assignments[i] === j);
                if (memberIdx.length === 0) return null;
                const sortedMemberIdx = [...memberIdx].sort((aIdx, bIdx) => {
                    const va = clusterVectors[aIdx] || getTrackVector(tracks[aIdx]);
                    const vb = clusterVectors[bIdx] || getTrackVector(tracks[bIdx]);
                    const da = euclidDist(va, c);
                    const db = euclidDist(vb, c);
                    return da - db;
                });
                const members = sortedMemberIdx.map((idx) => tracks[idx]);
                const displayCentroid = FEATURE_KEYS.map((key) => {
                    const sum = members.reduce((acc, track) => acc + getTrackFeature(track, key), 0);
                    return sum / members.length;
                });
                const genreCount = new Map();
                members.forEach((track) => {
                    getTrackGenres(track).forEach((genre) => {
                        genreCount.set(genre, (genreCount.get(genre) || 0) + 1);
                    });
                });
                const topGenres = [...genreCount.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 6)
                    .map(([genre]) => genre);
                const isNoiseCluster = effectiveClusterBasis === 'genre'
                    && Number.isInteger(noiseClusterId)
                    && j === noiseClusterId;
                const label = isNoiseCluster
                    ? { name: 'Mixed / Other', symbol: 'matrix' }
                    : effectiveClusterBasis === 'genre'
                        ? getGenreClusterLabel(topGenres)
                        : getClusterLabel(displayCentroid);
                return {
                    j,
                    label,
                    count: members.length,
                    color: isNoiseCluster ? '#94a3b8' : CLUSTER_COLORS[j % CLUSTER_COLORS.length],
                    members,
                    centroid: displayCentroid,
                    topGenres,
                };
            })
            .filter((cluster) => cluster && cluster.count > 0)
            .sort((a, b) => b.count - a.count);

        return deduplicateClusterLabels(sorted);
    }, [tracks, assignments, centroids, clusterVectors, effectiveClusterBasis, noiseClusterId]);

    useEffect(() => {
        if (selectedCluster !== null && !clusterStats.some((cluster) => cluster.j === selectedCluster)) {
            setSelectedCluster(null);
        }
    }, [clusterStats, selectedCluster]);

    const clusterById = useMemo(() => {
        const map = {};
        clusterStats.forEach((cluster) => {
            map[cluster.j] = cluster;
        });
        return map;
    }, [clusterStats]);

    const timelineSummary = useMemo(() => {
        if (tracks.length === 0 || assignments.length !== tracks.length) {
            return { hasDate: false, periods: [], datedCount: 0, visibleCount: 0 };
        }

        const datedRows = tracks
            .map((track, idx) => ({
                track,
                clusterId: assignments[idx],
                ts: getTrackTimeMs(track),
            }))
            .filter((row) => Number.isFinite(row.ts));

        if (datedRows.length === 0) {
            return { hasDate: false, periods: [], datedCount: 0, visibleCount: 0 };
        }

        const now = new Date();
        const rangeMonths = timelineRange === 'all' ? null : Number(timelineRange.replace('m', '')) || 12;
        let cutoffTs = null;
        if (rangeMonths) {
            const cutoff = new Date(now);
            cutoff.setHours(0, 0, 0, 0);
            cutoff.setMonth(cutoff.getMonth() - rangeMonths);
            cutoffTs = cutoff.getTime();
        }

        const visibleRows = cutoffTs
            ? datedRows.filter((row) => row.ts >= cutoffTs)
            : datedRows;

        if (visibleRows.length === 0) {
            return { hasDate: true, periods: [], datedCount: datedRows.length, visibleCount: 0 };
        }

        const bucketMap = new Map();
        visibleRows.forEach((row) => {
            const bucket = getTimeBucket(row.ts, timelineGranularity);
            if (!bucketMap.has(bucket.key)) {
                bucketMap.set(bucket.key, {
                    key: bucket.key,
                    label: bucket.label,
                    startTs: bucket.startTs,
                    total: 0,
                    trackIds: [],
                    clusterCounts: new Map(),
                    genreCounts: new Map(),
                });
            }
            const item = bucketMap.get(bucket.key);
            item.total += 1;
            item.trackIds.push(row.track.id);
            if (Number.isInteger(row.clusterId)) {
                item.clusterCounts.set(row.clusterId, (item.clusterCounts.get(row.clusterId) || 0) + 1);
            }
            getTrackGenres(row.track).forEach((genre) => {
                item.genreCounts.set(genre, (item.genreCounts.get(genre) || 0) + 1);
            });
        });

        const periods = [...bucketMap.values()]
            .sort((a, b) => a.startTs - b.startTs)
            .map((bucket) => {
                const dominant = [...bucket.clusterCounts.entries()].sort((a, b) => b[1] - a[1])[0] || null;
                const dominantClusterId = dominant ? dominant[0] : null;
                const dominantCount = dominant ? dominant[1] : 0;
                const dominantCluster = dominantClusterId !== null ? clusterById[dominantClusterId] : null;
                const topGenres = [...bucket.genreCounts.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 2)
                    .map(([genre]) => genre);
                const topGenreEntries = [...bucket.genreCounts.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([genre, count]) => ({
                        genre,
                        count,
                        share: bucket.total > 0 ? Math.round((count / bucket.total) * 100) : 0,
                    }));
                const topClusters = [...bucket.clusterCounts.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([clusterId, count]) => {
                        const cluster = clusterById[clusterId];
                        const share = bucket.total > 0 ? Math.round((count / bucket.total) * 100) : 0;
                        return {
                            clusterId,
                            count,
                            share,
                            color: cluster?.color || CLUSTER_COLORS[clusterId % CLUSTER_COLORS.length] || '#6b7280',
                            label: cluster?.label || { name: `Cluster ${clusterId + 1}`, symbol: 'headset' },
                        };
                    });

                return {
                    key: bucket.key,
                    label: bucket.label,
                    total: bucket.total,
                    trackIds: bucket.trackIds,
                    dominantClusterId,
                    dominantShare: bucket.total > 0 ? Math.round((dominantCount / bucket.total) * 100) : 0,
                    dominantLabel: dominantCluster?.label || null,
                    dominantColor: dominantCluster?.color || '#6b7280',
                    cardPalette: buildTimelineCardPalette(topGenreEntries, dominantCluster?.color || '#6b7280'),
                    topClusters,
                    topGenres,
                    topGenreEntries,
                };
            });

        return {
            hasDate: true,
            periods,
            datedCount: datedRows.length,
            visibleCount: visibleRows.length,
        };
    }, [tracks, assignments, timelineRange, timelineGranularity, clusterById]);

    useEffect(() => {
        if (!selectedPeriodKey) return;
        const stillExists = timelineSummary.periods.some((period) => period.key === selectedPeriodKey);
        if (!stillExists) {
            setSelectedPeriodKey(null);
        }
    }, [timelineSummary.periods, selectedPeriodKey]);

    const scrollTimelineCardIntoView = useCallback((periodKey, behavior = 'smooth') => {
        if (!periodKey) return;
        const row = timelineRowRef.current;
        if (!row) return;
        const card = row.querySelector(`[data-period-key="${periodKey}"]`);
        if (!card) return;
        card.scrollIntoView({
            behavior,
            inline: 'center',
            block: 'nearest',
        });
    }, []);

    useEffect(() => {
        if (!selectedPeriodKey) return;
        const id = window.requestAnimationFrame(() => {
            scrollTimelineCardIntoView(selectedPeriodKey, 'smooth');
        });
        return () => window.cancelAnimationFrame(id);
    }, [selectedPeriodKey, scrollTimelineCardIntoView]);

    const handleTimelinePeriodSelect = useCallback((periodKey) => {
        setSelectedPeriodKey((prev) => (prev === periodKey ? null : periodKey));
        setSelectedCluster(null);
    }, []);

    const selectedPeriodIndex = useMemo(() => {
        if (!selectedPeriodKey) return -1;
        return timelineSummary.periods.findIndex((period) => period.key === selectedPeriodKey);
    }, [timelineSummary.periods, selectedPeriodKey]);

    const canTimelineStepPrev = selectedPeriodIndex > 0 || (selectedPeriodIndex === -1 && timelineSummary.periods.length > 0);
    const canTimelineStepNext = selectedPeriodIndex >= 0 && selectedPeriodIndex < timelineSummary.periods.length - 1;

    const handleTimelineStep = useCallback((direction) => {
        if (!timelineSummary.periods.length) return;
        let nextIdx = -1;
        if (selectedPeriodIndex === -1) {
            nextIdx = direction < 0 ? timelineSummary.periods.length - 1 : 0;
        } else {
            nextIdx = selectedPeriodIndex + direction;
        }
        if (nextIdx < 0 || nextIdx >= timelineSummary.periods.length) return;
        const nextKey = timelineSummary.periods[nextIdx]?.key;
        if (!nextKey) return;
        setSelectedPeriodKey(nextKey);
        setSelectedCluster(null);
    }, [timelineSummary.periods, selectedPeriodIndex]);

    const revealAmbientUi = useCallback((duration = 2200) => {
        setAmbientUiVisible(true);
        if (ambientUiTimerRef.current) {
            window.clearTimeout(ambientUiTimerRef.current);
        }
        ambientUiTimerRef.current = window.setTimeout(() => {
            setAmbientUiVisible(false);
            ambientUiTimerRef.current = null;
        }, duration);
    }, []);

    useEffect(() => () => {
        if (ambientUiTimerRef.current) {
            window.clearTimeout(ambientUiTimerRef.current);
            ambientUiTimerRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (viewMode !== 'bubble') {
            setAmbientUiVisible(true);
            return;
        }
        revealAmbientUi(1800);
    }, [viewMode, revealAmbientUi]);

    useEffect(() => {
        if (viewMode !== 'bubble' || !selectedPeriodKey) return;
        if (timelineMorphTimerRef.current) {
            window.clearTimeout(timelineMorphTimerRef.current);
        }
        setTimelineMorphing(true);
        timelineMorphTimerRef.current = window.setTimeout(() => {
            setTimelineMorphing(false);
            timelineMorphTimerRef.current = null;
        }, 780);
        return () => {
            if (timelineMorphTimerRef.current) {
                window.clearTimeout(timelineMorphTimerRef.current);
                timelineMorphTimerRef.current = null;
            }
        };
    }, [selectedPeriodKey, viewMode]);

    useEffect(() => {
        if (viewMode !== 'bubble') return;
        if (!bubbleNodesResult.length) return;
        if (formationPlayed) return;

        setFormationPhase('dark');
        const timers = [
            window.setTimeout(() => setFormationPhase('seed'), 360),
            window.setTimeout(() => setFormationPhase('organize'), 980),
            window.setTimeout(() => setFormationPhase('labels'), 1700),
            window.setTimeout(() => {
                setFormationPhase('settled');
                setFormationPlayed(true);
            }, 2500),
        ];
        formationTimersRef.current = timers;
        return () => {
            timers.forEach((id) => window.clearTimeout(id));
            formationTimersRef.current = [];
        };
    }, [viewMode, bubbleNodesResult.length, formationPlayed]);

    useEffect(() => () => {
        formationTimersRef.current.forEach((id) => window.clearTimeout(id));
        formationTimersRef.current = [];
    }, []);

    const clusterLabelsByIndex = useMemo(() => {
        const labels = {};
        clusterStats.forEach((cluster) => {
            labels[cluster.j] = cluster.label;
        });
        return labels;
    }, [clusterStats]);

    const assignmentByTrackId = useMemo(() => {
        const map = new Map();
        tracks.forEach((track, idx) => {
            map.set(track.id, assignments[idx]);
        });
        return map;
    }, [tracks, assignments]);

    const selectedPeriodTrackIds = useMemo(() => {
        if (!selectedPeriodKey) return null;
        const period = timelineSummary.periods.find((item) => item.key === selectedPeriodKey);
        if (!period) return null;
        return new Set(period.trackIds);
    }, [timelineSummary.periods, selectedPeriodKey]);

    const activeTrackIds = useMemo(() => {
        const set = new Set();
        tracks.forEach((track, idx) => {
            if (selectedCluster !== null && assignments[idx] !== selectedCluster) return;
            if (selectedPeriodTrackIds && !selectedPeriodTrackIds.has(track.id)) return;
            set.add(track.id);
        });
        return set;
    }, [tracks, assignments, selectedCluster, selectedPeriodTrackIds]);

    const hasTrackFilter = selectedCluster !== null || !!selectedPeriodTrackIds;

    const bubbleCandidateTracks = useMemo(() => {
        if (!hasTrackFilter) return tracks;
        return tracks.filter((track) => activeTrackIds.has(track.id));
    }, [tracks, hasTrackFilter, activeTrackIds]);
    const shareSelectedTracks = useMemo(() => Object.values(shareSelectedMap), [shareSelectedMap]);
    const shareSelectedIds = useMemo(() => Object.keys(shareSelectedMap), [shareSelectedMap]);
    const expandPinIds = useMemo(() => Object.keys(expandPinMap), [expandPinMap]);
    const trackLookupById = useMemo(() => {
        const map = new Map();
        tracks.forEach((track) => {
            if (track?.id) map.set(track.id, track);
        });
        exploreRecs.forEach((item) => {
            const track = item?.track;
            if (track?.id && !map.has(track.id)) map.set(track.id, track);
        });
        return map;
    }, [tracks, exploreRecs]);
    const expandPinTracks = useMemo(
        () => expandPinIds
            .map((id) => trackLookupById.get(id) || expandPinMap[id])
            .filter((track) => track?.id && track?.name)
            .slice(0, 16),
        [expandPinIds, trackLookupById, expandPinMap],
    );

    const bubbleTracks = useMemo(() => {
        if (bubbleCandidateTracks.length <= BUBBLE_MAX_COUNT) return bubbleCandidateTracks;
        if (hasTrackFilter) {
            const selected = [];
            const seen = new Set();
            bubbleCandidateTracks.forEach((track) => {
                if (selected.length >= BUBBLE_MAX_COUNT || !activeTrackIds.has(track.id) || seen.has(track.id)) return;
                seen.add(track.id);
                selected.push(track);
            });
            sampleTracksForBubbleView(bubbleCandidateTracks, BUBBLE_MAX_COUNT).forEach((track) => {
                if (selected.length >= BUBBLE_MAX_COUNT || seen.has(track.id)) return;
                seen.add(track.id);
                selected.push(track);
            });
            return selected;
        }

        // Keep cluster proportions while guaranteeing a minimum visibility per cluster.
        const groups = new Map();
        bubbleCandidateTracks.forEach((track) => {
            const clusterId = assignmentByTrackId.get(track.id) ?? -1;
            if (!groups.has(clusterId)) groups.set(clusterId, []);
            groups.get(clusterId).push(track);
        });

        groups.forEach((arr) => arr.sort((a, b) => hash01(a.id) - hash01(b.id)));

        const selected = [];
        const cursors = new Map();
        const clusterIds = [...groups.keys()];
        const minPerCluster = 10;

        clusterIds.forEach((clusterId) => {
            const arr = groups.get(clusterId) || [];
            const take = Math.min(minPerCluster, arr.length);
            for (let i = 0; i < take; i++) selected.push(arr[i]);
            cursors.set(clusterId, take);
        });

        let added = true;
        while (selected.length < BUBBLE_MAX_COUNT && added) {
            added = false;
            for (const clusterId of clusterIds) {
                if (selected.length >= BUBBLE_MAX_COUNT) break;
                const arr = groups.get(clusterId) || [];
                const cursor = cursors.get(clusterId) || 0;
                if (cursor < arr.length) {
                    selected.push(arr[cursor]);
                    cursors.set(clusterId, cursor + 1);
                    added = true;
                }
            }
        }

        return selected.slice(0, BUBBLE_MAX_COUNT);
    }, [bubbleCandidateTracks, assignmentByTrackId, hasTrackFilter, activeTrackIds]);
    const knownTrackIds = useMemo(() => new Set(tracks.map((track) => track.id)), [tracks]);
    const spectraExpandTrack = useMemo(
        () => (spectraExpandTrackId ? tracks.find((track) => track.id === spectraExpandTrackId) || null : null),
        [tracks, spectraExpandTrackId],
    );
    const isSpectraExpandMode = exploreEnabled && !!spectraExpandTrack;

    const exploreSeedGenres = useMemo(() => {
        if (spectraExpandTrack) {
            const seedFromTrack = getTrackGenres(spectraExpandTrack).slice(0, 3);
            if (seedFromTrack.length > 0) return seedFromTrack;
        }
        const counts = new Map();
        bubbleCandidateTracks.forEach((track) => {
            getTrackGenres(track).forEach((genre) => {
                counts.set(genre, (counts.get(genre) || 0) + 1);
            });
        });
        const ranked = [...counts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([genre]) => genre);
        if (ranked.length > 0) return ranked;
        return ['electronic', 'indie', 'pop'];
    }, [bubbleCandidateTracks, spectraExpandTrack]);

    const exploreSparseAnchors = useMemo(() => {
        if (spectraExpandTrack) {
            const fx = clamp01(getTrackFeature(spectraExpandTrack, xAxis));
            const fy = clamp01(getTrackFeature(spectraExpandTrack, yAxis));
            return [{
                id: `focus-${spectraExpandTrack.id}`,
                x: fx,
                y: fy,
                seedTrackId: spectraExpandTrack.id,
            }];
        }
        const sourceTracks = hasTrackFilter ? bubbleCandidateTracks : tracks;
        if (sourceTracks.length < 12) return [];

        const cols = 7;
        const rows = 5;
        const counts = Array.from({ length: rows }, () => Array(cols).fill(0));

        sourceTracks.forEach((track) => {
            const fx = clamp01(getTrackFeature(track, xAxis));
            const fy = clamp01(getTrackFeature(track, yAxis));
            const c = Math.min(cols - 1, Math.floor(fx * cols));
            const r = Math.min(rows - 1, Math.floor(fy * rows));
            counts[r][c] += 1;
        });

        const cells = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                let neigh = 0;
                let neighCount = 0;
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const rr = r + dr;
                        const cc = c + dc;
                        if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) continue;
                        neigh += counts[rr][cc];
                        neighCount += 1;
                    }
                }
                const localDensity = neighCount > 0 ? neigh / neighCount : counts[r][c];
                const score = counts[r][c] + localDensity * 0.42;
                const tie = hash01(`${xAxis}:${yAxis}:${r}:${c}`);
                cells.push({
                    r,
                    c,
                    score,
                    tie,
                    x: (c + 0.5) / cols,
                    y: (r + 0.5) / rows,
                });
            }
        }

        cells.sort((a, b) => {
            if (a.score !== b.score) return a.score - b.score;
            return a.tie - b.tie;
        });

        const picked = [];
        for (const cell of cells) {
            const farEnough = picked.every((p) => Math.abs(p.r - cell.r) + Math.abs(p.c - cell.c) >= 2);
            if (!farEnough) continue;
            picked.push(cell);
            if (picked.length >= 3) break;
        }
        return picked.map((cell, idx) => ({ ...cell, id: `anchor-${idx}-${cell.r}-${cell.c}` }));
    }, [tracks, bubbleCandidateTracks, hasTrackFilter, xAxis, yAxis, spectraExpandTrack]);

    const bubbleWorldScale = useMemo(() => {
        const count = bubbleTracks.length;
        const densityBoost = Math.max(1, Math.sqrt(Math.max(1, count) / 110));
        return BUBBLE_BASE_WORLD_SCALE * densityBoost;
    }, [bubbleTracks.length]);

    // Debounce field size so layout worker doesn't re-fire on every resize frame
    const [debouncedFieldSize, setDebouncedFieldSize] = useState({ w: 0, h: 0 });
    useEffect(() => {
        const id = setTimeout(() => {
            setDebouncedFieldSize({
                w: bubbleFieldSize.w,
                h: bubbleFieldSize.h,
            });
        }, 150);
        return () => clearTimeout(id);
    }, [bubbleFieldSize.w, bubbleFieldSize.h]);

    // Bubble layout via Web Worker — positions stored as normalized [0,1] coords
    useEffect(() => {
        if (bubbleTracks.length === 0) { setBubbleNodesResult([]); return; }
        if (debouncedFieldSize.w === 0 || debouncedFieldSize.h === 0) return;

        bubbleLayoutWorkerRef.current?.terminate();
        const worker = new Worker(new URL('../workers/bubbleLayoutWorker.js', import.meta.url), { type: 'module' });
        bubbleLayoutWorkerRef.current = worker;

        worker.onmessage = ({ data }) => {
            const trackById = new Map(bubbleTracks.map((t) => [t.id, t]));
            const merged = data.nodes.map((n) => {
                const track = trackById.get(n.id);
                if (!track) return null;
                return {
                    ...n,
                    track,
                    style: {
                        '--tm-bubble-size': `${n.size}px`,
                        '--tm-bubble-color': n.color,
                        '--tm-float-duration': `${pickInRange(hash01(track.id + 'fd'), 12, 21)}s`,
                        '--tm-drift-x': `${pickInRange(hash01(track.id + 'dx'), -10, 10)}px`,
                        '--tm-drift-y': `${pickInRange(hash01(track.id + 'dy'), -14, 8)}px`,
                        '--tm-float-delay': `${pickInRange(hash01(track.id + 'dl'), -8, 4)}s`,
                        borderColor: `${n.color}88`,
                        backgroundImage: track.coverUrl
                            ? `linear-gradient(150deg, rgba(255,255,255,0.08), rgba(8,12,20,0.18)), url(${track.coverUrl})`
                            : `radial-gradient(circle at 30% 30%, ${n.color}, ${n.color}88)`,
                    },
                };
            }).filter(Boolean);
            setBubbleNodesResult(merged);
            worker.terminate();
        };
        worker.onerror = () => worker.terminate();

        // Build playWeight per track: recentPlayCount (1–N) wins; fallback to popularity (0–100)
        const playWeightEntries = bubbleTracks.map((t) => {
            const recent = recentPlayMap.get(t.id);
            if (recent != null) return [t.id, { type: 'recent', value: recent }];
            if (t.popularity != null) return [t.id, { type: 'popularity', value: t.popularity }];
            return [t.id, { type: 'none', value: 0 }];
        });

        const trackById = new Map(tracks.map((track) => [track.id, track]));
        const projected2dEntries = bubbleTracks
            .map((track) => {
                const sourceId = spectraAffinityMap[track.id];
                if (!sourceId) return null;
                const sourceTrack = trackById.get(sourceId);
                if (!sourceTrack) return null;
                // Keep the saved track near the expansion seed while preserving some own feature identity.
                const sourceX = clamp01(getTrackFeature(sourceTrack, xAxis));
                const sourceY = clamp01(getTrackFeature(sourceTrack, yAxis));
                const selfX = clamp01(getTrackFeature(track, xAxis));
                const selfY = clamp01(getTrackFeature(track, yAxis));
                const jx = pickInRange(hash01(`${track.id}:affx`), -0.03, 0.03);
                const jy = pickInRange(hash01(`${track.id}:affy`), -0.03, 0.03);
                const x = clamp01(sourceX * 0.72 + selfX * 0.28 + jx);
                const y = clamp01(sourceY * 0.72 + selfY * 0.28 + jy);
                return [track.id, [x, y]];
            })
            .filter(Boolean);

        const layoutTracks = bubbleTracks.map((track) => ({
            id: track.id,
            [xAxis]: getTrackFeature(track, xAxis),
            [yAxis]: getTrackFeature(track, yAxis),
        }));
        const bubbleAssignmentEntries = bubbleTracks.map((track) => [
            track.id,
            assignmentByTrackId.get(track.id),
        ]);

        worker.postMessage({
            tracks: layoutTracks,
            fieldW: debouncedFieldSize.w,
            fieldH: debouncedFieldSize.h,
            worldScale: bubbleWorldScale,
            xAxis,
            yAxis,
            assignmentEntries: bubbleAssignmentEntries,
            playWeightEntries,
            // Spectra expansion save-bias: place newly saved tracks near the expansion seed.
            projected2dEntries,
        });
        return () => { worker.terminate(); bubbleLayoutWorkerRef.current = null; };
    }, [
        bubbleTracks,
        debouncedFieldSize.w,
        debouncedFieldSize.h,
        bubbleWorldScale,
        xAxis,
        yAxis,
        assignmentByTrackId,
        recentPlayMap,
        tracks,
        spectraAffinityMap,
    ]);

    const dominantCluster = clusterStats[0] || null;
    const dominantShare = dominantCluster ? Math.round((dominantCluster.count / tracks.length) * 100) : 0;

    const diversityScore = useMemo(() => {
        if (tracks.length === 0) return 0;
        const probs = clusterStats.map((cluster) => cluster.count / tracks.length).filter((p) => p > 0);
        const entropy = -probs.reduce((sum, p) => sum + p * Math.log(p), 0);
        const maxEntropy = Math.log(Math.max(probs.length, 1));
        if (maxEntropy === 0) return 0;
        return Math.round((entropy / maxEntropy) * 100);
    }, [clusterStats, tracks.length]);

    const axisAverages = useMemo(() => {
        if (tracks.length === 0) return { x: 0, y: 0 };
        const xAvg = tracks.reduce((sum, t) => sum + getTrackFeature(t, xAxis), 0) / tracks.length;
        const yAvg = tracks.reduce((sum, t) => sum + getTrackFeature(t, yAxis), 0) / tracks.length;
        return { x: Math.round(xAvg * 100), y: Math.round(yAvg * 100) };
    }, [tracks, xAxis, yAxis]);

    const coverage = useMemo(() => {
        if (!dataStats) return null;
        const fetched = Number(dataStats.fetchedCount) || 0;
        const total = Number(dataStats.totalAvailable) || fetched;
        const analyzed = tracks.length;
        const missing = Math.max(total - fetched, 0);
        const dropped = Math.max(fetched - analyzed, 0);
        return {
            partial: missing > 0,
            text: `가져온 곡 ${fetched}/${total}곡 반영`,
            detail: missing > 0
                ? `아직 ${missing}곡 미반영`
                : (dropped > 0 ? `분석 제외 ${dropped}곡` : '전량 분석 반영'),
        };
    }, [dataStats, tracks.length]);

    const bubbleCoverage = useMemo(() => {
        if (bubbleCandidateTracks.length === 0) return null;
        if (bubbleCandidateTracks.length <= bubbleTracks.length) {
            return `${bubbleTracks.length}곡 버블 탐색`;
        }
        return `${bubbleTracks.length}/${bubbleCandidateTracks.length}곡 버블 샘플`;
    }, [bubbleCandidateTracks.length, bubbleTracks.length]);

    // ── Canvas size responsive ──────────────────────────────────────────────
    useEffect(() => {
        const update = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setCanvasSize({ w: Math.floor(rect.width), h: Math.max(420, Math.floor(rect.height * 0.7)) });
            }
        };
        update();

        const ro = new ResizeObserver(update);
        if (containerRef.current) ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        const update = () => {
            if (bubbleFieldRef.current) {
                const rect = bubbleFieldRef.current.getBoundingClientRect();
                setBubbleFieldSize({ w: Math.floor(rect.width), h: Math.floor(rect.height) });
            }
        };
        update();
        const ro = new ResizeObserver(update);
        if (bubbleFieldRef.current) ro.observe(bubbleFieldRef.current);
        return () => ro.disconnect();
    }, [viewMode, tracks.length]);

    useEffect(() => {
        const update = () => {
            if (threeFieldRef.current) {
                const rect = threeFieldRef.current.getBoundingClientRect();
                setThreeFieldSize({ w: Math.floor(rect.width), h: Math.floor(rect.height) });
            }
        };
        update();
        const ro = new ResizeObserver(update);
        if (threeFieldRef.current) ro.observe(threeFieldRef.current);
        return () => ro.disconnect();
    }, [viewMode, tracks.length]);

    const clampZoom = useCallback((z) => {
        return Math.min(BUBBLE_ZOOM_MAX, Math.max(BUBBLE_ZOOM_MIN, z));
    }, []);

    useEffect(() => {
        if (!queuedZoomCameraRef.current) bubbleZoomRef.current = bubbleZoom;
    }, [bubbleZoom]);
    useEffect(() => {
        if (!queuedZoomCameraRef.current && !queuedCameraRef.current) cameraRef.current = camera;
    }, [camera]);

    const scheduleCameraUpdate = useCallback((nextCamera) => {
        if (!nextCamera) return;
        if (queuedZoomCameraRef.current) {
            queuedZoomCameraRef.current = {
                ...queuedZoomCameraRef.current,
                camera: nextCamera,
            };
            cameraRef.current = nextCamera;
            return;
        }
        const base = queuedCameraRef.current || cameraRef.current;
        if (Math.abs(base.x - nextCamera.x) < 0.05 && Math.abs(base.y - nextCamera.y) < 0.05) return;
        queuedCameraRef.current = nextCamera;
        cameraRef.current = nextCamera;
        if (cameraRafRef.current) return;
        cameraRafRef.current = window.requestAnimationFrame(() => {
            cameraRafRef.current = 0;
            const finalCamera = queuedCameraRef.current;
            queuedCameraRef.current = null;
            if (!finalCamera) return;
            setCamera((prev) => (
                Math.abs(prev.x - finalCamera.x) < 0.05 && Math.abs(prev.y - finalCamera.y) < 0.05
                    ? prev
                    : finalCamera
            ));
        });
    }, []);

    useEffect(() => () => {
        if (cameraRafRef.current) {
            window.cancelAnimationFrame(cameraRafRef.current);
            cameraRafRef.current = 0;
        }
        if (cameraAnimationRafRef.current) {
            window.cancelAnimationFrame(cameraAnimationRafRef.current);
            cameraAnimationRafRef.current = 0;
        }
        if (zoomCameraRafRef.current) {
            window.cancelAnimationFrame(zoomCameraRafRef.current);
            zoomCameraRafRef.current = 0;
        }
        if (panVisualFrameRef.current) {
            window.cancelAnimationFrame(panVisualFrameRef.current);
            panVisualFrameRef.current = 0;
        }
        queuedCameraRef.current = null;
        queuedZoomCameraRef.current = null;
    }, []);

    const clampCamera = useCallback((x, y, zoomValue) => {
        const worldW = bubbleFieldSize.w * bubbleWorldScale;
        const worldH = bubbleFieldSize.h * bubbleWorldScale;
        const viewportW = zoomValue > 0 ? bubbleFieldSize.w / zoomValue : bubbleFieldSize.w;
        const viewportH = zoomValue > 0 ? bubbleFieldSize.h / zoomValue : bubbleFieldSize.h;
        const clampAxis = (value, worldSize, viewportSize) => {
            if (viewportSize >= worldSize) return (worldSize - viewportSize) / 2;
            return Math.min(worldSize - viewportSize, Math.max(0, value));
        };
        return {
            x: clampAxis(x, worldW, viewportW),
            y: clampAxis(y, worldH, viewportH),
        };
    }, [bubbleFieldSize.w, bubbleFieldSize.h, bubbleWorldScale]);

    const scheduleZoomCameraUpdate = useCallback((nextZoom, nextCamera) => {
        if (!nextCamera) return;
        const nextViewport = { zoom: nextZoom, camera: nextCamera };
        queuedZoomCameraRef.current = nextViewport;
        bubbleZoomRef.current = nextZoom;
        cameraRef.current = nextCamera;

        if (cameraRafRef.current) {
            window.cancelAnimationFrame(cameraRafRef.current);
            cameraRafRef.current = 0;
        }
        queuedCameraRef.current = null;
        if (zoomCameraRafRef.current) return;

        zoomCameraRafRef.current = window.requestAnimationFrame(() => {
            zoomCameraRafRef.current = 0;
            const finalViewport = queuedZoomCameraRef.current;
            queuedZoomCameraRef.current = null;
            if (!finalViewport) return;
            bubbleZoomRef.current = finalViewport.zoom;
            cameraRef.current = finalViewport.camera;
            setBubbleZoom(finalViewport.zoom);
            setCamera(finalViewport.camera);
        });
    }, []);

    const cancelCameraAnimation = useCallback(() => {
        if (cameraAnimationRafRef.current) {
            window.cancelAnimationFrame(cameraAnimationRafRef.current);
            cameraAnimationRafRef.current = 0;
        }
        bubbleFieldRef.current?.classList.remove('camera-moving');
    }, []);

    const animateCameraTo = useCallback((targetCamera, targetZoom, duration = 560) => {
        if (!targetCamera) return;
        cancelCameraAnimation();
        if (cameraRafRef.current) {
            window.cancelAnimationFrame(cameraRafRef.current);
            cameraRafRef.current = 0;
        }
        if (zoomCameraRafRef.current) {
            window.cancelAnimationFrame(zoomCameraRafRef.current);
            zoomCameraRafRef.current = 0;
        }
        queuedCameraRef.current = null;
        queuedZoomCameraRef.current = null;

        const startCamera = { ...cameraRef.current };
        const startZoom = bubbleZoomRef.current;
        const finalZoom = clampZoom(targetZoom || startZoom);
        const finalCamera = clampCamera(targetCamera.x, targetCamera.y, finalZoom);
        const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        const animationDuration = reduceMotion ? 0 : Math.max(180, duration);

        if (animationDuration === 0) {
            bubbleZoomRef.current = finalZoom;
            cameraRef.current = finalCamera;
            setBubbleZoom(finalZoom);
            setCamera(finalCamera);
            return;
        }

        bubbleFieldRef.current?.classList.add('camera-moving');
        const startedAt = performance.now();
        const tick = (now) => {
            const raw = Math.min(1, Math.max(0, (now - startedAt) / animationDuration));
            const eased = raw * raw * (3 - 2 * raw);
            const nextZoom = startZoom + (finalZoom - startZoom) * eased;
            const nextCamera = clampCamera(
                startCamera.x + (finalCamera.x - startCamera.x) * eased,
                startCamera.y + (finalCamera.y - startCamera.y) * eased,
                nextZoom,
            );
            bubbleZoomRef.current = nextZoom;
            cameraRef.current = nextCamera;
            setBubbleZoom(nextZoom);
            setCamera(nextCamera);
            if (raw < 1) {
                cameraAnimationRafRef.current = window.requestAnimationFrame(tick);
            } else {
                cameraAnimationRafRef.current = 0;
                bubbleFieldRef.current?.classList.remove('camera-moving');
            }
        };
        cameraAnimationRafRef.current = window.requestAnimationFrame(tick);
    }, [cancelCameraAnimation, clampCamera, clampZoom]);

    useEffect(() => {
        if (queuedZoomCameraRef.current) return;
        setCamera((prev) => {
            const next = clampCamera(prev.x, prev.y, bubbleZoom);
            if (Math.abs(prev.x - next.x) < 0.05 && Math.abs(prev.y - next.y) < 0.05) {
                return prev;
            }
            cameraRef.current = next;
            return next;
        });
    }, [clampCamera, bubbleZoom]);

    useEffect(() => {
        if (viewMode !== 'bubble') {
            bubbleAutoCenteredRef.current = false;
            return;
        }
        if (!bubbleFieldSize.w || !bubbleFieldSize.h) return;
        if (bubbleAutoCenteredRef.current) return;

        const zoomValue = bubbleZoomRef.current;
        const worldW = bubbleFieldSize.w * bubbleWorldScale;
        const worldH = bubbleFieldSize.h * bubbleWorldScale;
        const viewportW = bubbleFieldSize.w / zoomValue;
        const viewportH = bubbleFieldSize.h / zoomValue;
        const centerX = (worldW - viewportW) / 2;
        const centerY = (worldH - viewportH) / 2;
        setCamera(clampCamera(centerX, centerY, zoomValue));
        bubbleAutoCenteredRef.current = true;
    }, [viewMode, bubbleFieldSize.w, bubbleFieldSize.h, clampCamera, bubbleWorldScale, activeMapView]);

    useEffect(() => {
        if (viewMode === 'map') return;
        setHoveredIdx(null);
        setHoveredTrack(null);
        setHoveredBubbleId(null);
        setHoveredExploreId(null);
    }, [viewMode]);

    useEffect(() => {
        if (
            viewMode !== '3d'
            || !threeFieldRef.current
            || threeFieldSize.w <= 0
            || threeFieldSize.h <= 0
            || tracks.length === 0
            || assignments.length !== tracks.length
        ) {
            return;
        }

        const mount = threeFieldRef.current;
        let cleanup = null;
        let cancelled = false;

        (async () => {
            const THREE = await import('three');
            const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
            if (cancelled) return;

            const scene = new THREE.Scene();
            const camera3d = new THREE.PerspectiveCamera(52, threeFieldSize.w / threeFieldSize.h, 0.01, 100);
            camera3d.position.set(1.95, 1.55, 2.25);

            const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            renderer.setSize(threeFieldSize.w, threeFieldSize.h);
            mount.appendChild(renderer.domElement);

            const controls = new OrbitControls(camera3d, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.075;
            controls.target.set(0, 0, 0);
            controls.minDistance = 0.9;
            controls.maxDistance = 6;

            const ambient = new THREE.AmbientLight(0xffffff, 0.7);
            scene.add(ambient);
            const keyLight = new THREE.DirectionalLight(0xffffff, 0.45);
            keyLight.position.set(1.3, 1.1, 1.9);
            scene.add(keyLight);

            const axisLen = 1.35;
            const axisGeo = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-axisLen / 2, -axisLen / 2, -axisLen / 2),
                new THREE.Vector3(axisLen / 2, -axisLen / 2, -axisLen / 2),
                new THREE.Vector3(-axisLen / 2, -axisLen / 2, -axisLen / 2),
                new THREE.Vector3(-axisLen / 2, axisLen / 2, -axisLen / 2),
                new THREE.Vector3(-axisLen / 2, -axisLen / 2, -axisLen / 2),
                new THREE.Vector3(-axisLen / 2, -axisLen / 2, axisLen / 2),
            ]);
            const axisMat = new THREE.LineBasicMaterial({ color: 0x9ca3af, transparent: true, opacity: 0.38 });
            const axisLines = new THREE.LineSegments(axisGeo, axisMat);
            scene.add(axisLines);

            const map01to11 = (v) => (v - 0.5) * 2;
            const activePos = [];
            const activeColor = [];
            const mutedPos = [];
            const mutedColor = [];

            tracks.forEach((track, idx) => {
                const clusterId = assignments[idx];
                const active = activeTrackIds.has(track.id);
                const x = map01to11(getTrackFeature(track, xAxis));
                const y = map01to11(getTrackFeature(track, yAxis));
                const z = map01to11(getTrackFeature(track, zAxis));
                const color = new THREE.Color(CLUSTER_COLORS[(clusterId ?? 0) % CLUSTER_COLORS.length]);

                if (active) {
                    activePos.push(x, y, z);
                    activeColor.push(color.r, color.g, color.b);
                } else {
                    color.lerp(new THREE.Color('#111827'), 0.72);
                    mutedPos.push(x, y, z);
                    mutedColor.push(color.r, color.g, color.b);
                }
            });

            const createCloud = (positions, colors, size, opacity) => {
                const geometry = new THREE.BufferGeometry();
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
                geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
                const material = new THREE.PointsMaterial({
                    size,
                    sizeAttenuation: true,
                    vertexColors: true,
                    transparent: true,
                    opacity,
                    depthWrite: false,
                });
                const points = new THREE.Points(geometry, material);
                scene.add(points);
                return { geometry, material, points };
            };

            const cloudMuted = mutedPos.length > 0 ? createCloud(mutedPos, mutedColor, 0.031, 0.18) : null;
            const cloudActive = activePos.length > 0 ? createCloud(activePos, activeColor, 0.047, 0.95) : null;

            let rafId = 0;
            const animate = () => {
                controls.update();
                renderer.render(scene, camera3d);
                rafId = window.requestAnimationFrame(animate);
            };
            animate();

            cleanup = () => {
                if (rafId) window.cancelAnimationFrame(rafId);
                controls.dispose();
                axisGeo.dispose();
                axisMat.dispose();
                cloudActive?.geometry.dispose();
                cloudActive?.material.dispose();
                cloudMuted?.geometry.dispose();
                cloudMuted?.material.dispose();
                renderer.dispose();
                if (mount.contains(renderer.domElement)) {
                    mount.removeChild(renderer.domElement);
                }
            };
        })().catch(() => {});

        return () => {
            cancelled = true;
            cleanup?.();
        };
    }, [viewMode, threeFieldSize.w, threeFieldSize.h, tracks, assignments, activeTrackIds, xAxis, yAxis, zAxis]);

    // ── Render canvas ────────────────────────────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || tracks.length === 0 || assignments.length === 0) return;
        canvas.width = canvasSize.w;
        canvas.height = canvasSize.h;
        drawMap(canvas, tracks, assignments, centroids, hoveredIdx, hasTrackFilter ? activeTrackIds : null, xAxis, yAxis, clusterLabelsByIndex);
    }, [tracks, assignments, centroids, hoveredIdx, hasTrackFilter, activeTrackIds, canvasSize, xAxis, yAxis, clusterLabelsByIndex]);

    const getPoint = (e) => {
        if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        if (e.changedTouches && e.changedTouches[0]) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        return { x: e.clientX, y: e.clientY };
    };

    const setZoomAroundPoint = useCallback((nextZoom, anchorX, anchorY) => {
        cancelCameraAnimation();
        const queuedViewport = queuedZoomCameraRef.current;
        const currentZoom = queuedViewport?.zoom || bubbleZoomRef.current;
        const baseCamera = queuedViewport?.camera || queuedCameraRef.current || cameraRef.current;
        const targetZoom = clampZoom(nextZoom);
        const rect = bubbleFieldRef.current?.getBoundingClientRect();
        const localX = rect ? anchorX - rect.left : bubbleFieldSize.w / 2;
        const localY = rect ? anchorY - rect.top : bubbleFieldSize.h / 2;
        const safeLocalX = Math.min(Math.max(localX, 0), bubbleFieldSize.w || localX);
        const safeLocalY = Math.min(Math.max(localY, 0), bubbleFieldSize.h || localY);

        const worldAnchorX = baseCamera.x + safeLocalX / currentZoom;
        const worldAnchorY = baseCamera.y + safeLocalY / currentZoom;
        const nextX = worldAnchorX - safeLocalX / targetZoom;
        const nextY = worldAnchorY - safeLocalY / targetZoom;
        scheduleZoomCameraUpdate(targetZoom, clampCamera(nextX, nextY, targetZoom));
    }, [bubbleFieldSize.w, bubbleFieldSize.h, cancelCameraAnimation, clampCamera, clampZoom, scheduleZoomCameraUpdate]);

    const zoomAroundPointByFactor = useCallback((factor, anchorX, anchorY) => {
        const currentZoom = queuedZoomCameraRef.current?.zoom || bubbleZoomRef.current;
        setZoomAroundPoint(currentZoom * factor, anchorX, anchorY);
    }, [setZoomAroundPoint]);

    // Keep the zoom anchored under the pointer for both mouse wheels and trackpads.
    useEffect(() => {
        const el = bubbleFieldRef.current;
        if (!el || viewMode !== 'bubble') return;
        const onWheel = (e) => {
            e.preventDefault();
            clearTimeout(scrollHintTimerRef.current);
            setScrollHint(false);
            const deltaUnit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
            const normalizedDelta = Math.max(-180, Math.min(180, e.deltaY * deltaUnit));
            const factor = Math.exp(-normalizedDelta * 0.0018);
            zoomAroundPointByFactor(factor, e.clientX, e.clientY);
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [viewMode, zoomAroundPointByFactor]);

    const clearPanVisual = useCallback(() => {
        if (panVisualFrameRef.current) {
            window.cancelAnimationFrame(panVisualFrameRef.current);
            panVisualFrameRef.current = 0;
        }
        panVisualOffsetRef.current = { x: 0, y: 0 };
        bubbleLayerRef.current?.style.removeProperty('transform');
        bubbleFieldRef.current?.classList.remove('camera-moving');
    }, []);

    const queuePanVisual = useCallback((x, y) => {
        panVisualOffsetRef.current = { x, y };
        if (panVisualFrameRef.current) return;
        panVisualFrameRef.current = window.requestAnimationFrame(() => {
            panVisualFrameRef.current = 0;
            const offset = panVisualOffsetRef.current;
            if (!bubbleLayerRef.current) return;
            bubbleLayerRef.current.style.transform = `translate3d(${offset.x.toFixed(2)}px, ${offset.y.toFixed(2)}px, 0)`;
        });
    }, []);

    useLayoutEffect(() => {
        if (!pendingPanCommitRef.current) return;
        pendingPanCommitRef.current = false;
        clearPanVisual();
    }, [camera.x, camera.y, clearPanVisual]);

    const handleBubblePanStart = useCallback((e) => {
        cancelCameraAnimation();
        clearPanVisual();
        bubbleFieldRef.current?.classList.add('camera-moving');
        if (typeof e.currentTarget?.setPointerCapture === 'function' && e.pointerId !== undefined) {
            try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
        }
        if (e.pointerType === 'touch') {
            pinchRef.current.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (pinchRef.current.pointers.size >= 2) {
                const [p1, p2] = [...pinchRef.current.pointers.values()];
                pinchRef.current.active = true;
                pinchRef.current.startDist = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
                pinchRef.current.startZoom = queuedZoomCameraRef.current?.zoom || bubbleZoomRef.current;
                pinchRef.current.anchorX = (p1.x + p2.x) * 0.5;
                pinchRef.current.anchorY = (p1.y + p2.y) * 0.5;
                panRef.current.dragging = false;
                return;
            }
        }
        const pt = getPoint(e);
        const activeCamera = queuedZoomCameraRef.current?.camera || queuedCameraRef.current || cameraRef.current;
        panRef.current = {
            dragging: true,
            moved: false,
            startX: pt.x,
            startY: pt.y,
            camX: activeCamera.x,
            camY: activeCamera.y,
            nextCamera: activeCamera,
            lastMoveAt: panRef.current.lastMoveAt || 0,
        };
    }, [cancelCameraAnimation, clearPanVisual]);

    const handleBubblePanMove = useCallback((e) => {
        if (e.pointerType === 'touch' && pinchRef.current.pointers.has(e.pointerId)) {
            pinchRef.current.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        }
        if (pinchRef.current.active && pinchRef.current.pointers.size >= 2) {
            const [p1, p2] = [...pinchRef.current.pointers.values()];
            const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
            const ratio = dist / (pinchRef.current.startDist || 1);
            const next = pinchRef.current.startZoom * ratio;
            setZoomAroundPoint(next, pinchRef.current.anchorX, pinchRef.current.anchorY);
            if (e.cancelable) e.preventDefault();
            return;
        }
        if (!panRef.current.dragging) return;
        const pt = getPoint(e);
        const dx = pt.x - panRef.current.startX;
        const dy = pt.y - panRef.current.startY;
        if (!panRef.current.moved && Math.hypot(dx, dy) > 8) {
            panRef.current.moved = true;
        }
        if (panRef.current.moved) {
            if (e.cancelable) e.preventDefault();
            const activeZoom = queuedZoomCameraRef.current?.zoom || bubbleZoomRef.current;
            const next = clampCamera(
                panRef.current.camX - dx / activeZoom,
                panRef.current.camY - dy / activeZoom,
                activeZoom,
            );
            panRef.current.nextCamera = next;
            queuePanVisual(
                (panRef.current.camX - next.x) * activeZoom,
                (panRef.current.camY - next.y) * activeZoom,
            );
            panRef.current.lastMoveAt = Date.now();
        }
    }, [clampCamera, setZoomAroundPoint, queuePanVisual]);

    const handleBubblePanEnd = useCallback((e) => {
        if (typeof e?.currentTarget?.releasePointerCapture === 'function' && e?.pointerId !== undefined) {
            try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
        }
        if (e?.pointerType === 'touch') {
            pinchRef.current.pointers.delete(e.pointerId);
            if (pinchRef.current.pointers.size < 2) {
                pinchRef.current.active = false;
            }
        }
        panRef.current.dragging = false;
        const moved = panRef.current.moved;
        const finalCamera = panRef.current.nextCamera;
        if (moved) {
            const current = cameraRef.current;
            if (finalCamera && (Math.abs(current.x - finalCamera.x) >= 0.05 || Math.abs(current.y - finalCamera.y) >= 0.05)) {
                pendingPanCommitRef.current = true;
                cameraRef.current = finalCamera;
                setCamera(finalCamera);
            } else {
                clearPanVisual();
            }
            setTimeout(() => {
                panRef.current.moved = false;
            }, 0);
        } else {
            clearPanVisual();
        }
    }, [clearPanVisual]);

    const bubbleRenderItems = useMemo(() => {
        if (viewMode !== 'bubble') return [];
        if (!bubbleFieldSize.w || !bubbleFieldSize.h) return [];
        if (!bubbleNodesResult.length) return [];

        const viewportW = bubbleZoom > 0 ? bubbleFieldSize.w / bubbleZoom : bubbleFieldSize.w;
        const viewportH = bubbleZoom > 0 ? bubbleFieldSize.h / bubbleZoom : bubbleFieldSize.h;
        const vW = bubbleFieldSize.w * bubbleWorldScale;
        const vH = bubbleFieldSize.h * bubbleWorldScale;

        // Keep blend stable across zoom so zooming does not "jump" to another area.
        // A small fixed raw-blend preserves feature direction without coupling layout to zoom.
        const t = hasTrackFilter ? 0.26 : 0.18;

        const items = bubbleNodesResult.map((node) => {
            const worldX = (node.nX + (node.nRawX - node.nX) * t) * vW;
            const worldY = (node.nY + (node.nRawY - node.nY) * t) * vH;
            const xPercent = viewportW ? ((worldX - camera.x) / viewportW) * 100 : 50;
            const yPercent = viewportH ? ((worldY - camera.y) / viewportH) * 100 : 50;
            const xPx = (xPercent / 100) * bubbleFieldSize.w;
            const yPx = (yPercent / 100) * bubbleFieldSize.h;
            const clusterId = assignmentByTrackId.get(node.track.id);
            const active = activeTrackIds.has(node.track.id);
            const sizePx = Number.parseFloat(node.style['--tm-bubble-size']) || 56;

            return {
                node,
                clusterId,
                active,
                clusterFocused: selectedCluster !== null && clusterId === selectedCluster,
                clusterExpandPulsing: expandedClusterPulseId !== null && clusterId === expandedClusterPulseId,
                worldX,
                worldY,
                xPercent,
                yPercent,
                xPx,
                yPx,
                sizePx,
                labelWidth: sizePx + 28,
                labelHeight: 44,
                priority:
                    (active ? 1800 : 0)
                    + sizePx,
            };
        });

        const visibleLabels = new Set();
        const occupied = [];
        const MIN_LABEL_ZOOM = 1.12;
        const maxLabels = bubbleZoom < 1.35 ? 8 : bubbleZoom < 1.8 ? 15 : bubbleZoom < 2.3 ? 24 : 36;

        const labelCandidates = items.filter((item) => (
            item.xPx >= -180
            && item.xPx <= bubbleFieldSize.w + 180
            && item.yPx >= -180
            && item.yPx <= bubbleFieldSize.h + 180
        ));
        const sorted = [...labelCandidates].sort((a, b) => b.priority - a.priority);
        for (const item of sorted) {
            if (bubbleZoom < MIN_LABEL_ZOOM) continue;
            if (visibleLabels.size >= maxLabels) continue;

            const box = {
                left: item.xPx - item.labelWidth / 2,
                right: item.xPx + item.labelWidth / 2,
                top: item.yPx + item.sizePx / 2 + 5,
                bottom: item.yPx + item.sizePx / 2 + 5 + item.labelHeight,
            };
            const overlaps = occupied.some((existing) => rectsOverlap(box, existing, 7));
            if (!overlaps) {
                visibleLabels.add(item.node.track.id);
                occupied.push(box);
            }
        }

        return items.map((item) => ({
            ...item,
            showLabel: visibleLabels.has(item.node.track.id),
        }));
    }, [
        viewMode,
        bubbleFieldSize.w,
        bubbleFieldSize.h,
        bubbleNodesResult,
        bubbleZoom,
        bubbleWorldScale,
        camera.x,
        camera.y,
        assignmentByTrackId,
        hasTrackFilter,
        activeTrackIds,
        selectedCluster,
        expandedClusterPulseId,
    ]);

    // Only mount bubbles near the viewport. Analytics and clustering still use
    // the complete import, while the DOM cost stays bounded for huge libraries.
    const visibleBubbleRenderItems = useMemo(() => {
        const spotifyField = activeMapView === 'spotify';
        const overscan = spotifyField ? 240 : 280;
        const visible = bubbleRenderItems.filter((item) => (
            item.xPx >= -overscan
            && item.xPx <= bubbleFieldSize.w + overscan
            && item.yPx >= -overscan
            && item.yPx <= bubbleFieldSize.h + overscan
        ));
        const maxMounted = spotifyField
            ? (bubbleZoom < 0.5 ? 320 : bubbleZoom < 0.85 ? 420 : 520)
            : (bubbleZoom < 0.5 ? 760 : bubbleZoom < 0.85 ? 920 : 1100);
        if (visible.length <= maxMounted) return visible;

        const selectedId = selectedTrackCard?.track?.id;
        return visible
            .map((item) => {
                const id = item.node.track.id;
                return {
                    item,
                    score: (id === spectraExpandTrackId ? 100000 : 0)
                        + (id === selectedId ? 90000 : 0)
                        + (id === hoveredBubbleId ? 80000 : 0)
                        + (item.active ? 5000 : 0)
                        + item.sizePx * 10
                        + hash01(id),
                };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, maxMounted)
            .map((entry) => entry.item);
    }, [
        bubbleRenderItems,
        bubbleFieldSize.w,
        bubbleFieldSize.h,
        bubbleZoom,
        spectraExpandTrackId,
        selectedTrackCard,
        hoveredBubbleId,
        activeMapView,
    ]);

    const getMountedBubbleElement = useCallback((trackId) => {
        const field = bubbleFieldRef.current;
        if (!field || !trackId) return null;
        const escapedId = typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
            ? CSS.escape(String(trackId))
            : String(trackId).replace(/["\\]/g, '\\$&');
        return field.querySelector(`[data-bubble-id="${escapedId}"]`);
    }, []);

    const resetBubbleMagnetism = useCallback(() => {
        if (magneticFrameRef.current) {
            window.cancelAnimationFrame(magneticFrameRef.current);
            magneticFrameRef.current = 0;
        }
        magneticActiveIdsRef.current.forEach((trackId) => {
            const element = getMountedBubbleElement(trackId);
            if (!element) return;
            element.style.removeProperty('--tm-attract-x');
            element.style.removeProperty('--tm-attract-y');
            element.style.removeProperty('--tm-magnetic-strength');
        });
        magneticActiveIdsRef.current.clear();
        if (magneticCursorRef.current) {
            magneticCursorRef.current.style.removeProperty('--tm-cursor-opacity');
        }
    }, [getMountedBubbleElement]);

    const handleBubbleDragStart = useCallback((event, trackId) => {
        if (event.button !== undefined && event.button !== 0) return;
        const element = event.currentTarget;
        if (!element || !trackId) return;

        event.stopPropagation();
        resetBubbleMagnetism();

        const springTimer = bubbleSpringTimersRef.current.get(trackId);
        if (springTimer) {
            window.clearTimeout(springTimer);
            bubbleSpringTimersRef.current.delete(trackId);
        }

        element.classList.remove('springing');
        element.classList.add('dragging');
        element.style.setProperty('--tm-drag-x', '0px');
        element.style.setProperty('--tm-drag-y', '0px');
        if (typeof element.setPointerCapture === 'function') {
            try { element.setPointerCapture(event.pointerId); } catch { /* ignore */ }
        }

        bubbleDragRef.current = {
            pointerId: event.pointerId,
            trackId,
            element,
            startX: event.clientX,
            startY: event.clientY,
            moved: false,
            lastMoveAt: bubbleDragRef.current.lastMoveAt || 0,
        };
    }, [resetBubbleMagnetism]);

    const handleBubbleDragMove = useCallback((event) => {
        const drag = bubbleDragRef.current;
        if (drag.pointerId !== event.pointerId || !drag.element) return;

        event.stopPropagation();
        const rawX = event.clientX - drag.startX;
        const rawY = event.clientY - drag.startY;
        const distance = Math.hypot(rawX, rawY);
        if (distance > 5) drag.moved = true;
        if (!drag.moved) return;

        if (event.cancelable) event.preventDefault();
        const resistedDistance = Math.min(180, distance <= 72 ? distance : 72 + (distance - 72) * 0.38);
        const ratio = distance > 0 ? resistedDistance / distance : 0;
        drag.element.style.setProperty('--tm-drag-x', `${(rawX * ratio).toFixed(2)}px`);
        drag.element.style.setProperty('--tm-drag-y', `${(rawY * ratio).toFixed(2)}px`);
    }, []);

    const handleBubbleDragEnd = useCallback((event) => {
        const drag = bubbleDragRef.current;
        if (drag.pointerId !== event.pointerId || !drag.element) return;

        event.stopPropagation();
        const { element, trackId, moved } = drag;
        if (typeof element.releasePointerCapture === 'function') {
            try { element.releasePointerCapture(event.pointerId); } catch { /* ignore */ }
        }

        element.classList.remove('dragging');
        if (moved) {
            if (event.cancelable) event.preventDefault();
            element.classList.add('springing');
            element.style.setProperty('--tm-drag-x', '0px');
            element.style.setProperty('--tm-drag-y', '0px');
            drag.lastMoveAt = Date.now();

            const timerId = window.setTimeout(() => {
                element.classList.remove('springing');
                element.style.removeProperty('--tm-drag-x');
                element.style.removeProperty('--tm-drag-y');
                bubbleSpringTimersRef.current.delete(trackId);
            }, 720);
            bubbleSpringTimersRef.current.set(trackId, timerId);
        } else {
            element.style.removeProperty('--tm-drag-x');
            element.style.removeProperty('--tm-drag-y');
        }

        bubbleDragRef.current = {
            pointerId: null,
            trackId: null,
            element: null,
            startX: 0,
            startY: 0,
            moved: false,
            lastMoveAt: drag.lastMoveAt,
        };
    }, []);

    const handleMagneticPointerMove = useCallback((event) => {
        if (!magneticPullEnabled || event.pointerType === 'touch' || panRef.current.moved) {
            resetBubbleMagnetism();
            return;
        }

        const field = bubbleFieldRef.current;
        if (!field) return;
        magneticPointerRef.current = { x: event.clientX, y: event.clientY };

        if (magneticFrameRef.current) return;
        magneticFrameRef.current = window.requestAnimationFrame(() => {
            magneticFrameRef.current = 0;
            const rect = field.getBoundingClientRect();
            const { x: clientX, y: clientY } = magneticPointerRef.current;
            const localX = clientX - rect.left;
            const localY = clientY - rect.top;
            const radius = Math.min(180, Math.max(130, rect.width * 0.13));
            const nextActiveIds = new Set();
            const candidates = [];

            visibleBubbleRenderItems.forEach((item) => {
                const dx = localX - item.xPx;
                const dy = localY - item.yPx;
                if (Math.abs(dx) > radius || Math.abs(dy) > radius) return;
                const distance = Math.hypot(dx, dy);
                if (distance >= radius) return;

                candidates.push({ item, dx, dy, distance });
            });

            candidates
                .sort((a, b) => a.distance - b.distance)
                .slice(0, 10)
                .forEach(({ item, dx, dy, distance }) => {

                const element = getMountedBubbleElement(item.node.track.id);
                if (!element) return;
                const proximity = 1 - distance / radius;
                const pull = Math.min(9, distance * 0.08) * proximity * proximity;
                const normalX = distance > 0 ? dx / distance : 0;
                const normalY = distance > 0 ? dy / distance : 0;

                element.style.setProperty('--tm-attract-x', `${(normalX * pull).toFixed(2)}px`);
                element.style.setProperty('--tm-attract-y', `${(normalY * pull).toFixed(2)}px`);
                element.style.setProperty('--tm-magnetic-strength', (proximity * 0.56).toFixed(3));
                nextActiveIds.add(item.node.track.id);
            });

            magneticActiveIdsRef.current.forEach((trackId) => {
                if (nextActiveIds.has(trackId)) return;
                const element = getMountedBubbleElement(trackId);
                if (!element) return;
                element.style.removeProperty('--tm-attract-x');
                element.style.removeProperty('--tm-attract-y');
                element.style.removeProperty('--tm-magnetic-strength');
            });
            magneticActiveIdsRef.current = nextActiveIds;

            if (magneticCursorRef.current) {
                magneticCursorRef.current.style.transform = `translate3d(${localX}px, ${localY}px, 0)`;
                magneticCursorRef.current.style.setProperty('--tm-cursor-opacity', '1');
            }
        });
    }, [visibleBubbleRenderItems, magneticPullEnabled, getMountedBubbleElement, resetBubbleMagnetism]);

    const handleInteractiveBubbleMove = useCallback((event) => {
        if (bubbleDragRef.current.pointerId === event.pointerId) {
            handleBubbleDragMove(event);
            return;
        }
        handleBubblePanMove(event);
        handleMagneticPointerMove(event);
    }, [handleBubbleDragMove, handleBubblePanMove, handleMagneticPointerMove]);

    const handleInteractivePointerEnd = useCallback((event) => {
        if (bubbleDragRef.current.pointerId === event.pointerId) {
            handleBubbleDragEnd(event);
            return;
        }
        handleBubblePanEnd(event);
    }, [handleBubbleDragEnd, handleBubblePanEnd]);

    useEffect(() => {
        resetBubbleMagnetism();
    }, [camera.x, camera.y, bubbleZoom, magneticPullEnabled, resetBubbleMagnetism]);

    useEffect(() => () => resetBubbleMagnetism(), [resetBubbleMagnetism]);

    // Density heatmap: soft cluster-colored glow accumulated under the bubbles.
    // Drawn at low resolution and blurred via CSS, so per-frame cost stays low.
    useEffect(() => {
        const canvas = heatmapCanvasRef.current;
        if (!canvas) return;
        const { w, h } = bubbleFieldSize;
        if (!w || !h) return;

        const scale = 0.22;
        const cw = Math.max(1, Math.round(w * scale));
        const ch = Math.max(1, Math.round(h * scale));
        if (canvas.width !== cw) canvas.width = cw;
        if (canvas.height !== ch) canvas.height = ch;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, cw, ch);
        if (viewMode !== 'bubble' || visibleBubbleRenderItems.length === 0) return;

        const sprites = heatmapSpritesRef.current;
        const getSprite = (color) => {
            let sprite = sprites.get(color);
            if (sprite) return sprite;
            const SPRITE = 64;
            const half = SPRITE / 2;
            sprite = document.createElement('canvas');
            sprite.width = SPRITE;
            sprite.height = SPRITE;
            const sctx = sprite.getContext('2d');
            sctx.fillStyle = color;
            sctx.fillRect(0, 0, SPRITE, SPRITE);
            const falloff = sctx.createRadialGradient(half, half, 0, half, half, half);
            falloff.addColorStop(0, 'rgba(0, 0, 0, 0.36)');
            falloff.addColorStop(0.55, 'rgba(0, 0, 0, 0.15)');
            falloff.addColorStop(1, 'rgba(0, 0, 0, 0)');
            sctx.globalCompositeOperation = 'destination-in';
            sctx.fillStyle = falloff;
            sctx.fillRect(0, 0, SPRITE, SPRITE);
            sprites.set(color, sprite);
            return sprite;
        };

        const bubbleScale = Math.max(1, bubbleZoom / 1.2);
        const step = Math.max(1, Math.ceil(visibleBubbleRenderItems.length / 360));
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < visibleBubbleRenderItems.length; i += step) {
            const item = visibleBubbleRenderItems[i];
            const radius = (item.sizePx * bubbleScale * 1.6 + 30) * scale;
            if (item.xPx < -radius / scale || item.xPx > w + radius / scale) continue;
            if (item.yPx < -radius / scale || item.yPx > h + radius / scale) continue;
            const color = item.node.style['--tm-bubble-color'] || '#7896c8';
            ctx.drawImage(
                getSprite(color),
                item.xPx * scale - radius,
                item.yPx * scale - radius,
                radius * 2,
                radius * 2,
            );
        }
    }, [visibleBubbleRenderItems, bubbleFieldSize, viewMode, bubbleZoom]);

    // Cluster "region" name labels, placed at the weighted centroid of each
    // cluster's bubbles — reads like place names on a map.
    const bubbleRegionLabels = useMemo(() => {
        if (viewMode !== 'bubble' || visibleBubbleRenderItems.length === 0 || clusterStats.length === 0) return [];
        const centroids = new Map();
        for (const item of visibleBubbleRenderItems) {
            if (item.clusterId === null || item.clusterId === undefined || item.clusterId < 0) continue;
            let entry = centroids.get(item.clusterId);
            if (!entry) {
                entry = { x: 0, y: 0, weight: 0, count: 0 };
                centroids.set(item.clusterId, entry);
            }
            entry.x += item.xPx * item.sizePx;
            entry.y += item.yPx * item.sizePx;
            entry.weight += item.sizePx;
            entry.count += 1;
        }
        const labels = [];
        for (const cluster of clusterStats.slice(0, 8)) {
            const entry = centroids.get(cluster.j);
            if (!entry || entry.count < 3 || !entry.weight) continue;
            labels.push({
                id: cluster.j,
                name: cluster.label?.name || '',
                color: cluster.color,
                x: entry.x / entry.weight,
                y: entry.y / entry.weight,
            });
        }
        return labels;
    }, [viewMode, visibleBubbleRenderItems, clusterStats]);

    useEffect(() => {
        if (!exploreEnabled) {
            setExploreLoading(false);
            setExploreError(null);
            setExploreRecs([]);
            return;
        }
        if (viewMode !== 'bubble' || loading || tracks.length === 0) {
            if (loading) setExploreRecs([]);
            return;
        }
        if (exploreSparseAnchors.length === 0) {
            setExploreRecs([]);
            return;
        }

        let cancelled = false;
        setExploreLoading(true);
        setExploreError(null);

        (async () => {
            try {
                const requests = exploreSparseAnchors.map(async (anchor) => {
                    const seedTrackId = anchor.seedTrackId || '';
                    const params = new URLSearchParams({
                        xAxis,
                        yAxis,
                        targetX: String(clamp01(anchor.x)),
                        targetY: String(clamp01(anchor.y)),
                        limit: seedTrackId ? '14' : '8',
                        seedGenres: exploreSeedGenres.join(','),
                        source,
                    });
                    // Resolve the seed track id → "artist|title" for source-aware discovery.
                    if (seedTrackId) {
                        const seedTrack = tracks.find((t) => t.id === seedTrackId);
                        if (seedTrack?.artists && seedTrack?.name) {
                            const seedArtist = String(seedTrack.artists).split(',')[0].trim();
                            params.set('seedTracks', `${seedArtist}|${seedTrack.name}`);
                        }
                    }
                    const res = await fetch(api(`/api/discover?${params.toString()}`));
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const data = await res.json();
                    const tracksOut = Array.isArray(data?.tracks) ? data.tracks : [];
                    return tracksOut.map((track, sourceRank) => ({
                        track,
                        anchorId: anchor.id,
                        targetX: anchor.x,
                        targetY: anchor.y,
                        seedTrackId: seedTrackId || null,
                        sourceRank,
                    }));
                });

                const byAnchor = await Promise.all(requests);
                const dedupAll = new Map();
                const dedupNovel = new Map();
                const upsertCandidate = (bucket, item) => {
                    const key = getRecommendationDedupKey(item?.track);
                    if (!key) return;
                    const existing = bucket.get(key);
                    if (!existing) {
                        bucket.set(key, item);
                        return;
                    }
                    const rankA = Number.isFinite(item?.sourceRank) ? item.sourceRank : Number.POSITIVE_INFINITY;
                    const rankB = Number.isFinite(existing?.sourceRank) ? existing.sourceRank : Number.POSITIVE_INFINITY;
                    if (rankA < rankB) {
                        bucket.set(key, item);
                        return;
                    }
                    if (rankA > rankB) return;
                    const scoreA = Number.isFinite(Number(item?.track?.popularity)) ? Number(item.track.popularity) : -1;
                    const scoreB = Number.isFinite(Number(existing?.track?.popularity)) ? Number(existing.track.popularity) : -1;
                    if (scoreA > scoreB) {
                        bucket.set(key, item);
                        return;
                    }
                    if (scoreA === scoreB && hash01(item?.track?.id || '') < hash01(existing?.track?.id || '')) {
                        bucket.set(key, item);
                    }
                };
                byAnchor.flat().forEach((item) => {
                    if (!item?.track?.id) return;
                    if (spectraExpandTrackId && item.track.id === spectraExpandTrackId) return;
                    upsertCandidate(dedupAll, item);
                    if (knownTrackIds.has(item.track.id)) return;
                    upsertCandidate(dedupNovel, item);
                });
                const ranked = [...(dedupNovel.size > 0 ? dedupNovel.values() : dedupAll.values())]
                    .sort((a, b) => {
                        const ra = Number.isFinite(a?.sourceRank) ? a.sourceRank : Number.POSITIVE_INFINITY;
                        const rb = Number.isFinite(b?.sourceRank) ? b.sourceRank : Number.POSITIVE_INFINITY;
                        if (ra !== rb) return ra - rb;
                        const pa = Number.isFinite(Number(a?.track?.popularity)) ? Number(a.track.popularity) : -1;
                        const pb = Number.isFinite(Number(b?.track?.popularity)) ? Number(b.track.popularity) : -1;
                        if (pa !== pb) return pb - pa;
                        // Stable tie-break so layout doesn't jump between refreshes.
                        return hash01(a?.track?.id || '') - hash01(b?.track?.id || '');
                    });
                const merged = ranked.slice(0, spectraExpandTrackId ? 14 : 18);
                if (!cancelled) {
                    setExploreRecs(merged);
                }
            } catch (e) {
                if (!cancelled) {
                    setExploreRecs([]);
                    setExploreError(e?.message || '추천곡을 불러오지 못했습니다.');
                }
            } finally {
                if (!cancelled) setExploreLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [
        exploreEnabled,
        viewMode,
        loading,
        tracks.length,
        exploreSparseAnchors,
        exploreSeedGenres,
        knownTrackIds,
        spectraExpandTrackId,
        xAxis,
        yAxis,
        source,
    ]);

    const exploreRenderItems = useMemo(() => {
        if (!exploreEnabled || viewMode !== 'bubble') return [];
        if (!bubbleFieldSize.w || !bubbleFieldSize.h) return [];
        if (!exploreRecs.length) return [];

        const viewportW = bubbleZoom > 0 ? bubbleFieldSize.w / bubbleZoom : bubbleFieldSize.w;
        const viewportH = bubbleZoom > 0 ? bubbleFieldSize.h / bubbleZoom : bubbleFieldSize.h;
        const vW = bubbleFieldSize.w * bubbleWorldScale;
        const vH = bubbleFieldSize.h * bubbleWorldScale;
        const pad = 90;
        const recSize = 52;
        const recHalf = recSize / 2;
        const minX = pad + recHalf;
        const maxX = Math.max(minX, vW - pad - recHalf);
        const minY = pad + recHalf;
        const maxY = Math.max(minY, vH - pad - recHalf);
        const clampWorldX = (x) => Math.min(maxX, Math.max(minX, x));
        const clampWorldY = (y) => Math.min(maxY, Math.max(minY, y));
        const focusBubble = spectraExpandTrackId
            ? bubbleRenderItems.find((item) => item.node.track.id === spectraExpandTrackId) || null
            : null;
        const focusRecMode = Boolean(focusBubble);
        const activeBubbles = visibleBubbleRenderItems.filter((item) => item.active);
        const anchorItems = focusRecMode
            ? [focusBubble]
            : (activeBubbles.length ? activeBubbles : visibleBubbleRenderItems);
        const bubbleAnchors = anchorItems.map((item) => ({
            trackId: item.node.track.id,
            worldX: item.worldX,
            worldY: item.worldY,
            fx: clamp01(getTrackFeature(item.node.track, xAxis)),
            fy: clamp01(getTrackFeature(item.node.track, yAxis)),
            size: item.sizePx,
        }));
        const occupied = focusRecMode
            ? [{
                left: focusBubble.worldX - focusBubble.sizePx / 2,
                right: focusBubble.worldX + focusBubble.sizePx / 2,
                top: focusBubble.worldY - focusBubble.sizePx / 2,
                bottom: focusBubble.worldY + focusBubble.sizePx / 2,
            }]
            : bubbleAnchors.map((anchor) => ({
                left: anchor.worldX - anchor.size / 2,
                right: anchor.worldX + anchor.size / 2,
                top: anchor.worldY - anchor.size / 2,
                bottom: anchor.worldY + anchor.size / 2,
            }));

        const items = exploreRecs.map((item, idx) => {
            const recId = `rec-${item.track.id}-${idx}`;
            const recFx = clamp01(getTrackFeature(item.track, xAxis));
            const recFy = clamp01(getTrackFeature(item.track, yAxis));
            const targetJitterX = pickInRange(hash01(`${item.track.id}:${item.anchorId}:jx`), -0.08, 0.08);
            const targetJitterY = pickInRange(hash01(`${item.track.id}:${item.anchorId}:jy`), -0.07, 0.07);
            const targetFx = clamp01(item.targetX + targetJitterX);
            const targetFy = clamp01(item.targetY + targetJitterY);
            const anchorWorldX = pad + targetFx * Math.max(0, vW - pad * 2);
            const anchorWorldY = pad + (1 - targetFy) * Math.max(0, vH - pad * 2);

            let nearestBubble = null;
            let nearestDist = Number.POSITIVE_INFINITY;
            bubbleAnchors.forEach((bubble) => {
                const dist = Math.hypot(recFx - bubble.fx, recFy - bubble.fy);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestBubble = bubble;
                }
            });

            // Keep empty-area context, but pull recommendation cards toward nearby liked bubbles.
            const guideX = focusRecMode
                ? focusBubble.worldX
                : (nearestBubble ? nearestBubble.worldX * 0.72 + anchorWorldX * 0.28 : anchorWorldX);
            const guideY = focusRecMode
                ? focusBubble.worldY
                : (nearestBubble ? nearestBubble.worldY * 0.72 + anchorWorldY * 0.28 : anchorWorldY);
            const baseAngle = hash01(`${item.track.id}:${item.anchorId}:angle`) * Math.PI * 2;
            const baseRadius = focusRecMode
                ? pickInRange(hash01(`${item.track.id}:${item.anchorId}:radius`), 86, 192)
                : nearestBubble
                    ? pickInRange(hash01(`${item.track.id}:${item.anchorId}:radius`), 68, 122)
                    : pickInRange(hash01(`${item.track.id}:${item.anchorId}:radius`), 90, 148);
            const baseSeparation = focusRecMode
                ? Math.max(66, focusBubble.sizePx * 0.72 + recHalf + 12)
                : nearestBubble
                    ? Math.max(58, nearestBubble.size * 0.7 + recHalf + 10)
                    : recHalf + 14;

            let worldX = clampWorldX(guideX);
            let worldY = clampWorldY(guideY);
            let placed = false;
            for (let attempt = 0; attempt < 12; attempt++) {
                const angle = baseAngle + attempt * (Math.PI / 6);
                const radius = baseRadius + baseSeparation + attempt * 16;
                const candidateX = clampWorldX(guideX + Math.cos(angle) * radius);
                const candidateY = clampWorldY(guideY + Math.sin(angle) * radius);
                const candidateBox = {
                    left: candidateX - recHalf,
                    right: candidateX + recHalf,
                    top: candidateY - recHalf,
                    bottom: candidateY + recHalf,
                };
                const overlaps = occupied.some((existing) => rectsOverlap(candidateBox, existing, 7));
                if (!overlaps || attempt === 11) {
                    worldX = candidateX;
                    worldY = candidateY;
                    occupied.push(candidateBox);
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                occupied.push({
                    left: worldX - recHalf,
                    right: worldX + recHalf,
                    top: worldY - recHalf,
                    bottom: worldY + recHalf,
                });
            }

            const rawXPercent = viewportW ? ((worldX - camera.x) / viewportW) * 100 : 50;
            const rawYPercent = viewportH ? ((worldY - camera.y) / viewportH) * 100 : 50;
            const inView = rawXPercent >= -8 && rawXPercent <= 108 && rawYPercent >= -8 && rawYPercent <= 108;
            const hovered = hoveredExploreId === recId;
            const floatSeed = hash01(`${item.track.id}:${item.anchorId}:float`);
            const driftSeedX = hash01(`${item.track.id}:${item.anchorId}:driftx`);
            const driftSeedY = hash01(`${item.track.id}:${item.anchorId}:drifty`);
            const delaySeed = hash01(`${item.track.id}:${item.anchorId}:delay`);
            const floatDuration = `${12 + floatSeed * 9}s`;
            const driftX = `${pickInRange(driftSeedX, -14, 14).toFixed(2)}px`;
            const driftY = `${pickInRange(driftSeedY, -16, 16).toFixed(2)}px`;
            const floatDelay = `${(-delaySeed * 8).toFixed(2)}s`;

            return {
                id: recId,
                track: item.track,
                rank: idx + 1,
                worldX,
                worldY,
                inView,
                xPercent: rawXPercent,
                yPercent: rawYPercent,
                hovered,
                relatedToFocus: focusRecMode,
                showGuideLabel: focusRecMode && idx < 8,
                sourceTrackId: focusRecMode ? spectraExpandTrackId : nearestBubble?.trackId || null,
                style: {
                    '--tm-rec-size': '52px',
                    '--tm-float-duration': floatDuration,
                    '--tm-drift-x': driftX,
                    '--tm-drift-y': driftY,
                    '--tm-float-delay': floatDelay,
                    backgroundImage: item.track.coverUrl
                        ? `linear-gradient(150deg, rgba(255,255,255,0.08), rgba(8,12,20,0.18)), url(${item.track.coverUrl})`
                        : 'radial-gradient(circle at 30% 30%, rgba(167,139,250,0.55), rgba(191,219,254,0.38))',
                },
            };
        });

        return items;
    }, [
        exploreEnabled,
        viewMode,
        bubbleFieldSize.w,
        bubbleFieldSize.h,
        bubbleRenderItems,
        visibleBubbleRenderItems,
        exploreRecs,
        bubbleZoom,
        bubbleWorldScale,
        camera.x,
        camera.y,
        hoveredExploreId,
        xAxis,
        yAxis,
        spectraExpandTrackId,
    ]);
    const exploreVisibleCount = useMemo(
        () => exploreRenderItems.filter((item) => item.inView).length,
        [exploreRenderItems],
    );
    const handleZoomButton = useCallback((factor) => {
        const rect = bubbleFieldRef.current?.getBoundingClientRect();
        const cx = rect ? rect.left + rect.width / 2 : 0;
        const cy = rect ? rect.top + rect.height / 2 : 0;
        zoomAroundPointByFactor(factor, cx, cy);
    }, [zoomAroundPointByFactor]);
    const toggleExplore = useCallback(() => {
        const next = !exploreEnabled;
        setExploreEnabled(next);
        if (next) return;
        setSpectraExpandTrackId(null);
        if (selectedTrackCard?.source === 'recommendation') {
            setSelectedTrackCard(null);
        }
    }, [exploreEnabled, selectedTrackCard]);
    const focusCurrentBubbles = useCallback(() => {
        if (!bubbleRenderItems.length || !bubbleFieldSize.w || !bubbleFieldSize.h) return;
        const activeItems = bubbleRenderItems.filter((item) => item.active);
        const targets = activeItems.length ? activeItems : bubbleRenderItems;
        if (!targets.length) return;

        const minX = Math.min(...targets.map((item) => item.worldX - item.sizePx / 2));
        const maxX = Math.max(...targets.map((item) => item.worldX + item.sizePx / 2));
        const minY = Math.min(...targets.map((item) => item.worldY - item.sizePx / 2));
        const maxY = Math.max(...targets.map((item) => item.worldY + item.sizePx / 2));
        const boxW = Math.max(1, maxX - minX);
        const boxH = Math.max(1, maxY - minY);
        const margin = 120;

        const fitZoomX = bubbleFieldSize.w / (boxW + margin * 2);
        const fitZoomY = bubbleFieldSize.h / (boxH + margin * 2);
        const targetZoom = clampZoom(Math.min(fitZoomX, fitZoomY));
        const viewportW = bubbleFieldSize.w / targetZoom;
        const viewportH = bubbleFieldSize.h / targetZoom;
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const targetCamera = clampCamera(centerX - viewportW / 2, centerY - viewportH / 2, targetZoom);

        if (zoomCameraRafRef.current) {
            window.cancelAnimationFrame(zoomCameraRafRef.current);
            zoomCameraRafRef.current = 0;
        }
        if (cameraRafRef.current) {
            window.cancelAnimationFrame(cameraRafRef.current);
            cameraRafRef.current = 0;
        }
        queuedZoomCameraRef.current = null;
        queuedCameraRef.current = null;
        bubbleZoomRef.current = targetZoom;
        cameraRef.current = targetCamera;
        setBubbleZoom(targetZoom);
        setCamera(targetCamera);
    }, [bubbleRenderItems, bubbleFieldSize.w, bubbleFieldSize.h, clampCamera, clampZoom]);
    const showFullTasteField = useCallback(() => {
        const hadActiveFilter = selectedCluster !== null || selectedPeriodKey !== null || Boolean(spectraExpandTrackId);
        setSelectedCluster(null);
        setSelectedPeriodKey(null);
        setSpectraExpandTrackId(null);
        setActiveGenreFamily('');
        setActiveEmotionRegion('');
        if (hadActiveFilter) {
            pendingAxisFocusRef.current = true;
        } else {
            window.requestAnimationFrame(focusCurrentBubbles);
        }
    }, [selectedCluster, selectedPeriodKey, spectraExpandTrackId, focusCurrentBubbles]);
    useEffect(() => {
        if (viewMode !== 'bubble') return;
        pendingAxisFocusRef.current = true;
    }, [xAxis, yAxis, viewMode]);
    useEffect(() => {
        if (viewMode !== 'bubble') return;
        if (!pendingAxisFocusRef.current) return;
        if (!bubbleRenderItems.length) return;
        pendingAxisFocusRef.current = false;
        // Let layout settle for a frame after axis switch, then move camera.
        const id = window.requestAnimationFrame(() => {
            focusCurrentBubbles();
        });
        return () => window.cancelAnimationFrame(id);
    }, [viewMode, bubbleRenderItems, focusCurrentBubbles]);
    const focusExploreRecs = useCallback(() => {
        if (!exploreRenderItems.length || !bubbleFieldSize.w || !bubbleFieldSize.h) return;
        const viewportW = bubbleZoom > 0 ? bubbleFieldSize.w / bubbleZoom : bubbleFieldSize.w;
        const viewportH = bubbleZoom > 0 ? bubbleFieldSize.h / bubbleZoom : bubbleFieldSize.h;
        const mean = exploreRenderItems.reduce(
            (acc, item) => {
                acc.x += item.worldX;
                acc.y += item.worldY;
                return acc;
            },
            { x: 0, y: 0 },
        );
        const cx = mean.x / exploreRenderItems.length;
        const cy = mean.y / exploreRenderItems.length;
        animateCameraTo(
            clampCamera(cx - viewportW / 2, cy - viewportH / 2, bubbleZoom),
            bubbleZoom,
            520,
        );
    }, [exploreRenderItems, bubbleFieldSize.w, bubbleFieldSize.h, bubbleZoom, animateCameraTo, clampCamera]);

    const overviewDots = useMemo(() => {
        if (!bubbleNodesResult.length) return [];
        const maxDots = 700;
        const sampled = bubbleNodesResult.length <= maxDots
            ? bubbleNodesResult
            : [...bubbleNodesResult]
                .sort((a, b) => hash01(a.track.id) - hash01(b.track.id))
                .slice(0, maxDots);
        const blend = hasTrackFilter ? 0.26 : 0.18;
        return sampled.map((node) => {
            const clusterId = assignmentByTrackId.get(node.track.id);
            return {
                id: node.track.id,
                x: clamp01(node.nX + (node.nRawX - node.nX) * blend),
                y: clamp01(node.nY + (node.nRawY - node.nY) * blend),
                active: activeTrackIds.has(node.track.id),
                color: CLUSTER_COLORS[(clusterId ?? 0) % CLUSTER_COLORS.length],
            };
        });
    }, [bubbleNodesResult, hasTrackFilter, assignmentByTrackId, activeTrackIds]);

    const overviewMap = useMemo(() => {
        if (viewMode !== 'bubble') return null;
        if (!overviewDots.length || !bubbleFieldSize.w || !bubbleFieldSize.h) return null;
        const worldW = bubbleFieldSize.w * bubbleWorldScale;
        const worldH = bubbleFieldSize.h * bubbleWorldScale;
        if (!worldW || !worldH) return null;
        const viewportW = bubbleZoom > 0 ? bubbleFieldSize.w / bubbleZoom : bubbleFieldSize.w;
        const viewportH = bubbleZoom > 0 ? bubbleFieldSize.h / bubbleZoom : bubbleFieldSize.h;
        return {
            worldW,
            worldH,
            dots: overviewDots,
            viewRect: {
                x: clamp01(camera.x / worldW),
                y: clamp01(camera.y / worldH),
                w: clamp01(viewportW / worldW),
                h: clamp01(viewportH / worldH),
            },
        };
    }, [
        viewMode,
        overviewDots,
        bubbleFieldSize.w,
        bubbleFieldSize.h,
        bubbleWorldScale,
        bubbleZoom,
        camera.x,
        camera.y,
    ]);

    const handleOverviewNavigate = useCallback((event) => {
        if (!overviewMap) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const localX = clamp01((event.clientX - rect.left) / rect.width);
        const localY = clamp01((event.clientY - rect.top) / rect.height);
        const viewportW = bubbleZoom > 0 ? bubbleFieldSize.w / bubbleZoom : bubbleFieldSize.w;
        const viewportH = bubbleZoom > 0 ? bubbleFieldSize.h / bubbleZoom : bubbleFieldSize.h;
        const centerX = localX * overviewMap.worldW;
        const centerY = localY * overviewMap.worldH;
        scheduleCameraUpdate(clampCamera(centerX - viewportW / 2, centerY - viewportH / 2, bubbleZoom));
    }, [overviewMap, bubbleZoom, bubbleFieldSize.w, bubbleFieldSize.h, clampCamera, scheduleCameraUpdate]);

    const staticOverviewMap = useMemo(() => {
        if (!bubbleNodesResult.length || !clusterStats.length || tracks.length === 0) return null;
        const pointsByCluster = new Map();
        bubbleNodesResult.forEach((node) => {
            const clusterId = assignmentByTrackId.get(node.track.id);
            if (!Number.isInteger(clusterId)) return;
            if (!pointsByCluster.has(clusterId)) pointsByCluster.set(clusterId, []);
            pointsByCluster.get(clusterId).push({
                x: clamp01(node.nX),
                y: clamp01(node.nY),
            });
        });

        const clampRange = (value, min, max) => Math.min(max, Math.max(min, value));
        const topClusters = clusterStats.slice(0, 7);
        const regions = topClusters
            .map((cluster) => {
                const pts = pointsByCluster.get(cluster.j) || [];
                if (pts.length < 3) return null;
                let minX = 1; let minY = 1; let maxX = 0; let maxY = 0;
                let sumX = 0; let sumY = 0;
                pts.forEach((p) => {
                    minX = Math.min(minX, p.x);
                    minY = Math.min(minY, p.y);
                    maxX = Math.max(maxX, p.x);
                    maxY = Math.max(maxY, p.y);
                    sumX += p.x;
                    sumY += p.y;
                });
                const meanX = sumX / pts.length;
                const meanY = sumY / pts.length;
                let varX = 0;
                let varY = 0;
                pts.forEach((p) => {
                    varX += (p.x - meanX) ** 2;
                    varY += (p.y - meanY) ** 2;
                });
                const stdX = Math.sqrt(varX / pts.length);
                const stdY = Math.sqrt(varY / pts.length);
                const width = clampRange(Math.max((maxX - minX) + 0.03, stdX * 4.3), 0.09, 0.56);
                const height = clampRange(Math.max((maxY - minY) + 0.03, stdY * 4.3), 0.08, 0.5);
                const cx = clamp01(meanX);
                const cy = clamp01(meanY);
                const x = clampRange(cx - width * 0.5, 0, 1 - width);
                const y = clampRange(cy - height * 0.5, 0, 1 - height);
                return {
                    id: cluster.j,
                    symbol: cluster.label.symbol || 'headset',
                    name: cluster.label.name,
                    color: cluster.color,
                    share: Math.round((cluster.count / tracks.length) * 100),
                    x,
                    y,
                    w: width,
                    h: height,
                };
            })
            .filter(Boolean)
            .sort((a, b) => (b.w * b.h) - (a.w * a.h));

        return {
            total: bubbleNodesResult.length,
            regions,
        };
    }, [bubbleNodesResult, assignmentByTrackId, clusterStats, tracks.length]);

    const overviewClusterBreakdown = useMemo(() => {
        if (!clusterStats.length || tracks.length === 0) return [];
        return clusterStats.slice(0, 6).map((cluster) => ({
            id: cluster.j,
            name: cluster.label.name,
            symbol: cluster.label.symbol || 'headset',
            color: cluster.color,
            count: cluster.count,
            share: Math.round((cluster.count / tracks.length) * 100),
        }));
    }, [clusterStats, tracks.length]);

    const getNearestTrackIndex = useCallback((event, threshold = 20) => {
        const canvas = canvasRef.current;
        if (!canvas || tracks.length === 0) return null;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mx = (event.clientX - rect.left) * scaleX;
        const my = (event.clientY - rect.top) * scaleY;

        const pw = canvas.width - PADDING.left - PADDING.right;
        const ph = canvas.height - PADDING.top - PADDING.bottom;

        let nearest = null;
        let nearestDist = threshold;

        tracks.forEach((t, i) => {
            if (hasTrackFilter && !activeTrackIds.has(t.id)) return;

            const cx = PADDING.left + getTrackFeature(t, xAxis) * pw;
            const cy = PADDING.top + (1 - getTrackFeature(t, yAxis)) * ph;
            const d = Math.hypot(mx - cx, my - cy);
            if (d < nearestDist) {
                nearestDist = d;
                nearest = i;
            }
        });

        return nearest;
    }, [tracks, hasTrackFilter, activeTrackIds, xAxis, yAxis]);

    // ── Mouse hit-test ───────────────────────────────────────────────────────
    const handleMouseMove = useCallback((e) => {
        const nearest = getNearestTrackIndex(e, 20);
        setHoveredIdx(nearest);
        setHoveredTrack(nearest !== null ? tracks[nearest] : null);
        setHoveredPos({ x: e.clientX, y: e.clientY });
    }, [getNearestTrackIndex, tracks]);

    const handleMouseLeave = useCallback(() => {
        setHoveredIdx(null);
        setHoveredTrack(null);
    }, []);

    // ── Helpers ─────────────────────────────────────────────────────────────
    const FeatureBar = ({ label, value }) => (
        <div className="tm-feat-row">
            <span className="tm-feat-label">{label}</span>
            <div className="tm-feat-bar-bg">
                <div className="tm-feat-bar-fill" style={{ width: `${Math.round(value * 100)}%` }} />
            </div>
            <span className="tm-feat-val">{Math.round(value * 100)}</span>
        </div>
    );

    // Playback stays outside the app, but only after an explicit service choice.
    const openTrackExternal = useCallback((trackOrId, service = 'spotify') => {
        const trackId = typeof trackOrId === 'object' ? trackOrId?.id : trackOrId;
        if (!trackId) return;
        const t = (typeof trackOrId === 'object' ? trackOrId : null)
            || tracks.find((x) => x.id === trackId)
            || exploreRecs.find((r) => r.track?.id === trackId)?.track;
        const query = `${t?.artists || ''} ${t?.name || ''}`.trim();
        const url = service === 'youtube'
            ? (query ? `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}` : null)
            : (t?.externalUrl || (query ? `https://open.spotify.com/search/${encodeURIComponent(query)}` : null));
        if (url && typeof window !== 'undefined') {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
        setNowPlayingTrackId(trackId);
    }, [tracks, exploreRecs]);

    const openTrackCard = useCallback((track, source = 'library') => {
        if (!track?.id) return;
        setSelectedTrackCard({ track, source });
        setBubbleContextMenu(null);
        setHoveredBubbleId(source === 'library' ? track.id : null);
    }, []);

    // "Save" now folds the discovered track into the local field (no Spotify library).
    const saveTrackToMyBubble = useCallback((track) => {
        const trackId = track?.id;
        if (!trackId) return;
        if (knownTrackIds.has(trackId) || savedFromRecIds[trackId]) return;

        if (isSpectraExpandMode && spectraExpandTrackId && spectraExpandTrackId !== trackId) {
            setSpectraAffinityMap((prev) => ({ ...prev, [trackId]: spectraExpandTrackId }));
        }

        setSavedFromRecIds((prev) => ({ ...prev, [trackId]: true }));
        setTracks((prev) => (
            prev.some((t) => t.id === trackId)
                ? prev
                : [...prev, { ...track, addedAt: new Date().toISOString() }]
        ));
        setRecActionMessage(copy.recAddSuccess);
    }, [
        knownTrackIds,
        savedFromRecIds,
        copy.recAddSuccess,
        isSpectraExpandMode,
        spectraExpandTrackId,
    ]);

    const handleCanvasClick = useCallback((e) => {
        const nearest = getNearestTrackIndex(e, 16);
        if (nearest === null) return;

        const track = tracks[nearest];
        openTrackCard(track, 'library');
    }, [getNearestTrackIndex, tracks, openTrackCard]);

    const handleBubbleClick = useCallback((track) => {
        const justPanned = Date.now() - (panRef.current.lastMoveAt || 0) < 120;
        const justDragged = Date.now() - (bubbleDragRef.current.lastMoveAt || 0) < 180;
        if (panRef.current.moved || justPanned || justDragged) return;
        if (isSpectraExpandMode && track.id === spectraExpandTrackId) {
            setExploreEnabled(false);
            setSpectraExpandTrackId(null);
            setExploreRecs([]);
            setHoveredExploreId(null);
            setSelectedTrackCard(null);
            setHoveredBubbleId(null);
            return;
        }
        openTrackCard(track, 'library');
    }, [openTrackCard, isSpectraExpandMode, spectraExpandTrackId]);

    const handleBubbleLayerClick = useCallback((event) => {
        const bubbleElement = event.target?.closest?.('[data-bubble-id]');
        if (!bubbleElement) return;
        const track = trackLookupById.get(bubbleElement.dataset.bubbleId);
        if (track) handleBubbleClick(track);
    }, [trackLookupById, handleBubbleClick]);

    const focusBubbleTrack = useCallback((trackId, { ensureZoom = 0, duration = 560 } = {}) => {
        if (!trackId || !bubbleRenderItems.length || !bubbleFieldSize.w || !bubbleFieldSize.h) return false;
        const item = bubbleRenderItems.find((entry) => entry.node.track.id === trackId);
        if (!item) return false;

        const currentZoom = bubbleZoomRef.current || bubbleZoom;
        const targetZoom = ensureZoom > 0 ? Math.max(currentZoom, ensureZoom) : currentZoom;
        const viewportW = bubbleFieldSize.w / targetZoom;
        const viewportH = bubbleFieldSize.h / targetZoom;
        const nextX = item.worldX - viewportW / 2;
        const nextY = item.worldY - viewportH / 2;
        animateCameraTo(clampCamera(nextX, nextY, targetZoom), targetZoom, duration);
        return true;
    }, [bubbleRenderItems, bubbleFieldSize.w, bubbleFieldSize.h, bubbleZoom, animateCameraTo, clampCamera]);

    const openBubbleContextMenu = useCallback((event, track) => {
        event.preventDefault();
        event.stopPropagation();
        if (!bubbleFieldRef.current || !track?.id) return;

        const rect = bubbleFieldRef.current.getBoundingClientRect();
        const menuW = 260;
        const menuH = 172;
        const rawX = event.clientX - rect.left;
        const rawY = event.clientY - rect.top;
        const x = Math.min(Math.max(10, rawX), Math.max(10, rect.width - menuW - 10));
        const y = Math.min(Math.max(10, rawY), Math.max(10, rect.height - menuH - 10));
        const clusterId = assignmentByTrackId.get(track.id);

        setHoveredBubbleId(track.id);
        setSelectedTrackCard(null);
        setBubbleContextMenu({
            x,
            y,
            track,
            clusterId: Number.isInteger(clusterId) ? clusterId : null,
        });
    }, [assignmentByTrackId]);

    const handleBubbleLayerContextMenu = useCallback((event) => {
        const bubbleElement = event.target?.closest?.('[data-bubble-id]');
        if (!bubbleElement) return;
        const track = trackLookupById.get(bubbleElement.dataset.bubbleId);
        if (track) openBubbleContextMenu(event, track);
    }, [trackLookupById, openBubbleContextMenu]);

    const applySpectraExpandByTrackId = useCallback((trackId) => {
        if (!trackId) return false;
        const clusterId = assignmentByTrackId.get(trackId);
        if (clusterId === null || clusterId === undefined || clusterId < 0) return false;

        setExploreEnabled(true);
        setSpectraExpandTrackId(trackId);
        setHoveredBubbleId(trackId);
        triggerExpandedClusterHighlight(clusterId);
        focusBubbleTrack(trackId, { ensureZoom: 0.9, duration: 620 });
        return true;
    }, [assignmentByTrackId, focusBubbleTrack, triggerExpandedClusterHighlight]);

    const toggleExpandPinTrack = useCallback((track) => {
        if (!track?.id) return;
        setExpandPinMap((prev) => {
            const next = { ...prev };
            if (next[track.id]) {
                delete next[track.id];
                return next;
            }
            next[track.id] = {
                id: track.id,
                name: track.name || 'Untitled',
                artists: track.artists || '',
                coverUrl: track.coverUrl || null,
                genres: Array.isArray(track.genres) ? track.genres : [],
            };
            return next;
        });
    }, []);

    const handleContextToggleExpandPin = useCallback(() => {
        if (!bubbleContextMenu?.track) return;
        const pinned = Boolean(expandPinMap[bubbleContextMenu.track.id]);
        toggleExpandPinTrack(bubbleContextMenu.track);
        setRecActionMessage(pinned ? '확장 핀에서 제거했어요.' : '확장 핀에 추가했어요.');
        setBubbleContextMenu(null);
    }, [bubbleContextMenu, expandPinMap, toggleExpandPinTrack]);

    const handleContextExpandCluster = useCallback(() => {
        if (!bubbleContextMenu?.track) return;
        const ok = applySpectraExpandByTrackId(bubbleContextMenu.track.id);
        if (!ok) {
            setRecActionMessage(copy.contextMenuNoCluster);
        }
        setBubbleContextMenu(null);
    }, [bubbleContextMenu, copy.contextMenuNoCluster, applySpectraExpandByTrackId]);

    useEffect(() => {
        if (exploreEnabled) return;
        if (!spectraExpandTrackId) return;
        setSpectraExpandTrackId(null);
    }, [exploreEnabled, spectraExpandTrackId]);

    useEffect(() => {
        if (!spectraExpandTrackId) return;
        if (activeTrackIds.has(spectraExpandTrackId)) return;
        setSpectraExpandTrackId(null);
    }, [spectraExpandTrackId, activeTrackIds]);

    useEffect(() => {
        if (isSpectraExpandMode) return;
        if (Object.keys(spectraAffinityMap).length === 0) return;
        setSpectraAffinityMap({});
    }, [isSpectraExpandMode, spectraAffinityMap]);

    const handleContextFocusTrack = useCallback(() => {
        if (!bubbleContextMenu?.track) return;
        focusBubbleTrack(bubbleContextMenu.track.id, { ensureZoom: 1.15 });
        setBubbleContextMenu(null);
    }, [bubbleContextMenu, focusBubbleTrack]);

    const handleContextPlayTrack = useCallback(() => {
        if (!bubbleContextMenu?.track) return;
        openTrackExternal(bubbleContextMenu.track, 'spotify');
        setBubbleContextMenu(null);
    }, [bubbleContextMenu, openTrackExternal]);

    const handleContextSaveTrack = useCallback(() => {
        if (!bubbleContextMenu?.track) return;
        saveTrackToMyBubble(bubbleContextMenu.track);
        setBubbleContextMenu(null);
    }, [bubbleContextMenu, saveTrackToMyBubble]);

    useEffect(() => {
        if (!bubbleContextMenu) return undefined;
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') setBubbleContextMenu(null);
        };
        const handlePointerDown = (event) => {
            const target = event.target;
            if (target && typeof target.closest === 'function' && target.closest('.tm-bubble-context-menu')) return;
            setBubbleContextMenu(null);
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('pointerdown', handlePointerDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('pointerdown', handlePointerDown);
        };
    }, [bubbleContextMenu]);

    useEffect(() => {
        if (!selectedTrackCard) return undefined;
        const handleKeyDown = (event) => {
            if (event.key !== 'Escape') return;
            setSelectedTrackCard(null);
            setHoveredBubbleId(null);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedTrackCard]);

    const toggleShareTrack = useCallback((track) => {
        if (!track?.id) return;
        setShareSelectedMap((prev) => {
            const next = { ...prev };
            if (next[track.id]) {
                delete next[track.id];
            } else {
                next[track.id] = {
                    id: track.id,
                    name: track.name,
                    artists: track.artists,
                };
            }
            return next;
        });
        setShareMessage(null);
    }, []);
    const copyShareSelection = useCallback(async () => {
        if (!shareSelectedTracks.length) return;
        const header = 'SPECTRA Taste Map Picks';
        const lines = shareSelectedTracks.map((track, idx) => (
            `${idx + 1}. ${track.name} — ${track.artists}\nhttps://open.spotify.com/track/${track.id}`
        ));
        const text = `${header}\n\n${lines.join('\n\n')}`;
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            }
            setShareMessage('선택한 버블 목록을 복사했어요.');
        } catch {
            setShareMessage('복사에 실패했어요. 브라우저 권한을 확인해 주세요.');
        }
    }, [shareSelectedTracks]);
    const toggleShareMode = useCallback(() => {
        setShareMode((prev) => !prev);
        setShareMessage(null);
    }, []);

    const handlePresetChange = useCallback((presetKey) => {
        const preset = AXIS_PRESETS.find((item) => item.key === presetKey);
        if (!preset) return;
        setXAxis(preset.x);
        setYAxis(preset.y);
        if (zAxis === preset.x || zAxis === preset.y) {
            const fallbackZ = FEATURE_KEYS.find((key) => key !== preset.x && key !== preset.y) || zAxis;
            setZAxis(fallbackZ);
        }
    }, [zAxis]);

    const handleLibraryCardWheel = useCallback((listRef) => (event) => {
        const list = listRef?.current;
        if (!list) return;

        const canScroll = list.scrollHeight > list.clientHeight + 1;
        if (!canScroll) return;

        const atTop = list.scrollTop <= 0;
        const atBottom = list.scrollTop + list.clientHeight >= list.scrollHeight - 1;
        const goingUp = event.deltaY < 0;
        const goingDown = event.deltaY > 0;

        if ((goingUp && !atTop) || (goingDown && !atBottom)) {
            if (event.cancelable) event.preventDefault();
            list.scrollTop += event.deltaY;
        }
    }, []);

    const handleTimelineRowWheel = useCallback((event) => {
        const row = timelineRowRef.current;
        if (!row) return;

        const canScrollX = row.scrollWidth > row.clientWidth + 1;
        if (!canScrollX) return;

        const primaryDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY)
            ? event.deltaX
            : event.deltaY;

        if (primaryDelta === 0) return;

        const atLeft = row.scrollLeft <= 0;
        const atRight = row.scrollLeft + row.clientWidth >= row.scrollWidth - 1;
        const goingLeft = primaryDelta < 0;
        const goingRight = primaryDelta > 0;

        if ((goingLeft && !atLeft) || (goingRight && !atRight)) {
            if (event.cancelable) event.preventDefault();
            row.scrollLeft += primaryDelta;
        }
    }, []);

    const handleXAxisChange = (nextKey) => {
        if (nextKey === yAxis) {
            setYAxis(xAxis);
        }
        if (nextKey === zAxis) {
            setZAxis(xAxis);
        }
        setXAxis(nextKey);
    };

    const handleYAxisChange = (nextKey) => {
        if (nextKey === xAxis) {
            setXAxis(yAxis);
        }
        if (nextKey === zAxis) {
            setZAxis(yAxis);
        }
        setYAxis(nextKey);
    };

    const handleZAxisChange = (nextKey) => {
        if (nextKey === xAxis) {
            setXAxis(zAxis);
        }
        if (nextKey === yAxis) {
            setYAxis(zAxis);
        }
        setZAxis(nextKey);
    };

    const hoveredCluster = hoveredIdx !== null ? clusterById[assignments[hoveredIdx]] : null;
    const selectedClusterData = useMemo(() => {
        if (selectedCluster !== null && clusterById[selectedCluster]) return clusterById[selectedCluster];
        return clusterStats[0] || null;
    }, [selectedCluster, clusterById, clusterStats]);
    const xMeta = FEATURE_META[xAxis];
    const yMeta = FEATURE_META[yAxis];
    const zMeta = FEATURE_META[zAxis];
    const discoveryAnchorPosition = useMemo(() => {
        if (!isSpectraExpandMode || !spectraExpandTrackId) return null;
        const anchor = bubbleRenderItems.find((item) => item.node.track.id === spectraExpandTrackId);
        if (!anchor) return null;
        return {
            xPercent: anchor.xPercent,
            yPercent: anchor.yPercent,
            orbitSize: Math.min(620, Math.max(360, 480 * bubbleZoom)),
        };
    }, [isSpectraExpandMode, spectraExpandTrackId, bubbleRenderItems, bubbleZoom]);
    const selectedTrackDetails = useMemo(() => {
        const track = selectedTrackCard?.track;
        if (!track?.id) return null;
        const clusterId = assignmentByTrackId.get(track.id);
        const cluster = Number.isInteger(clusterId) ? clusterById[clusterId] : null;
        return {
            track,
            source: selectedTrackCard.source,
            cluster,
            genres: getTrackGenres(track).slice(0, 4),
            xValue: Math.round(clamp01(getTrackFeature(track, xAxis)) * 100),
            yValue: Math.round(clamp01(getTrackFeature(track, yAxis)) * 100),
            alreadyInField: knownTrackIds.has(track.id) || Boolean(savedFromRecIds[track.id]),
        };
    }, [selectedTrackCard, assignmentByTrackId, clusterById, xAxis, yAxis, knownTrackIds, savedFromRecIds]);
    const selectedTrackCardPosition = useMemo(() => {
        if (!selectedTrackDetails || !bubbleFieldSize.w || !bubbleFieldSize.h) return null;
        const trackId = selectedTrackDetails.track.id;
        const libraryItem = bubbleRenderItems.find((item) => item.node.track.id === trackId);
        const recItem = exploreRenderItems.find((item) => item.track.id === trackId && item.inView);
        const item = selectedTrackDetails.source === 'recommendation' ? recItem : libraryItem;
        if (!item) return null;

        const targetX = clamp01(item.xPercent / 100) * bubbleFieldSize.w;
        const targetY = clamp01(item.yPercent / 100) * bubbleFieldSize.h;
        const targetRadius = (item.sizePx || 52) / 2;
        const cardW = 370;
        const cardH = 352;
        const placeRight = targetX < bubbleFieldSize.w * 0.58;
        const rawLeft = placeRight
            ? targetX + targetRadius + 24
            : targetX - cardW - targetRadius - 24;
        const left = Math.min(
            Math.max(18, rawLeft),
            Math.max(18, bubbleFieldSize.w - cardW - 18),
        );
        const maxTop = Math.max(90, bubbleFieldSize.h - cardH - 88);
        const top = Math.min(Math.max(90, targetY - 104), maxTop);
        return {
            left,
            top,
            side: placeRight ? 'right' : 'left',
            tailY: Math.min(cardH - 30, Math.max(34, targetY - top)),
        };
    }, [selectedTrackDetails, bubbleFieldSize.w, bubbleFieldSize.h, bubbleRenderItems, exploreRenderItems]);
    const followedArtistPreview = useMemo(
        () => (librarySummary?.followedArtists || []),
        [librarySummary],
    );
    const savedAlbumPreview = useMemo(
        () => (librarySummary?.savedAlbums || []),
        [librarySummary],
    );
    const followedGenrePreview = useMemo(
        () => (librarySummary?.topFollowedGenres || []).slice(0, 6),
        [librarySummary],
    );
    const hasRenderableMap = tracks.length > 0 && bubbleNodesResult.length > 0;
    // Background reclustering must not cover a map that is already usable.
    const isAnalyzing = (loading || clusterLoading) && !hasRenderableMap;
    const analysisTargetProgress = useMemo(() => {
        if (hasRenderableMap) return 100;
        if (loading) return cacheReady ? 62 : 18;
        if (clusterLoading) return 88;
        if (tracks.length > 0) return 100;
        return 0;
    }, [hasRenderableMap, loading, cacheReady, clusterLoading, tracks.length]);
    const analysisStep = useMemo(() => {
        if (loading) return cacheReady ? 2 : 1;
        if (clusterLoading) return 3;
        return 3;
    }, [loading, cacheReady, clusterLoading]);
    const analysisMessage = useMemo(() => {
        if (loading && !cacheReady) return lang === 'en'
            ? 'Preparing your imported track list.'
            : '가져온 곡 목록을 준비하고 있어요.';
        if (loading) return lang === 'en'
            ? 'Preparing Last.fm signals and Spotify cover metadata.'
            : 'Last.fm 취향 신호와 Spotify 커버 정보를 준비하는 중입니다.';
        if (clusterLoading) return lang === 'en'
            ? 'Computing clusters and finalizing your taste map.'
            : '클러스터를 계산해 내 취향 지도를 마무리하는 중입니다.';
        return lang === 'en' ? 'Analysis complete.' : '분석이 완료되었습니다.';
    }, [loading, cacheReady, clusterLoading, lang]);

    const handleGenreRegionEnter = useCallback((genre) => {
        const family = getGenreIdentity(genre).family || '';
        setActiveGenreFamily(family);
    }, []);

    const clearGenreRegionFocus = useCallback(() => {
        setActiveGenreFamily('');
    }, []);

    const handleEmotionRegionEnter = useCallback((regionKey) => {
        setActiveEmotionRegion(String(regionKey || ''));
    }, []);

    const clearEmotionRegionFocus = useCallback(() => {
        setActiveEmotionRegion('');
    }, []);

    const handleRegionLightMove = useCallback((event) => {
        const el = event.currentTarget;
        const rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        el.style.setProperty('--tm-light-x', `${x.toFixed(2)}%`);
        el.style.setProperty('--tm-light-y', `${y.toFixed(2)}%`);
    }, []);

    const resetRegionLight = useCallback((event) => {
        const el = event.currentTarget;
        el.style.removeProperty('--tm-light-x');
        el.style.removeProperty('--tm-light-y');
    }, []);

    useEffect(() => {
        let raf = 0;
        const target = analysisTargetProgress;
        const animate = () => {
            const current = analysisProgressRef.current;
            const gap = target - current;
            const next = Math.abs(gap) < 0.35
                ? target
                : Math.max(0, Math.min(100, current + gap * 0.12));
            analysisProgressRef.current = next;
            setAnalysisProgress(next);
            if (next !== target) raf = window.requestAnimationFrame(animate);
        };
        raf = window.requestAnimationFrame(animate);
        return () => window.cancelAnimationFrame(raf);
    }, [analysisTargetProgress]);

    useEffect(() => {
        if (!mapFullscreen) return undefined;
        const prevOverflow = document.body.style.overflow;
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') setMapFullscreen(false);
        };
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [mapFullscreen]);

    const ambientUiIsVisible = useMemo(() => {
        if (viewMode !== 'bubble') return true;
        return ambientUiVisible || shareMode || mapFullscreen;
    }, [viewMode, ambientUiVisible, shareMode, mapFullscreen]);

    useEffect(() => {
        if (!recActionMessage) return undefined;
        const timer = window.setTimeout(() => setRecActionMessage(null), 3600);
        return () => window.clearTimeout(timer);
    }, [recActionMessage]);

    const explorerName = (user?.displayName || (lang === 'en' ? 'My' : '나의')).trim();
    const explorerNickname = useMemo(() => {
        const base = explorerName.replace(/^@+/, '').trim();
        const first = base.split(/\s+/)[0] || base;
        return first.length > 18 ? `${first.slice(0, 18)}…` : first;
    }, [explorerName]);
    const deepAnalysisLabel = lang === 'en' ? 'Taste Story' : '취향 스토리';
    const deepAnalysisDesc = lang === 'en'
        ? 'A focused view of how your taste changes over time'
        : '시간에 따라 달라진 취향을 차분하게 살펴보세요';
    const deepAnalysisToggleLabel = deepAnalysisOpen
        ? (lang === 'en' ? 'Collapse' : '접기')
        : (lang === 'en' ? 'Expand' : '펼쳐보기');
    const dashboardToggleLabel = dashboardOpen ? copy.dashboardHide : copy.dashboardShow;

    return (
        <div className={`tm-root tm-lang-${lang}${mapFullscreen ? ' tm-root-fullscreen' : ''}`} ref={containerRef}>
            {/* Header */}
            <header className="tm-header">
                <div className="tm-header-main">
                    <span className="tm-pill">S P E C T R A</span>
                    <h1 className="tm-title">
                        <span className="tm-title-brand">{explorerNickname}</span>
                        {' Taste Field'}
                    </h1>
                    <p className="tm-subtitle">
                        {copy.mappedSubtitle}
                    </p>
                    <div className="tm-header-live" aria-label="map status">
                        <span className="tm-live-signal"><span aria-hidden />LIVE FIELD</span>
                        <span>{tracks.length} {lang === 'en' ? 'memories' : '개의 기억'}</span>
                        <span>{clusterStats.length} {lang === 'en' ? 'regions' : '개의 영역'}</span>
                    </div>
                </div>
                <div className="tm-header-side">
                    <div className="tm-lang-toggle" role="tablist" aria-label="language toggle">
                        <button
                            type="button"
                            className={`tm-lang-btn${lang === 'ko' ? ' active' : ''}`}
                            onClick={() => setLang('ko')}
                            aria-selected={lang === 'ko'}
                        >
                            KO
                        </button>
                        <button
                            type="button"
                            className={`tm-lang-btn${lang === 'en' ? ' active' : ''}`}
                            onClick={() => setLang('en')}
                            aria-selected={lang === 'en'}
                        >
                            EN
                        </button>
                    </div>
                </div>
            </header>

            {isAnalyzing && (
                <>
                    <section className="tm-analysis-loading" aria-live="polite">
                        <div className="tm-analysis-head">
                            <strong>{copy.analyzingTitle}</strong>
                            <span>{Math.round(analysisProgress)}%</span>
                        </div>
                        <p className="tm-analysis-message">{analysisMessage}</p>
                        <div className="tm-analysis-progress">
                            <div className="tm-analysis-progress-fill" style={{ width: `${analysisProgress}%` }} />
                        </div>
                        <div className="tm-analysis-steps">
                            <div className={`tm-analysis-step ${analysisStep >= 1 ? 'active' : ''}`}>
                                <span className="tm-analysis-step-no">01</span>
                                <span className="tm-analysis-step-text">{copy.analyzingStep1}</span>
                            </div>
                            <div className={`tm-analysis-step ${analysisStep >= 2 ? 'active' : ''}`}>
                                <span className="tm-analysis-step-no">02</span>
                                <span className="tm-analysis-step-text">{copy.analyzingStep2}</span>
                            </div>
                            <div className={`tm-analysis-step ${analysisStep >= 3 ? 'active' : ''}`}>
                                <span className="tm-analysis-step-no">03</span>
                                <span className="tm-analysis-step-text">{copy.analyzingStep3}</span>
                            </div>
                        </div>
                    </section>
                    <section className="tm-skeleton" aria-hidden>
                        <div className="tm-skeleton-row">
                            <div className="tm-skeleton-block tm-skeleton-chip" />
                            <div className="tm-skeleton-block tm-skeleton-chip" />
                            <div className="tm-skeleton-block tm-skeleton-chip" />
                            <div className="tm-skeleton-block tm-skeleton-chip" />
                        </div>
                        <div className="tm-skeleton-body">
                            <div className="tm-skeleton-block tm-skeleton-map" />
                            <div className="tm-skeleton-side">
                                <div className="tm-skeleton-block tm-skeleton-card" />
                                <div className="tm-skeleton-block tm-skeleton-card" />
                                <div className="tm-skeleton-block tm-skeleton-card tall" />
                            </div>
                        </div>
                    </section>
                </>
            )}
            {error && (
                <div className="tm-error">
                    {error.includes('401') || error.includes('Not logged in') ? (
                        <>
                            {copy.loginRequired}
                            {' '}
                            <button
                                type="button"
                                onClick={login}
                                style={{
                                    color: '#3182f6',
                                    background: 'transparent',
                                    border: 0,
                                    padding: 0,
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                    font: 'inherit',
                                }}
                            >
                                {copy.loginAction}
                            </button>
                        </>
                    ) : (
                        `⚠️ ${error}`
                    )}
                </div>
            )}
            {!loading && !error && tracks.length === 0 && (
                <div className="tm-empty">
                    {copy.emptyMap1}
                    <br />
                    {copy.emptyMap2}
                </div>
            )}

            {!loading && tracks.length > 0 && (
                <>
                    <section className={`tm-deep-analysis-shell${deepAnalysisOpen ? ' open' : ''}`}>
                        <div className="tm-deep-analysis-head">
                            <div className="tm-deep-analysis-title-wrap">
                                <h3 className="tm-deep-analysis-title">{deepAnalysisLabel}</h3>
                                <p className="tm-deep-analysis-desc">{deepAnalysisDesc}</p>
                            </div>
                            <button
                                type="button"
                                className={`tm-deep-analysis-toggle${deepAnalysisOpen ? ' open' : ''}`}
                                onClick={() => setDeepAnalysisOpen((prev) => !prev)}
                                aria-expanded={deepAnalysisOpen}
                                aria-controls="tm-deep-analysis-body"
                            >
                                {deepAnalysisToggleLabel}
                            </button>
                        </div>
                        <div
                            id="tm-deep-analysis-body"
                            className={`tm-deep-analysis-body${deepAnalysisOpen ? ' open' : ''}`}
                            aria-hidden={!deepAnalysisOpen}
                        >
                            <TasteYearComparePanel
                                tracks={tracks}
                                profileName={user?.displayName || '나'}
                                lang={lang}
                            />
                            {staticOverviewMap && (
                                <section className="tm-overview-panel">
                            <div className="tm-overview-static">
                                <div className="tm-overview-head">
                                    <span>Taste Universe Snapshot</span>
                                    <span>{staticOverviewMap.total}{lang === 'en' ? ` ${copy.memoryVolumeSuffix}` : copy.memoryVolumeSuffix}</span>
                                </div>
                                <div className="tm-overview-meta">
                                    {lang === 'en'
                                        ? `${tracks.length} ${copy.memoryMeta} ${clusterStats.length} ${copy.regionsSuffix}`
                                        : `${tracks.length}${copy.memoryMeta} ${clusterStats.length}${copy.regionsSuffix}`}
                                </div>
                                <div
                                    className="tm-overview-region-tags tm-region-cloud tm-region-cloud-emotion"
                                    data-active-region={activeEmotionRegion || undefined}
                                    aria-label="cluster region tags"
                                >
                                    {staticOverviewMap.regions.map((region) => (
                                        <span
                                            key={`ov-region-chip-${region.id}`}
                                            className={`tm-overview-region-chip tm-region-tag tm-region-tag-emotion${activeEmotionRegion === `overview-${region.id}` ? ' is-region-active' : ''}${activeEmotionRegion && activeEmotionRegion !== `overview-${region.id}` ? ' is-region-dim' : ''}`}
                                            data-region={String(region.id)}
                                            tabIndex={0}
                                            style={{
                                                '--ov-color': region.color,
                                                ...getEmotionRegionStyle(region.color, `overview-${region.id}`),
                                            }}
                                            onMouseEnter={() => handleEmotionRegionEnter(`overview-${region.id}`)}
                                            onMouseLeave={(event) => {
                                                clearEmotionRegionFocus();
                                                resetRegionLight(event);
                                            }}
                                            onMouseMove={handleRegionLightMove}
                                            onFocus={() => handleEmotionRegionEnter(`overview-${region.id}`)}
                                            onBlur={clearEmotionRegionFocus}
                                        >
                                            <SpectraSymbol symbol={region.symbol} className="tm-symbol-inline" />
                                            <span>{region.name} · {region.share}%</span>
                                        </span>
                                    ))}
                                </div>
                                <div className="tm-overview-layout">
                                    <div className="tm-overview-stage static" aria-label="taste distribution overview">
                                        {staticOverviewMap.regions.map((region) => (
                                            <div
                                                key={`ov-region-${region.id}`}
                                                className="tm-overview-region"
                                                style={{
                                                    left: `${region.x * 100}%`,
                                                    top: `${region.y * 100}%`,
                                                    width: `${region.w * 100}%`,
                                                    height: `${region.h * 100}%`,
                                                    '--ov-color': region.color,
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <div className="tm-overview-side">
                                        <div className="tm-overview-insights">
                                            <article className="tm-overview-insight-card">
                                                <span className="tm-overview-insight-label">Memory Volume</span>
                                                <strong className="tm-overview-insight-value">{tracks.length}</strong>
                                                <span className="tm-overview-insight-meta">{coverage?.text || 'Built from your listening history'}</span>
                                            </article>
                                            <article className="tm-overview-insight-card">
                                                <span className="tm-overview-insight-label">Dominant Atmosphere</span>
                                                <strong className="tm-overview-insight-value">
                                                    {dominantCluster ? (
                                                        <>
                                                            <SpectraSymbol symbol={dominantCluster.label.symbol || 'headset'} className="tm-symbol-inline" />
                                                            <span>{dominantCluster.label.name}</span>
                                                        </>
                                                    ) : '-'}
                                                </strong>
                                                <span className="tm-overview-insight-meta">
                                                    {dominantCluster ? `${dominantShare}% of your current universe` : 'Finding your center of gravity'}
                                                </span>
                                            </article>
                                            <article className="tm-overview-insight-card">
                                                <span className="tm-overview-insight-label">Discovery Range</span>
                                                <strong className="tm-overview-insight-value">{diversityScore}</strong>
                                                <span className="tm-overview-insight-meta">How wide your taste field spreads</span>
                                            </article>
                                            <article className="tm-overview-insight-card">
                                                <span className="tm-overview-insight-label">Current Drift</span>
                                                <strong className="tm-overview-insight-value">
                                                    {xMeta.short}:{axisAverages.x} / {yMeta.short}:{axisAverages.y}
                                                </strong>
                                                <span className="tm-overview-insight-meta">Where your mood cluster sits now</span>
                                            </article>
                                        </div>
                                        <div className="tm-overview-legend">
                                            {overviewClusterBreakdown.map((item) => (
                                                <div key={`ov-legend-${item.id}`} className="tm-overview-legend-row">
                                                    <div className="tm-overview-legend-left">
                                                        <span className="tm-overview-legend-dot" style={{ backgroundColor: item.color }} />
                                                        <span className="tm-overview-legend-name">
                                                            <SpectraSymbol symbol={item.symbol} className="tm-symbol-inline" />
                                                            <span>{item.name}</span>
                                                        </span>
                                                    </div>
                                                    <span className="tm-overview-legend-share">{item.share}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="tm-overview-note">Your listening history, mapped in space.</div>
                            </div>
                                </section>
                            )}

                            <section className="tm-library-panel">
                        <div className="tm-library-head">
                            <h3 className="tm-library-title">Memory Shelf</h3>
                            {librarySummary?.stats?.partial && (
                                <span className="tm-library-meta">일부만 불러옴</span>
                            )}
                        </div>

                        {libraryLoading && (
                            <div className="tm-library-empty">팔로우 아티스트와 저장 앨범을 정리 중입니다.</div>
                        )}

                        {!libraryLoading && libraryError && (
                            <div className="tm-library-empty">
                                팔로우/앨범 정보를 가져오지 못했어요. Spotify 재로그인 후 다시 시도해 주세요.
                            </div>
                        )}

                        {!libraryLoading && !libraryError && librarySummary && (
                            <div className="tm-library-grid">
                                <article className="tm-library-card" onWheel={handleLibraryCardWheel(followedListRef)}>
                                    <div className="tm-library-card-head">
                                        <div>
                                            <span className="tm-library-card-label">팔로우 아티스트</span>
                                            <strong className="tm-library-card-value">
                                                {librarySummary.stats?.followedArtistsFetched ?? followedArtistPreview.length}
                                                {' / '}
                                                {librarySummary.stats?.followedArtistsTotal ?? followedArtistPreview.length}
                                            </strong>
                                        </div>
                                    </div>
                                    <div
                                        className="tm-library-genre-row tm-region-cloud tm-region-cloud-genre"
                                        data-active-family={activeGenreFamily || undefined}
                                    >
                                        {followedGenrePreview.length > 0 ? (
                                            followedGenrePreview.map((item) => {
                                                const identity = getGenreIdentity(item.genre);
                                                return (
                                                    <span
                                                        key={`follow-genre-${item.genre}`}
                                                        className={`tm-library-genre-chip tm-genre-token tm-region-tag tm-region-tag-genre${activeGenreFamily === identity.family ? ' is-family-active' : ''}${activeGenreFamily && activeGenreFamily !== identity.family ? ' is-family-dim' : ''}`}
                                                        data-family={identity.family}
                                                        style={getGenreChipStyle(item.genre)}
                                                        title={identity.display}
                                                        onMouseEnter={() => handleGenreRegionEnter(item.genre)}
                                                        onMouseLeave={(event) => {
                                                            clearGenreRegionFocus();
                                                            resetRegionLight(event);
                                                        }}
                                                        onMouseMove={handleRegionLightMove}
                                                        onFocus={() => handleGenreRegionEnter(item.genre)}
                                                        onBlur={clearGenreRegionFocus}
                                                    >
                                                        <SpectraSymbol symbol={getGenreSymbol(item.genre)} className="tm-symbol-chip" />
                                                        {identity.short} · {item.count}
                                                    </span>
                                                );
                                            })
                                        ) : (
                                            <span className="tm-library-hint">장르 정보가 아직 없어요.</span>
                                        )}
                                    </div>
                                    <div className="tm-library-list" ref={followedListRef}>
                                        {followedArtistPreview.map((artist) => (
                                            <a
                                                key={artist.id}
                                                className="tm-library-row"
                                                href={`https://open.spotify.com/artist/${artist.id}`}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                {artist.imageUrl ? (
                                                    <img src={artist.imageUrl} alt={artist.name} className="tm-library-cover" />
                                                ) : (
                                                    <span className="tm-library-cover tm-library-cover-fallback">A</span>
                                                )}
                                                <div className="tm-library-info">
                                                    <div className="tm-library-name">{artist.name}</div>
                                                    <div className="tm-library-sub">
                                                        {artist.genres?.[0] ? getGenreIdentity(artist.genres[0]).short : '장르 정보 없음'}
                                                    </div>
                                                </div>
                                            </a>
                                        ))}
                                        {followedArtistPreview.length === 0 && (
                                            <div className="tm-library-hint">팔로우 아티스트가 없어요.</div>
                                        )}
                                    </div>
                                </article>

                                <article className="tm-library-card" onWheel={handleLibraryCardWheel(savedAlbumListRef)}>
                                    <div className="tm-library-card-head">
                                        <div>
                                            <span className="tm-library-card-label">저장한 앨범</span>
                                            <strong className="tm-library-card-value">
                                                {librarySummary.stats?.savedAlbumsFetched ?? savedAlbumPreview.length}
                                                {' / '}
                                                {librarySummary.stats?.savedAlbumsTotal ?? savedAlbumPreview.length}
                                            </strong>
                                        </div>
                                    </div>
                                    <div className="tm-library-list" ref={savedAlbumListRef}>
                                        {savedAlbumPreview.map((album) => (
                                            <a
                                                key={album.id}
                                                className="tm-library-row"
                                                href={`https://open.spotify.com/album/${album.id}`}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                {album.coverUrl ? (
                                                    <img src={album.coverUrl} alt={album.name} className="tm-library-cover" />
                                                ) : (
                                                    <span className="tm-library-cover tm-library-cover-fallback">AL</span>
                                                )}
                                                <div className="tm-library-info">
                                                    <div className="tm-library-name">{album.name}</div>
                                                    <div className="tm-library-sub">{album.artists || '아티스트 정보 없음'}</div>
                                                </div>
                                                <span className="tm-library-date">{formatDateLabel(album.addedAt)}</span>
                                            </a>
                                        ))}
                                        {savedAlbumPreview.length === 0 && (
                                            <div className="tm-library-hint">저장된 앨범이 없어요.</div>
                                        )}
                                    </div>
                                </article>
                            </div>
                        )}
                            </section>
                        </div>
                    </section>

                    <section className="tm-axis-panel" aria-label={lang === 'en' ? 'Taste map tools' : '취향 지도 도구'}>
                        <div className="tm-view-switcher" role="tablist" aria-label={lang === 'en' ? 'Map view' : '맵 보기'}>
                            {MAP_VIEW_DEFINITIONS.map((definition) => (
                                <button
                                    key={definition.id}
                                    type="button"
                                    role="tab"
                                    className={`tm-view-option${activeMapView === definition.id ? ' active' : ''}`}
                                    aria-selected={activeMapView === definition.id}
                                    disabled={!definition.available}
                                    onClick={() => handleMapViewChange(definition.id)}
                                    title={definition.available ? definition.label : (lang === 'en' ? 'Coming in a future map' : '추후 추가될 맵입니다')}
                                >
                                    <span className="tm-view-option-mark" aria-hidden />
                                    <span>{definition.label}</span>
                                    {!definition.available && <span className="tm-view-soon">SOON</span>}
                                </button>
                            ))}
                        </div>

                        <span className="tm-dock-divider" aria-hidden />

                        <div className="tm-dock-zoom" aria-label={lang === 'en' ? 'Zoom controls' : '확대 축소'}>
                            <button type="button" onClick={() => handleZoomButton(1 / 1.2)} aria-label="zoom out">−</button>
                            <button type="button" className="tm-dock-zoom-value" onClick={focusCurrentBubbles} title={copy.currentBubble}>
                                {Math.round(bubbleZoom * 100)}%
                            </button>
                            <button type="button" onClick={() => handleZoomButton(1.2)} aria-label="zoom in">+</button>
                        </div>

                        <span className="tm-dock-divider" aria-hidden />

                        <div className="tm-dock-actions">
                            <button
                                type="button"
                                className={`tm-dock-action${showUtilityControls ? ' active' : ''}`}
                                onClick={() => setShowUtilityControls((prev) => !prev)}
                                aria-expanded={showUtilityControls}
                            >
                                <span aria-hidden>⌁</span>{lang === 'en' ? 'Axes' : '축'}
                            </button>
                            <button
                                type="button"
                                className={`tm-dock-action${magneticPullEnabled ? ' active' : ''}`}
                                onClick={() => setMagneticPullEnabled((prev) => !prev)}
                                aria-pressed={magneticPullEnabled}
                                title={lang === 'en' ? 'Pull nearby bubbles toward the pointer' : '포인터 주변 버블을 부드럽게 끌어당깁니다'}
                            >
                                <span aria-hidden>◎</span>{lang === 'en' ? 'Magnet' : '자석'}
                            </button>
                            <button
                                type="button"
                                className={`tm-dock-action${exploreEnabled ? ' active' : ''}`}
                                onClick={toggleExplore}
                                aria-pressed={exploreEnabled}
                            >
                                <span aria-hidden>✦</span>{lang === 'en' ? 'Discover' : '탐색'}
                            </button>
                            <button
                                type="button"
                                className={`tm-dock-action${dashboardOpen ? ' active' : ''}`}
                                onClick={() => {
                                    setDashboardOpen((prev) => !prev);
                                    setDeepAnalysisOpen(false);
                                }}
                                aria-pressed={dashboardOpen}
                            >
                                <span aria-hidden>◫</span>{lang === 'en' ? 'Inspect' : '인사이트'}
                            </button>
                            <button
                                type="button"
                                className={`tm-dock-action${deepAnalysisOpen ? ' active' : ''}`}
                                onClick={() => {
                                    setDeepAnalysisOpen((prev) => !prev);
                                    setDashboardOpen(false);
                                }}
                                aria-pressed={deepAnalysisOpen}
                            >
                                <span aria-hidden>◌</span>{lang === 'en' ? 'Story' : '스토리'}
                            </button>
                            <button
                                type="button"
                                className={`tm-dock-action${shareMode ? ' active' : ''}`}
                                onClick={toggleShareMode}
                                aria-pressed={shareMode}
                            >
                                <span aria-hidden>↗</span>{lang === 'en' ? 'Share' : '공유'}
                            </button>
                            <button
                                type="button"
                                className="tm-dock-action tm-dock-theme"
                                onClick={() => setMapTheme((prev) => (prev === 'day' ? 'dark' : 'day'))}
                                aria-label={mapTheme === 'day' ? 'dark map' : 'light map'}
                                title={mapTheme === 'day' ? 'Dark field' : 'Light field'}
                            >
                                <span aria-hidden>{mapTheme === 'day' ? '●' : '○'}</span>
                            </button>
                        </div>

                        {showUtilityControls && (
                            <div className="tm-axis-popover">
                                <div className="tm-axis-popover-head">
                                    <div>
                                        <strong>{lang === 'en' ? 'Map dimensions' : '맵 차원'}</strong>
                                        <span>{copy.axisGuide}</span>
                                    </div>
                                    <button type="button" onClick={() => setShowUtilityControls(false)} aria-label="close">×</button>
                                </div>
                                <div className="tm-preset-row">
                                    <span className="tm-axis-label">{copy.axisPresetLabel}</span>
                                    <div className="tm-preset-chips">
                                        {AXIS_PRESETS.map((preset) => (
                                            <button
                                                key={preset.key}
                                                className={`tm-preset-btn${axisPreset === preset.key ? ' active' : ''}`}
                                                onClick={() => handlePresetChange(preset.key)}
                                                title={preset.hint}
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="tm-axis-advanced">
                                    <label className="tm-axis-ctrl">
                                        <span className="tm-axis-label">{copy.axisX}</span>
                                        <select className="tm-axis-select" value={xAxis} onChange={(e) => handleXAxisChange(e.target.value)}>
                                            {FEATURE_KEYS.map((key) => <option key={key} value={key}>{FEATURE_META[key].label}</option>)}
                                        </select>
                                    </label>
                                    <label className="tm-axis-ctrl">
                                        <span className="tm-axis-label">{copy.axisY}</span>
                                        <select className="tm-axis-select" value={yAxis} onChange={(e) => handleYAxisChange(e.target.value)}>
                                            {FEATURE_KEYS.map((key) => <option key={key} value={key}>{FEATURE_META[key].label}</option>)}
                                        </select>
                                    </label>
                                </div>
                                <div className="tm-axis-meta">
                                    <span className="tm-axis-note">
                                        {effectiveClusterBasis === 'genre'
                                            ? `Genre · ${genreVocab.length}${lang === 'en' ? ` ${copy.genreBasis}` : copy.genreBasis}`
                                            : copy.audioBasis}
                                        {exploreEnabled && !exploreLoading && !exploreError && (
                                            <> · {copy.inViewCount} {exploreVisibleCount}{lang === 'en' ? '' : '곡'}</>
                                        )}
                                        {exploreLoading && <> · {copy.exploreLoading}</>}
                                        {exploreError && <> · {copy.exploreFailed}</>}
                                    </span>
                                    {(selectedCluster !== null || selectedPeriodKey !== null) && (
                                        <button
                                            type="button"
                                            className="tm-clear-filter"
                                            onClick={() => {
                                                setSelectedCluster(null);
                                                setSelectedPeriodKey(null);
                                                setSpectraExpandTrackId(null);
                                            }}
                                        >
                                            {copy.clearFilter}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </section>

                    <div className={`tm-body${ambientUiIsVisible ? '' : ' tm-ambient-ui-idle'}${dashboardOpen ? ' tm-dashboard-open' : ' tm-dashboard-closed'}`}>
                        {/* Map canvas */}
                        <div
                            className={`tm-canvas-wrap tm-theme-${mapTheme}${mapFullscreen ? ' fullscreen' : ''}`}
                            onPointerMove={() => revealAmbientUi(2200)}
                            onPointerDown={() => revealAmbientUi(2800)}
                        >
                            <div className="tm-map-top-bar">
                            <div className="tm-map-top-actions">
                                <div className="tm-map-overlay-controls">
                                    <button
                                        className={`tm-explore-toggle tm-explore-toggle--overlay${exploreEnabled ? ' active' : ''}`}
                                        onClick={toggleExplore}
                                        title="빈 영역 탐색 추천곡 표시"
                                    >
                                        {exploreEnabled ? copy.recOn : copy.recOff}
                                    </button>
                                    {exploreEnabled && exploreRecs.length > 0 && (
                                        <button
                                            className="tm-rec-focus-btn"
                                            onClick={focusExploreRecs}
                                            title="추천 위치로 이동"
                                        >
                                            {copy.recFocus}
                                        </button>
                                    )}
                                    <button
                                        className={`tm-share-mode-toggle${shareMode ? ' active' : ''}`}
                                        onClick={toggleShareMode}
                                        title={shareMode ? '공유 모드 종료' : '공유 모드 시작'}
                                    >
                                        {shareMode ? copy.shareOn : copy.share}
                                    </button>
                                    <button
                                        className={`tm-dashboard-toggle${subwayGeneratorOpen ? ' active' : ''}`}
                                        onClick={() => setSubwayGeneratorOpen(true)}
                                        title="지하철 노선도 생성기 열기"
                                        disabled={tracks.length < 4}
                                    >
                                        {copy.subwayGenerator}
                                    </button>
                                </div>
                                <button
                                    className={`tm-dashboard-toggle${dashboardOpen ? ' active' : ''}`}
                                    onClick={() => setDashboardOpen((prev) => !prev)}
                                    title={dashboardOpen ? '히스토리/태그 패널 숨기기' : '히스토리/태그 패널 보기'}
                                >
                                    {dashboardToggleLabel}
                                </button>
                                <button
                                    className={`tm-fullscreen-btn${mapFullscreen ? ' active' : ''}`}
                                    onClick={() => setMapFullscreen((prev) => !prev)}
                                    aria-label={mapFullscreen ? '취향 맵 축소' : '취향 맵 전체화면'}
                                    title={mapFullscreen ? '전체화면 종료 (Esc)' : '전체화면 보기'}
                                >
                                    <span>{mapFullscreen ? '⤡' : '⤢'}</span>
                                    <span>{mapFullscreen ? copy.mapZoomOut : copy.mapZoomIn}</span>
                                </button>
                            </div>
                            <div
                                className="tm-map-tag-strip tm-region-cloud tm-region-cloud-emotion"
                                data-active-region={activeEmotionRegion || undefined}
                                ref={mapTagStripRef}
                                onPointerDown={handleMapTagPointerDown}
                                onPointerMove={handleMapTagPointerMove}
                                onPointerUp={handleMapTagPointerEnd}
                                onPointerCancel={handleMapTagPointerEnd}
                                onClickCapture={handleMapTagClickCapture}
                            >
                                <button
                                    type="button"
                                    className={`tm-map-tag-chip tm-map-tag-chip--all tm-inspector-chip tm-region-tag${selectedCluster === null && selectedPeriodKey === null && !spectraExpandTrackId ? ' active' : ''}`}
                                    onClick={showFullTasteField}
                                    title={lang === 'en' ? 'Show the full taste field' : '필터를 해제하고 전체 취향 보기'}
                                >
                                    <span className="tm-all-chip-mark" aria-hidden>⊙</span>
                                    <span>{lang === 'en' ? 'All' : '전체'}</span>
                                </button>
                                {clusterStats.slice(0, 6).map((cluster) => (
                                    <button
                                        key={`map-chip-${cluster.j}`}
                                        type="button"
                                        className={`tm-map-tag-chip tm-inspector-chip tm-region-tag tm-region-tag-emotion${selectedCluster === cluster.j ? ' active' : ''}${activeEmotionRegion === `cluster-${cluster.j}` ? ' is-region-active' : ''}${activeEmotionRegion && activeEmotionRegion !== `cluster-${cluster.j}` ? ' is-region-dim' : ''}`}
                                        data-region={`cluster-${cluster.j}`}
                                        style={getEmotionRegionStyle(cluster.color, `cluster-${cluster.j}`)}
                                        onClick={() => {
                                            setSelectedCluster((prev) => (prev === cluster.j ? null : cluster.j));
                                        }}
                                        onMouseEnter={() => handleEmotionRegionEnter(`cluster-${cluster.j}`)}
                                        onMouseLeave={(event) => {
                                            clearEmotionRegionFocus();
                                            resetRegionLight(event);
                                        }}
                                        onMouseMove={handleRegionLightMove}
                                        onFocus={() => handleEmotionRegionEnter(`cluster-${cluster.j}`)}
                                        onBlur={clearEmotionRegionFocus}
                                    >
                                        <SpectraSymbol symbol={cluster.label.symbol || 'headset'} className="tm-symbol-inline" />
                                        <span>{cluster.label.name}</span>
                                    </button>
                                ))}
                            </div>
                            </div>
                            <div
                                className={`tm-bubble-wrap tm-form-phase-${formationPhase}`}
                                ref={bubbleFieldRef}
                                style={{
                                    background: mapTheme === 'day' ? '#ffffff' : '#12161d',
                                }}
                            >
                                    <canvas
                                        ref={heatmapCanvasRef}
                                        className={`tm-heatmap-layer${mapTheme === 'day' ? ' day' : ''}`}
                                        aria-hidden
                                    />
                                    <div
                                        className={`tm-region-label-layer${mapTheme === 'day' ? ' day' : ''}`}
                                        style={{ opacity: bubbleZoom < 1.35 ? 1 : 0.45 }}
                                        aria-hidden
                                    >
                                        {bubbleRegionLabels.map((region) => (
                                            <span
                                                key={`region-label-${region.id}`}
                                                className="tm-region-map-label"
                                                style={{
                                                    left: `${region.x}px`,
                                                    top: `${region.y}px`,
                                                    '--tm-region-label-color': region.color,
                                                }}
                                            >
                                                {region.name}
                                            </span>
                                        ))}
                                    </div>
                                    <div
                                        ref={magneticCursorRef}
                                        className={`tm-magnetic-cursor${magneticPullEnabled ? ' enabled' : ''}`}
                                        aria-hidden
                                    />
                                    {exploreEnabled && (
                                        <aside className={`tm-discovery-lens${isSpectraExpandMode ? ' track-seeded' : ''}`}>
                                            <div className="tm-discovery-lens-eyebrow">
                                                <span className="tm-discovery-lens-signal" aria-hidden />
                                                {copy.discoveryLens}
                                            </div>
                                            <div className="tm-discovery-lens-title-row">
                                                {spectraExpandTrack?.coverUrl && (
                                                    <img src={spectraExpandTrack.coverUrl} alt="" className="tm-discovery-seed-cover" />
                                                )}
                                                <div>
                                                    <strong>
                                                        {isSpectraExpandMode
                                                            ? copy.discoveryTrackBasis
                                                            : copy.discoveryGapBasis}
                                                    </strong>
                                                    {isSpectraExpandMode && <span>{spectraExpandTrack.name} · {spectraExpandTrack.artists}</span>}
                                                </div>
                                            </div>
                                            <p>
                                                {isSpectraExpandMode
                                                    ? (activeMapView === 'spotify' ? copy.discoverySpotifyTrackDesc : copy.discoveryTrackDesc)
                                                    : (activeMapView === 'spotify' ? copy.discoverySpotifyGapDesc : copy.discoveryGapDesc)}
                                            </p>
                                            <dl className="tm-discovery-criteria">
                                                <div>
                                                    <dt>{copy.discoveryCurrentAxes}</dt>
                                                    <dd>{xMeta.label} × {yMeta.label}</dd>
                                                </div>
                                                <div>
                                                    <dt>{copy.discoverySeedTags}</dt>
                                                    <dd>{exploreSeedGenres.map((genre) => getGenreIdentity(genre).short).join(' · ')}</dd>
                                                </div>
                                            </dl>
                                            <div className="tm-discovery-legend">
                                                <span><i className="tm-discovery-legend-dot mine" />{copy.discoveryMyBubble}</span>
                                                <span><i className="tm-discovery-legend-dot rec" />{copy.discoveryRecommendation}</span>
                                                <b>{exploreLoading ? '…' : exploreVisibleCount}</b>
                                            </div>
                                            {isSpectraExpandMode && (
                                                <button
                                                    type="button"
                                                    className="tm-discovery-focus-btn"
                                                    onClick={() => focusBubbleTrack(spectraExpandTrackId, { ensureZoom: 1.15 })}
                                                >
                                                    {copy.discoveryFocusAnchor} <span aria-hidden>↗</span>
                                                </button>
                                            )}
                                        </aside>
                                    )}
                                    <div className="tm-zoom-hud">
                                        <button className="tm-zoom-btn" onClick={() => handleZoomButton(1.2)} aria-label="zoom in">+</button>
                                        <span className="tm-zoom-value">{Math.round(bubbleZoom * 100)}%</span>
                                        <button className="tm-zoom-btn" onClick={() => handleZoomButton(1 / 1.2)} aria-label="zoom out">−</button>
                                        <button
                                            className="tm-zoom-reset"
                                            onClick={focusCurrentBubbles}
                                            title="현재 버블 위치로 이동"
                                        >
                                            {copy.currentBubble}
                                        </button>
                                    </div>
                                    {scrollHint && (
                                        <div className="tm-scroll-hint">
                                            {copy.scrollHint}
                                        </div>
                                    )}
                                    {isSpectraExpandMode && (
                                        <button
                                            className="tm-spectra-exit-fab"
                                            onClick={() => setSpectraExpandTrackId(null)}
                                            title={copy.spectraExit}
                                        >
                                            {copy.spectraExit}
                                        </button>
                                    )}
                                    {overviewMap && (
                                        <div className="tm-overview-map">
                                            <div className="tm-overview-head">
                                                <span>{copy.navigator}</span>
                                                <span>{Math.round(bubbleZoom * 100)}%</span>
                                            </div>
                                            <button
                                                className="tm-overview-stage"
                                                onPointerDown={(e) => {
                                                    e.stopPropagation();
                                                    handleOverviewNavigate(e);
                                                }}
                                                onPointerMove={(e) => {
                                                    if ((e.buttons & 1) !== 1) return;
                                                    e.stopPropagation();
                                                    handleOverviewNavigate(e);
                                                }}
                                                title="클릭/드래그로 탐색 위치 이동"
                                                aria-label="overview map navigator"
                                            >
                                                {overviewMap.dots.map((dot) => (
                                                    <span
                                                        key={`ov-nav-${dot.id}`}
                                                        className={`tm-overview-dot${dot.active ? '' : ' muted'}`}
                                                        style={{
                                                            left: `${dot.x * 100}%`,
                                                            top: `${dot.y * 100}%`,
                                                            '--ov-color': dot.color,
                                                        }}
                                                    />
                                                ))}
                                                <span
                                                    className="tm-overview-view"
                                                    style={{
                                                        left: `${overviewMap.viewRect.x * 100}%`,
                                                        top: `${overviewMap.viewRect.y * 100}%`,
                                                        width: `${overviewMap.viewRect.w * 100}%`,
                                                        height: `${overviewMap.viewRect.h * 100}%`,
                                                    }}
                                                />
                                            </button>
                                            <div className="tm-overview-note">지금 탐색 중인 영역</div>
                                        </div>
                                    )}
                                    {discoveryAnchorPosition && (
                                        <div
                                            className="tm-discovery-orbit"
                                            style={{
                                                left: `${discoveryAnchorPosition.xPercent}%`,
                                                top: `${discoveryAnchorPosition.yPercent}%`,
                                                '--tm-discovery-orbit-size': `${discoveryAnchorPosition.orbitSize}px`,
                                            }}
                                            aria-hidden
                                        >
                                            <span className="tm-discovery-orbit-ring outer" />
                                            <span className="tm-discovery-orbit-ring inner" />
                                            <span className="tm-discovery-orbit-axis horizontal" />
                                            <span className="tm-discovery-orbit-axis vertical" />
                                        </div>
                                    )}
                                    <div
                                        ref={bubbleLayerRef}
                                        className={`tm-bubble-layer${timelineMorphing ? ' retiming' : ''}${isSpectraExpandMode ? ' spectra-expanding' : ''}${visibleBubbleRenderItems.length > (activeMapView === 'spotify' ? 280 : 520) ? ' high-density' : ''}`}
                                        style={{ '--tm-bubble-scale': Math.max(1, bubbleZoom / 1.2) }}
                                        onPointerDown={(event) => {
                                            if (event.target?.closest?.('.tm-bubble, .tm-bubble-share-select')) return;
                                            if (bubbleContextMenu) setBubbleContextMenu(null);
                                            if (selectedTrackCard) {
                                                setSelectedTrackCard(null);
                                                setHoveredBubbleId(null);
                                            }
                                            handleBubblePanStart(event);
                                        }}
                                        onClick={handleBubbleLayerClick}
                                        onContextMenu={handleBubbleLayerContextMenu}
                                        onPointerMove={handleInteractiveBubbleMove}
                                        onPointerUp={handleInteractivePointerEnd}
                                        onPointerCancel={handleInteractivePointerEnd}
                                        onPointerLeave={resetBubbleMagnetism}
                                    >
                                        {visibleBubbleRenderItems.map(({ node, active, clusterFocused, clusterExpandPulsing, xPercent, yPercent, showLabel }) => {
                                            const hovered = hoveredBubbleId === node.track.id;
                                            const picked = !!shareSelectedMap[node.track.id];
                                            const nowPlaying = nowPlayingTrackId === node.track.id;
                                            const detailSelected = selectedTrackCard?.track?.id === node.track.id;
                                            const spectraBlur = isSpectraExpandMode && node.track.id !== spectraExpandTrackId;
                                            const spectraAnchor = isSpectraExpandMode && node.track.id === spectraExpandTrackId;
                                            return (
                                                <div
                                                    key={node.track.id}
                                                    data-bubble-id={node.track.id}
                                                    className={`tm-bubble-item${active ? '' : ' muted'}${showLabel ? ' show-label' : ''}${hovered ? ' hovered' : ''}${detailSelected ? ' detail-selected' : ''}${picked ? ' picked' : ''}${nowPlaying ? ' now-playing' : ''}${clusterFocused ? ' cluster-focus' : ''}${clusterExpandPulsing ? ' cluster-expand-pulse' : ''}${spectraBlur ? ' spectra-blur' : ''}${spectraAnchor ? ' spectra-anchor' : ''}`}
                                                    onPointerDown={(event) => handleBubbleDragStart(event, node.track.id)}
                                                    onPointerMove={handleBubbleDragMove}
                                                    onPointerUp={handleBubbleDragEnd}
                                                    onPointerCancel={handleBubbleDragEnd}
                                                    style={{
                                                        '--tm-bubble-size': node.style['--tm-bubble-size'],
                                                        '--tm-bubble-color': node.style['--tm-bubble-color'],
                                                        '--tm-float-duration': node.style['--tm-float-duration'],
                                                        '--tm-drift-x': node.style['--tm-drift-x'],
                                                        '--tm-drift-y': node.style['--tm-drift-y'],
                                                        '--tm-float-delay': node.style['--tm-float-delay'],
                                                        left: `${xPercent}%`,
                                                        top: `${yPercent}%`,
                                                    }}
                                                >
                                                    <div className="tm-bubble-float">
                                                        <button
                                                            className="tm-bubble"
                                                            style={{
                                                                borderColor: node.style.borderColor,
                                                                backgroundImage: node.style.backgroundImage,
                                                            }}
                                                            title={`${node.track.name} — ${node.track.artists}`}
                                                        >
                                                            <div className="tm-bubble-overlay" />
                                                        </button>
                                                        {shareMode && (
                                                            <button
                                                                className={`tm-bubble-share-select${picked ? ' on' : ''}`}
                                                                onPointerDown={(e) => e.stopPropagation()}
                                                                onPointerUp={(e) => e.stopPropagation()}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleShareTrack(node.track);
                                                                }}
                                                                title={picked ? '공유 목록에서 제거' : '공유 목록에 추가'}
                                                                aria-label={picked ? '공유 목록에서 제거' : '공유 목록에 추가'}
                                                            >
                                                                {picked ? '✓' : '+'}
                                                            </button>
                                                        )}
                                                        <div className="tm-bubble-label">
                                                            <div className="tm-bubble-name">{node.track.name}</div>
                                                            <div className="tm-bubble-artist">{node.track.artists}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {exploreRenderItems.map((rec) => (
                                            rec.inView ? (
                                                <div
                                                    key={rec.id}
                                                    className={`tm-rec-bubble-item${rec.hovered ? ' hovered' : ''}${rec.relatedToFocus ? ' spectra-related' : ''}${rec.showGuideLabel ? ' guide-label' : ''}${selectedTrackCard?.track?.id === rec.track.id ? ' detail-selected' : ''}`}
                                                    style={{
                                                        '--tm-rec-size': rec.style['--tm-rec-size'],
                                                        '--tm-float-duration': rec.style['--tm-float-duration'],
                                                        '--tm-drift-x': rec.style['--tm-drift-x'],
                                                        '--tm-drift-y': rec.style['--tm-drift-y'],
                                                        '--tm-float-delay': rec.style['--tm-float-delay'],
                                                        left: `${rec.xPercent}%`,
                                                        top: `${rec.yPercent}%`,
                                                    }}
                                                    onPointerEnter={() => setHoveredExploreId(rec.id)}
                                                    onPointerLeave={() => setHoveredExploreId(null)}
                                                >
                                                    <div className="tm-bubble-float">
                                                        <div className="tm-rec-actions">
                                                            <button
                                                                className={`tm-rec-action-btn add${(knownTrackIds.has(rec.track.id) || savedFromRecIds[rec.track.id]) ? ' saved' : ''}`}
                                                                disabled={Boolean(savingLibraryTrackIds[rec.track.id]) || knownTrackIds.has(rec.track.id) || savedFromRecIds[rec.track.id]}
                                                                onPointerDown={(e) => e.stopPropagation()}
                                                                onPointerUp={(e) => e.stopPropagation()}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    saveTrackToMyBubble(rec.track);
                                                                }}
                                                                title={
                                                                    knownTrackIds.has(rec.track.id) || savedFromRecIds[rec.track.id]
                                                                        ? copy.recAdded
                                                                        : (savingLibraryTrackIds[rec.track.id] ? copy.recSaving : copy.recAdd)
                                                                }
                                                                aria-label={
                                                                    knownTrackIds.has(rec.track.id) || savedFromRecIds[rec.track.id]
                                                                        ? copy.recAdded
                                                                        : (savingLibraryTrackIds[rec.track.id] ? copy.recSaving : copy.recAdd)
                                                                }
                                                            >
                                                                {knownTrackIds.has(rec.track.id) || savedFromRecIds[rec.track.id]
                                                                    ? '✓'
                                                                    : (savingLibraryTrackIds[rec.track.id] ? '…' : '+')}
                                                            </button>
                                                        </div>
                                                        <button
                                                            className="tm-rec-bubble"
                                                            style={{ backgroundImage: rec.style.backgroundImage }}
                                                            onPointerDown={(e) => e.stopPropagation()}
                                                            onPointerUp={(e) => e.stopPropagation()}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openTrackCard(rec.track, 'recommendation');
                                                            }}
                                                            title={`${rec.track.name} — ${rec.track.artists}`}
                                                        >
                                                            <span className="tm-rec-badge">추천 {rec.rank}</span>
                                                        </button>
                                                        <div className="tm-rec-label">
                                                            <div className="tm-rec-name">{rec.track.name}</div>
                                                            <div className="tm-rec-artist">{rec.track.artists}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : null
                                        ))}
                                    </div>
                                    {selectedTrackDetails && selectedTrackCardPosition && (
                                        <aside
                                            className={`tm-track-detail-card side-${selectedTrackCardPosition.side}`}
                                            style={{
                                                left: `${selectedTrackCardPosition.left}px`,
                                                top: `${selectedTrackCardPosition.top}px`,
                                                '--tm-detail-tail-y': `${selectedTrackCardPosition.tailY}px`,
                                            }}
                                            role="dialog"
                                            aria-label={`${selectedTrackDetails.track.name} details`}
                                            onPointerDown={(event) => event.stopPropagation()}
                                        >
                                            <button
                                                type="button"
                                                className="tm-track-detail-close"
                                                onClick={() => {
                                                    setSelectedTrackCard(null);
                                                    setHoveredBubbleId(null);
                                                }}
                                                aria-label={lang === 'en' ? 'Close track details' : '곡 상세 닫기'}
                                            >
                                                ×
                                            </button>
                                            <div className="tm-track-detail-head">
                                                <div
                                                    className={`tm-track-detail-cover${selectedTrackDetails.track.coverUrl ? ' has-image' : ''}`}
                                                    style={selectedTrackDetails.track.coverUrl
                                                        ? { backgroundImage: `url(${selectedTrackDetails.track.coverUrl})` }
                                                        : undefined}
                                                    aria-hidden
                                                >
                                                    {!selectedTrackDetails.track.coverUrl && <span>♪</span>}
                                                </div>
                                                <div className="tm-track-detail-heading">
                                                    <span className={`tm-track-detail-source ${selectedTrackDetails.source}`}>
                                                        {selectedTrackDetails.source === 'recommendation'
                                                            ? copy.discoveryRecommendation
                                                            : copy.discoveryMyBubble}
                                                    </span>
                                                    <h3>{selectedTrackDetails.track.name}</h3>
                                                    <p>{selectedTrackDetails.track.artists}</p>
                                                </div>
                                            </div>
                                            <div className="tm-track-detail-context">
                                                <span>{selectedTrackDetails.cluster?.label?.name || (lang === 'en' ? 'New territory' : '새로운 영역')}</span>
                                                <b>{xMeta.short} {selectedTrackDetails.xValue}</b>
                                                <b>{yMeta.short} {selectedTrackDetails.yValue}</b>
                                            </div>
                                            {selectedTrackDetails.genres.length > 0 && (
                                                <div className="tm-track-detail-tags">
                                                    {selectedTrackDetails.genres.map((genre) => (
                                                        <span key={`detail-${selectedTrackDetails.track.id}-${genre}`}>{getGenreIdentity(genre).short}</span>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="tm-track-detail-primary-actions">
                                                {selectedTrackDetails.cluster ? (
                                                    <button
                                                        type="button"
                                                        className="tm-track-detail-primary"
                                                        onClick={() => applySpectraExpandByTrackId(selectedTrackDetails.track.id)}
                                                    >
                                                        <span aria-hidden>◎</span>{copy.trackExploreAction}
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="tm-track-detail-primary"
                                                        disabled={selectedTrackDetails.alreadyInField}
                                                        onClick={() => saveTrackToMyBubble(selectedTrackDetails.track)}
                                                    >
                                                        <span aria-hidden>{selectedTrackDetails.alreadyInField ? '✓' : '+'}</span>
                                                        {selectedTrackDetails.alreadyInField ? copy.recAdded : copy.trackAddAction}
                                                    </button>
                                                )}
                                            </div>
                                            <div className="tm-track-detail-external">
                                                <button
                                                    type="button"
                                                    onClick={() => openTrackExternal(selectedTrackDetails.track, 'spotify')}
                                                >
                                                    {copy.spotifySearch}<span aria-hidden>↗</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => openTrackExternal(selectedTrackDetails.track, 'youtube')}
                                                >
                                                    {copy.youtubeSearch}<span aria-hidden>↗</span>
                                                </button>
                                            </div>
                                        </aside>
                                    )}
                                    {bubbleContextMenu && (
                                        <div
                                            className="tm-bubble-context-menu"
                                            style={{ left: `${bubbleContextMenu.x}px`, top: `${bubbleContextMenu.y}px` }}
                                            onPointerDown={(event) => event.stopPropagation()}
                                        >
                                            <div className="tm-bubble-context-head">
                                                <strong>{bubbleContextMenu.track.name}</strong>
                                                <span>{bubbleContextMenu.track.artists}</span>
                                            </div>
                                            <button
                                                type="button"
                                                className="tm-bubble-context-action"
                                                onClick={handleContextToggleExpandPin}
                                            >
                                                {expandPinMap[bubbleContextMenu.track.id] ? '📌 확장 핀 해제' : '📌 확장 핀 추가'}
                                            </button>
                                            <button type="button" className="tm-bubble-context-action" onClick={handleContextExpandCluster}>
                                                {copy.contextMenuExpand}
                                            </button>
                                            <button type="button" className="tm-bubble-context-action" onClick={handleContextFocusTrack}>
                                                {copy.contextMenuFocus}
                                            </button>
                                            <div className="tm-bubble-context-row">
                                                <button type="button" className="tm-bubble-context-action mini" onClick={handleContextPlayTrack}>
                                                    {copy.contextMenuPlay}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="tm-bubble-context-action mini"
                                                    disabled={Boolean(knownTrackIds.has(bubbleContextMenu.track.id) || savedFromRecIds[bubbleContextMenu.track.id] || savingLibraryTrackIds[bubbleContextMenu.track.id])}
                                                    onClick={handleContextSaveTrack}
                                                >
                                                    {(knownTrackIds.has(bubbleContextMenu.track.id) || savedFromRecIds[bubbleContextMenu.track.id]) ? copy.contextMenuSaved : copy.contextMenuSave}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {shareMode && (
                                        <div className="tm-share-tray">
                                            <div className="tm-share-tray-head">
                                                <span>{shareSelectedIds.length}곡 선택됨</span>
                                                <div className="tm-share-tray-head-actions">
                                                    <button className="tm-share-link" onClick={() => { setShareSelectedMap({}); setShareMessage(null); }}>
                                                        비우기
                                                    </button>
                                                    <button className="tm-share-link" onClick={toggleShareMode}>
                                                        닫기
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="tm-share-tray-actions">
                                                <button className="tm-share-copy-btn" onClick={copyShareSelection} disabled={shareSelectedIds.length === 0}>
                                                    목록 복사해서 공유
                                                </button>
                                            </div>
                                            {!shareMessage && shareSelectedIds.length === 0 && (
                                                <div className="tm-share-msg">버블의 + 버튼으로 공유할 곡을 선택해 주세요.</div>
                                            )}
                                            {shareMessage && <div className="tm-share-msg">{shareMessage}</div>}
                                        </div>
                                    )}
                            </div>
                            <div className="tm-track-count">
                                {bubbleCoverage || `${bubbleTracks.length}곡 버블 탐색`} · drag / zoom
                            </div>
                            {recActionMessage && (
                                <div className="tm-rec-action-msg">{recActionMessage}</div>
                            )}
                        </div>

                        {dashboardOpen && (
                        <aside className="tm-sidebar tm-sidebar-inspector">
                            <h2 className="tm-sidebar-title">Field Inspector</h2>
                            <div
                                className="tm-inspector-clusters tm-region-cloud tm-region-cloud-emotion"
                                data-active-region={activeEmotionRegion || undefined}
                            >
                                {clusterStats.slice(0, 8).map((cluster) => (
                                    <button
                                        key={`ins-chip-${cluster.j}`}
                                        type="button"
                                        className={`tm-inspector-chip tm-region-tag tm-region-tag-emotion${selectedCluster === cluster.j ? ' active' : ''}${activeEmotionRegion === `cluster-${cluster.j}` ? ' is-region-active' : ''}${activeEmotionRegion && activeEmotionRegion !== `cluster-${cluster.j}` ? ' is-region-dim' : ''}`}
                                        data-region={`cluster-${cluster.j}`}
                                        style={getEmotionRegionStyle(cluster.color, `cluster-${cluster.j}`)}
                                        onClick={() => {
                                            setSelectedCluster((prev) => (prev === cluster.j ? null : cluster.j));
                                        }}
                                        onMouseEnter={() => handleEmotionRegionEnter(`cluster-${cluster.j}`)}
                                        onMouseLeave={(event) => {
                                            clearEmotionRegionFocus();
                                            resetRegionLight(event);
                                        }}
                                        onMouseMove={handleRegionLightMove}
                                        onFocus={() => handleEmotionRegionEnter(`cluster-${cluster.j}`)}
                                        onBlur={clearEmotionRegionFocus}
                                    >
                                        <SpectraSymbol symbol={cluster.label.symbol || 'headset'} className="tm-symbol-inline" />
                                        <span>{cluster.label.name}</span>
                                    </button>
                                ))}
                            </div>
                            {selectedClusterData && (
                                <div
                                    className="tm-cluster-card selected"
                                    style={{ '--cluster-color': selectedClusterData.color }}
                                >
                                    <div className="tm-cluster-header">
                                        <SpectraSymbol symbol={selectedClusterData.label.symbol || 'headset'} className="tm-cluster-icon" />
                                        <span className="tm-cluster-name">{selectedClusterData.label.name}</span>
                                        <span className="tm-cluster-count">{selectedClusterData.count}곡</span>
                                    </div>
                                    {effectiveClusterBasis === 'genre' ? (
                                        <div
                                            className="tm-genre-list tm-region-cloud tm-region-cloud-genre"
                                            data-active-family={activeGenreFamily || undefined}
                                        >
                                            {selectedClusterData.topGenres.length === 0 && <span className="tm-genre-empty">장르 데이터 없음</span>}
                                            {selectedClusterData.topGenres.slice(0, 6).map((genre) => {
                                                const identity = getGenreIdentity(genre);
                                                return (
                                                    <span
                                                        key={`ins-${selectedClusterData.j}-${genre}`}
                                                        className={`tm-genre-chip tm-genre-token tm-region-tag tm-region-tag-genre${activeGenreFamily === identity.family ? ' is-family-active' : ''}${activeGenreFamily && activeGenreFamily !== identity.family ? ' is-family-dim' : ''}`}
                                                        data-family={identity.family}
                                                        style={getGenreChipStyle(genre)}
                                                        title={identity.display}
                                                        onMouseEnter={() => handleGenreRegionEnter(genre)}
                                                        onMouseLeave={(event) => {
                                                            clearGenreRegionFocus();
                                                            resetRegionLight(event);
                                                        }}
                                                        onMouseMove={handleRegionLightMove}
                                                        onFocus={() => handleGenreRegionEnter(genre)}
                                                        onBlur={clearGenreRegionFocus}
                                                    >
                                                        <SpectraSymbol symbol={getGenreSymbol(genre)} className="tm-symbol-chip" />
                                                        {identity.short}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="tm-cluster-features">
                                            <FeatureBar label="Valence" value={selectedClusterData.centroid[0]} />
                                            <FeatureBar label="Energy" value={selectedClusterData.centroid[1]} />
                                            <FeatureBar label="Dance" value={selectedClusterData.centroid[2]} />
                                            <FeatureBar label="Acoustic" value={selectedClusterData.centroid[3]} />
                                            <FeatureBar label="Instr." value={selectedClusterData.centroid[4]} />
                                        </div>
                                    )}
                                    <div className="tm-cluster-tracks">
                                        {selectedClusterData.members.slice(0, 4).map((track) => (
                                            <div
                                                key={`ins-track-${track.id}`}
                                                className="tm-mini-track"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openTrackCard(track, 'library');
                                                }}
                                            >
                                                {track.coverUrl && <img src={track.coverUrl} alt={track.name} className="tm-mini-cover" />}
                                                <div className="tm-mini-info">
                                                    <div className="tm-mini-name">{track.name}</div>
                                                    <div className="tm-mini-artist">{track.artists}</div>
                                                </div>
                                                <span className="tm-mini-play">›</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </aside>
                        )}
                    </div>

                    <section className="tm-mobile-sync-footer" aria-hidden="true">
                        <div className="tm-mobile-sync-panel">
                            <div className="tm-mobile-sync-head">
                                <span className="tm-mobile-sync-title">Spectra Starting Point</span>
                                <span className="tm-mobile-sync-count">Pins {expandPinTracks.length}</span>
                            </div>
                            {expandPinTracks.length > 0 && (
                                <div className="tm-mobile-sync-bubbles">
                                    {expandPinTracks.slice(0, 8).map((track) => (
                                        <button
                                            key={`sync-pin-${track.id}`}
                                            type="button"
                                            className="tm-mobile-sync-pin-bubble"
                                            onClick={() => toggleExpandPinTrack(track)}
                                            title="핀 해제"
                                        >
                                            {track.coverUrl ? (
                                                <img
                                                    src={track.coverUrl}
                                                    alt={track.name || 'track'}
                                                    className="tm-mobile-sync-pin-cover"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <span className="tm-mobile-sync-pin-cover tm-mobile-sync-pin-cover-fallback" aria-hidden>♪</span>
                                            )}
                                            <span className="tm-mobile-sync-pin-meta">
                                                <span className="tm-mobile-sync-pin-title">{track.name || 'Untitled'}</span>
                                                <span className="tm-mobile-sync-pin-artist">{track.artists || '-'}</span>
                                            </span>
                                            <span className="tm-mobile-sync-pin-icon" aria-hidden>📌</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                            <div className="tm-mobile-sync-note">
                                {expandPinTracks.length > 0
                                    ? '핀 목록을 현재 브라우저의 확장 기준으로 유지합니다.'
                                    : '버블에서 📌를 눌러 Spectra starting point를 추가하세요.'}
                            </div>
                        </div>
                    </section>

                    {dashboardOpen && (
                    <section className="tm-timeline-panel">
                        <div className="tm-timeline-head">
                            <div>
                                <h3 className="tm-timeline-title">Time Story</h3>
                            </div>
                            <div className="tm-timeline-controls">
                                <div className="tm-time-nav">
                                    <button
                                        className="tm-time-nav-btn"
                                        onClick={() => handleTimelineStep(-1)}
                                        disabled={!canTimelineStepPrev}
                                        title="이전 기간"
                                    >
                                        ← 이전
                                    </button>
                                    <button
                                        className="tm-time-nav-btn"
                                        onClick={() => handleTimelineStep(1)}
                                        disabled={!canTimelineStepNext}
                                        title="다음 기간"
                                    >
                                        다음 →
                                    </button>
                                </div>
                                <div className="tm-time-seg">
                                    <button
                                        className={`tm-time-btn${timelineGranularity === 'month' ? ' active' : ''}`}
                                        onClick={() => setTimelineGranularity('month')}
                                    >
                                        월별
                                    </button>
                                    <button
                                        className={`tm-time-btn${timelineGranularity === 'quarter' ? ' active' : ''}`}
                                        onClick={() => setTimelineGranularity('quarter')}
                                    >
                                        분기별
                                    </button>
                                </div>
                                <div className="tm-time-seg">
                                    {[
                                        { key: '6m', label: '6M' },
                                        { key: '12m', label: '12M' },
                                        { key: '24m', label: '24M' },
                                        { key: 'all', label: 'ALL' },
                                    ].map((item) => (
                                        <button
                                            key={item.key}
                                            className={`tm-time-btn${timelineRange === item.key ? ' active' : ''}`}
                                            onClick={() => setTimelineRange(item.key)}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {!timelineSummary.hasDate && (
                            <div className="tm-timeline-empty">
                                날짜 데이터가 부족합니다.
                            </div>
                        )}

                        {timelineSummary.hasDate && timelineSummary.periods.length === 0 && (
                            <div className="tm-timeline-empty">
                                선택한 기간 데이터가 없습니다.
                            </div>
                        )}

                        {timelineSummary.hasDate && timelineSummary.periods.length > 0 && (
                            <>
                                <div
                                    ref={timelineRowRef}
                                    className="tm-timeline-row"
                                    onWheel={handleTimelineRowWheel}
                                >
                                    {timelineSummary.periods.map((period) => {
                                        const selected = selectedPeriodKey === period.key;
                                        return (
                                            <button
                                                key={period.key}
                                                data-period-key={period.key}
                                                className={`tm-time-card${selected ? ' selected' : ''}`}
                                                onClick={() => handleTimelinePeriodSelect(period.key)}
                                                style={{
                                                    '--time-color': period.dominantColor,
                                                    '--tm-time-rgb-a': period.cardPalette?.a || '132, 158, 212',
                                                    '--tm-time-rgb-b': period.cardPalette?.b || '132, 158, 212',
                                                    '--tm-time-rgb-c': period.cardPalette?.c || '132, 158, 212',
                                                    '--tm-time-rgb-mixed': period.cardPalette?.mixed || '132, 158, 212',
                                                    '--tm-time-rgb-dominant': period.cardPalette?.dominant || '132, 158, 212',
                                                }}
                                                title={period.dominantLabel ? `${period.dominantLabel.name} ${period.dominantShare}%` : '클러스터 데이터 없음'}
                                            >
                                                <div className="tm-time-card-head">
                                                    <span className="tm-time-period">{period.label}</span>
                                                    <span className="tm-time-count">{period.total}곡</span>
                                                </div>
                                                <div className="tm-time-dominant">
                                                    {period.dominantLabel ? (
                                                        <>
                                                            <SpectraSymbol symbol={period.dominantLabel.symbol || 'headset'} className="tm-symbol-inline" />
                                                            <span>{period.dominantLabel.name}</span>
                                                            <span className="tm-time-cluster-share">{period.dominantShare}%</span>
                                                        </>
                                                    ) : (
                                                        <span>클러스터 없음</span>
                                                    )}
                                                </div>
                                                <div
                                                    className="tm-time-genres tm-region-cloud tm-region-cloud-genre"
                                                    data-active-family={activeGenreFamily || undefined}
                                                >
                                                    {period.topGenres.length > 0
                                                        ? period.topGenres.map((genre) => {
                                                            const identity = getGenreIdentity(genre);
                                                            return (
                                                                <span
                                                                    key={`${period.key}-${genre}`}
                                                                    className={`tm-time-genre tm-genre-token tm-region-tag tm-region-tag-genre${activeGenreFamily === identity.family ? ' is-family-active' : ''}${activeGenreFamily && activeGenreFamily !== identity.family ? ' is-family-dim' : ''}`}
                                                                    data-family={identity.family}
                                                                    style={getGenreChipStyle(genre)}
                                                                    title={identity.display}
                                                                    onMouseEnter={() => handleGenreRegionEnter(genre)}
                                                                    onMouseLeave={(event) => {
                                                                        clearGenreRegionFocus();
                                                                        resetRegionLight(event);
                                                                    }}
                                                                    onMouseMove={handleRegionLightMove}
                                                                    onFocus={() => handleGenreRegionEnter(genre)}
                                                                    onBlur={clearGenreRegionFocus}
                                                                >
                                                                    <SpectraSymbol symbol={getGenreSymbol(genre)} className="tm-symbol-chip" />
                                                                    {identity.short}
                                                                </span>
                                                            );
                                                        })
                                                        : <span className="tm-time-genre-empty">장르 데이터 없음</span>}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </section>
                    )}

                </>
            )}

            <TasteMapSubwayGenerator
                open={subwayGeneratorOpen}
                onClose={() => setSubwayGeneratorOpen(false)}
                tracks={tracks}
                activeTrackIds={activeTrackIds}
                assignmentByTrackId={assignmentByTrackId}
                clusterById={clusterById}
                xAxis={xAxis}
                yAxis={yAxis}
                lang={lang}
            />

            {/* Hover tooltip */}
            {viewMode === 'map' && hoveredTrack && (
                <div
                    className="tm-tooltip"
                    style={{
                        left: Math.min(hoveredPos.x + 16, window.innerWidth - 220),
                        top: Math.max(hoveredPos.y - 56, 12),
                    }}
                >
                    <div className="tm-tooltip-name">{hoveredTrack.name}</div>
                    <div className="tm-tooltip-artist">{hoveredTrack.artists}</div>
                    {hoveredCluster && (
                        <div className="tm-tooltip-cluster" style={{ color: hoveredCluster.color }}>
                            <SpectraSymbol symbol={hoveredCluster.label.symbol || 'headset'} className="tm-symbol-inline" />
                            <span>{hoveredCluster.label.name}</span>
                        </div>
                    )}
                    <div className="tm-tooltip-feats">
                        <span>
                            {xMeta.short}:{Math.round(getTrackFeature(hoveredTrack, xAxis) * 100)}
                        </span>
                        <span>
                            {yMeta.short}:{Math.round(getTrackFeature(hoveredTrack, yAxis) * 100)}
                        </span>
                        <span>D:{Math.round(getTrackFeature(hoveredTrack, 'danceability') * 100)}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
