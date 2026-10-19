import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMobileMapModel, mobileDiscoveryQuery } from '../src/taste/mobileMapModel.js';

test('personal map keeps every imported song and produces finite, stable genre positions', () => {
 const songs=Array.from({length:2000},(_,i)=>({id:`song-${i}`,name:`Song ${i}`,artists:`Artist ${i%19}`,genres:i%3?['indie','dream pop']:['jazz'],valence:i%2?0:NaN,energy:Infinity,metadataPending:i%7===0}));
 const before=JSON.stringify(songs);
 const a=buildMobileMapModel(songs),b=buildMobileMapModel([...songs].reverse());
 assert.equal(a.library.length,2000);
 const reordered=new Map(b.library.map(t=>[t.id,t]));
 for(const track of a.library){assert.ok(Number.isFinite(track.x)&&track.x>=0&&track.x<=1);assert.ok(Number.isFinite(track.y)&&track.y>=0&&track.y<=1);assert.deepEqual(track,reordered.get(track.id));}
 assert.equal(JSON.stringify(songs),before);
 assert.ok(a.library.every(t=>!t.mapRecommended));
 assert.ok(new Set(a.library.filter(t=>t.metadataPending).map(t=>`${t.x},${t.y}`)).size>200);
 assert.deepEqual(a.genres,b.genres);
});
test('discovery cannot duplicate a library song through a different provider ID', () => {
 const library=[{id:'spotify-a',name:'Movie',artists:'Tom Misch',genres:['jazz'],valence:.4,energy:.6}];
 const candidates=[{id:'lastfm-a',name:' MOVIE ',artists:'tom misch'},{id:'new',name:'South of the River',artists:'Tom Misch',genres:['jazz']},{id:'new-2',name:'South of the River',artists:'Tom Misch',genres:['jazz']}];
 const baseline=buildMobileMapModel(library),discovered=buildMobileMapModel(library,candidates);
 assert.deepEqual(discovered.library,baseline.library);
 assert.equal(discovered.recommendations.length,1);assert.equal(discovered.recommendations[0].mapRecommended,true);
 assert.equal(discovered.recommendations[0].mapColor,baseline.library[0].mapColor);
});
test('featureless and untagged imports remain explorable with honest grouping', () => {
 const model=buildMobileMapModel([{id:'a',name:'Pending',artists:'Artist',metadataPending:true},{id:'b',name:'No tags',artists:'Artist'}]);
 assert.equal(model.library[0].mapGroup,'분석 중인 곡');assert.equal(model.library[1].mapGroup,'더 알아가는 음악');
 assert.deepEqual(buildMobileMapModel([]),{genres:[],library:[],recommendations:[]});
});
test('discovery uses the selected song, preserves zero features and safely encodes artists', () => {
 const params=new URLSearchParams(mobileDiscoveryQuery({name:'R&B / Night',artists:'A & B',genres:['jazz'],valence:0,energy:1},'spotify'));
 assert.equal(params.get('targetX'),'0');assert.equal(params.get('targetY'),'1');assert.equal(params.get('seedTracks'),'A & B|R&B / Night');assert.equal(params.get('source'),'spotify');
 assert.equal(new URLSearchParams(mobileDiscoveryQuery({name:'Unknown',artists:'Artist',valence:NaN})).get('targetX'),'0.5');assert.equal(mobileDiscoveryQuery(null),'');
});

test('adding songs with existing genres does not rearrange the existing map when genre counts change', () => {
 const songs=[{id:'a',name:'Dream',artists:'Artist',genres:['dream pop','indie']},{id:'b',name:'Jazz',artists:'Artist',genres:['jazz','soul']}];
 const before=buildMobileMapModel(songs).library;
 const after=buildMobileMapModel([...songs,{id:'c',name:'New Jazz',artists:'Artist',genres:['jazz','soul']}]).library;
 assert.deepEqual(after.slice(0,2),before);
});
