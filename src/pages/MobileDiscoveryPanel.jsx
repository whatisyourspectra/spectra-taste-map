import { useMemo, useRef, useState } from 'react';
import MobileMusicIcon from '../components/MobileMusicIcon';

function Cover({ track }) {
    const src = track?.coverUrl || track?.imageUrl;
    return <span className="public-map-artwork" aria-hidden="true"><span>♪</span>{src && <img src={src} alt="" loading="lazy" onError={event => { event.currentTarget.style.visibility = 'hidden'; }} />}</span>;
}

export default function MobileDiscoveryPanel({ library, recommendations, seed, status, decisions, onSeedChange, onRetry, onDecision, onMap, lang = 'ko' }) {
    const en = lang === 'en';
    const cardRef = useRef(null);
    const [sourceSearch, setSourceSearch] = useState('');
    const [search, setSearch] = useState('');
    const [limit, setLimit] = useState(50);
    const [pickedId, setPickedId] = useState(null);
    const [useLibrary, setUseLibrary] = useState(false);
    const [message, setMessage] = useState(null);
    const choices = useMemo(() => new Map(decisions.map(item => [item.track.id, item.action])), [decisions]);
    const collection = useLibrary ? library : recommendations;
    const current = collection.find(track => track.id === pickedId) || collection.find(track => !choices.has(track.id));
    const matches = useMemo(() => collection.filter(track => `${track.name} ${track.artists}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())), [collection, search]);
    const sourceMatches = useMemo(() => library.filter(track => `${track.name} ${track.artists}`.toLocaleLowerCase().includes(sourceSearch.trim().toLocaleLowerCase())), [library, sourceSearch]);
    const chooseSeed = (track, event) => {
        event.currentTarget.closest('details').open = false;
        setUseLibrary(false); setPickedId(null); setSearch(''); setMessage(null);
        onSeedChange(track);
    };
    const decide = action => {
        if (!current) return;
        const success = onDecision(action, current);
        if (success) {
            setPickedId(null);
            setMessage({ error: false, text: action === 'absorb' ? (en ? 'Added to My map.' : '내 지도에 음악을 추가했어요.') : action === 'dig' ? (en ? 'Marked as interesting.' : '관심 있는 곡으로 표시했어요.') : (en ? 'Skipped. Try another song.' : '가볍게 넘겼어요. 다음 곡을 만나보세요.') });
        } else setMessage({ error: true, text: en ? 'Could not save. Please try again.' : '선택을 저장하지 못했어요. 다시 시도해 주세요.' });
    };
    const query = current ? encodeURIComponent(`${current.artists} ${current.name}`) : '';
    return <section className="mtm-discovery mtm-scroll-page" aria-labelledby="mtm-discovery-title">
        <div className="mtm-page-heading"><div><span className="public-map-eyebrow">FOLLOW YOUR CURIOSITY</span><h1 id="mtm-discovery-title">{en ? 'Discover' : '발견'}</h1><p>{en ? 'Start with a song you love. Find your next favorite.' : '좋아하는 한 곡에서, 다음 취향을 찾아요.'}</p></div></div>
        <details className="mtm-seed-picker">
            <summary><Cover track={seed} /><span><small>{en ? 'Starting from' : '이 곡에서 시작해요'}</small><strong>{seed?.name}</strong><small>{seed?.artists}</small></span><span className="mtm-seed-change">{en ? 'Change' : '곡 바꾸기'}⌄</span></summary>
            <label className="public-map-search"><input type="search" aria-label={en ? 'Find a starting song' : '추천 기준곡 검색'} placeholder={en ? 'Song or artist from your music' : '내 곡 또는 아티스트 찾기'} value={sourceSearch} onChange={event => setSourceSearch(event.target.value)} /></label>
            <div className="mtm-seed-options">{sourceMatches.slice(0, 30).map(track => <button type="button" key={track.id} onClick={event => chooseSeed(track, event)}><Cover track={track} /><span><strong>{track.name}</strong><small>{track.artists}</small></span></button>)}{!sourceMatches.length && <p>{en ? 'No songs found.' : '찾는 곡이 없어요.'}</p>}</div>
        </details>
        {!useLibrary && status === 'loading' ? <div className="mtm-discovery-skeleton" role="status"><div className="mtm-skeleton-art" aria-hidden="true" /><div className="mtm-skeleton-line" aria-hidden="true" /><div className="mtm-skeleton-line is-short" aria-hidden="true" /><p>{en ? 'Finding music connected to your song…' : '선택한 곡과 이어지는 음악을 찾고 있어요.'}</p></div>
            : !useLibrary && status === 'error' ? <div className="mtm-discovery-empty" role="alert"><h2>{en ? 'Could not connect recommendations' : '추천을 잠시 연결하지 못했어요'}</h2><p>{en ? 'You can keep exploring the music you already love.' : '내 음악으로 취향을 골라보거나 다시 연결해 보세요.'}</p><button type="button" onClick={onRetry}>{en ? 'Try again' : '추천 다시 시도'}</button><button type="button" onClick={() => setUseLibrary(true)}>{en ? 'Explore my music' : '내 음악으로 취향 고르기'}</button><button type="button" onClick={onMap}>{en ? 'My map' : '내 음악 보기'}</button></div>
                : <>
                    <div className="mtm-discovery-section-heading"><div><span className="public-map-eyebrow">TASTE DROP</span><h2>{en ? 'What catches your ear?' : '지금 끌리는 음악은?'}</h2></div><button type="button" className="mtm-text-button" onClick={() => { setPickedId(null); setMessage(null); setUseLibrary(false); onRetry(); }}><MobileMusicIcon name="refresh" />{en ? 'Refresh' : '새로 찾기'}</button></div>
                    {current ? <article ref={cardRef} className="mtm-drop-card">
                        <div key={current.id} className="mtm-drop-content"><Cover track={current} /><span className="public-map-eyebrow">{useLibrary ? (en ? 'FROM YOUR MUSIC' : '내 음악에서') : (en ? 'A NEW DISCOVERY' : '새롭게 발견한 곡')}</span><h3 title={current.name}>{current.name}</h3><p>{current.artists}</p></div>
                        <div className="public-map-track-actions"><a className="public-map-listen" href={`https://www.youtube.com/results?search_query=${query}`} target="_blank" rel="noopener noreferrer"><MobileMusicIcon name="play" />YouTube<MobileMusicIcon name="external" /></a><a href={`https://open.spotify.com/search/${query}`} target="_blank" rel="noopener noreferrer">Spotify<MobileMusicIcon name="external" /></a></div>
                        <div className="mtm-discovery-feedback-slot">{message && <p className={`mtm-discovery-message${message.error ? ' is-error' : ''}`} role={message.error ? 'alert' : 'status'}>{!message.error && <MobileMusicIcon name="check" />}<span>{message.text}</span></p>}</div>
                        <div className="mtm-drop-decisions"><button type="button" className="mtm-drop-add" onClick={() => decide('absorb')}><MobileMusicIcon name="plus" />{en ? 'Add to my music' : '내 음악에 추가'}</button><button type="button" onClick={() => decide('dig')}><MobileMusicIcon name="heart" />{en ? 'Interested' : '관심 표시'}</button><button type="button" className="mtm-drop-skip" onClick={() => decide('pop')}>{en ? 'Skip' : '넘기기'}<MobileMusicIcon name="arrow" /></button></div>
                    </article>
                        : <div className="mtm-discovery-empty"><h2>{collection.length ? (en ? 'You have explored every song.' : '이번 음악을 모두 살펴봤어요.') : (en ? 'No new songs found yet.' : '아직 새로운 곡을 찾지 못했어요.')}</h2><button type="button" onClick={() => { setUseLibrary(false); onRetry(); }}>{en ? 'Find more music' : '새로운 음악 다시 찾기'}</button>{!useLibrary && <button type="button" onClick={() => setUseLibrary(true)}>{en ? 'Explore my music' : '내 음악으로 취향 고르기'}</button>}</div>}
                    {!current && message && <p className={`mtm-discovery-message${message.error ? ' is-error' : ''}`} role={message.error ? 'alert' : 'status'}>{message.text}</p>}
                    <div className="mtm-discovery-list-heading"><h2>{en ? 'Explore the songs' : '다른 곡도 살펴보기'} <span>{collection.length}</span></h2></div>
                    <label className="public-map-search"><input type="search" aria-label={en ? 'Search discovered songs' : '발견한 곡 검색'} placeholder={en ? 'Song or artist' : '발견한 곡 또는 아티스트 찾기'} value={search} onChange={event => { setSearch(event.target.value); setLimit(50); }} /></label>
                    <div className="public-map-song-list">{matches.slice(0, limit).map(track => <button type="button" key={track.id} aria-pressed={track.id === current?.id} onClick={() => { setPickedId(track.id); setMessage(null); requestAnimationFrame(() => cardRef.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' })); }}><Cover track={track} /><span><strong>{track.name}</strong><small>{track.artists}</small></span><span className="public-map-song-arrow" aria-hidden="true">{choices.get(track.id) === 'dig' ? '♡' : '↗'}</span></button>)}</div>
                    {search && !matches.length && <p className="mtm-storage-note" role="status">{en ? 'No songs found.' : '찾는 곡이 없어요.'}</p>}
                    {matches.length > limit && <button className="public-map-load-more" type="button" onClick={() => setLimit(value => value + 50)}>{en ? 'See more songs' : '곡 더 보기'}</button>}
                </>}
    </section>;
}
