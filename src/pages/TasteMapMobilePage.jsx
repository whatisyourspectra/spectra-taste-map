import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTasteData } from '../context/TasteDataContext';
import './TasteMapMobilePage.css';

function openExternal(track) {
  const query = `${track?.artists || ''} ${track?.name || ''}`.trim();
  const url = track?.externalUrl
    || (query ? `https://open.spotify.com/search/${encodeURIComponent(query)}` : null);
  if (url && typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

const API_BASE = import.meta?.env?.VITE_API_BASE || '';
const api = (path) => `${API_BASE}${path}`;

function normalizeGenre(value) {
  return String(value || '').trim().toLowerCase();
}

function formatGenre(value) {
  return String(value || '')
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function shortGenreLabel(value) {
  const label = String(value || '').trim();
  if (!label) return 'Genre';
  if (label.length > 18) return `${label.slice(0, 18)}…`;
  return label;
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
  const base = formatGenre(normalized);
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

function buildGenreStats(tracks) {
  const map = new Map();
  for (const track of tracks) {
    const genres = Array.isArray(track?.genres) ? track.genres : [];
    for (const genre of genres) {
      const key = normalizeGenre(genre);
      if (!key) continue;
      const identity = getGenreIdentity(genre);
      const entry = map.get(key) || {
        key,
        label: identity.short,
        family: identity.family,
        symbol: getGenreSymbol(genre),
        tone: identity.tone,
        count: 0,
        tracks: [],
      };
      entry.count += 1;
      entry.tracks.push(track);
      map.set(key, entry);
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

function getTrackCoverUrl(track) {
  return track?.coverUrl
    || track?.imageUrl
    || track?.albumImage
    || track?.album?.images?.[0]?.url
    || null;
}

function calcExpandSeedStats(genreEntry) {
  const list = Array.isArray(genreEntry?.tracks) ? genreEntry.tracks : [];
  if (!list.length) return { valence: 0.5, energy: 0.5 };
  const energy = list.reduce((acc, track) => acc + (Number(track?.energy) || 0), 0) / list.length;
  const valence = list.reduce((acc, track) => acc + (Number(track?.valence) || 0), 0) / list.length;
  return {
    valence: Number.isFinite(valence) ? valence.toFixed(2) : '0.50',
    energy: Number.isFinite(energy) ? energy.toFixed(2) : '0.50',
  };
}

export default function TasteMapMobilePage() {
  const navigate = useNavigate();
  const { tracks } = useTasteData();
  const [selectedGenreKey, setSelectedGenreKey] = useState(null);
  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [expandRecs, setExpandRecs] = useState([]);
  const [expandRecsLoading, setExpandRecsLoading] = useState(false);
  const [expandRecsError, setExpandRecsError] = useState(null);
  const [expandDecisions, setExpandDecisions] = useState({});
  const [mapAcceptedTracks, setMapAcceptedTracks] = useState([]);
  const [savingTrackId] = useState(null); // async library save removed; kept for UI parity.
  const [currentExpandIdx, setCurrentExpandIdx] = useState(0);

  const genreStats = useMemo(() => buildGenreStats(tracks), [tracks]);
  const expandGenres = useMemo(() => {
    if (genreStats.length <= 6) return genreStats.slice(0, 10);
    return genreStats.slice(4).sort((a, b) => a.count - b.count).slice(0, 10);
  }, [genreStats]);
  const activeGenres = expandGenres;

  const selectedGenre = useMemo(
    () => activeGenres.find((g) => g.key === selectedGenreKey) || activeGenres[0] || null,
    [activeGenres, selectedGenreKey],
  );
  const activeTrackPool = useMemo(
    () => {
      const base = selectedGenre?.tracks || [];
      if (!mapAcceptedTracks.length) return base;
      const merged = [...mapAcceptedTracks, ...base];
      const seen = new Set();
      return merged.filter((track) => {
        if (!track?.id || seen.has(track.id)) return false;
        seen.add(track.id);
        return true;
      });
    },
    [selectedGenre, mapAcceptedTracks],
  );

  const selectedTrack = useMemo(() => {
    if (!activeTrackPool.length) return null;
    return activeTrackPool.find((track) => track.id === selectedTrackId) || activeTrackPool[0];
  }, [activeTrackPool, selectedTrackId]);
  const expandAnchorTrack = selectedTrack || activeTrackPool[0] || null;
  const currentExpandTrack = useMemo(() => {
    if (!expandRecs.length) return null;
    const safeIndex = ((currentExpandIdx % expandRecs.length) + expandRecs.length) % expandRecs.length;
    return expandRecs[safeIndex] || null;
  }, [expandRecs, currentExpandIdx]);

  const playTrack = (track) => {
    // No Spotify playback — open the track on an external service instead.
    const resolved = typeof track === 'object'
      ? track
      : tracks.find((t) => t.id === track) || expandRecs.find((t) => t.id === track);
    openExternal(resolved);
  };

  useEffect(() => {
    if (!selectedGenre?.key) return undefined;

    let cancelled = false;
    const run = async () => {
      setExpandRecsLoading(true);
      setExpandRecsError(null);
      try {
        const seed = calcExpandSeedStats(selectedGenre);
        const params = new URLSearchParams({
          seedGenres: selectedGenre.key,
          valence: String(seed.valence),
          energy: String(seed.energy),
          limit: '12',
        });
        if (expandAnchorTrack?.artists && expandAnchorTrack?.name) {
          const seedArtist = String(expandAnchorTrack.artists).split(',')[0].trim();
          params.set('seedTracks', `${seedArtist}|${expandAnchorTrack.name}`);
        }
        const res = await fetch(api(`/api/discover?${params.toString()}`));
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || `HTTP ${res.status}`);
        }
        const data = await res.json();
        const candidates = Array.isArray(data?.tracks) ? data.tracks.filter((track) => track?.id && track?.name) : [];
        if (!cancelled) {
          setCurrentExpandIdx(0);
          setExpandRecs(candidates.slice(0, 12));
        }
      } catch (e) {
        if (!cancelled) {
          setCurrentExpandIdx(0);
          setExpandRecs([]);
          setExpandRecsError(e?.message || '확장 추천곡을 가져오지 못했어요.');
        }
      } finally {
        if (!cancelled) setExpandRecsLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [selectedGenre, expandAnchorTrack?.artists, expandAnchorTrack?.name]);

  const handleExpandListen = (track) => {
    playTrack(track);
    setSelectedTrackId(track?.id || null);
  };

  const handleExpandDecision = (track, decision) => {
    if (!track?.id) return;
    if (decision === 'accepted') {
      // Keep accepted recommendations in this browser session.
      setMapAcceptedTracks((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        if (seen.has(track.id)) return prev;
        return [track, ...prev];
      });
    }
    setExpandDecisions((prev) => ({ ...prev, [track.id]: decision }));
  };

  const handleExpandNext = () => {
    if (!expandRecs.length) return;
    if (currentExpandIdx >= expandRecs.length - 1) {
      setCurrentExpandIdx(0);
      return;
    }
    setCurrentExpandIdx((prev) => prev + 1);
  };

  return (
    <div className="tmm-root tmm-root-compact">
      <header className="tmm-appbar">
        <div className="tmm-appbar-left">
          <span className="tmm-brand">SPECTRA</span>
        </div>
        <div className="tmm-appbar-right">
          <button type="button" className="tmm-icon-btn" onClick={() => navigate('/taste-map')}>
            ↗
          </button>
        </div>
      </header>

      <section className="tmm-panel tmm-glass">
          <div className="tmm-compact-genre-row">
            {activeGenres.slice(0, 8).map((genre) => (
              <button
                key={genre.key}
                type="button"
                className={`tmm-compact-genre-chip ${selectedGenre?.key === genre.key ? 'active' : ''}`}
                onClick={() => setSelectedGenreKey(genre.key)}
              >
                {shortGenreLabel(genre.label)}
              </button>
            ))}
          </div>

          <div className="tmm-expand-flow">
            <div className="tmm-expand-head">
              <strong>{selectedGenre?.label || '확장 공간'}</strong>
            </div>
            {expandRecsLoading && <p className="tmm-expand-empty">…</p>}
            {expandRecsError && <p className="tmm-expand-empty">×</p>}
            {!expandRecsLoading && !expandRecsError && !currentExpandTrack && (
              <p className="tmm-expand-empty">-</p>
            )}
            {currentExpandTrack && (() => {
              const track = currentExpandTrack;
              const coverUrl = getTrackCoverUrl(track);
              const decision = expandDecisions[track.id] || null;
              const accepted = decision === 'accepted';
              const rejected = decision === 'rejected';
              return (
                <div className="tmm-expand-list">
                  <article className={`tmm-expand-card ${accepted ? 'accepted' : ''} ${rejected ? 'rejected' : ''}`}>
                    <button
                      type="button"
                      className="tmm-expand-cover"
                      style={{
                        backgroundImage: coverUrl ? `url(${coverUrl})` : undefined,
                      }}
                      onClick={() => handleExpandListen(track)}
                      aria-label={`${track.name} 재생`}
                    >
                      {!coverUrl && <span>♪</span>}
                    </button>
                    <div className="tmm-expand-info">
                      <strong>{track.name}</strong>
                      {track.artists && <span>{track.artists}</span>}
                    </div>
                    <div className="tmm-expand-actions">
                      <button
                        type="button"
                        className={`tmm-expand-choice add ${accepted ? 'active' : ''}`}
                        disabled={savingTrackId === track.id}
                        onClick={() => handleExpandDecision(track, 'accepted')}
                      >
                        나의 spectra에 추가
                      </button>
                      <button
                        type="button"
                        className={`tmm-expand-choice burst ${rejected ? 'active' : ''}`}
                        onClick={() => {
                          handleExpandDecision(track, 'rejected');
                          handleExpandNext();
                        }}
                      >
                        버블 터뜨리기
                      </button>
                    </div>
                  </article>
                </div>
              );
            })()}
          </div>
      </section>
    </div>
  );
}
