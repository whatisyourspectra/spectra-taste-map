import { useMemo, useState } from 'react';
import { loadOracleRecords } from './constellationOracleData.js';
import './MonthlyConstellationCalendar.css';

export default function MonthlyConstellationCalendar({
    identity = 'guest',
    lang = 'ko',
    onListen,
    refreshTrigger = 0,
}) {
    const en = lang === 'en';
    const [viewDate, setViewDate] = useState(() => new Date());
    const [inspectingRecord, setInspectingRecord] = useState(null);

    // Load stamped records from local storage
    const records = useMemo(() => {
        // eslint-disable-next-line no-unused-expressions
        refreshTrigger; // reactive dependency
        return loadOracleRecords(identity);
    }, [identity, refreshTrigger]);

    // Map records by day string `YYYY-MM-DD`
    const recordByDay = useMemo(() => {
        const map = new Map();
        records.forEach((r) => map.set(r.day, r));
        return map;
    }, [records]);

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth(); // 0-indexed

    // Compute calendar grid cells
    const calendarDays = useMemo(() => {
        const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const cells = [];
        // Empty offset cells
        for (let i = 0; i < firstDayOfWeek; i++) {
            cells.push({ dayNumber: null });
        }
        // Month days
        for (let d = 1; d <= daysInMonth; d++) {
            const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            cells.push({
                dayNumber: d,
                dayStr,
                record: recordByDay.get(dayStr) || null,
            });
        }
        return cells;
    }, [year, month, recordByDay]);

    // Count collected constellations in this month
    const currentMonthCollectedCount = useMemo(() => {
        const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
        return records.filter((r) => r.day.startsWith(prefix)).length;
    }, [records, year, month]);

    const daysInThisMonth = new Date(year, month + 1, 0).getDate();

    const handlePrevMonth = () => {
        setViewDate(new Date(year, month - 1, 1));
    };

    const handleNextMonth = () => {
        setViewDate(new Date(year, month + 1, 1));
    };

    const monthNamesEn = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    const daysHeader = en ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'] : ['일', '월', '화', '수', '목', '금', '토'];

    return (
        <section className="mcc-root" aria-label={en ? 'Monthly Constellation Calendar' : '월간 별자리 달력'}>
            <header className="mcc-header">
                <div className="mcc-title-group">
                    <span className="mcc-eyebrow">MONTHLY LOG</span>
                    <h3 className="mcc-month-label">
                        {en ? `${monthNamesEn[month]} ${year}` : `${year}년 ${month + 1}월`}
                    </h3>
                </div>
                <div className="mcc-nav-btns">
                    <button type="button" onClick={handlePrevMonth} aria-label={en ? 'Previous month' : '이전 달'}>‹</button>
                    <button type="button" onClick={handleNextMonth} aria-label={en ? 'Next month' : '다음 달'}>›</button>
                </div>
            </header>

            {/* Streak / Count Summary Badge */}
            <div className="mcc-stats-bar">
                <span className="mcc-stats-text">
                    ✨ {en
                        ? `Collected ${currentMonthCollectedCount} of ${daysInThisMonth} constellations this month`
                        : `이번 달 ${daysInThisMonth}일 중 ${currentMonthCollectedCount}개의 별자리를 모았어요`}
                </span>
            </div>

            {/* Calendar Grid */}
            <div className="mcc-calendar-card">
                <div className="mcc-weekdays-row" aria-hidden="true">
                    {daysHeader.map((d, i) => (
                        <span key={i} className="mcc-weekday-cell">{d}</span>
                    ))}
                </div>

                <div className="mcc-days-grid" role="grid">
                    {calendarDays.map((cell, idx) => {
                        if (!cell.dayNumber) {
                            return <div key={idx} className="mcc-day-cell is-empty" aria-hidden="true" />;
                        }

                        const hasRecord = Boolean(cell.record);
                        const isToday = cell.dayStr === new Date().toISOString().slice(0, 10);

                        return (
                            <button
                                key={idx}
                                type="button"
                                className={`mcc-day-cell${hasRecord ? ' has-record' : ''}${isToday ? ' is-today' : ''}`}
                                onClick={() => cell.record && setInspectingRecord(cell.record)}
                                disabled={!hasRecord}
                                aria-label={hasRecord ? `${cell.dayStr} ${cell.record.constellation?.name || ''}` : `${cell.dayNumber}`}
                            >
                                <span className="mcc-day-num">{cell.dayNumber}</span>
                                {hasRecord && (
                                    <span className="mcc-star-stamp" title={cell.record.constellation?.name}>
                                        {cell.record.constellation?.symbol || '★'}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Modal Inspector for Past Oracle Tear-sheet */}
            {inspectingRecord && (
                <div className="mcc-modal-backdrop" onClick={() => setInspectingRecord(null)} role="dialog" aria-modal="true">
                    <div className="mcc-modal-sheet" onClick={(e) => e.stopPropagation()}>
                        <header className="mcc-modal-header">
                            <div>
                                <span className="mcc-modal-badge">{inspectingRecord.moonName
                                    ? `${inspectingRecord.moonSymbol || ''} ${inspectingRecord.moonName}`
                                    : (en ? 'YOUR SKY' : '나의 별자리')}</span>
                                <h4 className="mcc-modal-date">{inspectingRecord.dateDisplay}</h4>
                            </div>
                            <button type="button" className="mcc-modal-close" onClick={() => setInspectingRecord(null)}>✕</button>
                        </header>

                        <div className="mcc-modal-body">
                            <div className="mcc-modal-context">
                                <span className="mcc-modal-label">{en ? 'Your Moment' : '그날 나의 순간'}</span>
                                <p className="mcc-modal-moment-text">
                                    {inspectingRecord.result
                                        ? (en ? inspectingRecord.result.contextEn || inspectingRecord.result.context : inspectingRecord.result.context)
                                        : `${inspectingRecord.context?.emoji || ''} ${inspectingRecord.context?.label || ''}`}
                                </p>
                            </div>

                            <div className="mcc-modal-constellation">
                                <span className="mcc-modal-label">{en ? 'Recorded Constellation' : '기록된 별자리'}</span>
                                {inspectingRecord.result?.nodes?.length > 0 && (
                                    <svg className="mcc-modal-constellation-svg" viewBox="0 0 360 320" role="img" aria-label={en ? 'Your saved constellation' : '기록된 나의 별자리'}>
                                        {inspectingRecord.result.edges?.map(([fromIndex, toIndex], index) => {
                                            const from = inspectingRecord.result.nodes[fromIndex];
                                            const to = inspectingRecord.result.nodes[toIndex];
                                            return from && to ? <line key={index} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={inspectingRecord.result.color} /> : null;
                                        })}
                                        {inspectingRecord.result.nodes.map((node) => (
                                            <circle key={node.id} cx={node.x} cy={node.y} r={node.isSelected ? 5 : 3} fill="#f8faff" />
                                        ))}
                                    </svg>
                                )}
                                <div className="mcc-modal-symbol-row">
                                    <span className="mcc-modal-symbol">{inspectingRecord.constellation?.symbol}</span>
                                    <div>
                                        <h5 className="mcc-modal-symbol-name">{en ? (inspectingRecord.result?.nameEn || inspectingRecord.constellation?.name) : inspectingRecord.constellation?.name}</h5>
                                        <p className="mcc-modal-symbol-essence">{en ? (inspectingRecord.result?.lineEn || inspectingRecord.constellation?.essence) : inspectingRecord.constellation?.essence}</p>
                                    </div>
                                </div>
                            </div>

                            {inspectingRecord.track && (
                                <div className="mcc-modal-track-box">
                                    <span className="mcc-modal-label">{en ? 'Prescribed Track' : '처방받았던 음악'}</span>
                                    <div className="mcc-modal-track-row">
                                        <div className="mcc-modal-track-info">
                                            <h6>{inspectingRecord.track.name}</h6>
                                            <p>{inspectingRecord.track.artists || 'Unknown artist'}</p>
                                        </div>
                                        <button
                                            type="button"
                                            className="mcc-modal-listen-btn"
                                            onClick={() => onListen && onListen(inspectingRecord.track)}
                                        >
                                            {en ? 'Listen ↗' : '듣기 ↗'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
