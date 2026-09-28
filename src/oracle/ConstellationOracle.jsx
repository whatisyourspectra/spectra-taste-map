import { useEffect, useMemo, useState } from 'react';
import {
    ARCHETYPE_MIRRORS,
    formatEnglishDate,
    formatKoreanDate,
    getContextMoments,
    localDay,
    prescribeTrack,
    loadOracleRecords,
    saveOracleRecord,
} from './constellationOracleData.js';
import { buildOracleResult } from './oracleResult.js';
import { createOracleStoryImage } from './oracleShareImage.js';
import './ConstellationOracle.css';

function trackCoverUrl(track) {
    return track?.coverUrl || track?.albumArt || track?.imageUrl || track?.album?.images?.[0]?.url || null;
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
    const [selectedShift, setSelectedShift] = useState(todaySaved?.shift || null);
    const [prescribed, setPrescribed] = useState(todaySaved?.track || null);
    const [isTorn, setIsTorn] = useState(Boolean(todaySaved));
    const [tearingAnim, setTearingAnim] = useState(false);
    const [shareBlob, setShareBlob] = useState(null);
    const [shareStatus, setShareStatus] = useState('');
    const [shareFailed, setShareFailed] = useState(false);
    const [shareRetry, setShareRetry] = useState(0);
    const [activeStarId, setActiveStarId] = useState(null);

    // Resolved Archetype data based on selected context
    const currentMirror = useMemo(() => {
        const key = selectedContext?.archetypeKey || 'burnout';
        return ARCHETYPE_MIRRORS[key] || ARCHETYPE_MIRRORS.burnout;
    }, [selectedContext]);

    const result = useMemo(() => {
        if (todaySaved?.result
            && selectedContext?.id === todaySaved.context?.id
            && selectedShift?.id === todaySaved.shift?.id
            && prescribed?.id === todaySaved.track?.id) return todaySaved.result;
        return buildOracleResult(library, selectedContext, selectedShift, prescribed, today);
    }, [todaySaved, selectedContext, selectedShift, prescribed, library, today]);
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
        const url = `${window.location.origin}/taste-map/mobile?oracle=1`;
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
        const url = `${window.location.origin}/taste-map/mobile?oracle=1`;
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
        setStep(3);
    };

    const handleCustomSubmit = (e) => {
        e.preventDefault();
        if (!customText.trim()) return;
        setSelectedContext({
            id: 'ctx_custom',
            label: customText.trim(),
            labelEn: customText.trim(),
            archetypeKey: 'custom',
        });
        setStep(3);
    };

    // Step 3 -> Step 4: User exercises agency by selecting energy shift
    const handleSelectShift = (shift) => {
        setSelectedShift(shift);
        const track = prescribeTrack(library, shift, today);
        setPrescribed(track);
        setShareBlob(null);
        setShareStatus('');
        setShareFailed(false);
        setActiveStarId(null);

        // Notify 3D Constellation camera to swoop and focus
        if (shift.camera && onCameraChange) {
            onCameraChange(shift.camera);
        }

        setStep(4);
    };

    // Step 4: Tear off today's page and stamp it into the monthly calendar!
    const handleTearOff = () => {
        if (!prescribed || !result || isTorn) return;
        setTearingAnim(true);

        const newRecord = {
            day: today,
            dateDisplay: en ? formatEnglishDate(dateNow) : formatKoreanDate(dateNow),
            context: selectedContext,
            shift: selectedShift,
            constellation: {
                id: selectedShift?.constellation || 'personal',
                name: en ? result.nameEn : result.name,
                symbol: '✦',
                essence: en ? result.lineEn : result.line,
            },
            track: prescribed,
            result,
            createdAt: Date.now(),
        };

        window.setTimeout(() => {
            const updated = saveOracleRecord(identity, newRecord);
            setRecords(updated || []);
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
        setShareBlob(null);
        setShareStatus('');
        setShareFailed(false);
        setActiveStarId(null);
    };

    return (
        <section id="today-constellation" className="sco-root" aria-label={en ? 'Today’s constellation' : '오늘의 별자리'}>
            <header className="sco-header">
                <div className="sco-header__titles">
                    <span className="sco-brand-badge">TODAY / YOUR SKY</span>
                    <h2 className="sco-title">{en ? 'A constellation for today' : '오늘의 나를 그린 별자리'}</h2>
                </div>
                <div className="sco-header__meta">
                    <span className="sco-moon-disc" aria-hidden="true" />
                    <span className="sco-date">{en ? formatEnglishDate(dateNow) : formatKoreanDate(dateNow)}</span>
                </div>
            </header>

            {/* Main Daily Tear-off Page Sheet */}
            <div className={`sco-sheet${tearingAnim ? ' is-tearing' : ''}${isTorn ? ' is-torn' : ''}`}>
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
                                    style={{ '--sco-accent': shift.color }}
                                    onClick={() => handleSelectShift(shift)}
                                >
                                    <div className="sco-shift-card__header">
                                        <span className="sco-shift-mark" aria-hidden="true" />
                                        <span className="sco-shift-element">{en ? 'YOUR DIRECTION' : '내가 고른 방향'}</span>
                                    </div>
                                    <h4 className="sco-shift-name">{en ? shift.nameEn : shift.name}</h4>
                                    {(!en || shift.descEn) && <p className="sco-shift-desc">{en ? shift.descEn : shift.desc}</p>}
                                    <span className="sco-shift-action">{en ? 'See my constellation ↗' : '내 별자리 보기 ↗'}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Personal result made from actual tracks in the library. */}
                {step === 4 && prescribed && result && (
                    <div className="sco-step sco-step-prescribed animate-fade-in" style={{ '--sco-result-color': result.color }}>
                        <div className="sco-result-heading">
                            <span className="sco-eyebrow">TODAY / YOUR SKY</span>
                            <h3>{en ? result.nameEn : result.name}</h3>
                            <p>{en ? result.lineEn : result.line}</p>
                        </div>

                        <div className="sco-constellation-art">
                            <svg viewBox="0 0 360 320" className="sco-constellation-svg" role="group" aria-label={en ? `Constellation made from ${result.nodes.length} tracks in your library. Select a star to see its track.` : `내 음악 ${result.nodes.length}곡으로 만든 별자리. 별을 선택하면 곡을 볼 수 있습니다.`}>
                                <defs>
                                    <radialGradient id="sco-node-glow">
                                        <stop offset="0%" stopColor={result.color} stopOpacity="0.8" />
                                        <stop offset="100%" stopColor={result.color} stopOpacity="0" />
                                    </radialGradient>
                                </defs>
                                {result.edges.map(([fromIndex, toIndex], index) => {
                                    const from = result.nodes[fromIndex];
                                    const to = result.nodes[toIndex];
                                    if (!from || !to) return null;
                                    return <line key={index} className="sco-result-edge" x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={result.color} />;
                                })}
                                {result.nodes.map((node, index) => (
                                    <g
                                        key={node.id}
                                        className={`sco-result-node${node.isSelected ? ' is-selected' : ''}${activeStarId === node.id ? ' is-active' : ''}`}
                                        role="button"
                                        tabIndex={0}
                                        aria-label={en ? `Star ${index + 1}: ${node.name}${node.artists ? ` by ${node.artists}` : ''}` : `${index + 1}번 별: ${node.name}${node.artists ? ` · ${node.artists}` : ''}`}
                                        aria-pressed={activeStarId === node.id}
                                        onClick={() => setActiveStarId(node.id)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                setActiveStarId(node.id);
                                            }
                                        }}
                                    >
                                        <title>{node.name}{node.artists ? ` · ${node.artists}` : ''}</title>
                                        <circle cx={node.x} cy={node.y} r={node.isSelected ? 23 : 17} fill="url(#sco-node-glow)" />
                                        <circle className="sco-star-hit-area" cx={node.x} cy={node.y} r="20" />
                                        <circle className="sco-star-focus-ring" cx={node.x} cy={node.y} r="10" />
                                        <circle cx={node.x} cy={node.y} r={node.isSelected ? 4.8 : 3} fill="#f8faff" />
                                    </g>
                                ))}
                            </svg>
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
                                    ? `Today’s track and ${Math.max(0, result.nodes.length - 1)} songs from your library with a similar energy`
                                    : `오늘의 곡과 에너지가 가까운 내 음악 ${Math.max(0, result.nodes.length - 1)}곡`}
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
                            <div className="sco-track-box__left">
                                <span className="sco-track-tag">{en ? 'TODAY’S TRACK' : '오늘의 곡'}</span>
                                <h4 className="sco-track-name">{prescribed.name}</h4>
                                <p className="sco-track-artist">{prescribed.artists || 'Unknown artist'}</p>
                                <small className="sco-track-reason">{en ? 'From your library, close to the direction you chose' : '내 음악에서, 선택한 방향과 에너지가 가까운 곡'}</small>
                            </div>
                            <button
                                type="button"
                                className="sco-track-play-btn"
                                onClick={() => onListen && onListen(prescribed)}
                                aria-label={en ? `Listen to ${prescribed.name}` : `${prescribed.name} 바로 듣기`}
                            >
                                <span aria-hidden="true">▶</span>
                                <span>{en ? 'Listen' : '듣기'}</span>
                            </button>
                        </div>

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
                        <div className="sco-tear-actions">
                            {!isTorn ? (
                                <button
                                    type="button"
                                    className="sco-tear-btn"
                                    onClick={handleTearOff}
                                >
                                    <span>{en ? 'Save today to my calendar' : '오늘의 별자리 달력에 기록하기'}</span>
                                </button>
                            ) : (
                                <div className="sco-stamped-bar">
                                    <span className="sco-stamped-text">
                                        {en ? 'Saved to your constellation calendar.' : '오늘의 별자리를 달력에 기록했습니다.'}
                                    </span>
                                    <button type="button" className="sco-redraw-btn" onClick={handleRedraw}>
                                        {en ? 'Draw Again' : '다시 뽑기'}
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
