// Local PostgreSQL-compatible verification; never touches the connected Supabase.
// Run with PGLITE_MODULE pointing to an installed @electric-sql/pglite module.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
try {
    await db.exec(`
        create role anon; create role authenticated; create role service_role bypassrls;
        create schema auth; create table auth.users(id uuid primary key);
        create function auth.uid() returns uuid language sql as
        $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
    `);
    const sql = await readFile(new URL('../../docs/user_feedback.sql', import.meta.url), 'utf8');
    await db.exec(sql);
    await db.exec(sql); // Migration is safe to re-apply.
    const client = randomUUID(), request = randomUUID();
    const submit = (id = randomUUID(), clientId = client, overrides = {}) => {
        const f = { category: 'bug', subject: 'Map feedback', message: 'I cannot select an album after zooming.', email: null, path: '/taste-map', device: 'mobile', consent: true, ...overrides };
        return db.query('select public.submit_user_feedback($1,$2,$3,$4,$5,$6,$7,$8,$9) as id', [id, clientId, f.category, f.subject, f.message, f.email, f.path, f.device, f.consent]);
    };
    await db.exec('set role anon');
    assert.equal((await submit(request)).rows[0].id, request);
    assert.equal((await submit(request)).rows[0].id, request);
    await assert.rejects(db.query('select * from public.user_feedback'), { code: '42501' });
    await assert.rejects(db.exec("insert into public.user_feedback(client_id,category,subject,message,page_path,device_type) values(gen_random_uuid(),'bug','Test','A direct insert attempt','/','mobile')"), { code: '42501' });
    for (const overrides of [{ category: 'admin' }, { message: 'short' }, { path: '/?secret=1' }, { device: 'invalid' }, { email: 'not-an-email' }, { consent: false }]) {
        await assert.rejects(submit(randomUUID(), client, overrides));
    }
    for (let i = 0; i < 4; i++) await submit();
    await assert.rejects(submit(), /feedback_rate_limited/);
    assert.equal((await submit(request)).rows[0].id, request); // Retries still succeed at the limit.
    await db.exec('reset role');
    assert.equal((await db.query('select count(*)::int as n from public.user_feedback')).rows[0].n, 5);
    const user = randomUUID(), authRequest = randomUUID();
    await db.query('insert into auth.users(id) values($1)', [user]);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
    await db.exec('set role authenticated');
    await submit(authRequest, randomUUID());
    await assert.rejects(db.query('select * from public.user_feedback'), { code: '42501' });
    await assert.rejects(db.exec("update public.user_feedback set status='resolved'"), { code: '42501' });
    await db.exec('reset role');
    const row = (await db.query('select user_id,status,consent_at from public.user_feedback where id=$1', [authRequest])).rows[0];
    assert.equal(row.user_id, user);
    assert.equal(row.status, 'new');
    assert.ok(row.consent_at);
    console.log('Feedback SQL: migration replay, anonymous/authenticated inserts, private reads, blocked direct writes, validation, rate limit and deduplication passed');
} finally { await db.close(); }
