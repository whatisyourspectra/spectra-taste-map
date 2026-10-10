/**
 * Curated Demo Universes for instant one-click exploration.
 * Allows new visitors to experience SPECTRA's 3D celestial map and constellation voyager
 * immediately without having to export their personal library first.
 */

import { generateAestheticCoverSvg, getCachedArtwork } from './demoArtwork.js';

export const DEMO_UNIVERSES = [
  {
    id: 'cosmic-dreampop',
    name: 'Cosmic Indie & Dream Pop',
    koreanName: '드림팝 & 인디 별자리',
    badge: 'DREAMY · PSYCHEDELIC · ETHEREAL',
    symbol: 'sparkle',
    color: '#70d6ff',
    gradient: 'linear-gradient(135deg, rgba(112, 214, 255, 0.22), rgba(160, 110, 255, 0.12))',
    summary: '부유하는 신디사이저와 몽환적인 리버브가 밤하늘을 수놓는 아늑한 사이키델릭 은하.',
    featuredArtists: ['Tame Impala', 'Beach House', 'Cigarettes After Sex', 'Hyukoh', 'Men I Trust'],
    tracks: [
      { name: 'The Less I Know the Better', artists: 'Tame Impala' },
      { name: 'Space Song', artists: 'Beach House' },
      { name: 'Apocalypse', artists: 'Cigarettes After Sex' },
      { name: 'Show Me How', artists: 'Men I Trust' },
      { name: 'Chamber of Reflection', artists: 'Mac DeMarco' },
      { name: 'Breathe Deeper', artists: 'Tame Impala' },
      { name: 'Tomboy', artists: 'Hyukoh' },
      { name: 'Sunsetz', artists: 'Cigarettes After Sex' },
      { name: 'Myth', artists: 'Beach House' },
      { name: 'Ode to Viceroy', artists: 'Mac DeMarco' },
      { name: 'Silver Soul', artists: 'Beach House' },
      { name: 'Tailwhip', artists: 'Men I Trust' },
      { name: 'Eventually', artists: 'Tame Impala' },
      { name: 'Sweet', artists: 'Cigarettes After Sex' },
      { name: 'Wiing Wiing', artists: 'Hyukoh' },
      { name: 'My Kind of Woman', artists: 'Mac DeMarco' },
      { name: 'Nunjucks', artists: 'Men I Trust' },
      { name: 'Borderline', artists: 'Tame Impala' },
      { name: 'K.', artists: 'Cigarettes After Sex' },
      { name: 'Days', artists: 'The Drums' },
      { name: 'Let It Happen', artists: 'Tame Impala' },
      { name: 'Master of None', artists: 'Beach House' },
      { name: 'On the Level', artists: 'Mac DeMarco' },
      { name: 'Seven', artists: 'Men I Trust' },
    ],
  },
  {
    id: 'cyber-synthwave',
    name: 'Cyber Synthwave & Electro Pulse',
    koreanName: '사이버 신스웨이브 & 일렉트로 펄스',
    badge: 'ENERGETIC · NEON · PULSE',
    symbol: 'matrix',
    color: '#ff70a6',
    gradient: 'linear-gradient(135deg, rgba(255, 112, 166, 0.22), rgba(255, 151, 112, 0.12))',
    summary: '네온 불빛 아래 질주하는 아날로그 신디사이저와 심장을 울리는 베이스라인의 미래 도시.',
    featuredArtists: ['Daft Punk', 'Kavinsky', 'Justice', 'The Weeknd', 'Gesaffelstein'],
    tracks: [
      { name: 'Get Lucky', artists: 'Daft Punk' },
      { name: 'Nightcall', artists: 'Kavinsky' },
      { name: 'D.A.N.C.E.', artists: 'Justice' },
      { name: 'Blinding Lights', artists: 'The Weeknd' },
      { name: 'Harder, Better, Faster, Stronger', artists: 'Daft Punk' },
      { name: 'Starboy', artists: 'The Weeknd' },
      { name: 'Genesis', artists: 'Justice' },
      { name: 'Pacific Coast Highway', artists: 'Kavinsky' },
      { name: 'Around the World', artists: 'Daft Punk' },
      { name: 'Lost in the Fire', artists: 'Gesaffelstein, The Weeknd' },
      { name: 'One More Time', artists: 'Daft Punk' },
      { name: 'Safe and Sound', artists: 'Justice' },
      { name: 'Odd Look', artists: 'Kavinsky' },
      { name: 'Instant Crush', artists: 'Daft Punk' },
      { name: 'Save Your Tears', artists: 'The Weeknd' },
      { name: 'Waters of Nazareth', artists: 'Justice' },
      { name: 'Protovision', artists: 'Kavinsky' },
      { name: 'Digital Love', artists: 'Daft Punk' },
      { name: 'Take My Breath', artists: 'The Weeknd' },
      { name: 'We Are Your Friends', artists: 'Justice' },
      { name: 'Something About Us', artists: 'Daft Punk' },
      { name: 'I Feel It Coming', artists: 'The Weeknd' },
      { name: 'Midnight City', artists: 'M83' },
    ],
  },
  {
    id: 'midnight-jazz',
    name: 'Midnight Jazz & Velvet R&B',
    koreanName: '미드나잇 재즈 & 벨벳 알앤비',
    badge: 'ACOUSTIC · VELVET · SOULFUL',
    symbol: 'orbit',
    color: '#f4d35e',
    gradient: 'linear-gradient(135deg, rgba(244, 211, 94, 0.22), rgba(138, 201, 149, 0.12))',
    summary: '비 내리는 도시의 자정, 은은한 피아노 선율과 부드러운 그루브가 감도는 감성 taste맵.',
    featuredArtists: ['Tom Misch', 'FKJ', 'The Black Skirts', 'Yerin Baek', 'Laufey'],
    tracks: [
      { name: 'South of the River', artists: 'Tom Misch' },
      { name: 'Tadow', artists: 'Masego, FKJ' },
      { name: 'Everything Goes', artists: 'The Black Skirts' },
      { name: 'Square', artists: 'Yerin Baek' },
      { name: 'From the Start', artists: 'Laufey' },
      { name: 'Disco Yes', artists: 'Tom Misch' },
      { name: 'Ylang Ylang', artists: 'FKJ' },
      { name: 'Antifreeze', artists: 'The Black Skirts' },
      { name: 'Maybe It\'s Not Our Fault', artists: 'Yerin Baek' },
      { name: 'Valentine', artists: 'Laufey' },
      { name: 'It Runs Through Me', artists: 'Tom Misch' },
      { name: 'Vibin\' Out', artists: 'FKJ' },
      { name: 'Who Do You Love', artists: 'The Black Skirts' },
      { name: 'Popo', artists: 'Yerin Baek' },
      { name: 'Promise', artists: 'Laufey' },
      { name: 'Movie', artists: 'Tom Misch' },
      { name: 'So Much to Me', artists: 'FKJ' },
      { name: 'Love Is All', artists: 'The Black Skirts' },
      { name: '0310', artists: 'Yerin Baek' },
      { name: 'Falling Behind', artists: 'Laufey' },
      { name: 'Lost in Paris', artists: 'Tom Misch' },
      { name: 'Die With A Smile', artists: 'Lady Gaga, Bruno Mars' },
    ],
  },
];

