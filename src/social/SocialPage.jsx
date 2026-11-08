import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useTasteData } from '../context/TasteDataContext';
import { supabase } from '../auth/supabaseClient';
import AccountButton from '../auth/AccountButton';
import SpectraLogo from '../components/SpectraLogo';
import MobileMusicIcon from '../components/MobileMusicIcon';
import { mobileMusicTabs } from '../components/mobileMusicTabs';
import HelpCenter from '../components/HelpCenter';
import LanguageSwitcher from '../i18n/LanguageSwitcher';
import { useLocale } from '../i18n/useLocale';
import { titleizeGenre } from '../taste/genreIdentity';
import { isDemoTaste } from '../taste/tasteStorage';
import { buildSocialSnapshot, readSocialSnapshot, socialDisplayName, SOCIAL_PAGE_SIZE } from './socialSnapshot';
import { createSocialStore } from './socialStorage';
import SocialConstellation from './SocialConstellation';
import './SocialPage.css';

const store = createSocialStore(supabase);
const mergeRows = (rows, extra) => [...new Map([...rows, ...extra].map(row => [row.id || row.user_id, row])).values()];
function errorText(error, en) {
    if (error?.message === 'SOCIAL_RATE_LIMIT') return en ? 'A little pause. Try commenting again in a few minutes.' : '잠시 쉬었다가 다시 코멘트를 남겨 주세요.';
    if (error?.message === 'SOCIAL_PRIVATE') return en ? 'This taste profile is no longer public.' : '이 취향은 현재 비공개 상태예요.';
    return en ? 'Could not connect to Social. Please try again.' : 'Social에 연결하지 못했어요. 다시 시도해 주세요.';
}
function GenreTags({ snapshot, limit = 4 }) {
    return <div className="social-genres">{snapshot.genreProfile.slice(0, limit).map(item => <span key={item.genre}>{titleizeGenre(item.genre)}</span>)}</div>;
}
function ProfileCard({ profile, en }) {
    const snapshot = readSocialSnapshot(profile.snapshot);
    return <Link className="social-profile-card" to={`/social/${profile.user_id}`}>
        <div className="social-card-art"><SocialConstellation snapshot={snapshot} label={en ? 'Public taste constellation' : '공개 취향 별자리'} /><span className="social-card-open">↗</span></div>
        <div className="social-card-copy"><span className="social-card-person"><i>{profile.display_name.slice(0, 1)}</i><strong>{profile.display_name}</strong><span>{snapshot.trackCount.toLocaleString()}{en ? ' songs' : '곡'}</span></span>
            <p>{profile.headline || (en ? 'A little window into my music.' : '내가 좋아하는 음악을 만나보세요.')}</p><GenreTags snapshot={snapshot} />
            <span className="social-card-footer">{en ? 'Explore & leave a comment' : '취향 둘러보고 코멘트 남기기'} <span>→</span></span></div>
    </Link>;
}

