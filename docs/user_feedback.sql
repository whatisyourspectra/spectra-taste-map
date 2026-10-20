-- Run once in the existing Supabase project's SQL Editor.
-- Feedback is private: the browser can submit via RPC but cannot read any rows.
begin;

create table if not exists public.user_feedback (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    user_id uuid references auth.users(id) on delete set null,
    client_id uuid not null,
    category text not null check (category in ('question', 'bug', 'suggestion', 'other')),
    subject text not null check (char_length(btrim(subject)) between 2 and 120),
    message text not null check (char_length(btrim(message)) between 10 and 4000),
    email text check (email is null or (char_length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
    page_path text not null check (char_length(page_path) <= 200 and left(page_path, 1) = '/' and position('?' in page_path) = 0 and position('#' in page_path) = 0),
    device_type text not null check (device_type in ('mobile', 'desktop')),
    consent_at timestamptz not null default now(),
    status text not null default 'new' check (status in ('new', 'reviewing', 'resolved'))
);
create index if not exists user_feedback_client_created on public.user_feedback (client_id, created_at desc);
create index if not exists user_feedback_user_created on public.user_feedback (user_id, created_at desc) where user_id is not null;
create index if not exists user_feedback_status_created on public.user_feedback (status, created_at desc);
alter table public.user_feedback enable row level security;
revoke all on table public.user_feedback from public, anon, authenticated;
grant all on table public.user_feedback to service_role;

create or replace function public.submit_user_feedback(
    p_request_id uuid,
    p_client_id uuid,
    p_category text,
    p_subject text,
    p_message text,
    p_email text,
    p_page_path text,
    p_device_type text,
    p_consent boolean
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    actor uuid := auth.uid();
    existing_id uuid;
begin
    if p_consent is distinct from true or p_request_id is null or p_client_id is null then
        raise exception 'feedback_invalid_input' using errcode = '22023';
    end if;
    -- Serialize the rate-limit check and insert across parallel requests.
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_client_id::text, 0));
    if actor is not null then
        perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text, 1));
    end if;
    -- A retry after an uncertain connection result must not duplicate the message.
    select id into existing_id from public.user_feedback
        where id = p_request_id and client_id = p_client_id
          and user_id is not distinct from actor;
    if existing_id is not null then return existing_id; end if;

    if (select count(*) from public.user_feedback
        where created_at > now() - interval '15 minutes'
          and (client_id = p_client_id or (actor is not null and user_id = actor))) >= 5 then
        raise exception 'feedback_rate_limited' using errcode = 'P0001';
    end if;
    insert into public.user_feedback
        (id, client_id, user_id, category, subject, message, email, page_path, device_type)
    values
        (p_request_id, p_client_id, actor, p_category, btrim(p_subject), btrim(p_message),
         nullif(btrim(p_email), ''), p_page_path, p_device_type);
    return p_request_id;
end;
$$;
revoke all on function public.submit_user_feedback(uuid, uuid, text, text, text, text, text, text, boolean) from public;
grant execute on function public.submit_user_feedback(uuid, uuid, text, text, text, text, text, text, boolean) to anon, authenticated;
comment on table public.user_feedback is 'Private SPECTRA inquiries and feedback. Review with the Supabase dashboard; no public read access.';
notify pgrst, 'reload schema';
commit;
