import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ARCHETYPE_MIRRORS,
    formatEnglishDate,
    formatKoreanDate,
    getContextMoments,
    getMoonPhase,
    localDay,
    ORACLE_CONSTELLATIONS,
    prescribeTrack,
    loadOracleRecords,
    saveOracleRecord,
} from './constellationOracleData.js';
import './ConstellationOracle.css';

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
    const moon = useMemo(() => getMoonPhase(dateNow), [dateNow]);
    const moments = useMemo(() => getContextMoments(dateNow), [dateNow]);

    // Check if user already completed and stamped today's Oracle
    const [records, setRecords] = useState(() => loadOracleRecords(identity));
    const todaySaved = useMemo(() => records.find((r) => r.day === today), [records, today]);

    // Wizard Flow States: 1 (Context) -> 2 (Mirror) -> 3 (Agency) -> 4 (Prescribed)
    const [step, setStep] = useState(todaySaved ? 4 : 1);
    const [selectedContext, setSelectedContext] = useState(todaySaved?.context || null);
    const [customText, setCustomText] = useState('');
    const [showCustomInput, setShowCustomInput] = useState(false);
    const [selectedShift, setSelectedShift] = useState(todaySaved?.shift || null);
    const [prescribed, setPrescribed] = useState(todaySaved?.track || null);
    const [isTorn, setIsTorn] = useState(Boolean(todaySaved));
    const [tearingAnim, setTearingAnim] = useState(false);

    // Resolved Archetype data based on selected context
    const currentMirror = useMemo(() => {
        const key = selectedContext?.archetypeKey || 'burnout';
        return ARCHETYPE_MIRRORS[key] || ARCHETYPE_MIRRORS.burnout;
    }, [selectedContext]);

    // Resolved Constellation symbol data
    const constellation = useMemo(() => {
        const id = selectedShift?.constellation || 'anchor';
        return ORACLE_CONSTELLATIONS[id] || ORACLE_CONSTELLATIONS.anchor;
    }, [selectedShift]);

    // Step 1 -> Step 2: User picks a context chip
    const handleSelectContext = (moment) => {
        setSelectedContext(moment);
        setStep(2);
    };

    const handleCustomSubmit = (e) => {
        e.preventDefault();
        if (!customText.trim()) return;
        setSelectedContext({
            id: 'ctx_custom',
            label: customText.trim(),
            emoji: '✨',
            archetypeKey: 'wanderlust',
        });
        setStep(2);
    };

    // Step 2 -> Step 3: Proceed to Agency choice
    const handleProceedToAgency = () => {
        setStep(3);
    };

    // Step 3 -> Step 4: User exercises agency by selecting energy shift
    const handleSelectShift = (shift) => {
        setSelectedShift(shift);
        const track = prescribeTrack(library, shift, today);
        setPrescribed(track);

        // Notify 3D Constellation camera to swoop and focus
        if (shift.camera && onCameraChange) {
            onCameraChange(shift.camera);
        }

        setStep(4);
    };

    // Step 4: Tear off today's page and stamp it into the monthly calendar!
    const handleTearOff = () => {
        if (!prescribed || isTorn) return;
        setTearingAnim(true);

        const newRecord = {
            day: today,
            dateDisplay: en ? formatEnglishDate(dateNow) : formatKoreanDate(dateNow),
            moonSymbol: moon.symbol,
            moonName: moon.name,
            context: selectedContext,
            shift: selectedShift,
            constellation: {
                id: constellation.id,
                name: en ? constellation.nameEn : constellation.name,
                symbol: constellation.symbol,
                essence: en ? constellation.essenceEn : constellation.essence,
            },
            track: prescribed,
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
    };

    return (
        <section className="sco-root" aria-label={en ? 'Constellation Oracle & Daily Log' : '별자리 오라클 & 일력'}>
            <header className="sco-header">
                <div className="sco-header__titles">
                    <span className="sco-brand-badge">ORACLE & DAILY LOG</span>
                    <h2 className="sco-title">{en ? 'Constellation Oracle' : '오늘의 별자리 오라클'}</h2>
                </div>
                <div className="sco-header__meta">
                    <span className="sco-moon" title={moon.name}>{moon.symbol}</span>
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
                            <span className="sco-eyebrow">STEP 01 · CONTEXT</span>
                            <h3 className="sco-question">
                                {en ? 'Where are you in your day right now?' : '지금 어디서 어떤 시간을 건너고 있나요?'}
                            </h3>
                            <p className="sco-subtext">
                                {en ? 'Tap the moment that speaks closest to your current heart.' : '지금 내 마음에 가장 가까운 순간을 하나 골라보세요.'}
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
                                    <span className="sco-chip-emoji">{m.emoji}</span>
                                    <span className="sco-chip-text">{m.label}</span>
                                </button>
                            ))}
                        </div>

                        {!showCustomInput ? (
                            <button
                                type="button"
                                className="sco-custom-toggle"
                                onClick={() => setShowCustomInput(true)}
                            >
                                {en ? '+ Write my own thought' : '+ 직접 한 줄 적기'}
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

                {/* STEP 2: ARCHETYPE MIRROR */}
                {step === 2 && (
                    <div className="sco-step sco-step-mirror animate-flip-up">
                        <div className="sco-step__lead">
                            <span className="sco-eyebrow">STEP 02 · COSMIC MIRROR</span>
                            <h3 className="sco-question">
                                {selectedContext?.emoji} {selectedContext?.label}
                            </h3>
                        </div>

                        <div className="sco-mirror-card">
                            <div className="sco-mirror-card__badge">
                                <span className="sco-tarot-mark">✦ {currentMirror.tarot}</span>
                                <span className="sco-element-mark">{currentMirror.element}</span>
                            </div>
                            <blockquote className="sco-mirror-text">
                                “{en ? currentMirror.english : currentMirror.korean}”
                            </blockquote>
                        </div>

                        <button
                            type="button"
                            className="sco-proceed-btn"
                            onClick={handleProceedToAgency}
                        >
                            {en ? 'Choose How to Shift My Energy →' : '내 기운 조율하러 가기 →'}
                        </button>
                    </div>
                )}

                {/* STEP 3: USER AGENCY (CHOICE OF ENERGY SHIFT) */}
                {step === 3 && (
                    <div className="sco-step sco-step-agency animate-fade-in">
                        <div className="sco-step__lead">
                            <span className="sco-eyebrow">STEP 03 · YOUR AGENCY</span>
                            <h3 className="sco-question">
                                {en ? 'How would you like to shift your vibe right now?' : '지금 내 기운을 어떤 방향으로 조율해볼까요?'}
                            </h3>
                            <p className="sco-subtext">
                                {en ? 'Choose the frequency that your soul needs most.' : '내 마음에 가장 끌리는 방향의 카드를 하나 선택하세요.'}
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
                                        <span className="sco-shift-emoji">{shift.emoji}</span>
                                        <span className="sco-shift-element">{shift.element}</span>
                                    </div>
                                    <h4 className="sco-shift-name">{en ? shift.nameEn : shift.name}</h4>
                                    <p className="sco-shift-desc">{shift.desc}</p>
                                    <span className="sco-shift-action">{en ? 'Select this starlight ↗' : '이 별빛으로 조율하기 ↗'}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* STEP 4: PRESCRIBED CONSTELLATION & DAILY TEAR-OFF PAGE */}
                {step === 4 && prescribed && (
                    <div className="sco-step sco-step-prescribed animate-fade-in">
                        <div className="sco-oracle-badge-row">
                            <span className="sco-constellation-pill" style={{ '--sco-accent': selectedShift?.color || '#93c5fd' }}>
                                {constellation.symbol} {en ? constellation.nameEn : constellation.name}
                            </span>
                            <span className="sco-essence-pill">{en ? constellation.essenceEn : constellation.essence}</span>
                        </div>

                        {/* Constellation Mini Art */}
                        <div className="sco-constellation-art">
                            <svg viewBox="0 0 360 320" className="sco-constellation-svg" aria-hidden="true">
                                <defs>
                                    <radialGradient id="sco-node-glow">
                                        <stop offset="0%" stopColor={selectedShift?.color || '#93c5fd'} stopOpacity="0.8" />
                                        <stop offset="40%" stopColor={selectedShift?.color || '#93c5fd'} stopOpacity="0.2" />
                                        <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                                    </radialGradient>
                                </defs>
                                {/* Connection lines */}
                                {constellation.edges.map(([fromIdx, toIdx], i) => {
                                    const a = constellation.nodes[fromIdx];
                                    const b = constellation.nodes[toIdx];
                                    if (!a || !b) return null;
                                    return (
                                        <line
                                            key={i}
                                            x1={a.x}
                                            y1={a.y}
                                            x2={b.x}
                                            y2={b.y}
                                            stroke={selectedShift?.color || '#93c5fd'}
                                            strokeWidth="1.2"
                                            strokeOpacity="0.75"
                                        />
                                    );
                                })}
                                {/* Nodes */}
                                {constellation.nodes.map((node, i) => (
                                    <g key={i}>
                                        <circle cx={node.x} cy={node.y} r={node.radius * 4.5} fill="url(#sco-node-glow)" />
                                        <circle cx={node.x} cy={node.y} r={node.radius} fill={selectedShift?.color || '#93c5fd'} />
                                        <circle cx={node.x} cy={node.y} r={node.radius * 0.45} fill="#ffffff" />
                                    </g>
                                ))}
                            </svg>
                            <p className="sco-poem">“{en ? constellation.poemEn : constellation.poem}”</p>
                        </div>

                        {/* Prescribed Track Card */}
                        <div className="sco-track-box">
                            <div className="sco-track-box__left">
                                <span className="sco-track-tag">PRESCRIBED TRACK</span>
                                <h4 className="sco-track-name">{prescribed.name}</h4>
                                <p className="sco-track-artist">{prescribed.artists || 'Unknown artist'}</p>
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

                        {/* Tear-off and Stamp Action */}
                        <div className="sco-tear-actions">
                            {!isTorn ? (
                                <button
                                    type="button"
                                    className="sco-tear-btn"
                                    onClick={handleTearOff}
                                >
                                    <span className="sco-scissors-icon" aria-hidden="true">✂️</span>
                                    <span>{en ? 'Tear & Stamp to Calendar' : '오늘 일력 뜯어서 달력에 보관하기'}</span>
                                </button>
                            ) : (
                                <div className="sco-stamped-bar">
                                    <span className="sco-stamped-text">
                                        ✨ {en ? 'Stamped into your monthly calendar!' : '오늘의 별자리가 달력에 기록되었습니다!'}
                                    </span>
                                    <button type="button" className="sco-redraw-btn" onClick={handleRedraw}>
                                        {en ? 'Draw Again' : '다시 뽑기'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