function PublishPanel({ own, onPublished, onUnpublished, en }) {
    const { user, isMock } = useAuth();
    const { tracks, stats, featuresSource, status } = useTasteData();
    const [name, setName] = useState(own?.display_name || socialDisplayName(user));
    const [headline, setHeadline] = useState(own?.headline || '');
    const [includeTracks, setIncludeTracks] = useState(own ? Boolean(own.snapshot?.tracks?.length) : true);
    const [pending, setPending] = useState(false), [error, setError] = useState(null), [message, setMessage] = useState('');
    const demo = isDemoTaste({ tracks, stats });
    const snapshot = useMemo(() => {
        try { return buildSocialSnapshot(tracks, { stats, includeTracks, source: featuresSource }); } catch { return null; }
    }, [tracks, stats, includeTracks, featuresSource]);
    const t = (ko, english) => en ? english : ko;
    const submit = async event => {
        event.preventDefault(); setPending(true); setError(null); setMessage('');
        try {
            const profile = await store.publish(user.id, { displayName: name, headline, snapshot });
            onPublished(profile); setMessage(t('취향을 공개했어요. 다른 사람도 이제 볼 수 있어요.', 'Your taste is public. Others can now explore it.'));
        } catch (err) { setError(errorText(err, en)); } finally { setPending(false); }
    };
    const unpublish = async () => {
        setPending(true); setError(null); setMessage('');
        try { await store.unpublish(user.id); onUnpublished(); setMessage(t('공개를 해제했어요.', 'Your taste is now private.')); }
        catch (err) { setError(errorText(err, en)); } finally { setPending(false); }
    };
    return <section className="social-publish" aria-labelledby="social-publish-title">
        <div className="social-section-kicker">YOUR CORNER OF SPECTRA</div><h2 id="social-publish-title">{t('내 취향 공개하기', 'Share your taste')}</h2>
        <p>{t('좋아하는 음악으로 나를 소개해 보세요.', 'Let your music introduce you.')}</p>
        {!user ? <div className="social-empty-inline"><p>{t('로그인하면 내 취향을 공개하고 코멘트를 남길 수 있어요.', 'Sign in to publish your taste and leave comments.')}</p><Link className="social-primary" to="/auth/login?returnTo=%2Fsocial">{t('로그인하고 시작하기', 'Sign in to begin')}</Link></div>
        : <form onSubmit={submit}>
            <div className={`social-publication-state${own?.is_public ? ' is-public' : ''}`}><i />{own?.is_public ? t('공개 중', 'Public') : t('아직 비공개', 'Private')}</div>
            <label>{t('공개 닉네임', 'Public name')}<input value={name} onChange={event => setName(event.target.value)} maxLength={40} required autoComplete="nickname" /></label>
            <label>{t('한 줄 소개', 'A little about your taste')}<textarea value={headline} onChange={event => setHeadline(event.target.value)} maxLength={160} rows={3} placeholder={t('밤에 듣는 R&B와 오래된 재즈를 좋아해요.', 'Late-night R&B, old jazz, and everything in between.')} /><small>{headline.length}/160</small></label>
            {snapshot && <div className="social-preview"><span>{t('공개 미리보기', 'Public preview')}</span><SocialConstellation snapshot={snapshot} label={t('공개할 취향 별자리', 'Taste constellation to publish')} /><GenreTags snapshot={snapshot} />
                <p>{snapshot.trackCount.toLocaleString()}{t('곡에서 읽은 장르 분포', ' songs behind this taste')}</p></div>}
            <label className="social-checkbox"><input type="checkbox" checked={includeTracks} onChange={event => setIncludeTracks(event.target.checked)} />{t('대표곡도 함께 공개', 'Include representative songs')}</label>
            <p className="social-disclosure">{t(`닉네임, 소개, 곡 수, 장르 분포${includeTracks ? `와 대표곡 최대 24곡` : ''}이 공개돼요. 공개 후 음악을 바꾸면 직접 업데이트해 주세요.`, `Your name, intro, song count, genre profile${includeTracks ? ' and up to 24 representative songs' : ''} will be public. Publish an update when your music changes.`)}</p>
            {!snapshot && <p className="social-inline-notice">{demo ? t('데모 지도는 공개할 수 없어요. 내 음악을 먼저 가져와 주세요.', 'Import your own music to publish a taste profile.') : t('내 음악을 먼저 가져와 주세요.', 'Import your music first.')} <Link to="/">{t('음악 가져오기', 'Import music')} ↗</Link></p>}
            {status === 'enriching' && <p className="social-inline-notice">{t('음악 분석이 끝나면 공개할 수 있어요.', 'You can publish when music analysis finishes.')}</p>}
            {isMock && <p>{t('실제 계정으로 로그인해 주세요.', 'Please sign in with a real account.')}</p>}
            <button className="social-primary" type="submit" disabled={pending || !snapshot || !name.trim() || isMock || status === 'enriching'}>{pending ? t('저장 중…', 'Saving…') : own?.is_public ? t('공개 취향 업데이트', 'Update public taste') : t('내 취향 공개하기', 'Publish my taste')}</button>
            {own?.is_public && <button className="social-secondary" type="button" onClick={unpublish} disabled={pending}>{t('공개 해제', 'Make private')}</button>}
            {own?.is_public && <Link className="social-own-link" to={`/social/${own.user_id}`}>{t('내 공개 페이지 보기', 'View my public page')} ↗</Link>}
        </form>}
        {error && <p role="alert" className="social-error">{error}</p>}{message && <p role="status" className="social-success">{message}</p>}
    </section>;
}

