-- 0008_restrict_player_email.sql
--
-- PROBLEM
-- Migration 0006 added public.users.email and left a table-wide SELECT grant in
-- place. Combined with the original `public read users using (true)` policy,
-- every player's email address was readable through the public data API:
-- anyone holding the (deliberately public) anon key could enumerate them with
--     GET /rest/v1/users?select=email
-- The 0006 comment described admin-only visibility; the implemented result was
-- public. Confirmed by executing the query as `anon` on a migrated database.
--
-- FIX
-- The column becomes server-maintained and browser-invisible:
--   * anon and authenticated can SELECT only the public profile columns;
--   * neither role may write email at all — a BEFORE trigger copies the
--     authoritative address from auth.users on every insert/update.
-- So a player cannot read anyone's address (including their own, which the UI
-- never needed: the leaderboard header reads session.user.email from the auth
-- session), and cannot forge someone else's address into their profile row.
--
-- WHY A TRIGGER RATHER THAN A COLUMN GRANT
-- `INSERT ... ON CONFLICT DO UPDATE SET email = excluded.email` — exactly what
-- PostgREST's .upsert() emits — requires SELECT privilege on email. Granting
-- write-but-not-read is therefore not sufficient on its own; the client has to
-- stop sending the column, and the server has to fill it in. Verified: without
-- the trigger, revoking SELECT(email) breaks registration with
-- "permission denied for table users".
--
-- RELEASE NOTE
-- Ships with the frontend change that drops `email` from the public.users
-- select and upsert payloads. Apply this migration and deploy that build
-- together; the backfill below repairs any rows written in between.
--
-- Operators who need addresses (score verification, contacting winners) read
-- them with the service_role key or in the Supabase dashboard, both of which
-- bypass RLS and column grants by design.

begin;

-- ---------- 1. email is derived from auth.users, never from the client ----------

create or replace function public.sync_user_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select u.email into new.email
  from auth.users u
  where u.id = new.id;
  return new;
end;
$$;

revoke all on function public.sync_user_email() from public, anon, authenticated;

drop trigger if exists users_sync_email on public.users;
create trigger users_sync_email
  before insert or update on public.users
  for each row execute function public.sync_user_email();

-- ---------- 2. Browser roles lose the email column entirely ----------

revoke select, insert, update on public.users from anon, authenticated;

grant select (id, username, display_name, created_at)
  on public.users to anon, authenticated;

-- Note the absence of `email` in both lists: the trigger supplies it.
grant insert (id, username, display_name, created_at)
  on public.users to authenticated;
grant update (username, display_name)
  on public.users to authenticated;

-- ---------- 3. Repair anything written while the two halves were out of step ----------

update public.users u
set email = a.email
from auth.users a
where a.id = u.id
  and u.email is distinct from a.email;

commit;
