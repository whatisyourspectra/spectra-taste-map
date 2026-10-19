// Isolated public-link UX checks. No real accounts, share records, or third-party API calls.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || process.argv.find(arg => arg.startsWith('--playwright='))?.slice(13) || 'playwright');
const base = process.env.BASE_URL || 'http://127.0.0.1:5194';
const out = process.env.REVIEW_DIR || 'output/review/shared-map-mobile';
await mkdir(out, { recursive: true });
const fixture = count => ({ title: '밤에 꺼내 듣는 나의 스펙트라', style: 'constellation', genres: ['Dream Pop', 'Indie', 'Psychedelic', 'Alternative R&B'], tracks: Array.from({ length: count }, (_, i) => ({ id: `star-${i}`, name: ['Sunsetz', 'Space Song', 'The Less I Know the Better', 'Show Me How', 'Chamber of Reflection', 'Movie'][i % 6] + (i > 5 ? ` ${i + 1}` : ''), artists: ['Cigarettes After Sex', 'Beach House', 'Tame Impala', 'Men I Trust', 'Mac DeMarco', 'Tom Misch'][i % 6], coverUrl: i === 5 ? '/missing-artwork.jpg' : `/demo-covers/${['cigarettes-after-sex','depression-cherry','currents','show-me-how','salad-days','geography'][i % 6]}.jpg`, x: .05 + ((i * .6180339887) % 1) * .9, y: .05 + ((i * .3819660113 + Math.sin(i * 1.7) * .2 + 1) % 1) * .9 })) });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || process.argv.find(arg => arg.startsWith('--chrome='))?.slice(9) || undefined });
const errors = [];
async function open(size, data = fixture(69), touch = true) {
 const page = await browser.newPage({ viewport: size, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 });
 page.on('pageerror', error => errors.push(error.message));
 await page.route(/\/src\/auth\/supabaseClient\.js(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: 'export const supabase=null;export function finishGoogleLogin(){return Promise.reject();}' }));
 await page.route(/\/src\/share\/sharedMapStorage\.js(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: `export async function fetchSharedMap(){return ${JSON.stringify(data)}};export async function publishSharedMap(){};export async function revokeSharedMap(){};export async function listOwnSharedMaps(){return []}` }));
 await page.goto(`${base}/share/map/11111111-1111-4111-8111-111111111111`);
 await page.getByRole('heading', { name: data?.title || '공유 지도를 열 수 없어요', exact: true }).waitFor();
 await page.evaluate(() => document.fonts.ready);
 await page.waitForTimeout(400);
 return page;
}
const metrics = page => page.evaluate(() => { const r = selector => { const b = document.querySelector(selector).getBoundingClientRect(); return { x:b.x,y:b.y,width:b.width,height:b.height,bottom:b.bottom }; }; return { viewport: { width: innerWidth,height:innerHeight }, page:r('.public-map-page'), stage:r('.public-map-stage'), sheet:r('.public-map-inspector'), overflow:document.documentElement.scrollWidth > innerWidth }; });
try {
 const results=[];
 const captureOnly=process.argv.includes('--capture-only');
 for (const size of [{width:390,height:844},{width:320,height:640},{width:430,height:932}]) {
  const page=await open(size);
  const start=await metrics(page);
  assert.equal(start.overflow,false);
  assert.ok(start.sheet.bottom <= size.height+1,JSON.stringify(start));
  assert.ok(start.stage.height > size.height*.38,JSON.stringify(start));
  await page.screenshot({path:`${out}/mobile-${size.width}-overview.png`});
  if(captureOnly){await page.close();continue;}
  await page.getByRole('button',{name:'공유 지도에서 곡 찾기',exact:true}).click();
  const search=page.getByRole('searchbox',{name:'공유 지도에서 곡 찾기',exact:true});
  assert.equal(await search.evaluate(el=>el===document.activeElement),true);
  await search.fill('Movie');
  await page.getByRole('status').filter({hasText:'검색 결과'}).waitFor();
  await page.screenshot({path:`${out}/mobile-${size.width}-search.png`});
  await page.locator('.public-map-song-list > button').first().click();
  await page.waitForTimeout(400);
  assert.equal(await page.locator('.public-map-track h2').textContent(),'Movie');
  assert.equal(await page.locator('.public-map-library').isVisible(),false);
  assert.equal(await page.locator('.public-map-listen').evaluate(el=>el===document.activeElement),true,'Selection restores focus to the song actions');
  const centered=await page.locator('.public-map-star.is-selected').evaluate(el=>{const box=el.ownerSVGElement.getBoundingClientRect(),c=el.querySelector('circle'),p=new DOMPoint(Number(c.getAttribute('cx')),Number(c.getAttribute('cy'))).matrixTransform(el.getScreenCTM());return {dx:Math.abs(p.x-box.x-box.width/2),dy:Math.abs(p.y-box.y-box.height/2)};});
  assert.ok(centered.dx<2&&centered.dy<2,JSON.stringify(centered));
  const youtube=await page.locator('.public-map-listen').getAttribute('href');assert.ok(youtube.includes('Tom%20Misch%20Movie'));
  await page.screenshot({path:`${out}/mobile-${size.width}-selected.png`});
  await page.getByRole('button',{name:'다음 곡',exact:true}).click();assert.notEqual(await page.locator('.public-map-track h2').textContent(),'Movie');
  await page.getByRole('button',{name:'곡 정보 닫기',exact:true}).click();
  await page.getByRole('button',{name:'지도 전체 보기',exact:true}).click();
  await page.getByRole('button',{name:'앨범 버블',exact:true}).click();
  await page.screenshot({path:`${out}/mobile-${size.width}-bubbles.png`});
  results.push({size,...start,searchSelectAndFocus:true,nextTrack:true});await page.close();
 }
 if(!captureOnly){
  const touch=await open({width:390,height:844});
  const tapPoint=await touch.locator('.public-map-canvas').evaluate(svg=>{
   const box=svg.getBoundingClientRect();
   const points=[...svg.querySelectorAll('.public-map-star')].map(el=>{const c=el.querySelector('circle'),p=new DOMPoint(Number(c.getAttribute('cx')),Number(c.getAttribute('cy'))).matrixTransform(el.getScreenCTM());return {x:p.x,y:p.y,index:el.dataset.trackIndex};});
   return points.filter(p=>p.x>box.x+30&&p.x<box.right-30&&p.y>box.y+80&&p.y<box.bottom-90).map(p=>({...p,clearance:Math.min(...points.filter(q=>q.index!==p.index).map(q=>Math.hypot(p.x-q.x,p.y-q.y)))})).sort((a,b)=>b.clearance-a.clearance)[0];
  });
  await touch.touchscreen.tap(tapPoint.x+12,tapPoint.y);
  assert.equal(await touch.locator('.public-map-star.is-selected').getAttribute('data-track-index'),tapPoint.index,'A touch outside the small visible dot still selects its nearest star');
  await touch.getByRole('button',{name:'곡 정보 닫기',exact:true}).click();
  await touch.getByRole('button',{name:'지도 전체 보기',exact:true}).click();
  await touch.waitForTimeout(350);
  const client=await touch.context().newCDPSession(touch);
  const b=await touch.locator('.public-map-canvas').boundingBox();
  const before=await touch.locator('.public-map-world').getAttribute('transform');
  const cx=b.x+b.width/2,cy=b.y+b.height/2;
  const fingers=(spread)=>[{x:cx-spread,y:cy,id:0},{x:cx+spread,y:cy,id:1}];
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:fingers(32)});
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:fingers(70)});
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await touch.waitForTimeout(400);
  assert.notEqual(await touch.locator('.public-map-world').getAttribute('transform'),before);
  assert.equal(await touch.locator('.public-map-track').count(),0,'Pinch must not select a song');
  await touch.getByRole('button',{name:'지도 전체 보기',exact:true}).click();
  const handle=await touch.locator('.public-map-sheet-handle').boundingBox();
  const finger=(y)=>[{x:handle.x+handle.width/2,y,id:0}];
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:finger(handle.y+12)});
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:finger(handle.y-65)});
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await touch.waitForTimeout(350);
  assert.equal(await touch.locator('.public-map-library').isVisible(),true,'Swipe up opens the library');
  await touch.getByRole('button',{name:'곡 목록 닫기',exact:true}).click();
  await touch.getByRole('button',{name:'공유 지도에서 곡 찾기',exact:true}).click();
  await touch.setViewportSize({width:390,height:500});
  await touch.waitForTimeout(350);
  const keyboardMetrics=await metrics(touch);assert.ok(keyboardMetrics.sheet.bottom<=501);assert.equal(await touch.getByRole('searchbox').isVisible(),true);
  await touch.screenshot({path:`${out}/keyboard-short-viewport.png`});
  await touch.setViewportSize({width:390,height:320});await touch.waitForTimeout(350);
  assert.ok((await touch.locator('.public-map-library-scroll').boundingBox()).height>100,'Small keyboard viewport must leave room to select results');
  await touch.screenshot({path:`${out}/keyboard-small-viewport.png`});await touch.close();
  results.push({pinch:true,swipeSheet:true,shortViewport:true});
  const landscape=await open({width:844,height:390});const land=await metrics(landscape);assert.equal(land.overflow,false);assert.ok(land.stage.height>250);assert.ok(land.sheet.bottom<=390);await landscape.screenshot({path:`${out}/landscape.png`});await landscape.close();
  const longData=fixture(1);longData.title='아주 긴 제목을 가진 친구의 취향 지도 '.repeat(4);longData.tracks[0].name='아주 긴 곡 제목과 부제가 함께 있는 음악 — The Extended Live Version';
  const longPage=await open({width:320,height:640},longData);await longPage.locator('.public-map-peek-tracks button').first().click();assert.equal((await metrics(longPage)).overflow,false);await longPage.screenshot({path:`${out}/long-titles.png`});await longPage.close();
  const large=await open({width:390,height:844},fixture(2000));
  assert.ok(await large.locator('.public-map-star').count()<300);
  await large.getByRole('button',{name:'공유 지도에서 곡 찾기',exact:true}).click();
  await large.getByRole('searchbox').fill('2000');
  await large.locator('.public-map-song-list > button').first().click();
  assert.ok((await large.locator('.public-map-track h2').textContent()).includes('2000'));
  await large.screenshot({path:`${out}/dense-2000.png`});await large.close();
  const desktop=await open({width:1440,height:1000},fixture(69),false);assert.equal((await metrics(desktop)).overflow,false);await desktop.screenshot({path:`${out}/desktop.png`});await desktop.close();
  const missing=await open({width:390,height:844},null);assert.equal(await missing.getByRole('link',{name:'SPECTRA 시작하기'}).isVisible(),true);await missing.close();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({results,errors},null,2));
} finally {await browser.close();}
