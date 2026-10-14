-- Run once in Supabase SQL Editor. Private account maps remain private.
create table if not exists public.shared_taste_maps (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object' and jsonb_typeof(snapshot->'tracks') = 'array' and jsonb_array_length(snapshot->'tracks') between 1 and 2000),
 created_at timestamptz not null default now()
);
alter table public.shared_taste_maps enable row level security;
revoke all on public.shared_taste_maps from anon;
grant select, insert, delete on public.shared_taste_maps to authenticated;
drop policy if exists "Owners manage their share snapshots" on public.shared_taste_maps;
create policy "Owners manage their share snapshots" on public.shared_taste_maps
 for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
-- Public reads require the unguessable exact UUID; no public listing or owner data.
create or replace function public.get_shared_taste_map(share_id uuid)
returns jsonb language sql stable security definer set search_path = ''
as $$ select snapshot from public.shared_taste_maps where id = share_id; $$;
revoke all on function public.get_shared_taste_map(uuid) from public;
grant execute on function public.get_shared_taste_map(uuid) to anon, authenticated;
