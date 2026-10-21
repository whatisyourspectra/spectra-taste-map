import { translate } from '../i18n/translate.js';
import { useEffect, useRef, useState } from 'react';
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
    const lock = useRef(false);
    const cardReady = prepared?.file === file;
    useEffect(() => { if (kakaoShareConfigured) loadKakaoShare().catch(() => {}); }, []);
    const share = async () => {
        if (lock.current) return;
        lock.current = true;
        setBusy(true); setError('');
        try {
            if (cardReady) {
                try { prepared.kakao.Share.sendDefault(prepared.settings); }
                catch { setError('카카오톡을 열지 못했어요. 잠시 후 다시 시도해 주세요.'); }
                return;
            }
            let id = shareId;
            if (shareMap && !id) { setStage('공유 지도 저장 중…'); id = await publishSharedMap(tracks, {title, style, genres}); setShareId(id); }
            setStage('카카오 카드 업로드 중…');
            setPrepared({ ...await prepareKakaoCard(file, title, shareMap ? id : null), file });
        }
        catch (error) { setError(error.message === 'SHARE_AUTH_TIMEOUT' ? '로그인 상태 확인이 지연되고 있어요. 새로고침 후 다시 시도해 주세요.' : error.message === 'SHARE_DATABASE_TIMEOUT' ? '공유 지도 저장 응답이 지연되고 있어요. 연결을 확인하고 다시 시도해 주세요.' : error.message === 'SHARE_LOGIN_REQUIRED' ? '지도를 공유하려면 먼저 로그인해 주세요. 로그인 후 다시 공유해 주세요.' : error.message === 'SHARE_STORAGE_UNAVAILABLE' ? '공유 지도 저장소에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.' : kakaoShareError(error)); }
        finally { setBusy(false); lock.current = false; }
    };
    const sharedUrl = prepared?.settings?.content?.link?.webUrl;
    const copyLink = async () => {
        try { await navigator.clipboard.writeText(sharedUrl); setCopied(true); }
        catch { setError('링크를 복사하지 못했어요. 지도 직접 보기를 눌러 주소를 복사해 주세요.'); }
    };
    const revoke = async () => {
        if (lock.current) return;
        lock.current = true;
        setBusy(true); setError('');
        try { await revokeSharedMap(shareId); setShareId(null); setPrepared(null); setCopied(false); }
        catch { setError('공유를 해제하지 못했어요. 다시 시도해 주세요.'); }
        finally { setBusy(false); lock.current = false; }
    };
    return <div className="kakao-card-share">
        <div className="kakao-share-intro"><h3>{shareMap ? translate("친구에게 내 지도 보내기") : translate("카카오톡으로 카드 보내기")}</h3><p>{cardReady ? translate("준비됐어요. 카카오톡에서 보낼 대화방을 선택하세요.") : translate("카드를 먼저 준비한 뒤 카카오톡을 열어주세요.")}</p></div>
        {shareMap && !shareId && <p className="kakao-share-disclosure">{translate("공유 준비 시 최대 2,000곡의 제목·아티스트·이미지·좌표가 담긴 지도 링크가 만들어져요. 링크를 받은 누구나 볼 수 있어요.")}</p>}
        {shareId && <p className="kakao-share-status" role="status"><span aria-hidden="true">✓</span> {translate("친구가 둘러볼 지도 링크가 만들어졌어요.")}</p>}
        <button className="kakao-share-primary" type="button" disabled={busy || !kakaoShareConfigured} onClick={share}>{busy ? translate(stage) || translate("처리 중…") : cardReady ? translate("카카오톡 열기") : translate("카카오톡 공유 준비")}</button>
        {sharedUrl && shareMap && <div className="share-map-link-actions">
            <a href={sharedUrl} target="_blank" rel="noopener noreferrer">{translate("지도 직접 보기 ↗")}</a>
            <button type="button" onClick={copyLink}>{copied ? translate("링크 복사됨") : translate("지도 링크 복사")}</button>
        </div>}
        <p className="kakao-share-hint">{!kakaoShareConfigured ? translate("카카오톡 연결을 준비 중이에요. 이미지 저장과 기기 공유는 이용할 수 있어요.") : cardReady ? translate("카드와 ‘친구의 취향 구경하기’ 버튼에서 내 지도가 열려요.") : translate("공유 준비 시 카드 이미지가 카카오에 업로드돼요.")}</p>
        {error && <p className="kakao-share-error" role="alert">{translate(error)}</p>}
        {shareId && <details className="share-map-settings"><summary>{translate("이 지도의 공유 설정")}</summary><div className="share-map-current"><p>{translate("공유를 해제하면 기존 링크로 지도를 볼 수 없어요.")}</p><button className="share-map-revoke" type="button" disabled={busy} onClick={revoke}>{translate("지도 공유 해제")}</button></div></details>}
        <SharedMapManager refreshId={shareId} excludeId={shareId} onRevoked={id => { if (id === shareId) {setShareId(null); setPrepared(null); setCopied(false);} }} />
    </div>;
}
