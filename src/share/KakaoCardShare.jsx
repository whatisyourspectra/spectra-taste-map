import { useEffect, useState } from 'react';
import SharedMapManager from './SharedMapManager';
import { publishSharedMap, revokeSharedMap } from './sharedMapStorage';
import { kakaoShareConfigured, loadKakaoShare, prepareKakaoCard, kakaoShareError } from './kakaoShare';
export default function KakaoCardShare({ file, title, tracks = [], style = 'constellation', genres = [] }) {
    const [prepared, setPrepared] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [stage, setStage] = useState('');
    const [copied, setCopied] = useState(false);
    const shareMap = tracks.length > 0;
    const [shareId, setShareId] = useState(null);
    useEffect(() => { if (kakaoShareConfigured) loadKakaoShare().catch(() => {}); }, []);
    const share = async () => {
        if (busy) return;
        if (prepared) {
            try { prepared.kakao.Share.sendDefault(prepared.settings); }
            catch { setError('카카오톡을 열지 못했어요. 잠시 후 다시 시도해 주세요.'); }
            return;
        }
        setBusy(true); setError('');
        try {
            let id = shareId;
            if (shareMap && !id) { setStage('공유 지도 저장 중…'); id = await publishSharedMap(tracks, {title, style, genres}); setShareId(id); }
            setStage('카카오 카드 업로드 중…');
            setPrepared(await prepareKakaoCard(file, title, shareMap ? id : null));
        }
        catch (error) { setError(error.message === 'SHARE_AUTH_TIMEOUT' ? '로그인 상태 확인이 지연되고 있어요. 새로고침 후 다시 시도해 주세요.' : error.message === 'SHARE_DATABASE_TIMEOUT' ? '공유 지도 저장 응답이 지연되고 있어요. 연결을 확인하고 다시 시도해 주세요.' : error.message === 'SHARE_LOGIN_REQUIRED' ? '지도를 공유하려면 먼저 로그인해 주세요. 로그인 후 다시 공유해 주세요.' : error.message === 'SHARE_STORAGE_UNAVAILABLE' ? '공유 지도 저장소에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.' : kakaoShareError(error)); }
        finally { setBusy(false); }
    };
    const sharedUrl = prepared?.settings?.content?.link?.webUrl;
    const copyLink = async () => {
        try { await navigator.clipboard.writeText(sharedUrl); setCopied(true); }
        catch { setError('링크를 복사하지 못했어요. 지도 직접 보기를 눌러 주소를 복사해 주세요.'); }
    };
    const revoke = async () => {
        setBusy(true); setError('');
        try { await revokeSharedMap(shareId); setShareId(null); setPrepared(null); }
        catch { setError('공유를 해제하지 못했어요. 다시 시도해 주세요.'); }
        finally { setBusy(false); }
    };
    return <div className="kakao-card-share">
        {shareMap && <p>공유 준비를 누르면 카드와 함께 친구가 탐색할 지도 링크가 자동으로 만들어집니다. 최대 2,000곡의 제목·아티스트·이미지·좌표가 공개되며, 링크를 받은 누구나 볼 수 있어요.</p>}
        {shareId && <button type="button" disabled={busy} onClick={revoke}>지도 공유 해제</button>}
        <button type="button" disabled={busy || !kakaoShareConfigured} onClick={share}>{busy ? stage || '처리 중…' : prepared ? '카카오톡 열기' : '카카오톡 공유 준비'}</button>
        {prepared && shareMap && <div className="share-map-link-actions">
            <a href={sharedUrl} target="_blank" rel="noopener noreferrer">지도 직접 보기 ↗</a>
            <button type="button" onClick={copyLink}>{copied ? '링크 복사됨' : '지도 링크 복사'}</button>
        </div>}
        {prepared && shareMap && <p>카드와 ‘친구의 취향 구경하기’ 버튼을 누르면 같은 공유 지도가 열립니다.</p>}
        <p>{!kakaoShareConfigured ? '카카오톡 공유 연결을 준비 중이에요. 이미지 저장과 기기 공유는 이용할 수 있어요.' : '준비를 누르면 카드 이미지가 카카오에 업로드됩니다. 이후 카카오톡을 열어 보낼 대화방을 선택하세요.'}</p>
        {error && <p role="alert">{error}</p>}
        <SharedMapManager refreshId={shareId} onRevoked={id => { if (id === shareId) {setShareId(null); setPrepared(null);} }} />
    </div>;
}
