// TuneMyMusic CSV/TSV/TXT/JSON reader. Never guesses musical genres or features.
const clean = value => String(value ?? '').replace(/^\uFEFF/, '').trim();
const headerKey = value => clean(value).toLowerCase().replace(/[\s_.-]+/g, '');
export const importTrackKey = track => `${clean(track.artist || track.artists).toLowerCase()}|${clean(track.title || track.name).toLowerCase()}`;
function table(text, delimiter) {
    const rows = []; let row = [], field = '', quoted = false;
    for (let i=0;i<text.length;i++) {
        const char=text[i];
        if(char==='"') {if(quoted && text[i+1]==='"'){field+='"';i++;}else if(quoted || !field.trim()) quoted=!quoted;else field+=char;}
        else if(!quoted && char===delimiter){row.push(clean(field));field='';}
        else if(!quoted && char==='\n'){row.push(clean(field));if(row.some(Boolean))rows.push(row);row=[];field='';}
        else field+=char;
    }
    row.push(clean(field));if(row.some(Boolean))rows.push(row);
    return {rows, malformed:quoted};
}
function objectTracks(value) {
    if(Array.isArray(value)) return value.flatMap(objectTracks);
    if(!value || typeof value!=='object') return [];
    if(value.track && typeof value.track==='object') return objectTracks(value.track);
    for(const key of ['tracks','items','playlists']) if(Array.isArray(value[key]) || value[key]?.items) return objectTracks(value[key]);
    const artists=value.artist || value.artists || value['Artist name'];
    return [{artist:Array.isArray(artists)?artists.map(a=>a.name || a).join(', '):artists?.name || artists,
        title:value.title || value.name || value['Track name'],album:value.album?.name || value.album,
        spotifyId:value.spotifyId || value['Spotify - id'] || (value.type==='track'?value.id:undefined),isrc:value.isrc || value.external_ids?.isrc}];
}
export function parseTrackListDetailed(raw) {
    const text=clean(raw).replace(/\r\n?/g,'\n');
    const report={tracks:[], totalRows:0, duplicates:0, skipped:0, warnings:[], format:'txt'};
    if(!text)return report;
    const seen=new Set();
    const push=track=>{
        report.totalRows++;
        const artist=clean(track.artist),title=clean(track.title);
        if(!artist || !title){report.skipped++;return;}
        const key=importTrackKey({artist,title});if(seen.has(key)){report.duplicates++;return;}seen.add(key);
        const item={artist,title,album:clean(track.album),addedAt:track.addedAt || null};
        if(/^[A-Za-z0-9]{22}$/.test(clean(track.spotifyId)))item.spotifyId=clean(track.spotifyId);
        if(track.isrc)item.isrc=clean(track.isrc);
        report.tracks.push(item);
    };
    if(text.startsWith('[') || text.startsWith('{')) {
        try {const value=JSON.parse(text);objectTracks(value).forEach(push);report.format='json';return report;}
        catch {if(text.startsWith('{')){report.warnings.push('JSON 형식이 올바르지 않습니다.');return report;}}
    }
    const titleHeaders=['trackname','tracktitle','songname','songtitle','title','name','track','곡명','제목'];
    const artistHeaders=['artistname','artistnames','artists','artist','아티스트','가수'];
    const candidates=[',','\t',';'].map(delimiter=>{const parsed=table(text,delimiter);let header=-1,artist=-1,title=-1;
        for(let i=0;i<Math.min(12,parsed.rows.length);i++){const keys=parsed.rows[i].map(headerKey);const a=keys.findIndex(k=>artistHeaders.includes(k)),t=keys.findIndex(k=>titleHeaders.includes(k));if(a>=0&&t>=0){header=i;artist=a;title=t;break;}}
        return {...parsed,delimiter,header,artist,title};});
    const match=candidates.find(candidate=>candidate.header>=0);
    if(match){report.format=match.delimiter==='\t'?'tsv':'csv';const headers=match.rows[match.header].map(headerKey);
        const col=names=>headers.findIndex(key=>names.includes(key));
        for(const row of match.rows.slice(match.header+1))push({artist:row[match.artist],title:row[match.title],album:row[col(['album','albumname','アルバム','앨범'])],addedAt:row[col(['addedat','dateadded','addeddate'])],spotifyId:row[col(['spotifyid','spotifytrackid'])],isrc:row[col(['isrc'])]});
        if(match.malformed)report.warnings.push('닫히지 않은 따옴표가 있습니다. 원본 내보내기 파일을 확인해 주세요.');
    }else{
        for(const line of text.split('\n').map(clean).filter(Boolean)){
            const dash=line.match(/^(.*?)\s+[-–—]\s+(.+)$/);
            if(line.includes('\t')){const [artist,title]=line.split('\t');push({artist,title});}
            else if(dash)push({artist:dash[1],title:dash[2]});
            else {const cells=table(line,',').rows[0] || [];if(cells.length>=2)push({artist:cells[0],title:cells[1],album:cells[2]});else {report.totalRows++;report.skipped++;}}
        }
    }
    if(report.skipped)report.warnings.push(`${report.skipped}개 행에서 아티스트·곡명을 확인하지 못했어요.`);
    return report;
}
export function parseTrackList(raw) {return parseTrackListDetailed(raw).tracks;}
export async function readTrackFile(file) {
    const bytes=new Uint8Array(await file.arrayBuffer());
    if(bytes.length>10*1024*1024)throw new Error('파일이 너무 큽니다. 10MB 이하의 곡 목록을 선택해 주세요.');
    let encoding='utf-8';
    if(bytes[0]===255&&bytes[1]===254)encoding='utf-16le';
    else if(bytes[0]===254&&bytes[1]===255)encoding='utf-16be';
    else if(bytes.slice(0,200).filter((value,index)=>index%2===1&&value===0).length>20)encoding='utf-16le';
    return new TextDecoder(encoding).decode(bytes);
}