function CommentThread({ profile, en, onPrivate }) {
    const { user, isMock } = useAuth();
    const [comments, setComments] = useState([]), [name, setName] = useState(socialDisplayName(user));
    const [body, setBody] = useState(''), [error, setError] = useState(null), [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true), [pending, setPending] = useState(false), [deleting, setDeleting] = useState(null);
    const [more, setMore] = useState(false), [refresh, setRefresh] = useState(0);
    const request = useRef(null), mounted = useRef(false), offset = useRef(0);
    const t = (ko, english) => en ? english : ko;
    useEffect(() => {
        let cancelled = false; mounted.current = true; setLoading(true); setError(null);
        store.listComments(profile.user_id).then(rows => {
            if (cancelled) return;
            setComments(rows); offset.current = rows.length; setMore(rows.length === 30);
        }).catch(err => { if (!cancelled) setError(errorText(err, en)); }).finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; mounted.current = false; };
    }, [profile.user_id, refresh, en]);
    const submit = async event => {
        event.preventDefault(); if (pending) return;
        setPending(true); setError(null); setMessage('');
        const signature = JSON.stringify([profile.user_id, name.trim(), body.trim()]);
        if (request.current?.signature !== signature) request.current = { signature, id: crypto.randomUUID() };
        try {
            const row = await store.addComment(profile.user_id, { name, body, requestId: request.current.id });
            if (!mounted.current) return;
            if (!comments.some(comment => comment.id === row.id)) offset.current += 1;
            setComments(current => mergeRows([row], current)); setBody(''); request.current = null;
            setMessage(t('코멘트를 남겼어요.', 'Comment posted.'));
        } catch (err) {
            if (mounted.current) { setError(errorText(err, en)); if (err.message === 'SOCIAL_PRIVATE') onPrivate(); }
        } finally { if (mounted.current) setPending(false); }
    };
    const remove = async id => {
        setDeleting(id); setError(null);
        try { await store.deleteComment(id); if (mounted.current) { offset.current = Math.max(0, offset.current - 1); setComments(rows => rows.filter(row => row.id !== id)); setMessage(t('코멘트를 삭제했어요.', 'Comment deleted.')); } }
        catch (err) { if (mounted.current) setError(errorText(err, en)); } finally { if (mounted.current) setDeleting(null); }
    };
    const loadMore = async () => {
        setLoading(true); setError(null);
        try { const rows = await store.listComments(profile.user_id, offset.current); if (mounted.current) { setComments(current => mergeRows(current, rows)); offset.current += rows.length; setMore(rows.length === 30); } }
        catch (err) { if (mounted.current) setError(errorText(err, en)); } finally { if (mounted.current) setLoading(false); }
    };
    return <section className="social-comments" aria-labelledby="social-comments-title">
        <div className="social-section-heading"><h2 id="social-comments-title">{t('음악으로 나누는 이야기', 'Leave a little note')}</h2><button type="button" className="social-text-button" onClick={() => setRefresh(value => value + 1)} disabled={loading || pending}>{t('새로고침', 'Refresh')}</button></div>
        <p>{t('닮은 취향도, 처음 듣는 음악도 이야기해 보세요.', 'A shared favorite, a new discovery, a song to recommend.')}</p>
        {user && !isMock ? <form className="social-comment-form" onSubmit={submit}>
            <label>{t('공개 닉네임', 'Public name')}<input value={name} onChange={event => setName(event.target.value)} maxLength={40} required disabled={pending} /></label>
            <label>{t('코멘트', 'Comment')}<textarea aria-label={t('코멘트', 'Comment')} value={body} onChange={event => setBody(event.target.value)} maxLength={1000} rows={3} required disabled={pending} placeholder={t('이 취향에 추천하고 싶은 곡이 있나요?', 'Which song would you add to this taste?')} /></label>
            <div><small>{body.length}/1000</small><button className="social-primary" type="submit" disabled={pending || !body.trim() || !name.trim()}>{pending ? t('남기는 중…', 'Posting…') : t('코멘트 남기기', 'Post comment')}</button></div>
        </form> : <p className="social-login-note"><Link to={`/auth/login?returnTo=${encodeURIComponent(`/social/${profile.user_id}`)}`}>{t('로그인하고 코멘트 남기기', 'Sign in to leave a comment')} →</Link></p>}
        {error && <p role="alert" className="social-error">{error} <button type="button" onClick={() => setRefresh(value => value + 1)}>{t('다시 시도', 'Retry')}</button></p>}
        {message && <p role="status" className="social-success">{message}</p>}
        {!comments.length && !loading && !error && <p className="social-comment-empty">{t('첫 번째 이야기를 남겨 주세요.', 'Be the first to leave a note.')}</p>}
        <ol className="social-comment-list">{comments.map(comment => <li key={comment.id}>
            <div className="social-comment-meta"><i>{comment.author_name.slice(0, 1)}</i><strong>{comment.author_name}</strong><time dateTime={comment.created_at}>{new Date(comment.created_at).toLocaleDateString(en ? 'en-US' : 'ko-KR')}</time>
                {user && (comment.author_id === user.id || profile.user_id === user.id) && <button type="button" disabled={Boolean(deleting)} onClick={() => remove(comment.id)} aria-label={`${t('코멘트 삭제', 'Delete comment')}: ${comment.author_name}`}>{deleting === comment.id ? '…' : t('삭제', 'Delete')}</button>}</div><p>{comment.body}</p>
        </li>)}</ol>
        {loading && <p role="status">{t('이야기를 불러오는 중…', 'Loading notes…')}</p>}
        {more && <button type="button" className="social-secondary" disabled={loading} onClick={loadMore}>{t('이전 코멘트 더 보기', 'Load older comments')}</button>}
    </section>;
}

