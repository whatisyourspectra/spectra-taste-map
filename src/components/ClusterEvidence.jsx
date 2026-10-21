import { getClusterEvidence } from '../taste/clusterEvidence.js';
import './ClusterEvidence.css';

export default function ClusterEvidence({ cluster, source, lang = 'ko', onSelectTrack, onClose, compact = false }) {
    if (!cluster) return null;
    const en = lang === 'en';
    const evidence = getClusterEvidence(cluster, source);
    return <section className={`tm-cluster-evidence${compact ? ' is-compact' : ''}`} aria-label={en ? 'About this region' : '이 영역의 분류 근거'}>
        <header><div><span>{en ? 'ABOUT THIS REGION' : '이 영역을 이루는 음악'}</span><h3>{cluster.label.name}</h3></div>{onClose && <button type="button" aria-label={en ? 'Close region details' : '영역 설명 닫기'} onClick={onClose}>×</button>}</header>
        <p>{source === 'spotify' ? (en ? 'Grouped using Spotify artist genres.' : 'Spotify의 아티스트 장르를 바탕으로 묶었어요.') : (en ? 'Grouped using Last.fm track and artist tags.' : 'Last.fm의 곡·아티스트 태그를 바탕으로 묶었어요.')}</p>
        {evidence.nickname && <small>{en ? 'Region nickname' : '영역 별칭'} · {evidence.nickname}</small>}
        <div className="tm-cluster-evidence-tags">{evidence.genres.map(item => <span key={item.genre}>{item.label}<b>{item.count}</b></span>)}</div>
        {!evidence.genres.length && <p>{en ? 'There is not enough genre information to name this region.' : '장르 정보가 부족해 구체적인 이름을 붙이지 못했어요.'}</p>}
        {evidence.examples.length > 0 && <div className="tm-cluster-evidence-examples"><strong>{en ? 'Representative songs' : '이 영역의 대표곡'}</strong>{evidence.examples.map(track => onSelectTrack ? <button type="button" key={track.id} onClick={() => onSelectTrack(track)}><span>{track.name}</span><small>{track.artists}</small></button> : <p key={track.id}>{track.name}<small>{track.artists}</small></p>)}</div>}
        <details><summary>{en ? 'How to read the map' : '점·색·선은 무엇인가요?'}</summary><p>{en ? 'Each point is a song. Colors distinguish regions. Constellation lines connect nearby points in the layout to help you explore.' : '점 하나는 한 곡, 색은 취향 영역을 구분해요. 별자리의 선은 화면에서 가까운 곡들을 연결한 탐색 경로예요.'}</p><p>{en ? 'Genres can overlap. This view reflects the available metadata, which can differ between fields.' : '한 곡에 여러 장르가 겹칠 수 있어요. 뷰마다 사용하는 정보가 달라 영역의 구성이 달라질 수 있어요.'}</p></details>
    </section>;
}
