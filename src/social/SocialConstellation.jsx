import { useId, useMemo, useRef, useState } from 'react';
import { useLocale } from '../i18n/useLocale.js';
import { titleizeGenre } from '../taste/genreIdentity.js';
import MobileMusicIcon from '../components/MobileMusicIcon';
import LivingConstellationAvatar from '../avatar/LivingConstellationAvatar';
import ImmersiveSpectra from '../reflection/ImmersiveSpectra';
import { projectSpectra } from '../reflection/projectSpectra';
import { buildPublicConstellation, PUBLIC_CONSTELLATION_CAMERA } from './publicConstellation';
import { publicTastePeek } from './tastePeek.js';
import './SocialConstellation.css';

export default function SocialConstellation({ snapshot, label, detailed = false, onRevealTrack }) {
    const { lang } = useLocale();
    const en = lang === 'en';
    const t = (ko, english) => en ? english : ko;
    const id = useId();
    const stageRef = useRef(null), controlsRef = useRef(null);
    const [activeGenre, setActiveGenre] = useState(null);
    const [selectedTrackId, setSelectedTrackId] = useState(null);
    const [announcement, setAnnouncement] = useState('');
    const genreProfile = snapshot?.genreProfile, tracks = snapshot?.tracks;
    const model = useMemo(() => buildPublicConstellation({ genreProfile, tracks }), [genreProfile, tracks]);
    const compact = useMemo(() => projectSpectra(model.avatar, PUBLIC_CONSTELLATION_CAMERA), [model.avatar]);
    const active = model.genres.find(genre => genre.genre === activeGenre);
    const selectedTrack = model.tracks.find(track => track.id === selectedTrackId);
    const peek = selectedTrack ? { tracks: [selectedTrack], hasPublicTracks: true, genreMatched: false }
        : publicTastePeek({ tracks: model.tracks }, active?.genre);
    const count = Number.isFinite(snapshot?.trackCount) ? Math.max(0, snapshot.trackCount) : 0;
    const selectGenre = genre => {
        setActiveGenre(genre.genre); setSelectedTrackId(null);
        setAnnouncement(t(`${titleizeGenre(genre.genre)} 취향을 살펴보고 있어요.`, `Exploring ${titleizeGenre(genre.genre)}.`));
    };
    const selectStar = nodeId => {
        const node = model.avatar.nodes.find(item => item.id === nodeId);
        if (!node) return;
        if (node.kind === 'genre') { selectGenre(node); return; }
        setSelectedTrackId(nodeId);
        setActiveGenre(node.genre === 'unclassified' ? null : node.genre);
        setAnnouncement(t('공개된 곡을 살펴보고 있어요.', 'Exploring a publicly shared song.'));
    };
    const closePeek = () => {
        const previous = model.genres.findIndex(genre => genre.genre === activeGenre);
        setActiveGenre(null); setSelectedTrackId(null); setAnnouncement('');
        const control = controlsRef.current?.querySelectorAll('button')[Math.max(0, previous)];
        (control || stageRef.current)?.focus({ preventScroll: true });
    };
    const description = t(`공개된 대표곡 ${model.tracks.length}곡과 대표 장르 ${model.genres.length}개로 만든 별자리예요.`, `A constellation of ${model.tracks.length} public songs and ${model.genres.length} representative genres.`)
        + (detailed ? t(' 드래그해서 3D로 돌려보고 별을 눌러 취향을 살펴보세요.', ' Drag to rotate in 3D and select a star to explore this taste.') : '');
    return <div className={`social-taste-form${detailed ? ' is-detailed' : ''}${model.avatar.nodes.length ? '' : ' is-empty'}${active || selectedTrack ? ' has-peek' : ''}`}
        onKeyDown={event => { if (detailed && (active || selectedTrack) && event.key === 'Escape') { event.stopPropagation(); closePeek(); } }}>
        <div className="social-taste-form-meta" aria-hidden="true"><span>{detailed ? 'A WINDOW INTO THIS TASTE' : 'SPECTRA / CONSTELLATION'}</span><span>{count.toLocaleString(en ? 'en-US' : 'ko-KR')} {en ? 'TRACKS' : '곡'}</span></div>
        {detailed ? <div className="social-taste-stage">
            <ImmersiveSpectra avatar={model.avatar} lang={lang} stageRef={stageRef} onSelect={selectStar}
                initialCamera={PUBLIC_CONSTELLATION_CAMERA} activeGenre={activeGenre} label={label} description={description}
                artworkClassName="social-constellation" hint={t('드래그로 회전 · 두 손가락으로 확대 · 별을 눌러 취향 보기', 'Drag to rotate · Pinch to zoom · Select a star')} />
        </div> : <LivingConstellationAvatar avatar={compact} lang={lang} showReceiver={false} fixedFrame spatial className="social-constellation" label={label} description={description} />}
        {detailed && <div className="social-taste-explorer">
            {model.avatar.nodes.length > 0 ? <>
                <div className="social-taste-peek-invitation"><span><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></svg>{t('별을 따라, 이 취향 속으로', 'Step inside their constellation')}</span><small><span className="social-peek-desktop">{t('드래그로 돌리고, 별을 눌러보세요', 'Drag to rotate · Select a star')}</span><span className="social-peek-mobile">{t('밀어서 돌리고, 별을 눌러보세요', 'Swipe to rotate · Tap a star')}</span></small></div>
                <div ref={controlsRef} hidden={!model.genres.length} className="social-taste-genre-controls" role="group" aria-label={t('엿볼 대표 장르 선택', 'Choose a genre to explore')} onKeyDown={event => {
                    const buttons = [...event.currentTarget.querySelectorAll('button')];
                    const index = buttons.indexOf(document.activeElement);
                    let next;
                    if (event.key === 'ArrowRight') next = (index + 1) % buttons.length;
                    if (event.key === 'ArrowLeft') next = (index + buttons.length - 1) % buttons.length;
                    if (event.key === 'Home') next = 0;
                    if (event.key === 'End') next = buttons.length - 1;
                    if (next === undefined) return;
                    event.preventDefault(); selectGenre(model.genres[next]); buttons[next].focus({ preventScroll: true });
                    buttons[next].scrollIntoView({ block: 'nearest', inline: 'nearest' });
                }}>{model.genres.map(portal => <button type="button" key={portal.genre} aria-pressed={!selectedTrack && activeGenre === portal.genre} aria-controls={`${id}-peek`} onClick={() => selectGenre(portal)} style={{ '--portal-color': portal.color }}><i />{titleizeGenre(portal.genre)}</button>)}</div>
                <section id={`${id}-peek`} className={`social-taste-peek-panel${active || selectedTrack ? ' is-open' : ''}`} aria-label={t('취향 엿보기', 'Taste preview')}>
                    {active || selectedTrack ? <>
                        <div className="social-taste-peek-summary" key={selectedTrack?.id || active.genre}><span className="social-taste-peek-kicker">{selectedTrack ? t('이 별이 들려주는 음악', 'A SONG INSIDE THIS STAR') : t('이 취향의 한 조각', 'A PIECE OF THEIR TASTE')}</span><h3>{selectedTrack ? (active ? titleizeGenre(active.genre) : t('공개된 음악', 'Public music')) : titleizeGenre(active.genre)}</h3><p>{selectedTrack ? t('이 곡을 공개 목록에서 더 살펴보세요.', 'Follow this song to the public collection.') : peek.genreMatched ? t('이 장르로 공개한 곡들이에요.', 'Songs shared in this genre.') : peek.hasPublicTracks ? t('이 장르의 곡은 따로 연결되지 않았어요. 공개된 대표곡을 먼저 만나보세요.', 'No songs are linked to this genre yet. Here are a few public favorites.') : t('이 사용자는 곡 목록을 공개하지 않았어요. 장르로 취향을 둘러보세요.', 'This person has kept their song list private. You can still explore their genres.')}</p></div>
                        <button type="button" className="social-taste-peek-close" aria-label={t('취향 엿보기 닫기', 'Close taste preview')} onClick={closePeek}><MobileMusicIcon name="close" /></button>
                        {peek.tracks.length > 0 && <div className="social-taste-peek-tracks" key={`songs-${selectedTrack?.id || active.genre}`}>{peek.tracks.map(track => <button type="button" key={track.id} onClick={() => onRevealTrack?.(track)} disabled={!onRevealTrack} aria-label={t(`${track.name} 공개 곡에서 보기`, `View ${track.name} in public songs`)}>
                            <span className="social-taste-peek-art" aria-hidden="true">♪{track.coverUrl && <img src={track.coverUrl} alt="" loading="lazy" onError={event => { event.currentTarget.style.display = 'none'; }} />}</span><span><strong>{track.name}</strong><small>{track.artists}</small></span><MobileMusicIcon name="arrow" /></button>)}</div>}
                    </> : <div className="social-taste-peek-empty"><span aria-hidden="true">↗</span><div><h3>{t('어떤 음악을 좋아하는 사람일까요?', 'What does their world sound like?')}</h3><p>{t('별자리를 돌려보고, 별이나 장르를 골라 공개된 음악을 만나보세요.', 'Rotate the constellation, then select a star or genre to discover their public music.')}</p></div></div>}
                </section>
            </> : <p className="social-taste-peek-no-genres">{t('장르 정보가 모이면 이 취향을 더 자세히 살펴볼 수 있어요.', 'More of this taste will come into view when genre information is available.')}</p>}
            <p className="social-taste-peek-footnote">{t('공개한 취향과 곡만 보여요.', 'Only publicly shared taste and songs are shown.')}</p>
            <span className="social-peek-sr-only" role="status" aria-live="polite">{announcement}</span>
        </div>}
    </div>;
}
