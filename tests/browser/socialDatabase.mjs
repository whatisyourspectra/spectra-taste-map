// Executes the real migration and policies in local PostgreSQL (PGlite).
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const alice = randomUUID(), bob = randomUUID(), charlie = randomUUID();
const snapshot = { version: 1, trackCount: 2, genreProfile: [{ genre: 'r&b', strength: 1 }], tracks: [] };
async function as(role, id = '') {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec(`set role ${role}`);
}
async function publish(id, isPublic = true, value = snapshot) {
    return db.query(`insert into public.social_taste_profiles(user_id,display_name,snapshot,is_public) values($1,'Listener',$2,$3)
        on conflict(user_id) do update set user_id=excluded.user_id,display_name=excluded.display_name,snapshot=excluded.snapshot,is_public=excluded.is_public returning *`, [id, JSON.stringify(value), isPublic]);
}
async function comment(id = randomUUID(), body = 'A song for this world', target = alice) {
    return db.query('select public.add_social_taste_comment($1,$2,$3,$4) as item', [target, body, 'Listener', id]);
}
try {
    await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key);
        create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
        grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`);
    await db.query('insert into auth.users values($1),($2),($3)', [alice, bob, charlie]);
    const sql = await readFile(new URL('../../docs/social_taste.sql', import.meta.url), 'utf8');
    await db.exec(sql); await db.exec(sql);
    await as('authenticated', alice);
    await publish(alice); await publish(alice); // Verify Supabase-style full-payload upsert permissions.
    for (const invalid of [{}, { ...snapshot, version: null }, { ...snapshot, tracks: null }, { ...snapshot, trackCount: null }, { ...snapshot, tracks: Array(25).fill({}) }]) {
        await assert.rejects(publish(alice, true, invalid));
    }
    await assert.rejects(db.query('update public.social_taste_profiles set published_at=now() where user_id=$1', [alice]), { code: '42501' });
    await as('authenticated', bob); await publish(bob, false);
    await assert.rejects(publish(alice), { code: '42501' });
    const retry = randomUUID();
    const added = (await comment(retry)).rows[0].item;
    assert.equal(added.author_id, bob);
    assert.equal((await comment(retry)).rows[0].item.id, added.id);
    await assert.rejects(comment(retry, 'Different payload'), /social_request_conflict/);
    await assert.rejects(comment(randomUUID(), ' '));
    await assert.rejects(comment(randomUUID(), 'x'.repeat(1001)));
    await assert.rejects(db.query('insert into public.social_taste_comments(id,profile_id,author_id,author_name,body) values($1,$2,$3,$4,$5)', [randomUUID(), alice, alice, 'Fake author', 'Forged comment']), { code: '42501' });
    await as('authenticated', charlie);
    assert.equal((await db.query('delete from public.social_taste_comments where id=$1 returning id', [added.id])).rows.length, 0);
    await as('anon');
    assert.equal((await db.query('select count(*)::int n from public.social_taste_profiles')).rows[0].n, 1);
    assert.equal((await db.query('select count(*)::int n from public.social_taste_comments')).rows[0].n, 1);
    await assert.rejects(comment(), { code: '42501' });
    await as('authenticated', alice);
    await db.query('update public.social_taste_profiles set is_public=false where user_id=$1', [alice]);
    assert.equal((await db.query('select count(*)::int n from public.social_taste_comments')).rows[0].n, 1);
    await as('anon');
    assert.equal((await db.query('select count(*)::int n from public.social_taste_profiles')).rows[0].n, 0);
    assert.equal((await db.query('select count(*)::int n from public.social_taste_comments')).rows[0].n, 0);
    await as('authenticated', bob);
    await assert.rejects(comment(), /social_profile_private/);
    await as('authenticated', alice); await publish(alice);
    assert.equal((await db.query('delete from public.social_taste_comments where id=$1 returning id', [added.id])).rows.length, 1);
    await as('authenticated', bob);
    const own = (await comment()).rows[0].item;
    assert.equal((await db.query('delete from public.social_taste_comments where id=$1 returning id', [own.id])).rows.length, 1);
    await as('authenticated', charlie);
    const first = randomUUID(); await comment(first);
    for (let i = 1; i < 20; i++) await comment();
    await assert.rejects(comment(), /social_rate_limited/);
    assert.equal((await comment(first)).rows[0].item.id, first);
    console.log('Social SQL passed: migration replay, publish/update, anonymous public reads, ownership, hidden profiles/comments, authenticated authors, delete permissions, validation, rate limit and idempotent retries.');
} finally { await db.close(); }
