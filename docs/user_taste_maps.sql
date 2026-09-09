-- ==============================================================================
-- SPECTRA Taste Map: User Taste Map Cloud Storage Schema
-- ==============================================================================
-- Supabase Dashboard -> SQL Editor에 붙여넣고 [Run]을 누르면 적용됩니다.
-- 이 테이블은 각 로그인 사용자의 최신 취향 지도 데이터를 1:1로 영구 보관합니다.

create table if not exists public.user_taste_maps (
    user_id uuid primary key references auth.users(id) on delete cascade,
    map_id text not null,
    features_source text not null default 'none',
    stats jsonb,
    tracks jsonb not null,
    updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Row Level Security (RLS) 활성화: 다른 사용자가 내 지도를 보거나 수정할 수 없도록 보호
alter table public.user_taste_maps enable row level security;

-- 본인 데이터만 조회 가능
drop policy if exists "Users can select own taste map" on public.user_taste_maps;
create policy "Users can select own taste map"
    on public.user_taste_maps
    for select
    to authenticated
    using (auth.uid() = user_id);

-- 본인 데이터만 삽입 가능
drop policy if exists "Users can insert own taste map" on public.user_taste_maps;
create policy "Users can insert own taste map"
    on public.user_taste_maps
    for insert
    to authenticated
    with check (auth.uid() = user_id);

-- 본인 데이터만 수정 가능
drop policy if exists "Users can update own taste map" on public.user_taste_maps;
create policy "Users can update own taste map"
    on public.user_taste_maps
    for update
    to authenticated
    using (auth.uid() = user_id);

-- 본인 데이터만 삭제 가능
drop policy if exists "Users can delete own taste map" on public.user_taste_maps;
create policy "Users can delete own taste map"
    on public.user_taste_maps
    for delete
    to authenticated
    using (auth.uid() = user_id);
