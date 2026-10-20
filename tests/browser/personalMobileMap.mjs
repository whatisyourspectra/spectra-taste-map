// Local fixture data only. No production accounts or API quota are used.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium }=await import(process.env.PLAYWRIGHT_MODULE || process.argv.find(a=>a.startsWith('--playwright='))?.slice(13) || 'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE || process.argv.find(a=>a.startsWith('--chrome='))?.slice(9) || undefined});
const base=process.env.BASE_URL || 'http://127.0.0.1:5194',out='output/review/personal-mobile-map';await mkdir(out,{recursive:true});
const library=count=>Array.from({length:count},(_,i)=>({id:`personal-${i}`,name:['Sunsetz','Space Song','The Less I Know the Better','Movie','Show Me How','Get Lucky'][i%6]+(i>5?` ${i+1}`:''),artists:['Cigarettes After Sex','Beach House','Tame Impala','Tom Misch','Men I Trust','Daft Punk'][i%6],genres:i%3===0?['dream pop','indie']:i%3===1?['jazz','soul']:['electronic'],valence:(i*73%100)/100,energy:(i*31%100)/100,coverUrl:`/demo-covers/${['cigarettes-after-sex','depression-cherry','currents','geography','show-me-how','discovery'][i%6]}.jpg`}));
const recommendation={id:'new-recommendation',name:'South of the River',artists:'Tom Misch',genres:['jazz','soul'],valence:.7,energy:.65,coverUrl:'/demo-covers/geography.jpg'};
const errors=[],findings=[];
async function open(size={width:390,height:844},count=69,route='/taste-map'){
 const page=await browser.newPage({viewport:size,isMobile:size.width<1000,hasTouch:true});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({tracks})=>{if (!sessionStorage.getItem('spectra:taste:v5')) sessionStorage.setItem('spectra:taste:v5',JSON.stringify({tracks,mapId:'personal-mobile-test',featuresSource:'lastfm',updatedAt:new Date().toISOString(),stats:{isDemo:false,totalAvailable:tracks.length,processedCount:tracks.length}}));},{tracks:library(count)});
 await page.route(/\/src\/auth\/supabaseClient\.js(?:\?.*)?$/,r=>r.fulfill({contentType:'application/javascript',body:'export const supabase=null;export function finishGoogleLogin(){return Promise.reject();}'}));
 const calls=[];await page.route('**/api/discover?**',r=>{calls.push(r.request().url());return r.fulfill({json:{tracks:[recommendation]}});});
 await page.goto(base+route);await page.locator(size.width <= 900 ? '.mobile-taste-map' : '.tm-root').waitFor();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(400);
 return {page,calls};
}
try{
 for(const size of [{width:390,height:844},{width:320,height:640},{width:430,height:932}]){
  const {page,calls}=await open(size);
  assert.equal(calls.length,0,'No automatic recommendation request on arrival');
  assert.equal(await page.locator('.tm-root').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.ok((await page.locator('.public-map-stage').boundingBox()).height>200);
  assert.equal(await page.locator('.mtm-bottom-nav').isVisible(),true);
  await page.screenshot({path:`${out}/map-${size.width}.png`});
  if(process.argv.includes('--capture-only')){await page.close();continue;}
  await page.getByRole('button',{name:'내 음악에서 곡 찾기',exact:true}).click();
  const search=page.getByRole('searchbox',{name:'내 곡 또는 아티스트 검색'});assert.equal(await search.evaluate(el=>el===document.activeElement),true);
  await search.fill('Movie');await page.locator('.public-map-song-list > button').first().click();await page.waitForTimeout(350);
  assert.equal(await page.locator('.public-map-track h2').textContent(),'Movie');
  await page.screenshot({path:`${out}/selected-${size.width}.png`});
  await page.getByRole('button',{name:'관심 표시',exact:false}).click();
  assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('spectra:reflection:v1:guest:personal-mobile-test')).decisions.some(d=>d.track.name==='Movie'&&d.action==='dig')));
  await page.getByRole('button',{name:'비슷한 곡 찾기',exact:false}).click();
  await page.locator('.public-map-song-list > button').filter({hasText:'South of the River'}).waitFor();
  assert.equal(new URL(calls[0]).searchParams.get('seedTracks'),'Tom Misch|Movie');
  await page.screenshot({path:`${out}/discover-${size.width}.png`});
  await page.locator('.public-map-song-list > button').filter({hasText:'South of the River'}).click();
  await page.getByRole('button',{name:'내 음악에 추가',exact:false}).click();
  await page.getByRole('button',{name:'내 지도',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.mtm-intro h1')?.textContent.includes('70곡'));
  await page.screenshot({path:`${out}/added-${size.width}.png`});
  assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('spectra:taste:v5')).tracks.some(t=>t.id==='new-recommendation')));
  await page.reload();await page.locator('.mobile-taste-map').waitFor();assert.ok((await page.locator('.mtm-intro h1').textContent()).includes('70곡'));
  await page.locator('.mtm-genres button').filter({hasText:'Jazz'}).click();
  await page.getByRole('button',{name:'내 음악에서 곡 찾기',exact:true}).click();
  assert.ok((await page.locator('.public-map-library-heading h2').textContent()).includes('Jazz'));
  await page.getByRole('button',{name:'내 곡 목록 닫기',exact:true}).click();
  await page.getByRole('button',{name:'내 취향 둘러보기',exact:true}).click();await page.locator('.tmm-root').waitFor();
  await page.getByRole('button',{name:'취향 둘러보기 닫기',exact:true}).click();await page.locator('.mtm-overview-dialog').waitFor({state:'detached'});
  findings.push({size,search:true,genre:true,discoverUsesSelectedTrack:true,addedTrackSurvivesReload:true,legacyDetailedLinkStaysMobile:true});await page.close();
 }
 if(!process.argv.includes('--capture-only')){
  const {page}=await open({width:390,height:844},2000,'/taste-map?view=constellation&star=personal-1999');
  assert.equal(await page.locator('.public-map-track h2').textContent(),library(2000)[1999].name);assert.ok(await page.locator('.public-map-star').count()<400);await page.screenshot({path:`${out}/dense-2000.png`});
  await page.getByRole('button',{name:'내 곡 정보 닫기',exact:true}).click();await page.getByRole('button',{name:'지도 전체 보기',exact:true}).click();await page.waitForTimeout(350);
  const c=await page.context().newCDPSession(page),b=await page.locator('.public-map-canvas').boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2;
  const points=s=>[{id:0,x:x-s,y},{id:1,x:x+s,y}];const before=await page.locator('.public-map-world').getAttribute('transform');
  await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points(25)});await c.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:points(65)});await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.notEqual(await page.locator('.public-map-world').getAttribute('transform'),before);
  await page.getByRole('button',{name:'내 음악에서 곡 찾기',exact:true}).click();await page.setViewportSize({width:390,height:320});await page.waitForTimeout(350);assert.ok((await page.locator('.public-map-library-scroll').boundingBox()).height>100);await page.screenshot({path:`${out}/keyboard.png`});await page.close();
  const failed=await open();await failed.page.route('**/api/discover?**',r=>r.fulfill({status:503,json:{error:'quota'}}));await failed.page.getByRole('button',{name:'발견',exact:true}).click();await failed.page.getByRole('heading',{name:'추천을 잠시 연결하지 못했어요'}).waitFor();await failed.page.screenshot({path:`${out}/unavailable.png`});await failed.page.getByRole('button',{name:'내 음악 보기',exact:true}).click();assert.equal(await failed.page.locator('.public-map-song-list > button').count(),50);await failed.page.close();
  const land=await open({width:844,height:390});const stage=await land.page.locator('.public-map-stage').boundingBox();assert.ok(stage.y>=44 && stage.y+stage.height<=391,JSON.stringify(stage));await land.page.screenshot({path:`${out}/landscape.png`});await land.page.close();
  const desktop=await open({width:1440,height:1000});assert.equal(await desktop.page.locator('.mobile-taste-map').count(),0);await desktop.page.close();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({findings,errors},null,2));
}finally{await browser.close();}
