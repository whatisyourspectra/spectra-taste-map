import { useTasteData } from '../context/TasteDataContext';
import { useAuth } from '../auth/AuthContext';
import { isDemoTaste } from '../taste/tasteStorage';
import './TasteSaveStatus.css';

export default function TasteSaveStatus() {
    const { user } = useAuth();
    const { tracks, stats, cloudSaveStatus, retryCloudSync, retryImportAnalysis } = useTasteData();
    if (isDemoTaste({ tracks, stats })) return null;
    if (!user && !Number(stats?.metadataPendingCount)) return null;
    if (!tracks.length && cloudSaveStatus !== 'error') return null;
    const message = cloudSaveStatus === 'saved' ? '계정에 저장됨'
        : cloudSaveStatus === 'saving' ? '계정에 저장 중…'
            : cloudSaveStatus === 'error' ? '계정 동기화 실패'
                : stats?.backgroundEnriching ? '브라우저에 저장됨 · 분석 후 계정에 저장해요' : '브라우저에 저장됨';
    const pending = Number(stats?.metadataPendingCount) || 0;
    return <div className={`taste-save-status ${cloudSaveStatus}`} role="status">
        <span>{message}{pending > 0 ? ` · ${pending}곡 분석 ${stats?.backgroundEnriching ? '중' : '대기'}` : ''}</span>
        {pending > 0 && !stats?.backgroundEnriching && <button type="button" onClick={retryImportAnalysis}>분석 다시 시도</button>}
        {cloudSaveStatus === 'error' && <button type="button" onClick={retryCloudSync}>다시 시도</button>}
    </div>;
}