function hash01(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return (h % 10_000) / 10_000;
}

export function getEnrichedDemoTracks(universe) {
  if (!universe || !Array.isArray(universe.tracks)) return [];
  const baseGenres = universe.id === 'cyber-synthwave'
    ? ['synthwave', 'electronic', 'french touch']
    : universe.id === 'midnight-jazz'
    ? ['jazz', 'neo soul', 'r&b']
    : ['dream pop', 'psychedelic', 'indie'];

  return universe.tracks.map((t, idx) => {
    const seed = hash01(`${universe.id}:${t.name}:${t.artists}:${idx}`);
    let valence, energy, danceability, acousticness;

    if (universe.id === 'cyber-synthwave') {
      valence = 0.45 + (seed % 0.45);
      energy = 0.72 + (seed % 0.26);
      danceability = 0.65 + (seed % 0.28);
      acousticness = 0.02 + (seed % 0.14);
    } else if (universe.id === 'midnight-jazz') {
      valence = 0.35 + (seed % 0.5);
      energy = 0.24 + (seed % 0.34);
      danceability = 0.42 + (seed % 0.36);
      acousticness = 0.58 + (seed % 0.38);
    } else {
      // dreampop
      valence = 0.38 + (seed % 0.44);
      energy = 0.32 + (seed % 0.38);
      danceability = 0.42 + (seed % 0.34);
      acousticness = 0.38 + (seed % 0.44);
    }

    const cachedCover = getCachedArtwork(t.artists, t.name);
    const coverUrl = cachedCover || generateAestheticCoverSvg({
      name: t.name,
      artists: t.artists,
      color: universe.color,
      index: idx,
    });

    return {
      id: `demo-${universe.id}-${idx}`,
      demoUniverseId: universe.id,
      name: t.name,
      artists: t.artists,
      album: `${t.artists} - ${t.name}`,
      coverUrl,
      albumArt: coverUrl,
      imageUrl: coverUrl,
      valence: Math.round(valence * 100) / 100,
      energy: Math.round(energy * 100) / 100,
      danceability: Math.round(danceability * 100) / 100,
      acousticness: Math.round(acousticness * 100) / 100,
      instrumentalness: seed > 0.65 ? 0.55 : 0.02,
      genres: [t.artists.toLowerCase(), ...baseGenres],
      spotifyGenres: baseGenres,
      featuresSource: 'spotify-genres',
      popularity: 70 + Math.round(seed * 28),
    };
  });
}

// The three entry cards are filters over one shared demo field.
export function getCombinedDemoTracks() {
  return DEMO_UNIVERSES.flatMap(getEnrichedDemoTracks);
}

export function getDemoUniverseIndex(track) {
  return DEMO_UNIVERSES.findIndex(universe => track?.demoUniverseId === universe.id
    || String(track?.id || '').startsWith(`demo-${universe.id}-`));
}
