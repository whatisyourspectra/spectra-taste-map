import { useEffect, useMemo, useRef, useState } from 'react';
import TasteConstellation from '../TasteConstellation.jsx';
import { TrackArtwork } from '../BrandElements.jsx';
import { normalizeLibrary, MOODS } from '../moodEngine.js';
import { spectraDemoLibrary, initialDemoTrackName } from '../spectraDemoLibrary.js';
import { readAudioFiles } from '../platform/localAudio.js';
import { applyDriveCommand, baselineMood, buildDriveTaste, queueReason, selectDriveQueue } from './queue.js';
import HangangCabin from './HangangCabin.jsx';
import PleosDisplay from './PleosDisplay.jsx';
import './cockpit.css';
import './pleos.css';

const sampleLibrary = normalizeLibrary(spectraDemoLibrary);
const REQUESTS = ['퇴근길이니까 좀 편안하게', '조금 더 신나게', '기본 취향으로'];
function MicIcon() { return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.5" /><path d="M6 11v1a6 6 0 0 0 12 0v-1m-6 7v3m-3 0h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>; }
function Wave({ active }) { return <span className={`cp-wave ${active ? 'is-active' : ''}`} aria-hidden="true">{Array.from({ length: 5 }, (_, i) => <i key={i} />)}</span>; }

function Cluster({ track }) {
  return <section className="cp-cluster" aria-label="모의 클러스터">
    <div className="cp-cluster-top"><span>18:32</span><span>주행 예시</span><span>18°C</span></div>
    <div className="cp-speed"><strong>48</strong><span>km/h</span><small>D <i> ECO</i></small></div>
    <svg className="cp-lane" viewBox="0 0 160 160" fill="none" aria-hidden="true"><path d="M64 5 19 155m77-150 45 150" stroke="#75949c" strokeWidth="2" /><path d="m70 5-10 150m30-150 10 150" stroke="#6bc6c8" strokeWidth="1" opacity=".4" /><path d="m65 85 4-10h22l4 10 3 30q-18 6-36 0Z" fill="#9faebf" stroke="#d6e4eb" /><path d="m69 87 3-8h16l3 8Z" fill="#344a5b" /><path d="M67 111h26" stroke="#ed9a9b" strokeWidth="2" /></svg>
    <div className="cp-range"><span>주행 가능 거리</span><strong>312 <small>km</small></strong><div><i /><span>78%</span></div></div>
    <div className="cp-cluster-bottom"><span>↗ 집까지 24분</span><span>♫ {track.name}</span></div>
  </section>;
}

function Infotainment({ library, queue, current, mood, label, listening, transcript, reply, source, revision, playing, hasAudio, onMic, onPlay, onNext }) {
  const highlighted = [current, ...queue.slice(0, 3)];
  return <section className="cp-infotainment" aria-label="SPECTRA 차량 디스플레이" style={{ '--mood': MOODS[mood.mood].color }}>
    <header className="cp-app-header"><div><img src="/spectra-wordmark.svg" alt="SPECTRA" /><span>DRIVE</span></div><span className="cp-app-source"><i />{source} · {library.length}곡</span><time>18:32</time></header>
    <div className="cp-app-content"><div className="cp-sky-panel"><div className="cp-mood-heading"><span>MY TASTE, RIGHT NOW</span><strong>{label}</strong></div><TasteConstellation library={library} queue={highlighted} mood={{ ...MOODS[mood.mood], label }} listening={listening} /><span className="cp-taste-kept">같은 취향 지도, 달라지는 다음 곡</span><div className="cp-now-playing"><TrackArtwork track={current} /><div><small>NOW PLAYING</small><strong>{current.name}</strong><span>{current.artist}</span><span className="cp-now-album">{current.album}</span></div></div></div>
      <div className="cp-up-next"><div className="cp-queue-heading"><span>NEXT UP</span><span key={revision} className={revision ? 'cp-updated' : ''}>{revision ? '대기열 업데이트 ✓' : '내 취향에서 고른 곡'}</span></div><ol data-revision={revision}>{queue.slice(0, 3).map((track, i) => <li key={track.id} data-track-id={track.id}><span>{String(i + 1).padStart(2, '0')}</span><TrackArtwork track={track} /><div><strong title={track.name}>{track.name}</strong><small title={track.artist}>{track.artist}</small><span className="cp-track-album" title={track.album}>{track.album}</span></div></li>)}</ol><p className="cp-reason">{queueReason(queue, label)}</p></div>
    </div>
    <div className={`cp-voice-strip ${listening ? 'is-listening' : ''}`} role="status" aria-live="polite"><Wave active={listening} /><div>{listening ? <strong>듣고 있어요…</strong> : <><strong>{transcript ? `“${transcript}”` : '지금 듣고 싶은 무드를 말해주세요.'}</strong><span>{reply}</span></>}</div><button onClick={onMic} aria-label="차량 화면 음성 입력" aria-pressed={listening}><MicIcon /></button></div>
    <div className="cp-player"><TrackArtwork track={current} /><div className="cp-player-title"><strong title={current.name}>{current.name}</strong><span title={`${current.artist}${current.album ? ` · ${current.album}` : ''}`}>{current.artist}{current.album && ` · ${current.album}`}</span><small className="cp-player-status">{hasAudio ? playing ? '로컬 음원 재생 중' : '로컬 음원 일시정지' : '화면 시연 · 음원 미연결'}</small></div><div className="cp-play-controls"><button onClick={onPlay} disabled={!hasAudio} aria-label={playing ? '음악 일시정지' : '음악 재생'} title={hasAudio ? '연결한 로컬 음원 재생' : '로컬 음원을 연결하면 재생할 수 있어요'}>{playing ? 'Ⅱ' : '▶'}</button><button onClick={onNext} disabled={!queue.length} aria-label="다음 곡">▸▏</button></div><span className="cp-current-kept">현재 곡 유지</span></div>
  </section>;
}

