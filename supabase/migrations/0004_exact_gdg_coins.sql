-- ============================================================
-- GDG Go — Migration 0004: Exact Cumulative GDG Coins
-- ============================================================
-- 1. Adds `gdg_coins` and `pills` columns to `public.scores`.
-- 2. Updates `recompute_leaderboard` trigger to calculate exact cumulative GDG coins.
-- 3. Synchronizes `public.leaderboard` across all drivers.
-- ============================================================

-- ---------- 1. Add gdg_coins & pills columns to scores ----------
alter table public.scores
  add column if not exists gdg_coins integer not null default 0 check (gdg_coins >= 0);

alter table public.scores
  add column if not exists pills integer not null default 0 check (pills >= 0);

-- ---------- 2. Update Leaderboard Synchronization Trigger ----------
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
      coalesce(sum(
        case 
          when coalesce(s.gdg_coins, s.pills, 0) > 0 then coalesce(s.gdg_coins, s.pills)
          else greatest(1, floor(s.coins / 15))
        end
      ), 0) as total_gdg_coins,
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

-- ---------- 3. Initial Synchronization of public.leaderboard ----------
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
  coalesce(sum(
    case 
      when coalesce(s.gdg_coins, s.pills, 0) > 0 then coalesce(s.gdg_coins, s.pills)
      else greatest(1, floor(s.coins / 15))
    end
  ), 0) as total_gdg_coins,
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
