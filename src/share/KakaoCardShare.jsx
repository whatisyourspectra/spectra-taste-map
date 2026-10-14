import { useEffect, useState } from 'react';
import { kakaoShareConfigured, loadKakaoShare, prepareKakaoCard, kakaoShareError } from './kakaoShare';
export default function KakaoCardShare({ file, title }) {
    const [prepared, setPrepared] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => { if (kakaoShareConfigured) loadKakaoShare().catch(() => {}); }, []);
    const share = async () => {
        if (busy) return;
        if (prepared) {
            try { prepared.kakao.Share.sendDefault(prepared.settings); }
            catch { setError('카카오톡을 열지 못했어요. 잠시 후 다시 시도해 주세요.'); }
            return;
        }
        setBusy(true); setError('');
        try { setPrepared(await prepareKakaoCard(file, title)); }
        catch (error) { setError(kakaoShareError(error)); }
        finally { setBusy(false); }
    };
    return <div className="kakao-card-share">
        <button type="button" disabled={busy || !kakaoShareConfigured} onClick={share}>{busy ? '카드 준비 중…' : prepared ? '카카오톡 열기' : '카카오톡 공유 준비'}</button>
        <p>{!kakaoShareConfigured ? '카카오톡 공유 연결을 준비 중이에요. 이미지 저장과 기기 공유는 이용할 수 있어요.' : '준비를 누르면 카드 이미지가 카카오에 업로드됩니다. 이후 카카오톡을 열어 보낼 대화방을 선택하세요.'}</p>
        {error && <p role="alert">{error}</p>}
    </div>;
}
