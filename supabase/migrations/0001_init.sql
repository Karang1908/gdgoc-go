-- ============================================================
-- GDG Go — Supabase init migration
-- ============================================================
-- Applies the schema + RLS from docs/PROJECT.md §6.
-- Run in the Supabase SQL editor (or `supabase db push` against a local stack).
-- Idempotent-ish — uses IF NOT EXISTS where it matters.
-- ============================================================

-- ---------- 1. Application tables ----------

create table if not exists public.users (
  id           uuid primary key references auth.users on delete cascade,
  username     text        not null,
  display_name text        not null,
  created_at   timestamptz not null default now()
);

create unique index if not exists users_username_unique
  on public.users (username);

create table if not exists public.scores (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users (id) on delete cascade,
  username     text        not null,
  display_name text        not null,
  score        integer     not null check (score   between 0 and 1000000),
  coins        integer     not null check (coins   between 0 and 100000),
  distance     integer     not null check (distance between 0 and 1000000),
  created_at   timestamptz not null default now()
);

create index if not exists scores_score_desc
  on public.scores (score desc);
create index if not exists scores_user_id
  on public.scores (user_id);

-- ---------- 2. Row-Level Security ----------

alter table public.users  enable row level security;
alter table public.scores enable row level security;

-- users: anyone may read a profile (we show display_name on the leaderboard),
--        only the owner may write.
drop policy if exists "public read users"  on public.users;
drop policy if exists "owner writes user"  on public.users;
create policy "public read users"  on public.users for select using (true);
create policy "owner writes user"  on public.users for all
  using (auth.uid() = id) with check (auth.uid() = id);

-- scores: anyone may read (public leaderboard), only owner may insert,
--         never update, never delete.
drop policy if exists "public read scores"  on public.scores;
drop policy if exists "owner insert scores" on public.scores;
drop policy if exists "no update scores"    on public.scores;
drop policy if exists "no delete scores"    on public.scores;
create policy "public read scores"  on public.scores for select using (true);
create policy "owner insert scores" on public.scores for insert
  with check (auth.uid() = user_id);
create policy "no update scores"   on public.scores for update using (false);
create policy "no delete scores"   on public.scores for delete using (false);

-- ---------- 3. Auto-fill user profile on signup (optional convenience) ----------
-- If you skip the C# users-table insert from AuthAPI, this trigger will write
-- the profile row for you once Auth creates the auth.users entry.
-- Uncomment if you'd rather rely on it instead of the C# insert in AuthAPI.SignUp.

-- create or replace function public.handle_new_user()
-- returns trigger
-- language plpgsql security definer
-- as $$
-- begin
--   insert into public.users (id, username, display_name)
--   values (new.id,
--           split_part(new.email, '@', 1),
--           split_part(new.email, '@', 1))
--   on conflict (id) do nothing;
--   return new;
-- end;
-- $$;
--
-- drop trigger if exists on_auth_user_created on auth.users;
-- create trigger on_auth_user_created
--   after insert on auth.users
--   for each row execute procedure public.handle_new_user();
