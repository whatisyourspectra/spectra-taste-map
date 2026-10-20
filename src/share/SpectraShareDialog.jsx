import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { buildTasteState } from '../taste/buildTasteState';
import { titleizeGenre } from '../taste/genreIdentity';
import { buildAvatarState } from '../avatar/buildAvatarState';
import LivingConstellationAvatar from '../avatar/LivingConstellationAvatar';
import { createBubbleShareImage, createConstellationImage } from '../avatar/exportConstellation';
import KakaoCardShare from './KakaoCardShare';
import './share.css';
import './SpectraShareDialog.css';

export default function SpectraShareDialog({ tracks, avatar: suppliedAvatar, lang = 'ko', initialStyle = 'bubbles', initialChannel = 'card', onClose }) {
    const en = lang === 'en';
    const id = useId();
    const dialogRef = useRef(null);
    const constellationRef = useRef(null);
    const kakaoRef = useRef(null);
    const [kakaoOpen, setKakaoOpen] = useState(initialChannel === 'kakao');
    // Keep one snapshot while the user chooses a card, even if enrichment finishes.
    const [library] = useState(() => tracks);
    const [initialAvatar] = useState(() => suppliedAvatar);
    const taste = useMemo(() => buildTasteState(library), [library]);
    const avatar = useMemo(() => initialAvatar || buildAvatarState(taste, library, []), [initialAvatar, taste, library]);
    const [style, setStyle] = useState(initialStyle);
    const [attempt, setAttempt] = useState(0);
    const [image, setImage] = useState(null);
    const [error, setError] = useState(null);
    const [sharing, setSharing] = useState(false);
    const shareLock = useRef(false);
    const ready = image?.style === style && image?.attempt === attempt;
    const failure = error?.style === style && error?.attempt === attempt ? error.message : '';

    useEffect(() => {
        dialogRef.current.showModal();
    }, []);

    useEffect(() => {
        let disposed = false;
        const generate = async () => {
            try {
                const options = {
                    title: en ? 'My Spectra' : '나의 스펙트라',
                    genres: taste.coreGenres.slice(0, 3).map(item => titleizeGenre(item.genre)),
                    count: library.length,
                };
                const blob = style === 'bubbles'
                    ? await createBubbleShareImage(library, options)
                    : await createConstellationImage(constellationRef.current.querySelector('svg'), options);
                if (disposed) return;
                const url = URL.createObjectURL(blob);
                setImage({ url, style, attempt, file: new File([blob], 'my-spectra-story.png', { type: 'image/png' }) });
            } catch {
                if (!disposed) setError({ style, attempt, message: en ? 'Could not create the card. Please try again.' : '카드를 만들지 못했어요. 다시 시도해 주세요.' });
            }
        };
        generate();
        return () => { disposed = true; };
    }, [style, attempt, library, taste, en]);

    useEffect(() => {
        if (!image) return;
        return () => URL.revokeObjectURL(image.url);
    }, [image]);

    useEffect(() => {
        if (initialChannel !== 'kakao' || !ready) return;
        kakaoRef.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }, [initialChannel, ready]);

    let canShare = false;
    try { canShare = Boolean(ready && navigator.share && navigator.canShare?.({ files: [image.file] })); } catch { /* Image download remains available. */ }
    const share = async () => {
        if (!ready || shareLock.current) return;
        shareLock.current = true;
        setSharing(true);
        setError(null);
        try { await navigator.share({ files: [image.file] }); }
        catch (failure) {
            if (failure.name !== 'AbortError') setError({ style, attempt, message: en ? 'Could not open sharing. You can save the image below.' : '공유를 열지 못했어요. 이미지 저장을 이용해 주세요.' });
        } finally { shareLock.current = false; setSharing(false); }
    };
    const close = () => dialogRef.current.close();

    return <dialog ref={dialogRef} className="spectra-share-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} onClose={onClose}
        onKeyDown={event => { if (event.key === 'Escape') event.stopPropagation(); }}
        onClick={event => {
            if (event.target !== event.currentTarget) return;
            const rect = event.currentTarget.getBoundingClientRect();
            if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
        }}>
        <header className="spectra-share-heading"><div><span>SHARE YOUR SPECTRA</span><h2 id={`${id}-title`}>{en ? 'Share my taste map' : '내 취향 지도 공유하기'}</h2></div><button type="button" autoFocus aria-label={en ? 'Close sharing' : '공유 창 닫기'} onClick={close}>×</button></header>
        <p id={`${id}-description`} className="spectra-share-description">{en ? 'Your music, made into a card to share.' : '내 음악이 담긴 카드를 친구에게 전해요.'}</p>
        <div className="spectra-share-styles" role="group" aria-label={en ? 'Card style' : '공유 카드 스타일'}>
            {[['bubbles', en ? 'Album bubbles' : '앨범 버블'], ['constellation', en ? 'Constellation' : '별자리']].map(([key, label]) => <button key={key} type="button" aria-pressed={style === key} disabled={sharing} onClick={() => { setError(null); setStyle(key); }}>{label}</button>)}
        </div>
        <div className="spectra-share-body">
            <div className="spectra-share-preview" aria-busy={!ready && !failure}>
                {ready ? <img src={image.url} alt={en ? 'My taste map share card preview' : '내 취향 지도 공유 카드 미리보기'} />
                    : <div className="spectra-share-placeholder" role={failure ? 'alert' : 'status'}>{failure ? <p>{failure}</p> : <><span className="spectra-share-spinner" aria-hidden="true" /><p>{en ? 'Creating your card…' : '내 취향을 카드에 담고 있어요…'}</p></>}</div>}
            </div>
            {image && <details ref={kakaoRef} className="spectra-share-kakao" hidden={!ready} open={kakaoOpen} onToggle={event => setKakaoOpen(event.currentTarget.open)}><summary>{en ? 'KakaoTalk & map link' : '카카오톡으로 지도 링크 보내기'}<span aria-hidden="true">＋</span></summary>
                <KakaoCardShare file={image.file} tracks={library} style={image.style} genres={taste.coreGenres.slice(0, 3).map(item => titleizeGenre(item.genre))} title={en ? 'My Spectra' : '나의 스펙트라'} />
            </details>}
        </div>
        <footer className="spectra-share-footer">
            {ready ? <div className="spectra-share-actions">{canShare && <button className="spectra-share-primary" type="button" disabled={sharing} onClick={share}>{sharing ? (en ? 'Opening…' : '공유 여는 중…') : (en ? 'Share card' : '카드 공유하기')}</button>}<a className={canShare ? 'spectra-share-secondary' : 'spectra-share-primary'} href={image.url} download={image.file.name}>{en ? 'Save image' : '이미지 저장'}</a></div>
                : <button className="spectra-share-primary" type="button" disabled={!failure} onClick={() => { setError(null); setAttempt(value => value + 1); }}>{failure ? (en ? 'Try again' : '다시 만들기') : (en ? 'Preparing card…' : '카드 준비 중…')}</button>}
            {ready && failure && <p role="alert">{failure}</p>}
            <p>{en ? 'Save the image to add it to your Instagram story.' : '이미지를 저장해 Instagram 스토리에도 올려보세요.'}</p>
        </footer>
        <div ref={constellationRef} className="spectra-share-source" aria-hidden="true" inert><LivingConstellationAvatar avatar={avatar} lang={lang} showReceiver={false} /></div>
    </dialog>;
}
