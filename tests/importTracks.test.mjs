import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTrackList, parseTrackListDetailed, readTrackFile } from '../src/utils/parseTrackList.js';
import { pendingImportTrack, mergeImportedTracks } from '../src/utils/importTracks.js';
test('TuneMyMusic CSV handles BOM, commas, escaped quotes, multiline fields and Spotify IDs',()=>{
 const rows=parseTrackList('\ufeffTrack name,Artist name,Album,Spotify - id\r\n"Song, A","Artist ""B""","Album\nName",2SLwbpExuoBDZBpjfefCtV\r\n');
 assert.equal(rows.length,1);assert.equal(rows[0].title,'Song, A');assert.equal(rows[0].artist,'Artist "B"');assert.equal(rows[0].album,'Album\nName');assert.equal(rows[0].spotifyId,'2SLwbpExuoBDZBpjfefCtV');
});
test('semicolon CSV, TSV and reordered columns import consistently',()=>{
 for(const delimiter of [';', '\t', ',']){const rows=parseTrackList(['Album','Artist Name','Track Name'].join(delimiter)+'\n'+['Album','Artist','Song'].join(delimiter));assert.equal(rows[0].artist,'Artist');assert.equal(rows[0].title,'Song');}
});
test('TXT handles Unicode, CRLF, duplicate rows and reports unreadable rows',()=>{
 const result=parseTrackListDetailed('落日飛車 - Believe U\r\n落日飛車 - Believe U\nUnusable heading\nBeach House — Space Song');assert.equal(result.tracks.length,2);assert.equal(result.duplicates,1);assert.equal(result.skipped,1);assert.ok(result.warnings.length);
});
test('JSON playlist and Spotify nested item exports are supported',()=>{
 const rows=parseTrackList(JSON.stringify({playlists:[{tracks:[{track:{type:'track',name:'Song',artists:[{name:'Artist'}],album:{name:'Album'},id:'2SLwbpExuoBDZBpjfefCtV'}}]}]}));assert.equal(rows.length,1);assert.equal(rows[0].album,'Album');
});
test('UTF-16 file is decoded before parsing',async()=>{
 const bytes=Buffer.concat([Buffer.from([255,254]),Buffer.from('Artist - Song','utf16le')]);assert.equal(parseTrackList(await readTrackFile(new Blob([bytes])))[0].title,'Song');
});
test('failed enrichment retains real names and no invented genres; corrected metadata replaces its original',()=>{
 const input={artist:'The Weeknd',title:'Out of Time',album:'Dawn FM'};const pending=pendingImportTrack(input);assert.equal(pending.name,input.title);assert.equal(pending.artists,input.artist);assert.deepEqual(pending.genres,[]);assert.equal(pending.metadataPending,true);
 const collected=new Map([[pending.importKey,pending]]);mergeImportedTracks(collected,[{id:'spotify-id',importKey:pending.importKey,name:'Out of Time (Remastered)',artists:'The Weeknd',featuresSource:'lastfm'}]);assert.equal(collected.size,1);assert.equal([...collected.values()][0].metadataPending,false);assert.equal([...collected.values()][0].id,'spotify-id');
});
