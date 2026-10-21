import './DesktopDiscoveryPanel.css';

export default function DesktopDiscoveryPanel({ items, loading, error, lastBatchCount, seed, onMore, onClose, onInspect, onPlay, onAdd, savedIds, selectedId, playingId, lang = 'ko' }) {
    const en = lang === 'en';
    return <aside className="tm-discovery-lens tm-discovery-panel" aria-label={en ? 'New music recommendations' : '새 음악 추천 목록'}>
        <header><div><span className="tm-discovery-lens-eyebrow">{en ? 'DISCOVER NEW MUSIC' : '새 음악 발견'}</span><h2>{en ? 'Find your next favorite' : '다음 취향을 만나보세요'}</h2></div><button type="button" className="tm-discovery-close" onClick={onClose} aria-label={en ? 'Close recommendations' : '추천 목록 닫기'}>×</button></header>
        <p className="tm-discovery-basis">{seed ? (en ? `Starting from ${seed.name} · ${seed.artists}` : `${seed.name} · ${seed.artists}에서 이어지는 음악`) : (en ? 'Based on the genres in your music.' : '내 음악의 주요 장르를 바탕으로 찾았어요.')}</p>
        <div className="tm-discovery-list-meta"><strong>{en ? `${items.length} recommended songs` : `추천 ${items.length}곡`}</strong><span>{en ? '8 at a time' : '한 번에 최대 8곡'}</span></div>
        <div className="tm-discovery-request-status" role={error ? 'alert' : 'status'} aria-live="polite">
            {loading ? (en ? 'Finding songs… Your current list will stay.' : '새 곡을 찾는 중이에요. 기존 목록은 유지돼요.') : error ? (en ? 'Could not find songs. Please try again.' : '곡을 불러오지 못했어요. 다시 시도해 주세요.') : lastBatchCount === 0 ? (en ? 'No more new songs for this basis.' : '이 기준으로 더 찾은 새 곡이 없어요.') : items.length ? (en ? 'Ready. Songs join My map only when you add them.' : '찾기 완료 · 추가한 곡만 내 지도에 들어가요.') : (en ? 'Recommendations will appear here.' : '찾은 추천곡이 여기에 표시돼요.')}
        </div>
        <ol className="tm-discovery-song-list" aria-label={en ? 'Recommended songs' : '추천곡'} aria-busy={loading}>
            {items.map(({ track }, index) => {
                const added = savedIds.has(track.id);
                return <li key={track.id} className={selectedId === track.id ? 'is-selected' : ''}>
                    <button type="button" className="tm-discovery-song" onClick={() => onInspect(track)} aria-label={`${en ? 'View' : '곡 정보'}: ${track.name}`}><span className="tm-discovery-rank">{playingId === track.id ? '▶' : index + 1}</span>{track.coverUrl && <img src={track.coverUrl} alt="" loading="lazy" />}<span><strong>{track.name}</strong><small>{track.artists}</small></span></button>
                    <div className="tm-discovery-song-actions"><button type="button" onClick={() => onPlay(track)} aria-label={`${en ? 'Listen' : '듣기'}: ${track.name}`}>▶</button><button type="button" disabled={added} onClick={() => onAdd(track)} aria-label={`${added ? (en ? 'Added' : '추가됨') : (en ? 'Add to My map' : '내 지도에 추가')}: ${track.name}`}>{added ? '✓' : '+'}</button></div>
                </li>;
            })}
        </ol>
        <button type="button" className="tm-discovery-more" disabled={loading} onClick={onMore}>{loading ? (en ? 'Finding…' : '찾는 중…') : error ? (en ? 'Try again' : '다시 시도') : (en ? 'Find more songs' : '새 곡 더 찾기')}</button>
        <label className="tm-discovery-map-option"><input type="checkbox" checked disabled />{en ? 'Also show recommendations on the map' : '추천곡을 지도에도 표시'}</label>
    </aside>;
}
