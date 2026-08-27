-- 0010_clubs_and_associations.sql
--
-- Adds a temporary, ID-based sign-in path for clubs and associations.
--
-- An ID is registered in this table on first use and resolves to the same
-- deterministic synthetic Auth identity on later visits. The ID and supplied
-- name are copied into public.users, so the existing score RPCs and leaderboard
-- continue to derive identity from auth.uid().

begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.clubs_and_associations (
  id                uuid primary key default gen_random_uuid(),
  issued_id         text not null,
  display_name      text,
  auth_user_id      uuid unique references auth.users (id) on delete set null,
  active            boolean not null default true,
  claimed_at        timestamptz,
  last_sign_in_at   timestamptz,
  sign_in_count     integer not null default 0 check (sign_in_count >= 0),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint clubs_and_associations_issued_id_length
    check (char_length(trim(issued_id)) between 1 and 64),
  constraint clubs_and_associations_display_name_length
    check (display_name is null or char_length(trim(display_name)) between 2 and 24)
);

-- These ALTERs also upgrade a database where the first draft of Migration
-- 0010 was already applied with a restrictive letters/numbers-only check.
alter table public.clubs_and_associations
  drop constraint if exists clubs_and_associations_issued_id_format;
alter table public.clubs_and_associations
  drop constraint if exists clubs_and_associations_issued_id_length;
alter table public.clubs_and_associations
  add constraint clubs_and_associations_issued_id_length
  check (char_length(trim(issued_id)) between 1 and 64);

create unique index if not exists clubs_and_associations_issued_id_unique
  on public.clubs_and_associations (lower(trim(issued_id)));

create index if not exists clubs_and_associations_auth_user_idx
  on public.clubs_and_associations (auth_user_id)
  where auth_user_id is not null;

comment on table public.clubs_and_associations is
  'IDs registered on first use and their claimed names for the temporary Clubs and Associations sign-in route.';
comment on column public.clubs_and_associations.issued_id is
  'Case-preserving external ID. Its first successful use creates and claims this row.';
comment on column public.clubs_and_associations.display_name is
  'Mandatory player name supplied at the most recent successful sign-in.';

alter table public.clubs_and_associations enable row level security;

-- There is deliberately no browser-facing table policy. Registered identities
-- must not be enumerable, and claims are written only through the function below.
revoke all on public.clubs_and_associations from public, anon, authenticated;

create or replace function public.claim_club_or_association(
  p_issued_id text,
  p_display_name text
)
returns table (
  id uuid,
  username text,
  display_name text
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_user_id uuid := auth.uid();
  v_normalized_id text := lower(trim(p_issued_id));
  v_display_name text := trim(p_display_name);
  v_auth_email text;
  v_access public.clubs_and_associations%rowtype;
begin
  if v_user_id is null or auth.role() <> 'authenticated' then
    raise exception 'You must be signed in to use a Clubs and Associations ID.'
      using errcode = 'insufficient_privilege';
  end if;

  if coalesce(char_length(v_normalized_id), 0) not between 1 and 64 then
    raise exception 'Clubs and Associations IDs must be 1-64 characters.'
      using errcode = 'check_violation';
  end if;

  if coalesce(char_length(v_display_name), 0) not between 2 and 24 then
    raise exception 'Names are 2-24 characters.' using errcode = 'check_violation';
  end if;

  -- The web client derives this Auth address from the SHA-256 hash of the ID.
  -- Hashing allows IDs to contain arbitrary characters without putting them in
  -- an email local-part, and prevents a normal password account from attaching
  -- itself to an ID row.
  select lower(a.email) into v_auth_email
  from auth.users a
  where a.id = v_user_id;

  if v_auth_email is distinct from (
    'club-' || substr(
      encode(extensions.digest(convert_to(v_normalized_id, 'UTF8'), 'sha256'), 'hex'),
      1,
      48
    ) ||
    '@gdg-go.local'
  ) then
    raise exception 'This session is not valid for that Clubs and Associations ID.'
      using errcode = 'insufficient_privilege';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_normalized_id, 7010));

  select c.* into v_access
  from public.clubs_and_associations c
  where lower(trim(c.issued_id)) = v_normalized_id
  for update;

  if not found then
    insert into public.clubs_and_associations (issued_id)
    values (trim(p_issued_id))
    returning * into v_access;
  end if;

  if not v_access.active then
    raise exception 'That Clubs and Associations ID is inactive.'
      using errcode = 'insufficient_privilege';
  end if;

  if v_access.auth_user_id is not null and v_access.auth_user_id <> v_user_id then
    raise exception 'That Clubs and Associations ID is already assigned.'
      using errcode = 'insufficient_privilege';
  end if;

  -- public.users.username is what the current leaderboard renders. Refuse a
  -- collision instead of silently changing the operator-issued ID.
  if exists (
    select 1
    from public.users u
    where lower(u.username) = lower(v_access.issued_id)
      and u.id <> v_user_id
  ) then
    raise exception 'That issued ID conflicts with an existing driver profile.'
      using errcode = 'unique_violation';
  end if;

  update public.clubs_and_associations c
  set auth_user_id = v_user_id,
      display_name = v_display_name,
      claimed_at = coalesce(c.claimed_at, now()),
      last_sign_in_at = now(),
      sign_in_count = c.sign_in_count + 1,
      updated_at = now()
  where c.id = v_access.id;

  insert into public.users as u (id, username, display_name, email)
  values (v_user_id, v_access.issued_id, v_display_name, null)
  on conflict (id) do update
    set username = excluded.username,
        display_name = excluded.display_name;

  -- Keep an existing standing current even before the player records another
  -- score. New score rows are already stamped from public.users by 0007.
  update public.leaderboard l
  set username = v_access.issued_id,
      display_name = v_display_name,
      updated_at = now()
  where l.user_id = v_user_id;

  return query
  select u.id, u.username, u.display_name
  from public.users u
  where u.id = v_user_id;
end;
$$;

revoke all on function public.claim_club_or_association(text, text)
  from public, anon, authenticated;
grant execute on function public.claim_club_or_association(text, text) to authenticated;

commit;
