-- ============================================================
-- GDG Go — Migration 0003: Relational Leaderboard & Admin DB Editing
-- ============================================================
-- 1. Enforces strict relational foreign keys between users and scores.
-- 2. Grants database administrators / Supabase Studio permissions to edit/delete any score.
-- 3. Creates the `public.leaderboard` table to store final leaderboard rankings and stats.
-- 4. Creates automated trigger to synchronize `public.leaderboard` on any score change.
-- ============================================================

-- ---------- 1. Ensure Relational Integrity ----------
do $$
begin
  -- Ensure foreign key constraint from scores to users exists with cascade options
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'scores_user_id_fkey' and table_name = 'scores'
  ) then
    alter table public.scores
      add constraint scores_user_id_fkey
      foreign key (user_id) references public.users(id)
      on delete cascade on update cascade;
  end if;
end $$;

create index if not exists scores_user_score_relational_idx
  on public.scores (user_id, score desc);

-- ---------- 2. Allow Direct Editing & Deletion in Database / Studio ----------
drop policy if exists "no update scores" on public.scores;
drop policy if exists "no delete scores" on public.scores;
drop policy if exists "allow update scores" on public.scores;
drop policy if exists "allow delete scores" on public.scores;

-- Allow authenticated users to manage their scores and dashboard admins / service_role full control
create policy "allow update scores" on public.scores for update
  using (
    auth.uid() = user_id
    or auth.role() in ('service_role', 'postgres', 'supabase_admin')
    or auth.jwt() is null -- Direct psql / dashboard queries
  )
  with check (
    auth.uid() = user_id
    or auth.role() in ('service_role', 'postgres', 'supabase_admin')
    or auth.jwt() is null
  );

create policy "allow delete scores" on public.scores for delete
  using (
    auth.uid() = user_id
    or auth.role() in ('service_role', 'postgres', 'supabase_admin')
    or auth.jwt() is null
  );

-- ---------- 3. Final Leaderboard Schema (public.leaderboard) ----------
create table if not exists public.leaderboard (
  user_id          uuid primary key references public.users(id) on delete cascade,
  username         text        not null,
  display_name     text        not null,
  best_score       integer     not null default 0 check (best_score >= 0),
  total_coins      integer     not null default 0 check (total_coins >= 0),
  total_gdg_coins  integer     not null default 0 check (total_gdg_coins >= 0),
  best_distance    integer     not null default 0 check (best_distance >= 0),
  total_games      integer     not null default 0 check (total_games >= 0),
  rank             integer,
  last_played      timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists leaderboard_best_score_desc_idx
  on public.leaderboard (best_score desc);
create index if not exists leaderboard_rank_idx
  on public.leaderboard (rank asc);

alter table public.leaderboard enable row level security;

drop policy if exists "public read leaderboard" on public.leaderboard;
drop policy if exists "allow write leaderboard" on public.leaderboard;

create policy "public read leaderboard" on public.leaderboard
  for select using (true);

create policy "allow write leaderboard" on public.leaderboard
  for all
  using (
    auth.uid() = user_id
    or auth.role() in ('service_role', 'postgres', 'supabase_admin')
    or auth.jwt() is null
  );

-- ---------- 4. Automated Synchronization Trigger ----------
create or replace function public.recompute_leaderboard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
begin
  if tg_op = 'DELETE' then
    target_user_id := old.user_id;
  else
    target_user_id := new.user_id;
  end if;

  if target_user_id is not null then
    -- Recompute single user's leaderboard metrics
    insert into public.leaderboard (
      user_id,
      username,
      display_name,
      best_score,
      total_coins,
      total_gdg_coins,
      best_distance,
      total_games,
      last_played,
      updated_at
    )
    select
      u.id as user_id,
      u.username,
      u.display_name,
      coalesce(max(s.score), 0) as best_score,
      coalesce(sum(s.coins), 0) as total_coins,
      coalesce(sum(greatest(1, floor(s.coins / 15))), 0) as total_gdg_coins,
      coalesce(max(s.distance), 0) as best_distance,
      coalesce(count(s.id), 0) as total_games,
      coalesce(max(s.created_at), now()) as last_played,
      now() as updated_at
    from public.users u
    left join public.scores s on s.user_id = u.id
    where u.id = target_user_id
    group by u.id, u.username, u.display_name
    on conflict (user_id) do update set
      username = excluded.username,
      display_name = excluded.display_name,
      best_score = excluded.best_score,
      total_coins = excluded.total_coins,
      total_gdg_coins = excluded.total_gdg_coins,
      best_distance = excluded.best_distance,
      total_games = excluded.total_games,
      last_played = excluded.last_played,
      updated_at = excluded.updated_at;
  end if;

  -- Recompute global rank numbers for all drivers with positive scores
  with ranked as (
    select user_id, row_number() over (order by best_score desc, updated_at asc) as new_rank
    from public.leaderboard
    where best_score > 0
  )
  update public.leaderboard l
  set rank = r.new_rank
  from ranked r
  where l.user_id = r.user_id;

  return null;
end;
$$;

drop trigger if exists scores_sync_leaderboard on public.scores;
create trigger scores_sync_leaderboard
  after insert or update or delete on public.scores
  for each row execute function public.recompute_leaderboard();

-- ---------- 5. Initial Population of public.leaderboard ----------
insert into public.leaderboard (
  user_id,
  username,
  display_name,
  best_score,
  total_coins,
  total_gdg_coins,
  best_distance,
  total_games,
  last_played,
  updated_at
)
select
  u.id as user_id,
  u.username,
  u.display_name,
  coalesce(max(s.score), 0) as best_score,
  coalesce(sum(s.coins), 0) as total_coins,
  coalesce(sum(greatest(1, floor(s.coins / 15))), 0) as total_gdg_coins,
  coalesce(max(s.distance), 0) as best_distance,
  coalesce(count(s.id), 0) as total_games,
  coalesce(max(s.created_at), now()) as last_played,
  now() as updated_at
from public.users u
left join public.scores s on s.user_id = u.id
group by u.id, u.username, u.display_name
on conflict (user_id) do update set
  username = excluded.username,
  display_name = excluded.display_name,
  best_score = excluded.best_score,
  total_coins = excluded.total_coins,
  total_gdg_coins = excluded.total_gdg_coins,
  best_distance = excluded.best_distance,
  total_games = excluded.total_games,
  last_played = excluded.last_played,
  updated_at = excluded.updated_at;

with ranked as (
  select user_id, row_number() over (order by best_score desc, updated_at asc) as new_rank
  from public.leaderboard
  where best_score > 0
)
update public.leaderboard l
set rank = r.new_rank
from ranked r
where l.user_id = r.user_id;
