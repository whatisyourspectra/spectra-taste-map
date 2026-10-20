import { useEffect, useMemo, useRef, useState } from 'react';
import {
    getMoodMirror,
    moodDirection,
    moodTrackDescription,
    formatEnglishDate,
    formatKoreanDate,
    getContextMoments,
    localDay,
    rankMoodTracks,
    loadOracleRecords,
    saveOracleRecord,
} from './constellationOracleData.js';
import { buildOracleResult } from './oracleResult.js';
import { createOracleStoryImage } from './oracleShareImage.js';
import ConstellationArtwork from './ConstellationArtwork';
import './ConstellationOracle.css';

function trackCoverUrl(track) {
    return track?.coverUrl || track?.albumArt || track?.imageUrl || track?.album?.images?.[0]?.url || null;
}

function TrackCover({ track }) {
    const cover = trackCoverUrl(track);
    return <span className="sco-album-cover" aria-hidden="true">
        <svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="15" /><circle cx="24" cy="24" r="5" /><path d="M14 19a11 11 0 0 1 5-5m10 20a11 11 0 0 0 5-5" /></svg>
        {cover && <img key={cover} src={cover} alt="" loading="lazy" decoding="async" onError={event => { event.currentTarget.style.display = 'none'; }} />}
    </span>;
}

