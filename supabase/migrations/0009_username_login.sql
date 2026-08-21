-- 0009_username_login.sql
--
-- GOAL
-- Players sign up once with a username, a password and an email address, and
-- from then on sign in with **username + password only**. The email address is
-- operator-facing contact data: it is never shown in the UI and never readable
-- by a browser role.
--
-- HOW USERNAME LOGIN WORKS WITHOUT AN EMAIL LOOKUP
-- Supabase's password provider authenticates against auth.users.email, so the
-- auth identity becomes the deterministic synthetic address
--     <username>@gdg-go.local
-- The client derives it from the typed username, so signing in needs no server
-- lookup at all. That matters for security: any username -> real-email resolver
-- is an enumeration oracle, and it would re-open exactly the exposure that
-- migration 0008 closed. There is no such endpoint here.
--
-- WHERE THE REAL EMAIL LIVES
-- public.users.email, still unreadable by anon and authenticated (0008). It is
-- written through the SECURITY DEFINER RPC below rather than by a direct table
-- write, because PostgREST's .upsert() emits
--     ON CONFLICT DO UPDATE SET email = excluded.email
-- which requires SELECT privilege on the column. The RPC lets the browser write
-- an address it can never read back.
--
-- WHAT THIS REPLACES
-- Migration 0008 kept public.users.email in step with auth.users.email via the
-- users_sync_email trigger. Under this migration auth.users.email is the
-- synthetic address, so that trigger would overwrite every player's real
-- address with "<username>@gdg-go.local". It is therefore dropped here.
--
-- Operators read addresses with the service_role key or the Supabase
-- dashboard, both of which bypass RLS and column grants by design.

begin;

-- ---------- 1. Retire the 0008 sync trigger ----------

drop trigger if exists users_sync_email on public.users;
drop function if exists public.sync_user_email();

-- ---------- 2. One RPC owns profile creation ----------

create or replace function public.register_profile(
  p_username     text,
  p_display_name text,
  p_email        text
)
returns table (
  id           uuid,
  username     text,
  display_name text
)
language plpgsql
security definer
set search_path = ''
as $$
-- The RETURNS TABLE output names (id, username, display_name) shadow the
-- table's own columns inside this body; resolve such references to the column.
#variable_conflict use_column
declare
  v_user_id  uuid := auth.uid();
  v_username text := lower(trim(p_username));
  v_display  text := trim(p_display_name);
  v_email    text := lower(trim(p_email));
begin
  if v_user_id is null or auth.role() <> 'authenticated' then
    raise exception 'You must be signed in to create a driver profile.'
      using errcode = 'insufficient_privilege';
  end if;

  if v_username !~ '^[a-z0-9_-]{3,24}$' then
    raise exception 'Usernames are 3-24 characters, using letters, numbers, _ or -.'
      using errcode = 'check_violation';
  end if;

  if coalesce(char_length(v_display), 0) not between 2 and 24 then
    raise exception 'Display names are 2-24 characters.' using errcode = 'check_violation';
  end if;

  -- Format only. An address is not proven to belong to the player, and this
  -- migration deliberately does not try to prove it.
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$' then
    raise exception 'Enter a valid email address.' using errcode = 'check_violation';
  end if;

  -- The unique index on username is the real arbiter; this check only turns a
  -- race into a clearer message for the common case.
  if exists (
    select 1 from public.users u
    where u.username = v_username and u.id <> v_user_id
  ) then
    raise exception 'This username is already taken.' using errcode = 'unique_violation';
  end if;

  insert into public.users as u (id, username, display_name, email)
  values (v_user_id, v_username, v_display, v_email)
  on conflict (id) do update
    set username     = excluded.username,
        display_name = excluded.display_name,
        email        = coalesce(excluded.email, u.email);

  return query
  select u.id, u.username, u.display_name
  from public.users u
  where u.id = v_user_id;
end;
$$;

revoke all on function public.register_profile(text, text, text)
  from public, anon, authenticated;
grant execute on function public.register_profile(text, text, text) to authenticated;

-- ---------- 3. Username availability without exposing anything else ----------
-- The signup form needs to answer "is this handle free?". Usernames are already
-- public on the leaderboard, so this leaks nothing new, and it keeps the client
-- off any query that touches the email column.

create or replace function public.username_is_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.users u where u.username = lower(trim(p_username))
  )
$$;

revoke all on function public.username_is_available(text) from public, anon, authenticated;
grant execute on function public.username_is_available(text) to anon, authenticated;

commit;
