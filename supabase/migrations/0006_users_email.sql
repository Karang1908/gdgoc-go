-- ============================================================
-- GDG Go — Migration 0006: Add Email Column to public.users
-- ============================================================
-- 1. Adds `email` column to `public.users` so admins can view
--    player email addresses directly in Supabase Table Editor.
-- 2. Backfills existing emails from `auth.users`.
-- ============================================================

-- ---------- 1. Add email column to public.users ----------
alter table public.users
  add column if not exists email text;

-- Index for email lookups
create index if not exists idx_users_email on public.users (email);

-- ---------- 2. Backfill existing emails from auth.users ----------
update public.users u
set email = a.email
from auth.users a
where u.id = a.id and (u.email is null or u.email = '');

-- ---------- 3. Ensure permissions ----------
grant select, insert, update on public.users to authenticated;
grant select on public.users to anon;