export default function ConstellationOracle({
    library = [],
    identity = 'guest',
    lang = 'ko',
    onListen,
    onCameraChange,
    onSavedToCalendar,
}) {
    const en = lang === 'en';
    const today = useMemo(() => localDay(), []);
    const dateNow = useMemo(() => new Date(), []);
    const moments = useMemo(() => getContextMoments(dateNow), [dateNow]);

    // Check if user already completed and stamped today's Oracle
    const [records, setRecords] = useState(() => loadOracleRecords(identity));
    const todaySaved = useMemo(() => records.find((r) => r.day === today), [records, today]);

    // A short path from today's moment to a direction and a personal result.
    const [step, setStep] = useState(todaySaved ? 4 : 1);
    const [selectedContext, setSelectedContext] = useState(todaySaved?.context || null);
    const [customText, setCustomText] = useState('');
    const [showCustomInput, setShowCustomInput] = useState(false);
    const [moodEnergy, setMoodEnergy] = useState(todaySaved?.shift?.targetEnergy ?? 0.5);
    const [moodValence, setMoodValence] = useState(todaySaved?.shift?.targetValence ?? 0.5);
    const [selectedShift, setSelectedShift] = useState(todaySaved?.shift || null);
    const [prescribed, setPrescribed] = useState(todaySaved?.track || null);
    const [isTorn, setIsTorn] = useState(Boolean(todaySaved));
    const [tearingAnim, setTearingAnim] = useState(false);
    const [shareBlob, setShareBlob] = useState(null);
    const [shareStatus, setShareStatus] = useState('');
    const [shareFailed, setShareFailed] = useState(false);
    const [shareRetry, setShareRetry] = useState(0);
    const [activeStarId, setActiveStarId] = useState(null);
    const [query, setQuery] = useState('');
    const [candidateCount, setCandidateCount] = useState(5);
    const [saveError, setSaveError] = useState(false);
    const tearTimer = useRef(null);
    const stepRef = useRef(null);
    const previousStep = useRef(step);
    useEffect(() => () => window.clearTimeout(tearTimer.current), []);
    useEffect(() => {
        if (previousStep.current === step) return;
        previousStep.current = step;
        stepRef.current?.focus({ preventScroll: true });
        stepRef.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }, [step]);

    const currentMirror = getMoodMirror(selectedContext);
    const direction = useMemo(() => selectedShift ? {
        ...selectedShift, targetEnergy: moodEnergy, targetValence: moodValence,
    } : null, [selectedShift, moodEnergy, moodValence]);
    const rankedTracks = useMemo(() => rankMoodTracks(library, direction, today), [library, direction, today]);
    const candidates = useMemo(() => rankedTracks
        .filter(track => `${track.name || ''} ${track.artists || ''}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())),
    [rankedTracks, query]);
    const choiceConstellation = useMemo(() => buildOracleResult(
        library, selectedContext, direction, prescribed || rankedTracks[0], today,
    ), [library, selectedContext, direction, prescribed, rankedTracks, today]);

    const result = useMemo(() => {
        if (isTorn && todaySaved?.result
            && selectedContext?.id === todaySaved.context?.id
            && selectedShift?.id === todaySaved.shift?.id
            && prescribed?.id === todaySaved.track?.id) return todaySaved.result;
        return buildOracleResult(library, selectedContext, direction, prescribed, today);
    }, [isTorn, todaySaved, selectedContext, selectedShift, direction, prescribed, library, today]);
    const activeStarIndex = result?.nodes.findIndex((node) => node.id === activeStarId) ?? -1;
    const activeStar = activeStarIndex >= 0 ? result.nodes[activeStarIndex] : null;
    const libraryById = useMemo(() => new Map(library.map((track) => [track.id, track])), [library]);

    useEffect(() => {
        if (step !== 4 || !result || !prescribed) return undefined;
        let cancelled = false;
        createOracleStoryImage({ result, track: prescribed, day: today, lang })
            .then((blob) => {
                if (cancelled) return;
                setShareBlob(blob);
                setShareFailed(false);
                setShareStatus('');
            })
            .catch(() => {
                if (cancelled) return;
                setShareFailed(true);
                setShareStatus(en ? 'Could not create the card. Please retry.' : '공유 카드를 만들지 못했어요. 다시 시도해 주세요.');
            });
        return () => { cancelled = true; };
    }, [step, result, prescribed, today, lang, en, shareRetry]);

    const handleShare = async () => {
        if (!shareBlob || !result) return;
        const file = new File([shareBlob], `spectra-${today}.png`, { type: 'image/png' });
        const title = en ? result.nameEn : result.name;
        const url = `${window.location.origin}/taste-map?tab=today`;
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
            try {
                await navigator.share({ files: [file], title, text: en ? 'What does your sky look like today?' : '당신의 오늘은 어떤 별자리인가요?', url });
                setShareStatus('');
                return;
            } catch (error) {
                if (error?.name === 'AbortError') return;
            }
        }
        const objectUrl = URL.createObjectURL(shareBlob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
        setShareStatus(en ? 'Story image saved.' : '스토리 이미지가 저장되었습니다.');
    };

    const handleCopyLink = async () => {
        const url = `${window.location.origin}/taste-map?tab=today`;
        if (navigator.share) {
            try {
                await navigator.share({ title: en ? 'Find your constellation' : '오늘의 별자리 찾기', url });
                setShareStatus('');
                return;
            } catch (error) {
                if (error?.name === 'AbortError') return;
            }
        }
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(url);
            } else {
                const input = document.createElement('textarea');
                input.value = url;
                input.style.position = 'fixed';
                input.style.opacity = '0';
                document.body.appendChild(input);
                let copied = false;
                try {
                    input.select();
                    copied = document.execCommand('copy');
                } finally {
                    input.remove();
                }
                if (!copied) throw new Error('Copy unavailable');
            }
            setShareStatus(en ? 'Link copied. Send it to a friend.' : '링크를 복사했습니다. 친구에게 보내보세요.');
        } catch {
            setShareStatus(en ? 'Could not copy the link.' : '링크를 복사하지 못했어요.');
        }
    };

    // Step 1 -> Step 2: User picks a context chip
    const handleSelectContext = (moment) => {
        setSelectedContext(moment);
        setSelectedShift(null);
        setStep(3);
    };

    const handleCustomSubmit = (e) => {
        e.preventDefault();
        if (!customText.trim()) return;
        setSelectedShift(null);
        setSelectedContext({
            id: 'ctx_custom',
            label: customText.trim(),
            labelEn: customText.trim(),
            archetypeKey: 'custom',
        });
        setStep(3);
    };

    const handleSelectShift = (shift) => {
        const next = moodDirection(shift);
        setSelectedShift(next);
        setMoodEnergy(next.targetEnergy);
        setMoodValence(next.targetValence);
    };

    const chooseTrack = (track) => {
        setPrescribed(track);
        setShareBlob(null);
        setShareStatus('');
        setShareFailed(false);
        setActiveStarId(null);
        setSaveError(false);
        if (selectedShift?.camera) onCameraChange?.(selectedShift.camera);
        setStep(4);
    };

    // Step 4: Tear off today's page and stamp it into the monthly calendar!
    const handleTearOff = () => {
        if (!prescribed || !result || isTorn || tearingAnim) return;
        setSaveError(false);
        setTearingAnim(true);

        const newRecord = {
            day: today,
            dateDisplay: en ? formatEnglishDate(dateNow) : formatKoreanDate(dateNow),
            context: selectedContext,
            shift: direction,
            constellation: {
                id: selectedShift?.constellation || 'personal',
                name: en ? result.nameEn : result.name,
                essence: en ? result.lineEn : result.line,
            },
            track: prescribed,
            result,
            createdAt: Date.now(),
        };

        tearTimer.current = window.setTimeout(() => {
            const updated = saveOracleRecord(identity, newRecord);
            if (!updated) {
                setTearingAnim(false);
                setSaveError(true);
                return;
            }
            setRecords(updated);
            setIsTorn(true);
            setTearingAnim(false);
            if (onSavedToCalendar) onSavedToCalendar(newRecord);
        }, 550);
    };

    // Reset flow if user wants to draw again
    const handleRedraw = () => {
        setStep(1);
        setSelectedContext(null);
        setSelectedShift(null);
        setPrescribed(null);
        setIsTorn(false);
        setShowCustomInput(false);
        setCustomText('');
        setQuery('');
        setCandidateCount(5);
        setSaveError(false);
        setShareBlob(null);
        setShareStatus('');
        setShareFailed(false);
        setActiveStarId(null);
    };

    return (
        <section id="today-constellation" className="sco-root" aria-label={en ? 'Today’s constellation' : '오늘의 별자리'}>
            <header className="sco-header">
                <div className="sco-header__titles">
                    <span className="sco-brand-badge">DAILY / LISTENING</span>
                    <h2 className="sco-title">{en ? 'Music for this moment' : '지금의 나에게 맞는 음악'}</h2>
                </div>
                <div className="sco-header__meta">
                    <span className="sco-moon-disc" aria-hidden="true" />
                    <time className="sco-date" dateTime={today} title={en ? formatEnglishDate(dateNow) : formatKoreanDate(dateNow)}>{today.slice(5).replace('-', '.')}</time>
                </div>
            </header>

            {/* Main Daily Tear-off Page Sheet */}
            <div ref={stepRef} tabIndex={-1} className={`sco-sheet${tearingAnim ? ' is-tearing' : ''}${isTorn ? ' is-torn' : ''}`}>
                {/* Perforated holes top decoration */}
                <div className="sco-perforations" aria-hidden="true">
                    <span className="sco-punch" />
                    <span className="sco-punch" />
                    <span className="sco-punch" />
                </div>

                {/* STEP 1: CONTEXT INTAKE */}
                {step === 1 && (
                    <div className="sco-step sco-step-context animate-fade-in">
                        <div className="sco-step__lead">
                            <span className="sco-eyebrow">01 / TODAY</span>
                            <h3 className="sco-question">
                                {en ? 'What kind of moment are you in?' : '오늘, 어떤 순간에 있나요?'}
                            </h3>
                            <p className="sco-subtext">
                                {en ? 'Choose the line that feels closest to you.' : '지금 내 마음과 가장 가까운 한 줄을 골라주세요.'}
                            </p>
                        </div>

                        <div className="sco-chips-grid">
                            {moments.map((m) => (
                                <button
                                    key={m.id}
                                    type="button"
                                    className="sco-chip-btn"
                                    onClick={() => handleSelectContext(m)}
                                >
                                    <span className="sco-chip-spark" aria-hidden="true" />
                                    <span className="sco-chip-text">{en ? m.labelEn : m.label}</span>
                                </button>
                            ))}
                        </div>

                        {!showCustomInput ? (
                            <button
                                type="button"
                                className="sco-custom-toggle"
                                onClick={() => setShowCustomInput(true)}
                            >
                                {en ? '+ Write my own moment' : '+ 내 순간 직접 적기'}
                            </button>
                        ) : (
                            <form className="sco-custom-form" onSubmit={handleCustomSubmit}>
                                <input
                                    type="text"
                                    aria-label={en ? 'My moment' : '나의 순간'}
                                    maxLength={40}
                                    placeholder={en ? 'E.g. Walking home in the rain...' : '예: 비 오는 밤, 퇴근길 버스 창가에서...'}
                                    value={customText}
                                    onChange={(e) => setCustomText(e.target.value)}
                                    autoFocus
                                />
                                <button type="submit" disabled={!customText.trim()}>
                                    {en ? 'Confirm' : '확인'}
                                </button>
                            </form>
                        )}
                    </div>
                )}

                {/* Choose a direction before revealing the personal constellation. */}
                {step === 3 && (
                    <div className="sco-step sco-step-agency animate-fade-in">
                        <div className="sco-step__lead">
                            <span className="sco-eyebrow">02 / DIRECTION</span>
                            <h3 className="sco-question">
                                {en ? 'Where would you like to go from here?' : '이 순간을 어떤 방향으로 바꾸고 싶나요?'}
                            </h3>
                            <p className="sco-subtext">
                                {en ? 'Choose the pace you want to hear today.' : '오늘 듣고 싶은 속도를 골라주세요.'}
                            </p>
                        </div>

                        <div className="sco-shifts-grid">
                            {currentMirror.shifts.map((shift) => (
                                <button
                                    key={shift.id}
                                    type="button"
                                    className="sco-shift-card"
                                    aria-pressed={selectedShift?.id === shift.id}
                                    style={{ '--sco-accent': shift.color }}
                                    onClick={() => handleSelectShift(shift)}
                                >
                                    <div className="sco-shift-card__header">
                                        <span className="sco-shift-mark" aria-hidden="true" />
                                        <span className="sco-shift-element">{en ? 'YOUR DIRECTION' : '내가 고른 방향'}</span>
                                    </div>
                                    <h4 className="sco-shift-name">{en ? shift.nameEn : shift.name}</h4>
                                    {(!en || shift.descEn) && <p className="sco-shift-desc">{en ? shift.descEn : shift.desc}</p>}
                                    <span className="sco-shift-action">{selectedShift?.id === shift.id ? (en ? 'Selected' : '선택한 방향') : (en ? 'Choose this direction' : '이 방향 선택하기')}</span>
                                </button>
                            ))}
                        </div>
                        {selectedShift && <>
                        <details className="sco-mood-controls" key={selectedShift?.id}>
                            <summary>{en ? 'Fine-tune the sound' : '음악의 결 더 섬세하게 조절하기'}</summary>
                            {[
                                { key: 'energy', label: en ? 'Energy' : '에너지', low: en ? 'Quiet' : '차분하게', high: en ? 'Lively' : '활기차게', value: moodEnergy, change: setMoodEnergy },
                                { key: 'valence', label: en ? 'Tone' : '감정의 톤', low: en ? 'Reflective' : '사색적으로', high: en ? 'Bright' : '밝게', value: moodValence, change: setMoodValence },
                            ].map(control => <label key={control.key}>
                                <span>{control.label}<small>{control.value < 0.4 ? control.low : control.value > 0.65 ? control.high : (en ? 'In between' : '그 사이')}</small></span>
                                <input type="range" min="0" max="1" step="0.05" value={control.value} aria-valuetext={control.value < 0.4 ? control.low : control.value > 0.65 ? control.high : (en ? 'In between' : '그 사이')} onChange={event => control.change(Number(event.target.value))} />
                                <span className="sco-mood-scale"><small>{control.low}</small><small>{control.high}</small></span>
                            </label>)}
                        </details>
                            <button type="button" className="sco-continue" onClick={() => { setQuery(''); setCandidateCount(5); setStep(2); }}>
                                {en ? 'Find my song' : '이 무드에서 곡 고르기'}<span aria-hidden="true">↗</span>
                            </button>
                        </>}
                        <button type="button" className="sco-link-btn" onClick={() => setStep(1)}>{en ? 'Change my moment' : '지금의 상황 다시 고르기'}</button>
                    </div>
                )}

                {step === 2 && <div className="sco-step sco-step-choose animate-fade-in">
                    <div className="sco-step__lead">
                        <span className="sco-eyebrow">03 / YOUR CHOICE</span>
                        <h3 className="sco-question">{en ? 'Which song feels like now?' : '지금은 어떤 곡이 끌리나요?'}</h3>
                        <p className="sco-subtext">{en ? 'Listen to the options, or find a song of your own.' : '후보곡을 들어보거나, 떠오르는 곡을 직접 찾아요.'}</p>
                    </div>
                    <div className="sco-choice-direction"><span className="sco-shift-mark" style={{ '--sco-accent': selectedShift?.color }} aria-hidden="true" />
                        {en ? selectedShift?.nameEn : selectedShift?.name}
                        <button type="button" onClick={() => setStep(3)}>{en ? 'Adjust' : '조절'}</button>
                    </div>
                    {choiceConstellation && <figure className="sco-choice-constellation">
                        <ConstellationArtwork result={choiceConstellation}
                            label={en ? 'Constellation preview for your chosen mood' : '선택한 무드로 그린 별자리 미리보기'} />
                        <figcaption>{en ? 'A sky for this mood. Choose the song to keep.' : '이 무드로 그린 별자리, 여기에 남길 곡을 골라요.'}</figcaption>
                    </figure>}
                    <label className="sco-track-search">
                        <span>{en ? 'Search my music' : '내 음악에서 직접 찾기'}</span>
                        <input type="search" value={query} placeholder={en ? 'Song or artist' : '곡 또는 아티스트'} onChange={event => { setQuery(event.target.value); setCandidateCount(5); }} />
                    </label>
                    <div className="sco-mood-candidates">
                        <p role="status">{query.trim()
                            ? (en ? `${candidates.length} songs found in your library` : `내 음악에서 ${candidates.length}곡을 찾았어요`)
                            : (en ? 'Starting points for your chosen energy and tone' : '내가 고른 에너지와 톤에서 시작하는 후보곡')}
                        </p>
                        {candidates.slice(0, candidateCount).map((candidate, index) => <div key={candidate.id} className="sco-candidate-row">
                            <span className="sco-candidate-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                            <button className="sco-candidate-select" type="button" aria-label={en ? `Choose ${candidate.name}` : `${candidate.name} 선택하기`} onClick={() => chooseTrack(candidate)}>
                                <TrackCover track={candidate} />
                                <span className="sco-candidate-copy">
                                    <strong>{candidate.name}</strong><small>{candidate.artists}</small>
                                    <span className="sco-candidate-reason">{moodTrackDescription(candidate, en)}</span>
                                </span>
                            </button>
                            <button className="sco-candidate-listen" type="button" aria-label={en ? `Listen to ${candidate.name}` : `${candidate.name} 듣기`} onClick={() => onListen?.(candidate)}>
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 9 6-9 6Z" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>
                            </button>
                        </div>)}
                        {!candidates.length && <p>{library.length
                            ? (en ? 'Try another song title or artist.' : '다른 곡 제목이나 아티스트로 찾아보세요.')
                            : (en ? 'Add music to your library to start choosing.' : '내 음악을 추가하면 여기서 곡을 고를 수 있어요.')}</p>}
                        {candidates.length > candidateCount && <button type="button" className="sco-link-btn" onClick={() => setCandidateCount(count => count + 5)}>{en ? 'See more songs' : '다른 곡도 살펴보기'}</button>}
                    </div>
                </div>}

                {/* Personal result made from actual tracks in the library. */}
                {step === 4 && prescribed && result && (
                    <div className="sco-step sco-step-prescribed animate-fade-in" style={{ '--sco-result-color': result.color }}>
                        <div className="sco-result-heading">
                            <span className="sco-eyebrow">TODAY / YOUR SKY</span>
                            <h3>{en ? result.nameEn : result.name}</h3>
                            <p>{en ? result.lineEn : result.line}</p>
                        </div>

                        <div className="sco-constellation-art">
                            <ConstellationArtwork result={result} activeId={activeStarId} onSelect={setActiveStarId}
                                label={en ? `Constellation of ${result.nodes.length} songs. Select a star to see its song.` : `${result.nodes.length}곡으로 그린 별자리. 별을 선택하면 곡을 볼 수 있어요.`} />
                            <p className="sco-result-count" aria-live="polite">
                                {activeStar
                                    ? (en ? `Star ${activeStarIndex + 1} · ${activeStar.name}` : `${activeStarIndex + 1}번 별 · ${activeStar.name}`)
                                    : (en ? 'Tap a star to find its track' : '별을 누르면 곡을 확인할 수 있어요')}
                            </p>
                        </div>

                        <div className="sco-star-tracklist">
                            <div className="sco-star-tracklist__heading">
                                <h4>{en ? `${result.nodes.length} tracks in this constellation` : `이 별자리를 만든 ${result.nodes.length}곡`}</h4>
                                <span>{en ? 'STAR / TRACK' : '별 / 곡'}</span>
                            </div>
                            <p className="sco-star-tracklist__description">
                                {en
                                    ? `Your chosen song and ${Math.max(0, result.nodes.length - 1)} songs around your listening mood`
                                    : `내가 고른 곡과 오늘의 무드에서 함께 찾아본 ${Math.max(0, result.nodes.length - 1)}곡`}
                            </p>
                            <ol>
                                {result.nodes.map((node, index) => {
                                    const cover = trackCoverUrl(libraryById.get(node.id)) || node.coverUrl;
                                    return (
                                        <li key={node.id} className={activeStarId === node.id ? 'is-active' : ''}>
                                            <button
                                                type="button"
                                                className="sco-star-tracklist__select"
                                                onClick={() => setActiveStarId(node.id)}
                                                aria-pressed={activeStarId === node.id}
                                                aria-label={en ? `Highlight star ${index + 1}, ${node.name}` : `${index + 1}번 별 ${node.name} 강조하기`}
                                            >
                                                <span className="sco-star-tracklist__number">{String(index + 1).padStart(2, '0')}</span>
                                                <span className="sco-star-tracklist__cover" aria-hidden="true">
                                                    <svg viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="12" /><circle cx="20" cy="20" r="3" /><path d="M7 13 2 9m31 18 5 4M12 31l-4 5" /></svg>
                                                    {cover && <img key={cover} src={cover} alt="" loading="lazy" decoding="async" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}
                                                </span>
                                                <span className="sco-star-tracklist__copy">
                                                    <strong>{node.name}</strong>
                                                    <small>{node.artists || (en ? 'Unknown artist' : '아티스트 정보 없음')}</small>
                                                </span>
                                                {node.isSelected && <span className="sco-star-tracklist__today">{en ? 'TODAY' : '오늘의 곡'}</span>}
                                            </button>
                                            <button
                                                type="button"
                                                className="sco-star-tracklist__listen"
                                                onClick={() => onListen?.(libraryById.get(node.id) || node)}
                                                aria-label={en ? `Listen to ${node.name}` : `${node.name} 듣기`}
                                                title={en ? 'Listen' : '듣기'}
                                            >↗</button>
                                        </li>
                                    );
                                })}
                            </ol>
                        </div>

                        <div className="sco-result-moment">
                            <span>{en ? 'MY MOMENT' : '오늘의 순간'}</span>
                            <p>{en ? (result.contextEn || result.context) : result.context}</p>
                        </div>

                        {/* Prescribed Track Card */}
                        <div className="sco-track-box">
                            <TrackCover track={prescribed} />
                            <div className="sco-track-box__left">
                                <span className="sco-track-tag">{en ? 'TODAY’S TRACK' : '오늘의 곡'}</span>
                                <h4 className="sco-track-name">{prescribed.name}</h4>
                                <p className="sco-track-artist">{prescribed.artists || 'Unknown artist'}</p>
                                <small className="sco-track-reason">{en ? 'A song you chose for this moment' : '지금의 순간을 위해 내가 고른 곡'}</small>
                            </div>
                            <button
                                type="button"
                                className="sco-track-play-btn"
                                onClick={() => onListen && onListen(prescribed)}
                                aria-label={en ? `Listen to ${prescribed.name}` : `${prescribed.name} 바로 듣기`}
                            >
                                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="m8 5 11 7-11 7Z" fill="currentColor" /></svg>
                                <span>{en ? 'Listen' : '듣기'}</span>
                            </button>
                        </div>

                        {!isTorn && <button type="button" className="sco-link-btn" disabled={tearingAnim} onClick={() => setStep(2)}>{en ? 'Choose a different song' : '다른 곡으로 바꾸기'}</button>}
                        <button type="button" className="sco-share-btn" onClick={shareFailed ? () => { setShareFailed(false); setShareRetry((value) => value + 1); } : handleShare} disabled={!shareBlob && !shareFailed}>
                            {shareFailed
                                ? (en ? 'Retry story card' : '공유 카드 다시 만들기')
                                : shareBlob
                                    ? (en ? 'Share my sky' : '내 별자리 공유하기')
                                    : (en ? 'Preparing story card…' : '스토리 카드 준비 중…')}
                        </button>
                        <button type="button" className="sco-link-btn" onClick={handleCopyLink}>
                            {en ? 'Invite a friend to find their sky ↗' : '친구에게 별자리 링크 보내기 ↗'}
                        </button>
                        {shareStatus && <p className="sco-share-status" role="status">{shareStatus}</p>}

                        {/* Tear-off and Stamp Action */}
                        {saveError && <p className="sco-save-error" role="alert">{en ? 'Could not save. Try again using the button below.' : '기록을 저장하지 못했어요. 아래 버튼으로 다시 시도해 주세요.'}</p>}
                        <div className="sco-tear-actions">
                            {!isTorn ? (
                                <button
                                    type="button"
                                    className="sco-tear-btn"
                                    disabled={tearingAnim}
                                    onClick={handleTearOff}
                                >
                                    <span>{tearingAnim ? (en ? 'Saving…' : '기록하는 중…') : (en ? 'Save this moment to my calendar' : '이 순간과 음악을 달력에 기록하기')}</span>
                                </button>
                            ) : (
                                <div className="sco-stamped-bar">
                                    <span className="sco-stamped-text">
                                        {en ? 'Saved to your constellation calendar.' : '오늘의 별자리를 달력에 기록했습니다.'}
                                    </span>
                                    <button type="button" className="sco-redraw-btn" onClick={handleRedraw}>
                                        {en ? 'Choose again' : '다시 선택하기'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {step === 4 && !prescribed && (
                    <div className="sco-empty-result" role="status">
                        <p>{en ? 'Add a few songs to your library to draw your constellation.' : '별자리를 그리려면 내 음악을 먼저 추가해 주세요.'}</p>
                        <button type="button" onClick={handleRedraw}>{en ? 'Choose another moment' : '다른 순간 고르기'}</button>
                    </div>
                )}
            </div>
        </section>
    );
}
