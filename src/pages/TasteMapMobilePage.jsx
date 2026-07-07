import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSpotifyAuth } from '../context/SpotifyAuthContext';
import { useSocket } from '../hooks/useSocket';
import './TasteMapMobilePage.css';

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

function getMobileGenreTagStyle(genreEntry) {
  const tone = genreEntry?.tone || GENRE_FAMILY_TONES.default;
  return {
    '--tmm-region-rgb': tone.rgb,
    '--tmm-region-text': tone.text,
    '--tmm-region-color': `rgb(${tone.rgb})`,
  };
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

const FIELD_ANCHORS = [
  { x: 18, y: 24 },
  { x: 36, y: 16 },
  { x: 57, y: 26 },
  { x: 76, y: 18 },
  { x: 24, y: 46 },
  { x: 46, y: 38 },
  { x: 68, y: 48 },
  { x: 16, y: 68 },
  { x: 38, y: 72 },
  { x: 61, y: 67 },
  { x: 80, y: 74 },
  { x: 52, y: 56 },
];

const ACTIONS = [
  {
    id: 'expand',
    icon: '✦',
    title: '취향 확장',
    dockLabel: '확장',
    subtitle: 'New territories',
    description: '적게 들었거나 처음 듣는 공간을 가볍게 탐색합니다.',
  },
  {
    id: 'core',
    icon: '◎',
    title: '기존 취향 선택',
    dockLabel: '코어',
    subtitle: 'Your core taste',
    description: '익숙한 취향의 대표곡을 빠르게 듣고 취향을 단단히 합니다.',
  },
  {
    id: 'shared',
    icon: '◌',
    title: '공유 취향 탐색',
    dockLabel: '공유',
    subtitle: 'Shared field',
    description: '내 취향 카드를 전시하고 텍스트로 간단히 공유합니다.',
  },
];

function SpectraSymbol({ symbol = 'headset', className = '' }) {
  return (
    <span className={`tmm-symbol tmm-symbol-${symbol}${className ? ` ${className}` : ''}`} aria-hidden>
      <span className="tmm-symbol-core" />
    </span>
  );
}

export default function TasteMapMobilePage() {
  const navigate = useNavigate();
  const { login } = useSpotifyAuth();
  const { socketRef, emitControl } = useSocket();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profileName, setProfileName] = useState('나');
  const [tracks, setTracks] = useState([]);
  const [desktopHandoff, setDesktopHandoff] = useState(null);
  const [mode, setMode] = useState('expand');
  const [selectedGenreKey, setSelectedGenreKey] = useState(null);
  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [expandRecs, setExpandRecs] = useState([]);
  const [expandRecsLoading, setExpandRecsLoading] = useState(false);
  const [expandRecsError, setExpandRecsError] = useState(null);
  const [listenedTrackIds, setListenedTrackIds] = useState({});
  const [expandDecisions, setExpandDecisions] = useState({});
  const [mapAcceptedTracks, setMapAcceptedTracks] = useState([]);
  const [savingTrackId, setSavingTrackId] = useState(null);
  const [currentExpandIdx, setCurrentExpandIdx] = useState(0);
  const [expandAnchorIdx, setExpandAnchorIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [remoteExpandStatus, setRemoteExpandStatus] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const [profileRes, tracksRes, snapshotRes] = await Promise.all([
          fetch(api('/api/me/profile'), { credentials: 'include' }),
          fetch(api('/api/me/liked-tracks-features?includeGenres=1'), { credentials: 'include' }),
          fetch(api('/api/me/taste-snapshot'), { credentials: 'include' }),
        ]);

        if (!tracksRes.ok) {
          const txt = await tracksRes.text();
          throw new Error(`HTTP ${tracksRes.status}: ${txt}`);
        }

        const tracksData = await tracksRes.json();
        const usableTracks = Array.isArray(tracksData?.tracks)
          ? tracksData.tracks.filter((t) => t?.id)
          : [];
        if (!cancelled) setTracks(usableTracks);

        if (snapshotRes.ok) {
          const snapshotData = await snapshotRes.json();
          const handoff = snapshotData?.snapshot?.desktopHandoff || null;
          if (!cancelled) {
            setDesktopHandoff(handoff);
          }
        }

        if (profileRes.ok) {
          const profile = await profileRes.json();
          if (!cancelled && profile?.displayName) setProfileName(profile.displayName);
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || '데이터를 불러오지 못했어요.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSocketConnected(Boolean(socketRef.current?.connected));
    }, 800);
    return () => window.clearInterval(id);
  }, [socketRef]);

  const genreStats = useMemo(() => buildGenreStats(tracks), [tracks]);

  const coreGenres = useMemo(() => genreStats.slice(0, 12), [genreStats]);
  const expandGenres = useMemo(() => {
    if (genreStats.length <= 6) return genreStats.slice(0, 10);
    return genreStats.slice(4).sort((a, b) => a.count - b.count).slice(0, 10);
  }, [genreStats]);

  const activeGenres = mode === 'expand' ? expandGenres : coreGenres;

  useEffect(() => {
    if (mode === 'shared') return;
    if (!activeGenres.length) {
      setSelectedGenreKey(null);
      return;
    }
    if (!selectedGenreKey || !activeGenres.some((g) => g.key === selectedGenreKey)) {
      setSelectedGenreKey(activeGenres[0].key);
    }
  }, [activeGenres, mode, selectedGenreKey]);

  const selectedGenre = useMemo(
    () => activeGenres.find((g) => g.key === selectedGenreKey) || activeGenres[0] || null,
    [activeGenres, selectedGenreKey],
  );

  const desktopHandoffTracks = useMemo(
    () => (Array.isArray(desktopHandoff?.nextTracks) ? desktopHandoff.nextTracks.filter((track) => track?.id && track?.name) : []),
    [desktopHandoff],
  );
  useEffect(() => {
    setExpandAnchorIdx(0);
  }, [desktopHandoff]);
  const useDesktopTrackSet = desktopHandoffTracks.length > 0;
  const activeTrackPool = useMemo(
    () => {
      if (useDesktopTrackSet) return desktopHandoffTracks;
      const base = selectedGenre?.tracks || [];
      if (mode !== 'expand' || !mapAcceptedTracks.length) return base;
      const merged = [...mapAcceptedTracks, ...base];
      const seen = new Set();
      return merged.filter((track) => {
        if (!track?.id || seen.has(track.id)) return false;
        seen.add(track.id);
        return true;
      });
    },
    [useDesktopTrackSet, desktopHandoffTracks, selectedGenre, mode, mapAcceptedTracks],
  );

  useEffect(() => {
    const firstTrack = activeTrackPool[0] || null;
    setSelectedTrackId(firstTrack?.id || null);
  }, [activeTrackPool]);

  const selectedTrack = useMemo(() => {
    if (!activeTrackPool.length) return null;
    return activeTrackPool.find((track) => track.id === selectedTrackId) || activeTrackPool[0];
  }, [activeTrackPool, selectedTrackId]);
  const expandAnchorTrack = useMemo(
    () => {
      if (mode === 'expand' && desktopHandoffTracks.length > 0) {
        const safeIdx = ((expandAnchorIdx % desktopHandoffTracks.length) + desktopHandoffTracks.length) % desktopHandoffTracks.length;
        return desktopHandoffTracks[safeIdx] || desktopHandoffTracks[0] || null;
      }
      return selectedTrack || activeTrackPool[0] || null;
    },
    [mode, desktopHandoffTracks, expandAnchorIdx, selectedTrack, activeTrackPool],
  );
  const desktopExpandTarget = expandAnchorTrack || selectedTrack || activeTrackPool[0] || null;
  const currentExpandTrack = useMemo(() => {
    if (!expandRecs.length) return null;
    const safeIndex = ((currentExpandIdx % expandRecs.length) + expandRecs.length) % expandRecs.length;
    return expandRecs[safeIndex] || null;
  }, [expandRecs, currentExpandIdx]);

  const topGenreLabel = genreStats[0]?.label || '-';
  const uniqueGenreCount = genreStats.length;

  const moodLabel = useMemo(() => {
    if (!tracks.length) return 'No signal';
    const energy = tracks.reduce((acc, t) => acc + (Number(t.energy) || 0), 0) / tracks.length;
    const valence = tracks.reduce((acc, t) => acc + (Number(t.valence) || 0), 0) / tracks.length;
    if (energy > 0.68 && valence > 0.58) return 'Bright Pulse';
    if (energy > 0.62 && valence < 0.45) return 'Dark Momentum';
    if (energy < 0.45 && valence > 0.55) return 'Warm Drift';
    return 'Balanced Orbit';
  }, [tracks]);

  const shareText = useMemo(() => {
    const top = genreStats.slice(0, 5).map((g) => g.label).join(', ');
    return [
      `${profileName}'s SPECTRA taste field`,
      `Core mood: ${moodLabel}`,
      `Top regions: ${top || 'no data yet'}`,
      `Unique genres: ${uniqueGenreCount}`,
    ].join('\n');
  }, [genreStats, moodLabel, profileName, uniqueGenreCount]);

  const activeAction = useMemo(
    () => ACTIONS.find((item) => item.id === mode) || ACTIONS[0],
    [mode],
  );
  const storyGenres = useMemo(() => genreStats.slice(0, 10), [genreStats]);
  const activeDockIndex = Math.max(0, ACTIONS.findIndex((item) => item.id === mode));
  const profileInitial = String(profileName || 'S').trim().charAt(0).toUpperCase() || 'S';

  const playTrack = async (trackId) => {
    if (!trackId) return;
    try {
      await fetch(api('/api/me/playback/play-track'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId }),
      });
    } catch {
      // ignore playback errors in mobile flow
    }
  };

  const calcExpandSeedStats = (genreEntry) => {
    const list = Array.isArray(genreEntry?.tracks) ? genreEntry.tracks : [];
    if (!list.length) return { valence: 0.5, energy: 0.5 };
    const energy = list.reduce((acc, track) => acc + (Number(track?.energy) || 0), 0) / list.length;
    const valence = list.reduce((acc, track) => acc + (Number(track?.valence) || 0), 0) / list.length;
    return {
      valence: Number.isFinite(valence) ? valence.toFixed(2) : '0.50',
      energy: Number.isFinite(energy) ? energy.toFixed(2) : '0.50',
    };
  };

  useEffect(() => {
    if (mode !== 'expand' || !selectedGenre?.key) {
      setExpandRecs([]);
      setExpandRecsError(null);
      setExpandRecsLoading(false);
      return;
    }

    let cancelled = false;
    const run = async () => {
      setExpandRecsLoading(true);
      setExpandRecsError(null);
      try {
        const seed = calcExpandSeedStats(selectedGenre);
        const seedGenresFromDesktop = Array.isArray(desktopHandoff?.selectedGenreKeys)
          ? desktopHandoff.selectedGenreKeys.filter(Boolean).slice(0, 3)
          : [];
        const seedGenresValue = seedGenresFromDesktop.length
          ? seedGenresFromDesktop.join(',')
          : selectedGenre.key;
        const params = new URLSearchParams({
          seedGenres: seedGenresValue,
          valence: String(seed.valence),
          energy: String(seed.energy),
          limit: '12',
          strangeness: expandAnchorTrack?.id ? '0.62' : '0.78',
          market: 'KR',
        });
        if (expandAnchorTrack?.id) {
          params.set('seedTracks', expandAnchorTrack.id);
        }
        const res = await fetch(api(`/api/spotify/digging?${params.toString()}`), { credentials: 'include' });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || `HTTP ${res.status}`);
        }
        const data = await res.json();
        const candidates = Array.isArray(data?.tracks) ? data.tracks.filter((track) => track?.id && track?.name) : [];
        if (!cancelled) {
          setExpandRecs(candidates.slice(0, 12));
        }
      } catch (e) {
        if (!cancelled) {
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
  }, [mode, selectedGenre?.key, desktopHandoff?.selectedGenreKeys, expandAnchorTrack?.id]);

  useEffect(() => {
    setCurrentExpandIdx(0);
  }, [mode, selectedGenre?.key, expandRecs.length]);

  const handleExpandListen = async (track) => {
    await playTrack(track?.id);
    setSelectedTrackId(track?.id || null);
    if (track?.id) {
      setListenedTrackIds((prev) => ({ ...prev, [track.id]: true }));
    }
  };

  const handleExpandDecision = async (track, decision) => {
    if (!track?.id) return;
    if (decision === 'accepted') {
      setSavingTrackId(track.id);
      try {
        const res = await fetch(api('/api/me/library/save'), {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trackId: track.id }),
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || `HTTP ${res.status}`);
        }
        setMapAcceptedTracks((prev) => {
          const seen = new Set(prev.map((item) => item.id));
          if (seen.has(track.id)) return prev;
          return [track, ...prev];
        });
        emitControl('taste-map-plan-add', {
          source: 'taste-map-mobile',
          track: {
            id: track.id,
            name: track.name,
            artists: track.artists,
          },
        });
      } catch {
        // keep flow even when save fails
      } finally {
        setSavingTrackId(null);
      }
    }
    setExpandDecisions((prev) => ({ ...prev, [track.id]: decision }));
  };

  const handleExpandNext = () => {
    if (!expandRecs.length) return;
    if (currentExpandIdx >= expandRecs.length - 1) {
      setCurrentExpandIdx(0);
      if (mode === 'expand' && desktopHandoffTracks.length > 1) {
        setExpandAnchorIdx((prev) => (prev + 1) % desktopHandoffTracks.length);
      }
      return;
    }
    setCurrentExpandIdx((prev) => prev + 1);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1300);
    } catch {
      setCopied(false);
    }
  };

  const handleRequestDesktopExpand = (track) => {
    if (!track?.id) return;
    emitControl('taste-map-expand', {
      trackId: track.id,
      source: 'taste-map-mobile',
      requestedAt: Date.now(),
    });
    setRemoteExpandStatus(`"${track.name}" 기준으로 데스크톱 spectra 확장을 요청했어요.`);
  };

  useEffect(() => {
    if (!remoteExpandStatus) return undefined;
    const id = window.setTimeout(() => setRemoteExpandStatus(null), 2400);
    return () => window.clearTimeout(id);
  }, [remoteExpandStatus]);

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

      {loading ? (
        <section className="tmm-panel tmm-glass tmm-loading-panel">
          <span className="tmm-loading-pulse" aria-hidden />
        </section>
      ) : error ? (
        <section className="tmm-panel tmm-glass tmm-error-panel">
          <button type="button" className="tmm-copy-btn tmm-glass-btn" onClick={login}>
            다시 연결
          </button>
        </section>
      ) : (
        <section className="tmm-panel tmm-glass">
          <div className="tmm-remote-expand">
            <button
              type="button"
              className="tmm-remote-expand-btn tmm-glass-btn"
              onClick={() => handleRequestDesktopExpand(desktopExpandTarget)}
              disabled={!desktopExpandTarget?.id || !socketConnected}
            >
              확장
            </button>
            <span className={`tmm-remote-expand-dot ${socketConnected ? 'on' : ''}`} aria-hidden />
            {remoteExpandStatus && <span className="tmm-remote-expand-status">OK</span>}
          </div>

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
              {desktopHandoffTracks.length > 0 && (
                <span className="tmm-expand-anchor-meta">
                  핀 {((expandAnchorIdx % desktopHandoffTracks.length) + desktopHandoffTracks.length) % desktopHandoffTracks.length + 1}/{desktopHandoffTracks.length}
                  {expandAnchorTrack?.name ? ` · ${expandAnchorTrack.name}` : ''}
                </span>
              )}
            </div>
            {desktopHandoffTracks.length > 0 && (
              <div className="tmm-expand-anchor-row">
                {desktopHandoffTracks.slice(0, 8).map((track, idx) => (
                  <button
                    key={`anchor-${track.id}`}
                    type="button"
                    className={`tmm-expand-anchor-chip ${expandAnchorTrack?.id === track.id ? 'active' : ''}`}
                    onClick={() => {
                      setExpandAnchorIdx(idx);
                      setCurrentExpandIdx(0);
                    }}
                    title={track.name}
                  >
                    📌 {idx + 1}
                  </button>
                ))}
              </div>
            )}
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
      )}
    </div>
  );
}
