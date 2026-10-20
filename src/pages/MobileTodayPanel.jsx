import { useRef, useState } from 'react';
import ConstellationOracle from '../oracle/ConstellationOracle';
import MonthlyConstellationCalendar from '../oracle/MonthlyConstellationCalendar';

export default function MobileTodayPanel({ library, identity, hidden, lang = 'ko', onListen }) {
    const [refresh, setRefresh] = useState(0);
    const calendarRef = useRef(null);
    const en = lang === 'en';
    return <div className="mtm-today mtm-scroll-page" hidden={hidden}>
        <div className="mtm-page-heading"><div><span className="public-map-eyebrow">MUSIC FOR THIS MOMENT</span><h1>{en ? 'Today' : '오늘'}</h1><p>{en ? 'Choose a song for now. Keep the moment.' : '지금의 마음에 맞는 음악을 고르고, 순간을 남겨요.'}</p></div><button type="button" className="mtm-text-button" onClick={() => calendarRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' })}>{en ? 'Calendar ↓' : '기록 달력 ↓'}</button></div>
        <ConstellationOracle library={library} identity={identity} lang={lang} onListen={onListen} onSavedToCalendar={() => setRefresh(value => value + 1)} />
        <div ref={calendarRef} className="mtm-calendar-section"><MonthlyConstellationCalendar identity={identity} lang={lang} onListen={onListen} refreshTrigger={refresh} /><p className="mtm-storage-note">{en ? 'Listening moments are saved in this browser.' : '음악으로 남긴 순간은 현재 브라우저에 보관돼요.'}</p></div>
    </div>;
}
