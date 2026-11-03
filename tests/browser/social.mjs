import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
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
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
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
    await mobile.getByRole('navigation', { name: '모바일 음악 메뉴' }).getByRole('button', { name: 'Social' }).click();
    await mobile.getByRole('heading', { name: '지금 공개된 취향' }).waitFor();
    assert.equal(await mobile.locator('.social-mobile-nav a').count(), 4);
    assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'No horizontal overflow');
    await mobile.screenshot({ path: `${output}/mobile-feed.png`, fullPage: true });
    await page.goto(`${base}/social`);
    await page.getByRole('button', { name: '공개 해제', exact: true }).click();
    await page.getByRole('status').filter({ hasText: '공개를 해제했어요.' }).first().waitFor();
    assert.equal(profiles.get(alice).is_public, false);
    await guest.reload();
    await guest.getByRole('heading', { name: '지금은 공개되지 않은 취향이에요' }).waitFor();
    assert.deepEqual(errors, []);
    console.log('Social browser passed: explicit publication, failure/retry, public profiles, idempotent comments, owner deletion, guest read, mobile navigation and unpublish.');
} catch (error) {
    for (let i = 0; i < pages.length; i++) { await pages[i].screenshot({ path: `${output}/failure-${i}.png`, fullPage: true }).catch(() => {}); }
    console.error(JSON.stringify({ errors })); throw error;
} finally { await browser.close(); }
