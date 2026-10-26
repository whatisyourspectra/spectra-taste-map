import { useEffect, useMemo, useRef, useState } from 'react';
import { MOODS, parseCommand, normalizeLibrary, rankTracks, restoreState } from './moodEngine.js';
import { demoLibrary } from './demoLibrary.js';
import TasteConstellation from './TasteConstellation.jsx';
import { MoodGlyph, TrackArtwork } from './BrandElements.jsx';
import { CabinPreview, JourneyBar, SimulationSettings } from './JourneyPanels.jsx';
import { createSimulator } from './platform/simulator.js';
import { DEMO_PLACES, getCommuteSuggestion } from './platform/journey.js';
import { performCommand, buildGleoCallback, responseOwner } from './platform/commands.js';
import { readAudioFiles } from './platform/localAudio.js';

const STORAGE_KEY = 'spectra-drive:mood:v1';
const SUGGESTIONS = ['퇴근했어. 좀 편안하게 가자', '조금 더 밝게', '음악만 조금 더 신나게. 조명은 그대로', '이거 퇴근 모드로 기억해'];
function loadMood() {
  try { return restoreState(localStorage.getItem(STORAGE_KEY)); } catch { return restoreState(null); }
}
function MicIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8" /></svg>;
}

export default function App() {
  const [state, setState] = useState(loadMood);
  const [library, setLibrary] = useState(() => normalizeLibrary(demoLibrary));
  const [source, setSource] = useState('샘플 취향');
  const [input, setInput] = useState('');
  const [reply, setReply] = useState('음악과 조명, 어떤 분위기로 함께 갈까요?');
  const [listening, setListening] = useState(false);
  const [voiceReply, setVoiceReply] = useState(false);
  const [notice, setNotice] = useState('');
  const [platform] = useState(createSimulator);
  const [snapshot, setSnapshot] = useState(() => platform.getSnapshot());
  const [suggestion, setSuggestion] = useState(null);
  const [lightingOutcome, setLightingOutcome] = useState(null);
  const [callback, setCallback] = useState(null);
  const [audioUrls, setAudioUrls] = useState(() => new Map());
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [playing, setPlaying] = useState(false);
  const recognitionRef = useRef(null);
  const stateRef = useRef(state);
  const libraryRef = useRef(library);
  const audioRef = useRef(null);
  const urlsRef = useRef(audioUrls);
  const playingRef = useRef(false);
  const voiceReplyRef = useRef(false);
  const duckedVolumeRef = useRef(null);
  const commandQueue = useRef(Promise.resolve());
  const dismissedSuggestions = useRef(new Set());
  const alive = useRef(true);
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const mood = MOODS[state.mood];
  const queue = useMemo(() => rankTracks(library, state), [library, state]);

  useEffect(() => {
    alive.current = true;
    const audio = audioRef.current;
    return () => {
      alive.current = false;
      recognitionRef.current?.abort();
      window.speechSynthesis?.cancel();
      audio?.pause();
      for (const url of urlsRef.current.values()) URL.revokeObjectURL(url);
    };
  }, []);

  function duckAudio() {
    if (!audioRef.current || duckedVolumeRef.current !== null) return;
    duckedVolumeRef.current = audioRef.current.volume;
    audioRef.current.volume = Math.min(0.15, audioRef.current.volume);
  }
  function restoreAudioVolume() {
    if (audioRef.current && duckedVolumeRef.current !== null) audioRef.current.volume = duckedVolumeRef.current;
    duckedVolumeRef.current = null;
  }
  function speak(message, origin) {
    if (responseOwner(origin, voiceReplyRef.current) !== 'app' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    restoreAudioVolume();
    duckAudio();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = 'ko-KR';
    utterance.onend = restoreAudioVolume;
    utterance.onerror = restoreAudioVolume;
    window.speechSynthesis.speak(utterance);
  }
  function refreshSuggestion(nextState = stateRef.current) {
    const context = platform.getSnapshot();
    const proposal = getCommuteSuggestion(nextState, context);
    setSnapshot(context);
    setSuggestion(proposal && !dismissedSuggestions.current.has(proposal.key) ? proposal : null);
  }
  async function playTrack(track) {
    const url = urlsRef.current.get(track?.id);
    if (!url || !audioRef.current) return 'unavailable';
    try {
      if (audioRef.current.getAttribute('src') !== url) audioRef.current.src = url;
      setSelectedTrack(track);
      await audioRef.current.play();
      return 'playing';
    } catch {
      if (alive.current) setNotice('재생을 시작하지 못했어요. 지원되는 오디오 파일인지 확인하고 곡의 재생 버튼을 눌러주세요.');
      return 'blocked';
    }
  }
  function clearAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }
    for (const url of urlsRef.current.values()) URL.revokeObjectURL(url);
    urlsRef.current = new Map();
    setAudioUrls(urlsRef.current);
    setSelectedTrack(null);
    playingRef.current = false;
    setPlaying(false);
  }
  function runAction(action, origin = 'app') {
    commandQueue.current = commandQueue.current.catch(() => {}).then(async () => {
      if (!alive.current) return;
      const result = await performCommand(stateRef.current, action, platform);
      if (!alive.current) return;
      stateRef.current = result.state;
      setState(result.state);
      if (result.lightingResult.status !== 'not_requested') setLightingOutcome(result.lightingResult);
      let persistenceFailed = false;
      if (result.ok) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(result.state)); setNotice(''); }
        catch { persistenceFailed = true; setNotice('기기 저장 공간에 접근할 수 없어, 이번 화면에서만 무드를 유지합니다.'); }
      }
      let playback = 'not_requested';
      if (result.effects.some(effect => effect.type === 'music.queue')) {
        if (action.name === 'SET_MOOD' || playingRef.current) {
          const candidate = rankTracks(libraryRef.current, result.state).find(track => urlsRef.current.has(track.id));
          playback = await playTrack(candidate);
          if (playback === 'unavailable' && playingRef.current) {
            audioRef.current?.pause();
            setNotice('새 무드의 추천 곡에 연결된 음원 파일이 없어 재생을 멈췄어요.');
          }
        } else playback = 'paused';
      }
      if (!alive.current) return;
      const response = buildGleoCallback(action, result, playback, origin);
      if (persistenceFailed && action?.name === 'SAVE_MOOD') {
        response.status = 'error';
        response.message = 'The settings are available in this session but could not be persisted.';
      }
      setCallback(response);
      const message = persistenceFailed && action?.name === 'SAVE_MOOD'
        ? '음악과 조명 설정을 이번 화면에서만 기억해요. 기기에 영구 저장하지 못했어요.'
        : result.message + (playback === 'playing' ? ' 연결된 내 음원을 재생해요.' : '');
      setReply(message);
      speak(message, origin);
      refreshSuggestion(result.state);
    }).catch(() => {
      if (alive.current) setNotice('요청을 처리하지 못했어요. 다시 시도해주세요.');
    });
    return commandQueue.current;
  }
  function submit(text) {
    setInput('');
    return runAction(parseCommand(text, stateRef.current.saved));
  }
  function startListening() {
    if (recognitionRef.current) { recognitionRef.current.stop(); return; }
    if (!Recognition) { setNotice('이 브라우저에서는 음성 입력을 지원하지 않아요. 아래 문장 입력을 사용해주세요.'); return; }
    window.speechSynthesis?.cancel();
    restoreAudioVolume();
    duckAudio();
    const recognition = new Recognition();
    recognition.lang = 'ko-KR';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = event => { if (alive.current) submit(event.results[0][0].transcript); };
    recognition.onerror = event => {
      if (alive.current) setNotice(event.error === 'not-allowed' ? '마이크 권한을 허용한 뒤 다시 시도해주세요.' : '말을 듣지 못했어요. 다시 시도하거나 문장으로 입력해주세요.');
    };
    recognition.onend = () => { recognitionRef.current = null; restoreAudioVolume(); if (alive.current) setListening(false); };
    recognitionRef.current = recognition;
    try { recognition.start(); setListening(true); setNotice(''); }
    catch { recognitionRef.current = null; restoreAudioVolume(); setListening(false); setNotice('마이크를 시작하지 못했어요. 다시 시도해주세요.'); }
  }
  async function importLibrary(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (platform.getSnapshot().driving) throw new Error('정차 후 취향 데이터를 가져와주세요.');
      if (file.size > 5 * 1024 * 1024) throw new Error('5MB 이하의 JSON 파일을 선택해주세요.');
      const imported = normalizeLibrary(JSON.parse(await file.text()));
      if (platform.getSnapshot().driving) throw new Error('정차 후 취향 데이터를 가져와주세요.');
      clearAudio(); libraryRef.current = imported; setLibrary(imported); setSource('내 취향');
      setNotice(`${imported.length}곡을 불러왔어요. 곡 목록과 연결한 음원은 이번 화면에서만 유지됩니다.`);
    } catch (error) { setNotice(error instanceof SyntaxError ? 'JSON 파일 형식을 확인해주세요.' : error.message); }
    finally { event.target.value = ''; }
  }
  function attachAudio(event) {
    try {
      if (platform.getSnapshot().driving) throw new Error('정차 후 음원 파일을 연결해주세요.');
      const imported = readAudioFiles(event.target.files || [], libraryRef.current);
      clearAudio();
      urlsRef.current = imported.urls;
      setAudioUrls(imported.urls);
      setNotice(`${imported.matched}곡의 로컬 음원을 연결했어요.${imported.unmatched ? ` 일치하지 않는 ${imported.unmatched}개 파일은 제외했어요.` : ''} 재생 버튼이나 무드 선택으로 시작해주세요.`);
    } catch (error) { setNotice(error.message); }
    finally { event.target.value = ''; }
  }
  function configure(options) { platform.configure(options); refreshSuggestion(); }
  function setDestination(place) { platform.setDestination(DEMO_PLACES[place] || null); refreshSuggestion(); }
  function applyProposal() {
    if (!suggestion) return;
    dismissedSuggestions.current.add(suggestion.key);
    setSuggestion(null);
    runAction({ name: 'SET_MOOD', parameters: { mood: suggestion.name } });
  }

  return <main className="app" style={{ '--mood': mood.color }}>
    <header className="topbar"><a className="brand" href="/" aria-label="SPECTRA Drive 홈"><img src="/spectra-wordmark.svg" alt="SPECTRA" width="1200" height="110" /><span className="brand-divider" /><span>DRIVE</span></a><span className="prototype"><i /> 음악·조명 무드 프로토타입</span></header>
    <JourneyBar snapshot={snapshot} onDestination={setDestination} suggestion={suggestion} onApply={applyProposal} onDismiss={() => { dismissedSuggestions.current.add(suggestion.key); setSuggestion(null); }} hasCommute={state.saved.some(item => item.name === '퇴근 모드')} />
    <div className="drive-layout">
      <section className="mood-panel" aria-labelledby="mood-heading">
        <div className="mood-copy"><div className="eyebrow">YOUR MUSIC UNIVERSE, IN MOTION</div><h1 id="mood-heading">나의 취향으로,<br className="mobile-break" /> 지금의 무드로.</h1><p className="intro">내 음악과 빛, 이동의 순간을 하나의 무드로.</p></div>
        <TasteConstellation library={library} queue={queue} mood={mood} listening={listening} />
        <div className="current-mood"><div><MoodGlyph mood={state.mood} /><span>지금의 무드<strong>{state.activeName || mood.label}</strong></span></div><span className="taste-source">{source} · {library.length}곡</span></div>
        <div className="mood-tabs" aria-label="기본 무드">{Object.entries(MOODS).map(([key, value]) => <button key={key} style={{ '--option-color': value.color }} aria-pressed={state.mood === key} onClick={() => runAction({ name: 'SET_MOOD', parameters: { mood: key } })}><MoodGlyph mood={key} />{value.label}</button>)}</div>
        <div className="levels">{[['energy', '활기'], ['brightness', '밝기']].map(([key, label]) => <div key={key}><span>음악 {label}</span><meter min="0" max="1" value={state[key]} aria-label={label} /><span>{Math.round(state[key] * 100)}</span></div>)}</div>
        <CabinPreview requested={state.lighting} snapshot={snapshot} outcome={lightingOutcome} onAction={runAction} />
      </section>
      <section className="conversation" aria-label="음성으로 무드 전환">
        <div className="section-top"><span className="eyebrow">A VOICE TO YOUR UNIVERSE</span><label className="voice-toggle"><input type="checkbox" checked={voiceReply} onChange={event => { const enabled = event.target.checked; setVoiceReply(enabled); voiceReplyRef.current = enabled; if (!enabled) { window.speechSynthesis?.cancel(); restoreAudioVolume(); } }} />음성 응답</label></div>
        <div className={`voice-presence ${listening ? 'is-listening' : ''}`} aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /></div>
        <div className="reply" role="status" aria-live="polite"><p>{reply}</p></div>
        <button className={`mic-button ${listening ? 'active' : ''}`} onClick={startListening} aria-label={listening ? '음성 입력 끝내기' : '음성으로 무드 바꾸기'} aria-pressed={listening}><MicIcon /><span>{listening ? '듣고 있어요 · 끝내기' : '눌러서 말하기'}</span></button>
        <p className="voice-help">{Recognition ? '음악과 조명을 함께, 또는 따로 바꿔보세요.' : '이 브라우저에서는 아래 문장 입력을 사용해주세요.'}</p>
        <div className="suggestions" aria-label="이렇게 말해보세요">{SUGGESTIONS.map(text => <button key={text} onClick={() => submit(text)}>“{text}”<span aria-hidden="true">↗</span></button>)}</div>
        <form className="command-form" onSubmit={event => { event.preventDefault(); if (input.trim()) submit(input); }}><label className="sr-only" htmlFor="command">무드 요청</label><input id="command" value={input} maxLength={120} onChange={event => setInput(event.target.value)} placeholder="음악만 더 신나게, 조명은 그대로" autoComplete="off" /><button type="submit" disabled={!input.trim()} aria-label="무드 요청 보내기">↗</button></form>
        <p className="notice" role="status">{notice}</p>
      </section>
    </div>
    <section className="library-section" aria-labelledby="library-heading"><div className="library-header"><div><div className="eyebrow">THE STARS ALONG YOUR WAY</div><h2 id="library-heading">지금의 무드에 가까운 곡</h2></div><label className={`import-button ${snapshot.driving ? 'is-disabled' : ''}`}>내 취향 JSON 가져오기<span aria-hidden="true">↗</span><input aria-label="내 취향 JSON 가져오기" type="file" disabled={snapshot.driving} accept=".json,application/json" onChange={importLibrary} /></label></div>
      <p className="library-caption">{source} · {library.length}곡 기준 · {audioUrls.size ? `${audioUrls.size}곡 로컬 음원 연결` : '음원 파일을 연결하면 실제 재생할 수 있어요.'}{snapshot.driving ? ' · 데이터 가져오기는 정차 후에 가능해요.' : ''}</p>
      <div className="audio-dock"><div><span className="eyebrow">MY AUDIO</span><strong>{selectedTrack ? `${playing ? '재생 중' : '일시정지'} · ${selectedTrack.name}` : '내 음원으로 무드에 소리를 더해보세요.'}</strong><small>곡명 또는 아티스트 - 곡명 파일명 · 파일은 업로드되지 않습니다.</small></div><label className={`import-button ${snapshot.driving ? 'is-disabled' : ''}`}>로컬 음원 연결<input aria-label="로컬 음원 연결" type="file" accept="audio/*,.flac,.m4a" multiple disabled={snapshot.driving} onChange={attachAudio} /></label><audio ref={audioRef} controls aria-label="내 음원 재생기" onPlay={() => { playingRef.current = true; setPlaying(true); }} onPause={() => { playingRef.current = false; setPlaying(false); }} onEnded={() => { playingRef.current = false; setPlaying(false); }} onError={() => { playingRef.current = false; setPlaying(false); setNotice('이 음원을 재생할 수 없어요. 파일 형식이나 파일을 확인해주세요.'); }} /></div>
      <div className="track-grid">{queue.map((track, index) => <article className="track" key={track.id}><span className="track-number">{String(index + 1).padStart(2, '0')}</span><TrackArtwork track={track} /><div className="track-info"><h3>{track.name}</h3><p>{track.artist}</p><small>{source === '샘플 취향' ? '가상 곡 · 예시 무드 값' : track.basis}</small></div><button className="track-play" disabled={!audioUrls.has(track.id)} aria-label={`${track.name} 재생`} title={audioUrls.has(track.id) ? '연결한 내 음원 재생' : '로컬 음원 파일을 연결해주세요'} onClick={() => playTrack(track)}>▷</button></article>)}</div>
    </section>
    <section className="saved-section" aria-label="저장한 무드"><div><span className="eyebrow">MY MOOD CONSTELLATIONS</span><h2>다시 돌아올 나의 무드</h2></div><div className="saved-list">{state.saved.length ? state.saved.map(item => <button key={item.name} style={{ '--saved-color': MOODS[item.mood].color }} onClick={() => runAction({ name: 'SET_MOOD', parameters: { mood: item.name } })}><MoodGlyph mood={item.mood} /><strong>{item.name}<small>음악 + 조명 {Math.round(item.lighting.brightness * 100)}%</small></strong><span>불러오기 ↗</span></button>) : <p>“이거 퇴근 모드로 기억해”라고 말해보세요.<br />음악과 빛을 함께 담아 다시 불러올 수 있어요.</p>}</div></section>
    <SimulationSettings snapshot={snapshot} onConfigure={configure} onWorkExit={() => { platform.emitWorkExit(); refreshSuggestion(); }} callback={callback} />
    <footer><span>SPECTRA DRIVE / 0.2</span><span>브라우저 시제품 · 로컬 음원 재생 · 차량·경로·위치 시뮬레이션 · Gleo 연동 준비 중</span></footer>
  </main>;
}
