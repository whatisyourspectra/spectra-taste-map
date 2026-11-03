-- Run in the existing Supabase project's SQL Editor. Re-applicable migration.
-- Personal user_taste_maps are never read by any Social policy/function.
begin;
create table if not exists public.social_taste_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
 headline text not null default '' check (char_length(headline) <= 160),
 snapshot jsonb not null check (
   jsonb_typeof(snapshot) = 'object' and snapshot @> '{"version":1}'::jsonb
   and snapshot ?& array['genreProfile','tracks','trackCount'] and jsonb_typeof(snapshot->'trackCount') = 'number'
   and jsonb_typeof(snapshot->'genreProfile') = 'array' and jsonb_array_length(snapshot->'genreProfile') <= 512
   and jsonb_typeof(snapshot->'tracks') = 'array' and jsonb_array_length(snapshot->'tracks') <= 24
   and (snapshot->>'trackCount')::int > 0 and octet_length(snapshot::text) <= 200000),
 is_public boolean not null default false,
 published_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists social_profiles_feed on public.social_taste_profiles(published_at desc, user_id desc) where is_public;
create or replace function public.touch_social_profile() returns trigger
language plpgsql set search_path = '' as $$
begin new.published_at = old.published_at; new.updated_at = now(); return new; end; $$;
revoke all on function public.touch_social_profile() from public, anon, authenticated;
drop trigger if exists touch_social_profile on public.social_taste_profiles;
create trigger touch_social_profile before update on public.social_taste_profiles for each row execute function public.touch_social_profile();

create table if not exists public.social_taste_comments (
 id uuid primary key,
 profile_id uuid not null references public.social_taste_profiles(user_id) on delete cascade,
 author_id uuid not null references auth.users(id) on delete cascade,
 author_name text not null check (char_length(btrim(author_name)) between 1 and 40),
 body text not null check (char_length(btrim(body)) between 1 and 1000),
 created_at timestamptz not null default now()
);
create index if not exists social_comments_profile on public.social_taste_comments(profile_id,created_at desc,id desc);
create index if not exists social_comments_author on public.social_taste_comments(author_id,created_at desc);
alter table public.social_taste_profiles enable row level security;
alter table public.social_taste_comments enable row level security;
revoke all on public.social_taste_profiles, public.social_taste_comments from anon, authenticated;
grant select on public.social_taste_profiles, public.social_taste_comments to anon, authenticated;
grant insert (user_id, display_name, headline, snapshot, is_public), update (user_id, display_name, headline, snapshot, is_public) on public.social_taste_profiles to authenticated;
grant delete on public.social_taste_comments to authenticated;
drop policy if exists "Read published social profiles or own draft" on public.social_taste_profiles;
create policy "Read published social profiles or own draft" on public.social_taste_profiles for select to anon,authenticated using (is_public or (select auth.uid()) = user_id);
drop policy if exists "Publish own social profile" on public.social_taste_profiles;
create policy "Publish own social profile" on public.social_taste_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Update own social profile" on public.social_taste_profiles;
create policy "Update own social profile" on public.social_taste_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Read comments on visible profiles" on public.social_taste_comments;
create policy "Read comments on visible profiles" on public.social_taste_comments for select to anon,authenticated using (
 exists(select 1 from public.social_taste_profiles p where p.user_id = profile_id and (p.is_public or p.user_id = (select auth.uid())))
);
drop policy if exists "Author or profile owner removes comments" on public.social_taste_comments;
create policy "Author or profile owner removes comments" on public.social_taste_comments for delete to authenticated using (
 (select auth.uid()) = author_id or (select auth.uid()) = profile_id
);

create or replace function public.add_social_taste_comment(target_profile_id uuid, comment_body text, public_name text, request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare viewer uuid := auth.uid(); existing public.social_taste_comments; inserted public.social_taste_comments;
begin
 if viewer is null then raise exception 'social_login_required' using errcode = '42501'; end if;
 if request_id is null or comment_body is null or char_length(btrim(comment_body)) not between 1 and 1000
    or public_name is null or char_length(btrim(public_name)) not between 1 and 40 then raise exception 'social_invalid_comment'; end if;
 -- Serialize comments per account, including parallel calls and retries.
 perform pg_advisory_xact_lock(hashtextextended(viewer::text, 721));
 -- A row lock makes publication changes and a concurrent comment atomic.
 perform 1 from public.social_taste_profiles where user_id = target_profile_id and is_public for share;
 if not found then raise exception 'social_profile_private'; end if;
 select * into existing from public.social_taste_comments where id = request_id;
 if found then
   if existing.author_id <> viewer or existing.profile_id <> target_profile_id or existing.body <> btrim(comment_body)
      or existing.author_name <> btrim(public_name) then raise exception 'social_request_conflict'; end if;
   return to_jsonb(existing);
 end if;
 if (select count(*) from public.social_taste_comments where author_id = viewer and created_at > now() - interval '10 minutes') >= 20 then
   raise exception 'social_rate_limited';
 end if;
 insert into public.social_taste_comments(id,profile_id,author_id,author_name,body)
 values(request_id,target_profile_id,viewer,btrim(public_name),btrim(comment_body)) returning * into inserted;
 return to_jsonb(inserted);
end; $$;
revoke all on function public.add_social_taste_comment(uuid,text,text,uuid) from public,anon;
grant execute on function public.add_social_taste_comment(uuid,text,text,uuid) to authenticated;
commit;
