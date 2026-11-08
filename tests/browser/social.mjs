import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { buildSocialSnapshot } from '../../src/social/socialSnapshot.js';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
const base = process.env.BASE_URL || 'http://127.0.0.1:5173';
const output = 'output/review/social'; await mkdir(output, { recursive: true });
const alice = '11111111-1111-4111-8111-111111111111', bob = '22222222-2222-4222-8222-222222222222';
const tracks = Array.from({ length: 36 }, (_, i) => ({ id: `own-${i}`, name: `Private song ${i}`, artists: `Artist ${i % 12}`,
    genres: i % 2 ? ['rnb', 'soul'] : ['house', 'electronic'], spotifyGenres: ['house'], valence: .4, energy: .5,
    danceability: .5, acousticness: .3, instrumentalness: .1 }));
const snapshot = buildSocialSnapshot(tracks);
const profiles = new Map([[bob, { user_id: bob, display_name: 'Midnight Listener', headline: 'R&B after dark, jazz before sunrise.', snapshot, is_public: true,
    published_at: '2026-11-03T01:00:00Z', updated_at: '2026-11-03T01:00:00Z' }]]);
const comments = new Map(), errors = [], pages = [];
let failPublish = false, failComment = false, publishCalls = 0;
async function open(userId, mobile = false, path = '/social') {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1100 }, reducedMotion: 'reduce', hasTouch: mobile });
    const page = await context.newPage(); pages.push(page); page.on('pageerror', error => errors.push(error.message));
    const user = userId ? { id: userId, user_metadata: { full_name: userId === alice ? 'Alice' : 'Bob' } } : null;
    await page.addInitScript(({ user, tracks }) => {
        if (user) sessionStorage.setItem(`spectra:taste:v5:user:${user.id}`, JSON.stringify({ tracks, mapId: 'social-fixture', featuresSource: 'lastfm', updatedAt: '2026-11-03T00:00:00Z', stats: {} }));
        localStorage.setItem('spectra:map-guide:v2:desktop', 'seen');
    }, { user, tracks });
    await page.route(/\/src\/auth\/supabaseClient\.js(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: `
        const user=${JSON.stringify(user)};
        function query(table,operation='select',payload=null){const q={table,operation,payload,filters:[],start:0,end:100};let run;
        const proxy=new Proxy({}, {get(_,key){if(key==='then')return(resolve,reject)=>{run||=fetch('/__social_test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...q,actor:user?.id})}).then(r=>r.json());return run.then(resolve,reject)};
        return(...args)=>{if(key==='eq')q.filters.push(args);if(key==='range'){q.start=args[0];q.end=args[1]}
        if(key==='upsert'||key==='update'||key==='delete'){q.operation=key;q.payload=args[0]}
        if(key==='single'||key==='maybeSingle')q.single=true;if(key==='abortSignal')return proxy;return proxy;}}});return proxy;}
        export const supabase={from:table=>query(table),rpc:(name,payload)=>query(name,'rpc',payload),auth:{
          onAuthStateChange(cb){queueMicrotask(()=>cb('INITIAL_SESSION',user?{user}:null));return{data:{subscription:{unsubscribe(){}}}}},
          getSession:async()=>({data:{session:user?{user}:null}}),getUser:async()=>({data:{user}}),signOut:async()=>({})}};
        export function finishGoogleLogin(){return Promise.reject();}
    ` }));
    await page.route('**/__social_test', async route => {
        const q = route.request().postDataJSON(), eq = key => q.filters.find(([k]) => k === key)?.[1];
        const ok = data => route.fulfill({ json: { data, error: null } });
        const fail = message => route.fulfill({ json: { data: null, error: { message } } });
        if (q.table === 'user_taste_maps') return ok(q.actor ? { map_id: 'social-fixture', features_source: 'lastfm', tracks, stats: {}, updated_at: '2026-11-03T00:00:00Z' } : null);
        if (q.table === 'social_taste_profiles') {
            if (q.operation === 'upsert') {
                publishCalls++; if (failPublish) { failPublish = false; return fail('unavailable'); }
                const row = { ...q.payload, published_at: new Date().toISOString(), updated_at: new Date().toISOString() }; profiles.set(q.actor, row); return ok(row);
            }
            if (q.operation === 'update') { const row = profiles.get(q.actor); Object.assign(row, q.payload); return ok(row); }
            let rows = [...profiles.values()].filter(row => row.is_public || row.user_id === q.actor);
            if (eq('user_id')) return ok(rows.find(row => row.user_id === eq('user_id')) || null);
            rows = rows.filter(row => row.is_public); return ok(rows.slice(q.start, q.end + 1));
        }
        if (q.table === 'social_taste_comments') {
            if (q.operation === 'delete') { const row = comments.get(eq('id')); comments.delete(eq('id')); return ok({ id: row.id }); }
            return ok([...comments.values()].filter(row => row.profile_id === eq('profile_id')).slice(q.start, q.end + 1));
        }
        if (q.table === 'add_social_taste_comment') {
            const p = q.payload; if (!profiles.get(p.target_profile_id)?.is_public) return fail('social_profile_private');
            const row = comments.get(p.request_id) || { id: p.request_id, profile_id: p.target_profile_id, author_id: q.actor, author_name: p.public_name, body: p.comment_body, created_at: new Date().toISOString() };
            comments.set(row.id, row);
            if (failComment) { failComment = false; return fail('lost response after commit'); }
            return ok(row);
        }
        return ok(null);
    });
    await page.goto(base + path); return page;
}
try {
    const page = await open(alice);
    await page.getByRole('heading', { name: '지금 공개된 취향' }).waitFor();
    const publish = page.getByRole('region', { name: '내 취향 공개하기' });
    await publish.getByLabel('공개 닉네임').fill('Night swimmer');
    await publish.getByLabel('한 줄 소개').fill('나의 밤은 Soul과 House 사이.');
    assert.equal(publishCalls, 0, 'Editing must never auto-publish');
    failPublish = true; await publish.getByRole('button', { name: '내 취향 공개하기', exact: true }).click();
    await publish.getByRole('alert').waitFor();
    assert.equal(profiles.has(alice), false);
    assert.equal(await publish.getByLabel('한 줄 소개').inputValue(), '나의 밤은 Soul과 House 사이.');
    await publish.getByRole('button', { name: '내 취향 공개하기', exact: true }).click();
    await publish.getByText('공개 중', { exact: true }).waitFor();
    await page.locator('.social-profile-card').filter({ hasText: 'Night swimmer' }).waitFor();
    await page.screenshot({ path: `${output}/desktop-feed.png`, fullPage: true });
    await page.locator('.social-profile-card').filter({ hasText: 'Midnight Listener' }).click();
    await page.locator('.social-comment-form').waitFor();
    const sculpture = page.locator('.social-detail-visual .social-constellation');
    assert.ok(await sculpture.locator('.lc-star').count() > 0);
    assert.ok(await sculpture.locator('.lc-connections line').count() > 0, 'Shared-card stars and connections replace the wire mesh');
    assert.equal(await sculpture.locator('.social-taste-mesh').count(), 0);
    const starIds = async svg => (await svg.locator('.lc-star').evaluateAll(nodes => nodes.map(node => node.dataset.trackId))).sort();
    assert.deepEqual(await starIds(sculpture), await starIds(page.locator('.social-preview .social-constellation')), 'Compact and 3D views contain the same public stars');
    await page.locator('.social-detail-visual').screenshot({ path: `${output}/constellation-3d-desktop.png` });
    const artwork = await sculpture.evaluate(async source => {
        const clone = source.cloneNode(true);
        const originals = [source, ...source.querySelectorAll('*')], copies = [clone, ...clone.querySelectorAll('*')];
        originals.forEach((node, index) => {
            const computed = getComputedStyle(node), target = copies[index];
            for (const property of ['color', 'fill', 'stroke', 'stroke-width', 'stroke-opacity', 'opacity', 'transform', 'transform-origin']) {
                if (property === 'fill' && node.getAttribute('fill')?.startsWith('url(')) continue;
                target.style.setProperty(property, computed.getPropertyValue(property));
            }
            target.style.animation = 'none';
        });
        clone.setAttribute('width', '4096'); clone.setAttribute('height', '4096');
        const svg = new XMLSerializer().serializeToString(clone);
        const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
        try {
            const image = new Image(); image.src = url; await image.decode();
            const canvas = document.createElement('canvas'); canvas.width = 4096; canvas.height = 4096;
            canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
            return { svg, png: canvas.toDataURL('image/png').split(',')[1] };
        } finally { URL.revokeObjectURL(url); }
    });
    await writeFile(`${output}/public-constellation.svg`, artwork.svg);
    await writeFile(`${output}/public-constellation-4096.png`, Buffer.from(artwork.png, 'base64'));
    const viewport = page.locator('.social-detail-visual .tmm-space-viewport');
    const world = page.locator('.social-detail-visual .tmm-space-world');
    const camera = () => world.evaluate(node => ({ yaw: +node.dataset.yaw, pitch: +node.dataset.pitch, zoom: +node.dataset.zoom }));
    const initialCamera = await camera();
    const positions = () => sculpture.locator('.lc-star > circle[fill="transparent"]').evaluateAll(nodes => nodes.map(node => [node.getAttribute('cx'), node.getAttribute('cy')]));
    const initialPositions = await positions();
    const drag = async (dx, dy, steps = 8) => {
        const box = await viewport.boundingBox();
        const x = box.x + box.width * .5, y = box.y + box.height * .45;
        await page.mouse.move(x, y); await page.mouse.down();
        await page.mouse.move(x + dx, y + dy, { steps }); await page.mouse.up();
    };
    await drag(100, 45);
    assert.notEqual((await camera()).yaw, initialCamera.yaw);
    assert.notEqual((await camera()).pitch, initialCamera.pitch);
    assert.notDeepEqual(await positions(), initialPositions, 'The stars are reprojected in 3D, rather than tilting a flat image');
    assert.equal(await page.locator('.social-taste-peek-summary').count(), 0, 'Dragging must not accidentally select a star');
    const reducedCamera = await camera(); await page.waitForTimeout(100);
    assert.deepEqual(await camera(), reducedCamera, 'Reduced motion disables the release inertia');
    await viewport.focus(); await viewport.press('ArrowLeft');
    assert.notEqual((await camera()).yaw, reducedCamera.yaw);
    await viewport.press('+'); assert.ok((await camera()).zoom > initialCamera.zoom);
    await page.locator('.social-detail-visual .tmm-space-controls button').nth(1).click();
    assert.deepEqual(await camera(), initialCamera);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await drag(70, -25, 4);
    const drifting = await camera(); await page.waitForTimeout(100);
    assert.notEqual((await camera()).yaw, drifting.yaw, 'Release gently decelerates');
    await page.locator('.social-detail-visual .tmm-space-controls button').nth(1).click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const explorer = page.locator('.social-detail-visual .social-taste-form');
    const genreControls = explorer.locator('.social-taste-genre-controls button');
    const firstGenre = await genreControls.first().innerText();
    const originalLibrary = await page.evaluate(() => sessionStorage.getItem('spectra:taste:v5:user:11111111-1111-4111-8111-111111111111'));
    const originalPublishCalls = publishCalls;
    await sculpture.getByRole('button', { name: firstGenre, exact: true }).click();
    await explorer.locator('.social-taste-peek-summary h3').filter({ hasText: firstGenre }).waitFor();
    await explorer.screenshot({ path: `${output}/constellation-peek-desktop.png` });
    await genreControls.first().focus();
    await page.keyboard.press('End');
    assert.equal(await genreControls.last().getAttribute('aria-pressed'), 'true');
    await page.keyboard.press('Home');
    assert.equal(await genreControls.first().getAttribute('aria-pressed'), 'true');
    await page.keyboard.press('Escape');
    assert.equal(await explorer.locator('.social-taste-peek-summary').count(), 0);
    assert.ok(await genreControls.first().evaluate(element => element === document.activeElement));
    const songStar = sculpture.locator('.lc-star[data-star-kind="track"]').first();
    await songStar.focus(); await songStar.press('Enter');
    assert.equal(await explorer.locator('.social-taste-peek-tracks > button').count(), 1, 'A song star reveals that exact public song');
    const songName = (await songStar.getAttribute('aria-label')).split(' · ')[0];
    assert.equal(await explorer.locator('.social-taste-peek-tracks strong').innerText(), songName);
    await genreControls.first().click();
    assert.ok(await explorer.locator('.social-taste-peek-tracks > button').count() > 0);
    await explorer.locator('.social-taste-peek-tracks > button').first().click();
    await page.locator('.social-tracks li.is-revealed').waitFor();
    await page.waitForFunction(() => document.activeElement?.closest('.social-tracks li.is-revealed'));
    assert.equal(await page.evaluate(() => sessionStorage.getItem('spectra:taste:v5:user:11111111-1111-4111-8111-111111111111')), originalLibrary, 'Peeking never changes my own library');
    assert.equal(publishCalls, originalPublishCalls, 'Peeking never republishes a profile');
    const form = page.locator('.social-comment-form');
    await form.getByLabel('코멘트', { exact: true }).fill('추천곡도 궁금해요! <script>window.hacked=true</script>');
    await publish.getByLabel('한 줄 소개').fill('공개 프로필을 갱신해도 다른 사람에게 쓰던 글은 유지.');
    await publish.getByRole('button', { name: '공개 취향 업데이트', exact: true }).click();
    await publish.getByLabel('한 줄 소개').filter({ visible: true }).waitFor();
    assert.match(await form.getByLabel('코멘트', { exact: true }).inputValue(), /추천곡/,
        'Updating my publication must preserve a comment draft on another profile');
    failComment = true; await form.getByRole('button', { name: '코멘트 남기기' }).click();
    await page.locator('.social-comments [role=alert]').waitFor();
    assert.match(await form.getByLabel('코멘트', { exact: true }).inputValue(), /추천곡/);
    await form.getByRole('button', { name: '코멘트 남기기' }).click();
    await page.locator('.social-comment-list li').waitFor();
    assert.equal(comments.size, 1, 'A lost success response and retry must not duplicate a comment');
    assert.equal(await page.evaluate(() => window.hacked), undefined);
    await page.screenshot({ path: `${output}/desktop-comments.png`, fullPage: true });
    const owner = await open(bob, false, `/social/${bob}`);
    await owner.locator('.social-comment-list li').waitFor();
    await owner.getByRole('button', { name: /^코멘트 삭제:/ }).click();
    await owner.getByText('코멘트를 삭제했어요.', { exact: true }).waitFor();
    assert.equal(comments.size, 0);
    const guest = await open(null, true, `/social/${alice}`);
    await guest.getByRole('heading', { name: 'Night swimmer의 스펙트라' }).waitFor();
    assert.equal(await guest.locator('.social-comment-form').count(), 0);
    await guest.getByRole('link', { name: '로그인하고 코멘트 남기기' }).waitFor();
    await guest.screenshot({ path: `${output}/mobile-profile.png`, fullPage: true });
    const mobile = await open(alice, true, '/taste-map');
    await mobile.getByRole('button', { name: '내 취향 지도 공유하기', exact: true }).click();
    const shareDialog = mobile.locator('.spectra-share-dialog');
    await shareDialog.getByRole('button', { name: '별자리', exact: true }).click();
    await mobile.waitForFunction(() => {
        const image = document.querySelector('.spectra-share-preview > img');
        return image?.complete && image.naturalWidth === 1080;
    });
    await shareDialog.screenshot({ path: `${output}/original-share-constellation.png` });
    await shareDialog.getByRole('button', { name: '공유 창 닫기', exact: true }).click();
    await mobile.getByRole('navigation', { name: '모바일 음악 메뉴' }).getByRole('button', { name: '소셜' }).click();
    await mobile.getByRole('heading', { name: '지금 공개된 취향' }).waitFor();
    assert.equal(await mobile.locator('.social-mobile-nav a').count(), 4);
    assert.deepEqual(await mobile.locator('.social-mobile-nav a').allTextContents(), ['내 지도', '발견', '오늘', '소셜']);
    assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'No horizontal overflow');
    await mobile.screenshot({ path: `${output}/mobile-feed.png`, fullPage: true });
    await mobile.locator('.social-profile-card').filter({ hasText: 'Midnight Listener' }).click();
    await mobile.locator('.social-detail-visual .social-constellation').waitFor();
    await mobile.locator('.social-detail-visual').screenshot({ path: `${output}/taste-form-mobile.png` });
    const mobileExplorer = mobile.locator('.social-detail-visual .social-taste-form');
    const mobileViewport = mobileExplorer.locator('.tmm-space-viewport');
    const mobileWorld = mobileExplorer.locator('.tmm-space-world');
    const touchCamera = () => mobileWorld.evaluate(node => ({ yaw: +node.dataset.yaw, zoom: +node.dataset.zoom }));
    const touchStartCamera = await touchCamera();
    const touchArea = await mobileViewport.boundingBox();
    const tx = touchArea.x + touchArea.width / 2, ty = touchArea.y + touchArea.height / 2;
    const cdp = await mobile.context().newCDPSession(mobile);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: tx, y: ty, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: tx + 55, y: ty - 20, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.notEqual((await touchCamera()).yaw, touchStartCamera.yaw, 'A single finger rotates the 3D constellation');
    const beforePinch = await touchCamera();
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: tx - 30, y: ty, id: 1 }, { x: tx + 30, y: ty, id: 2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: tx - 60, y: ty, id: 1 }, { x: tx + 60, y: ty, id: 2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await mobile.waitForFunction(previous => +document.querySelector('.social-detail-visual .tmm-space-world').dataset.zoom > previous, beforePinch.zoom);
    await mobileExplorer.locator('.tmm-space-controls button').nth(1).tap();
    assert.deepEqual(await touchCamera(), touchStartCamera);
    await cdp.detach();
    await mobileExplorer.locator('.social-taste-genre-controls button').first().tap();
    await mobileExplorer.locator('.social-taste-peek-summary').waitFor();
    assert.equal(await mobileExplorer.locator('.social-taste-genre-controls button').first().getAttribute('aria-pressed'), 'true');
    await mobileExplorer.screenshot({ path: `${output}/constellation-peek-mobile.png` });
    await mobile.setViewportSize({ width: 320, height: 640 });
    assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'The detailed sculpture fits a 320px screen');
    const mobileVisual = await mobile.locator('.social-detail-visual').boundingBox();
    assert.ok(mobileVisual.x >= 0 && mobileVisual.x + mobileVisual.width <= 320);
    await mobileExplorer.locator('.social-taste-peek-tracks > button').first().click();
    await mobile.locator('.social-tracks li.is-revealed').waitFor();
    assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Public-song reveal also fits a narrow screen');
    await mobile.setViewportSize({ width: 390, height: 844 });
    await mobile.goto(`${base}/social?lang=en`);
    await mobile.locator('.social-mobile-nav').waitFor();
    assert.deepEqual(await mobile.locator('.social-mobile-nav a').allTextContents(), ['My map', 'Discover', 'Today', 'Social']);
    await page.goto(`${base}/social`);
    await page.getByRole('button', { name: '공개 해제', exact: true }).click();
    await page.getByRole('status').filter({ hasText: '공개를 해제했어요.' }).first().waitFor();
    assert.equal(profiles.get(alice).is_public, false);
    await guest.reload();
    await guest.getByRole('heading', { name: '지금은 공개되지 않은 취향이에요' }).waitFor();
    const legacyId = '33333333-3333-4333-8333-333333333333';
    profiles.set(legacyId, { user_id: legacyId, display_name: 'Older publication', headline: '', is_public: true,
        snapshot: { ...snapshot, tracks: snapshot.tracks.map(({ genres: _genres, ...track }) => track) } });
    const legacy = await open(null, true, `/social/${legacyId}?lang=en`);
    const legacyExplorer = legacy.locator('.social-detail-visual .social-taste-form');
    await legacyExplorer.locator('.social-taste-genre-controls button').first().click();
    await legacyExplorer.getByText(/No songs are linked to this genre yet/).waitFor();
    assert.ok(await legacyExplorer.locator('.social-taste-peek-tracks > button').count() > 0);
    profiles.get(legacyId).snapshot.tracks = [];
    await legacy.reload();
    await legacyExplorer.locator('.social-taste-genre-controls button').first().click();
    await legacyExplorer.getByText(/kept their song list private/).waitFor();
    assert.equal(await legacyExplorer.locator('.social-taste-peek-tracks > button').count(), 0);
    assert.deepEqual(errors, []);
    console.log('Social browser passed: 3D drag/inertia/zoom, touch/keyboard peeks, public song reveal, legacy/genre-only publications, reduced motion, privacy, comments and unpublish.');
} catch (error) {
    for (let i = 0; i < pages.length; i++) { await pages[i].screenshot({ path: `${output}/failure-${i}.png`, fullPage: true }).catch(() => {}); }
    console.error(JSON.stringify({ errors })); throw error;
} finally { await browser.close(); }
