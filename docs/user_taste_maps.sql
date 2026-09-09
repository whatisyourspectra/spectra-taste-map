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

-- 기존 정책들 정리 후 upsert 및 모든 작업을 완벽하게 지원하는 통합 정책 적용
drop policy if exists "Users can select own taste map" on public.user_taste_maps;
drop policy if exists "Users can insert own taste map" on public.user_taste_maps;
drop policy if exists "Users can update own taste map" on public.user_taste_maps;
drop policy if exists "Users can delete own taste map" on public.user_taste_maps;
drop policy if exists "Users can manage own taste map" on public.user_taste_maps;

create policy "Users can manage own taste map"
    on public.user_taste_maps
    for all
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