function ProfileDetail({ id, revision, en, onRefresh }) {
    const [state, setState] = useState({ loading: true, profile: null, error: null });
    const [retry, setRetry] = useState(0), [copied, setCopied] = useState(false), [copyError, setCopyError] = useState(false);
    const [revealedTrack, setRevealedTrack] = useState(null);
    const t = (ko, english) => en ? english : ko;
    useEffect(() => {
        if (!revealedTrack) return undefined;
        const target = document.getElementById(`social-track-${id}-${revealedTrack.id}`);
        target?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
        target?.querySelector('a')?.focus({ preventScroll: true });
        const timer = window.setTimeout(() => setRevealedTrack(null), 2600);
        return () => window.clearTimeout(timer);
    }, [revealedTrack, id]);
    useEffect(() => {
        let cancelled = false;
        store.getProfile(id).then(profile => { if (!cancelled) setState({ loading: false, profile: profile?.is_public ? profile : null, error: null }); })
            .catch(error => { if (!cancelled) setState({ loading: false, profile: null, error }); });
        return () => { cancelled = true; };
    }, [id, retry, revision]);
    if (state.loading) return <section className="social-detail" role="status">{t('취향을 불러오는 중…', 'Opening this taste…')}</section>;
    if (state.error) return <section className="social-detail"><p role="alert">{errorText(state.error, en)}</p><button className="social-secondary" onClick={() => setRetry(value => value + 1)}>{t('다시 시도', 'Retry')}</button></section>;
    if (!state.profile) return <section className="social-detail social-empty"><h2>{t('지금은 공개되지 않은 취향이에요', 'This taste is currently private')}</h2><p>{t('다른 사람들의 음악을 만나보세요.', 'There are more musical worlds to explore.')}</p><Link to="/social">{t('Social 둘러보기', 'Explore Social')} →</Link></section>;
    const profile = state.profile, snapshot = readSocialSnapshot(profile.snapshot);
    return <article className="social-detail">
        <div className="social-detail-visual"><SocialConstellation detailed snapshot={snapshot} label={t('공개 취향을 표현한 3D 별자리', '3D constellation of this public taste')} onRevealTrack={track => setRevealedTrack({ id: track.id })} /></div>
        <div className="social-detail-copy"><span className="social-section-kicker">PUBLIC TASTE</span><h1>{profile.display_name}{!en && '의 스펙트라'}</h1><p className="social-headline">{profile.headline}</p>
            <GenreTags snapshot={snapshot} limit={12} /><p className="social-data-caption">{snapshot.trackCount.toLocaleString()}{t('곡으로 이루어진 취향 · 태그 기반 장르 분포', ' songs · A genre profile based on music tags')}</p>
            <button className="social-text-button" onClick={async () => { setCopyError(false); try { await navigator.clipboard.writeText(`${window.location.origin}/social/${profile.user_id}`); setCopied(true); } catch { setCopied(false); setCopyError(true); } }}>{copied ? t('링크 복사됨', 'Link copied') : t('취향 링크 복사', 'Copy taste link')}</button>
            {copyError && <p role="alert" className="social-error">{t('복사하지 못했어요. 주소창의 링크를 복사해 주세요.', 'Could not copy. Please copy the link from your address bar.')}</p>}
            {snapshot.tracks.length > 0 && <section className="social-tracks"><h2>{t('이 취향을 들려주는 곡들', 'A few songs from this world')}</h2><ul>{snapshot.tracks.map(track => <li key={track.id} id={`social-track-${id}-${track.id}`} className={revealedTrack?.id === track.id ? 'is-revealed' : undefined}><span className="social-track-art">♪{track.coverUrl && <img src={track.coverUrl} alt="" loading="lazy" onError={event => { event.currentTarget.style.display = 'none'; }} />}</span><span><strong>{track.name}</strong><small>{track.artists}</small></span><a href={`https://open.spotify.com/search/${encodeURIComponent(`${track.artists} ${track.name}`)}`} target="_blank" rel="noopener noreferrer" aria-label={`${track.name} · Spotify`}>↗</a></li>)}</ul></section>}
            <CommentThread key={id} profile={profile} en={en} onPrivate={() => { setState({ loading: false, profile: null, error: null }); onRefresh(); }} />
        </div>
    </article>;
}