export default function DriverView() {
  const [library, setLibrary] = useState(sampleLibrary);
  const taste = useMemo(() => buildDriveTaste(library), [library]);
  const [mood, setMood] = useState(() => baselineMood(buildDriveTaste(sampleLibrary)));
  const [current, setCurrent] = useState(() => sampleLibrary.find(track => track.name === initialDemoTrackName) || sampleLibrary[0]);
  const [label, setLabel] = useState('나의 기본 취향');
  const [source, setSource] = useState('SPECTRA 데모');
  const [transcript, setTranscript] = useState('');
  const [reply, setReply] = useState('지금 곡은 그대로, 다음 곡부터 맞춰드려요.');
  const [revision, setRevision] = useState(0);
  const [listening, setListening] = useState(false);
  const [auto, setAuto] = useState(false);
  const [focus, setFocus] = useState(false);
  const [pleos, setPleos] = useState(() => window.location.pathname.startsWith('/pleos'));
  const [split, setSplit] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [scale, setScale] = useState(1);
  const [audioUrls, setAudioUrls] = useState(new Map());
  const [playing, setPlaying] = useState(false);
  const [notice, setNotice] = useState('');
  const [request, setRequest] = useState('');
  const stageRef = useRef(null);
  const audioRef = useRef(null);
  const urlsRef = useRef(audioUrls);
  const recognitionRef = useRef(null);
  const transitionRef = useRef(null);
  const continuingRef = useRef(false);
  const mounted = useRef(true);
  const applyRef = useRef(null);
  const queue = useMemo(() => selectDriveQueue(library, taste, mood, current.id), [library, taste, mood, current]);
  const hasAudio = audioUrls.has(current.id);
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setScale(Math.min(entry.contentRect.width / 1600, entry.contentRect.height / 900)));
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => { document.title = pleos ? 'SPECTRA Drive — Pleos Connect 디스플레이 시안' : 'SPECTRA Drive — IONIQ 6 운전자 시점'; }, [pleos]);
  useEffect(() => {
    const updateFullscreen = () => setFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener('fullscreenchange', updateFullscreen);
    return () => document.removeEventListener('fullscreenchange', updateFullscreen);
  }, []);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; recognitionRef.current?.abort(); clearTimeout(transitionRef.current); for (const url of urlsRef.current.values()) URL.revokeObjectURL(url); };
  }, []);
  useEffect(() => {
    const audio = audioRef.current;
    audio.pause();
    const url = audioUrls.get(current.id);
    if (url) audio.src = url;
    else { audio.removeAttribute('src'); audio.load(); }
    if (continuingRef.current && url) audio.play().catch(() => { if (mounted.current) setNotice('재생 버튼을 눌러 음악을 시작해주세요.'); });
    continuingRef.current = false;
  }, [current, audioUrls]);
  function apply(text) {
    const result = applyDriveCommand(mood, taste, text);
    setTranscript(text); setReply(result.reply);
    if (result.ok) { setMood(result.state); setLabel(result.label); setRevision(value => value + 1); }
  }
  useEffect(() => { applyRef.current = apply; });
  function stopVoice() {
    clearTimeout(transitionRef.current);
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    if (audioRef.current) audioRef.current.volume = 1;
    setListening(false);
  }
  function simulate(text) {
    setAuto(false); stopVoice(); setListening(true); setNotice('예시 요청을 같은 명령 처리 로직으로 실행합니다.');
    transitionRef.current = setTimeout(() => { applyRef.current(text); setListening(false); }, 850);
  }
  useEffect(() => {
    if (!auto) return undefined;
    const timers = REQUESTS.flatMap((text, i) => [
      setTimeout(() => setListening(true), 1700 + i * 9000),
      setTimeout(() => { applyRef.current(text); setListening(false); }, 2900 + i * 9000),
    ]);
    timers.push(setTimeout(() => setAuto(false), 28000));
    return () => { timers.forEach(clearTimeout); };
  }, [auto]);
  function toggleAuto() { stopVoice(); setAuto(value => !value); setNotice('28초 자동 시연 · 음성 요청은 예시이며 음악은 자동으로 재생하지 않습니다.'); }
  function startMic() {
    setAuto(false); clearTimeout(transitionRef.current);
    if (recognitionRef.current) { stopVoice(); return; }
    if (!Recognition) { setListening(false); setNotice('이 브라우저는 음성 인식을 지원하지 않아요. 아래 요청 예시나 텍스트 입력을 사용해주세요.'); return; }
    const recognition = new Recognition();
    recognition.lang = 'ko-KR'; recognition.interimResults = false; recognition.continuous = false;
    recognition.onresult = event => { if (mounted.current) applyRef.current(event.results[0][0].transcript); };
    recognition.onerror = event => { if (mounted.current) setNotice(event.error === 'not-allowed' ? '마이크 권한을 허용하거나 요청 예시를 눌러주세요.' : '음성을 인식하지 못했어요. 다시 말하거나 요청 예시를 사용해주세요.'); };
    recognition.onend = () => { if (recognitionRef.current !== recognition) return; recognitionRef.current = null; if (audioRef.current) audioRef.current.volume = 1; if (mounted.current) setListening(false); };
    recognitionRef.current = recognition;
    try { recognition.start(); setListening(true); audioRef.current.volume = .15; setNotice('브라우저 음성 인식 중 · Gleo 미연결'); }
    catch { stopVoice(); setNotice('마이크를 시작하지 못했어요. 요청 예시를 사용해주세요.'); }
  }
  function nextTrack() { if (!queue.length) return; continuingRef.current = playing; setCurrent(queue[0]); }
  async function togglePlay() {
    if (!hasAudio) return;
    if (playing) audioRef.current.pause();
    else try { await audioRef.current.play(); } catch { setNotice('음원을 재생할 수 없어요. 파일을 확인해주세요.'); }
  }
  function clearAudio() {
    audioRef.current.pause();
    for (const url of urlsRef.current.values()) URL.revokeObjectURL(url);
    urlsRef.current = new Map(); setAudioUrls(new Map());
  }
  async function importTaste(event) {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('5MB 이하 JSON 파일을 선택해주세요.');
      const imported = normalizeLibrary(JSON.parse(await file.text()));
      const profile = buildDriveTaste(imported);
      setAuto(false); stopVoice(); clearAudio(); setLibrary(imported); setMood(baselineMood(profile)); setCurrent(imported[0]); setLabel('나의 기본 취향'); setSource('내 취향'); setRevision(0); setTranscript(''); setReply('가져온 내 음악을 기준으로 다음 곡을 고릅니다.'); setNotice(`${imported.length}곡을 불러왔어요. 기존 SPECTRA 장르 분석을 적용합니다.`);
    } catch (error) { setNotice(error instanceof SyntaxError ? 'JSON 파일 형식을 확인해주세요.' : error.message); }
    finally { event.target.value = ''; }
  }
  function attachAudio(event) {
    try {
      const result = readAudioFiles(event.target.files, library);
      clearAudio(); urlsRef.current = result.urls; setAudioUrls(result.urls); setNotice(`${result.matched}곡 연결 · 파일은 서버에 업로드하지 않습니다.`);
    } catch (error) { setNotice(error.message); }
    finally { event.target.value = ''; }
  }
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (stageRef.current.requestFullscreen) await stageRef.current.requestFullscreen();
      else setNotice('이 브라우저는 전체 화면을 지원하지 않아요. 화면 확대를 사용해주세요.');
    } catch { setNotice('전체 화면을 시작하지 못했어요. 화면 확대를 사용해주세요.'); }
  }
  const screenProps = { library, queue, current, mood, label, listening, transcript, reply, source, revision, playing, hasAudio, onMic: startMic, onPlay: togglePlay, onNext: nextTrack };
  return <main className="cp-page">
    <header className="cp-page-header"><a className="cp-brand" href="/"><img src="/spectra-wordmark.svg" alt="SPECTRA" /><span>DRIVE</span></a><div className="cp-view-tag"><i />{pleos ? 'PLEOS CONNECT' : 'HANGANG AT SUNSET'}<span>{pleos ? 'CONNECT-S / 17″ TEMPLATE' : 'IONIQ 6 / CONCEPT'}</span></div><a href="/design">이전 시안 ↗</a></header>
    <section className="cp-intro"><div><span className="cp-eyebrow">YOUR TASTE. YOUR NEXT TRACK.</span><h1>내 취향 그대로.<span>다음 곡은, 한마디로.</span></h1></div><p>폰처럼 고치기 어려운 차 안의 음악 리스트.<br />듣고 싶은 무드를 말하면, 내 음악 안에서 다음 곡을 고릅니다.</p></section>
    <nav className="cp-view-modes" aria-label="디스플레이 시안 선택"><div><button aria-pressed={!pleos} onClick={() => setPleos(false)}>한강 운전석</button><button aria-pressed={pleos} onClick={() => setPleos(true)}>Pleos Connect 템플릿</button></div>{pleos && <div className="cp-pleos-layouts" role="group" aria-label="Pleos 앱 창 배치"><button aria-pressed={!split} onClick={() => setSplit(false)}>SPECTRA 단독</button><button aria-pressed={split} onClick={() => setSplit(true)}>내비 + SPECTRA</button></div>}</nav>
    <section className={`cp-stage cp-hifi ${!pleos && focus ? 'is-focused' : ''} ${pleos ? 'is-pleos' : ''} ${auto ? 'is-auto' : ''}`} ref={stageRef} aria-label={pleos ? 'Pleos Connect 공식 템플릿을 적용한 웹 디스플레이 시안' : '한강 노을이 보이는 아이오닉 6 운전석 모의 렌더링'}>
      <div className="cp-canvas" style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
        {pleos ? <><HangangCabin listening={false} /><div className="pc-scene-dim" /><PleosDisplay split={split} onSplitChange={setSplit} onMic={startMic} listening={listening}><Infotainment {...screenProps} /></PleosDisplay></> : <>{!focus && <><HangangCabin listening={listening} /><Cluster track={current} /></>}<Infotainment {...screenProps} />{!focus && <button className="cp-wheel-mic" onClick={startMic} aria-label="스티어링 휠 음성 입력" aria-pressed={listening}><MicIcon /></button>}</>}
        <div className="cp-stage-tag"><span className="cp-tiny-cross">+</span>{pleos ? 'PLEOS CONNECT / CONNECT-S 17″' : focus ? 'SPECTRA / DISPLAY VIEW' : 'HANGANG / GOLDEN HOUR'}<small>{pleos ? 'OFFICIAL LAYOUT · WEB PREVIEW' : 'IONIQ 6 · INTERACTIVE CONCEPT'}</small></div>
        <div className="cp-stage-actions">{!pleos && <button className="cp-view-switch" aria-pressed={focus} onClick={() => setFocus(value => !value)}>{focus ? '↙ 운전자 시점' : '↗ 화면 확대'}</button>}<button className="cp-view-switch cp-fullscreen" onClick={toggleFullscreen} aria-label={fullscreen ? '몰입 보기 종료' : '몰입 보기'} aria-pressed={fullscreen}>{fullscreen ? '⤡ 나가기' : '⤢ 몰입 보기'}</button></div>
        {!pleos && <div className="cp-scene-caption"><span>{listening ? 'LISTENING' : revision ? 'QUEUE RECOMPOSED' : 'READY WHEN YOU ARE'}</span><strong>{listening ? '지금 듣고 싶은 무드를 말해보세요.' : transcript ? `“${transcript}”` : '손은 운전에. 음악은 내 취향에.'}</strong><p>{listening ? '현재 음악과 기본 취향은 유지합니다.' : reply}</p></div>}
        <span className="cp-canvas-disclosure">{pleos ? '공식 디자인 가이드 기반 웹 시안 · 시스템 기능 / 내비 / Gleo 미연결' : `AI 생성 풍경 · 모의 주행 · Gleo / 차량 미연결${source === 'SPECTRA 데모' ? ' · 데모 취향' : ''}`}</span>
      </div>
    </section>
    <section className="cp-demo-controls" aria-label="시연 조작 패널"><div className="cp-request-examples"><span>이렇게 말해보세요</span>{REQUESTS.map((text, i) => <button key={text} onClick={() => simulate(text)}><small>0{i + 1}</small>{text}<span>↗</span></button>)}</div><div className="cp-demo-actions"><button className="cp-live-mic" onClick={startMic} aria-pressed={listening}><MicIcon />직접 말하기</button><button className="cp-auto-button" onClick={toggleAuto} aria-pressed={auto}>{auto ? 'Ⅱ 시연 멈추기' : '▷ 28초 자동 시연'}</button></div></section>
    <div className="cp-notice" role="status">{notice || '요청 예시는 모의 음성 입력입니다. 직접 말하기는 브라우저 음성 인식을 사용합니다.'}</div>
    <details className="cp-tools"><summary>내 데이터로 시연하기 <span>JSON · 로컬 음원 · 텍스트 요청</span></summary><div className="cp-tools-body"><label>취향 JSON 가져오기<input type="file" accept=".json,application/json" onChange={importTaste} aria-label="운전자 시안 취향 JSON" /></label><label>로컬 음원 연결<input type="file" accept="audio/*,.flac,.m4a" multiple onChange={attachAudio} aria-label="운전자 시안 로컬 음원" /></label><a className="cp-demo-download" href="/spectra-demo.json" download="spectra-demo.json">SPECTRA 더미 JSON ↓</a><form onSubmit={event => { event.preventDefault(); setAuto(false); stopVoice(); apply(request); }}><input value={request} onChange={event => setRequest(event.target.value)} placeholder="예: 조금 더 신나게" aria-label="운전자 시안 텍스트 요청" maxLength={120} required /><button type="submit">요청 적용 ↗</button></form><p>곡 파일명은 ‘곡명.mp3’ 또는 ‘아티스트 - 곡명.mp3’. 데이터와 파일은 이 화면을 떠나면 초기화됩니다.</p></div></details>
    <footer className="cp-page-footer"><span>SPECTRA DRIVE · {pleos ? 'PLEOS STUDY 04' : 'HANGANG STUDY 03'}</span><p>{pleos ? 'Pleos 공식 시스템 UI 도안을 참고한 웹 시안입니다. SPECTRA는 앱 창에 표시되며, 차량 실탑재·SDK 연동을 의미하지 않습니다.' : '아이오닉 6 실내를 참고한 AI 생성 콘셉트 배경에 실제 작동하는 앱 화면을 합성했습니다. 실제 주행 영상·차량 탑재를 의미하지 않습니다.'}</p><a href={pleos ? 'https://document.pleos.ai/en/docs/connect/guide/docs-design/Introduction/intro' : 'https://www.hyundai.com/id/en/find-a-car/ioniq-6/interior'} target="_blank" rel="noreferrer">{pleos ? '공식 템플릿 출처 ↗' : '차량 디자인 참고 ↗'}</a></footer>
    <audio ref={audioRef} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={nextTrack} onError={() => setNotice('음원 파일을 재생할 수 없어요. 파일 형식을 확인해주세요.')} />
  </main>;
}