export default function SocialPage() {
    const { profileId } = useParams(), navigate = useNavigate();
    const { lang } = useLocale(), en = lang === 'en', t = (ko, english) => en ? english : ko;
    const { user } = useAuth();
    const [own, setOwn] = useState(null), [ownReady, setOwnReady] = useState(!user), [ownError, setOwnError] = useState(null);
    const [rows, setRows] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState(null);
    const [more, setMore] = useState(false), [refresh, setRefresh] = useState(0), [notice, setNotice] = useState('');
    const offset = useRef(0), active = useRef(false);
    useEffect(() => {
        let cancelled = false; active.current = true; setLoading(true); setError(null);
        store.listProfiles().then(data => { if (!cancelled) { setRows(data); offset.current = data.length; setMore(data.length === SOCIAL_PAGE_SIZE); } })
            .catch(err => { if (!cancelled) setError(err); }).finally(() => { if (!cancelled) setLoading(false); });
        if (user) {
            setOwnReady(false); setOwnError(null);
            store.getProfile(user.id).then(data => { if (!cancelled) setOwn(data); }).catch(err => { if (!cancelled) setOwnError(err); })
                .finally(() => { if (!cancelled) setOwnReady(true); });
        }
        return () => { cancelled = true; active.current = false; };
    }, [user, refresh]);
    const loadMore = async () => {
        setLoading(true); setError(null);
        try { const data = await store.listProfiles(offset.current); if (active.current) { setRows(current => mergeRows(current, data)); offset.current += data.length; setMore(data.length === SOCIAL_PAGE_SIZE); } }
        catch (err) { if (active.current) setError(err); } finally { if (active.current) setLoading(false); }
    };
    const published = profile => { setOwn(profile); setRows(current => [profile, ...current.filter(row => row.user_id !== profile.user_id)]); setNotice(t('내 취향이 공개됐어요.', 'Your taste is now public.')); };
    const unpublished = () => { setOwn(current => ({ ...current, is_public: false })); setRows(current => current.filter(row => row.user_id !== user.id)); setNotice(t('공개를 해제했어요.', 'Your taste is now private.')); if (profileId === user.id) navigate('/social'); };
    return <main className="social-page">
        <header className="social-header"><Link to="/" aria-label="SPECTRA home"><SpectraLogo decorative /></Link><nav aria-label={t('서비스 메뉴', 'App menu')}><Link to="/taste-map">{t('내 지도', 'My map')}</Link><Link to="/social" aria-current="page">Social<span /></Link></nav><div><LanguageSwitcher /><span className="social-help-action"><HelpCenter inMenu /></span><AccountButton /></div></header>
        <div className="social-shell"><div className="social-main">
            {notice && <p role="status" className="social-success">{notice}</p>}
            {profileId ? <><Link className="social-back" to="/social">← {t('모든 취향 보기', 'All tastes')}</Link><ProfileDetail key={profileId} id={profileId} revision={profileId === own?.user_id ? own.updated_at : null} en={en} onRefresh={() => setRefresh(value => value + 1)} /></> : <>
                <section className="social-hero"><span className="social-section-kicker">SPECTRA / SOCIAL</span><h1 className="social-hero-title">{t('서로의 스펙트라에는', 'What music fills')}<br /><span>{t('어떤 음악이 담겨 있을까요?', 'each other’s Spectra?')}</span></h1><p>{t('누군가의 취향을 들여다보고, 음악으로 이야기를 시작해 보세요.', 'Step into someone’s music taste. Find a song, start a conversation.')}</p><a className="social-publish-shortcut" href="#social-my-taste">{own?.is_public ? t('내 공개 설정', 'My publication') : t('내 취향 공개하기', 'Share my taste')} ↗</a><div className="social-hero-orbits" aria-hidden="true"><i /><i /><i /><span>✳</span></div></section>
                <div className="social-section-heading"><h2>{t('지금 공개된 취향', 'Open worlds')}</h2><button className="social-text-button" onClick={() => setRefresh(value => value + 1)} disabled={loading}>{t('새로고침', 'Refresh')} ↻</button></div>
                {error && <div className="social-error" role="alert">{errorText(error, en)} <button onClick={() => setRefresh(value => value + 1)}>{t('다시 시도', 'Retry')}</button></div>}
                {!loading && !error && !rows.length && <section className="social-empty"><span>✳</span><h2>{t('첫 번째 취향을 기다리고 있어요', 'The first world could be yours')}</h2><p>{t('내 음악을 공개하고 첫 대화를 시작해 보세요.', 'Publish your music taste and open the first conversation.')}</p></section>}
                <div className="social-feed">{rows.map(profile => <ProfileCard key={profile.user_id} profile={profile} en={en} />)}</div>
                {loading && <div className="social-loading" role="status">{t('새로운 취향을 불러오는 중…', 'Finding musical worlds…')}</div>}
                {more && <button className="social-secondary social-load-more" disabled={loading} onClick={loadMore}>{t('취향 더 둘러보기', 'Explore more tastes')}</button>}
            </>}
        </div><aside className="social-sidebar" id="social-my-taste">{ownError ? <section className="social-publish"><p role="alert">{errorText(ownError, en)}</p><button className="social-secondary" onClick={() => setRefresh(value => value + 1)}>{t('다시 시도', 'Retry')}</button></section>
            : ownReady ? <PublishPanel key={`${user?.id || 'guest'}-${own?.updated_at || 'new'}`} own={own} en={en} onPublished={published} onUnpublished={unpublished} /> : <p role="status">{t('내 공개 설정을 불러오는 중…', 'Loading your publication…')}</p>}
        </aside></div>
        <nav className="social-mobile-nav" aria-label={t('모바일 음악 메뉴', 'Mobile music menu')}>
            {mobileMusicTabs(lang).map(item => <Link key={item.id} to={item.href} aria-current={item.id === 'social' ? 'page' : undefined}><MobileMusicIcon name={item.icon} />{item.label}</Link>)}
        </nav>
    </main>;
}
