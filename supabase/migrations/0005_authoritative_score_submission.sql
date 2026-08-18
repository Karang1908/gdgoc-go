-- ============================================================
-- GDG Go — Authoritative, idempotent score submission
-- ============================================================
-- New runs are submitted through submit_game_score(). The RPC owns identity,
-- writes exact GDG-pill totals, and makes retries safe with a per-run UUID.
-- Existing rows remain readable and retain their legacy GDG-coin estimate.
-- ============================================================

-- ---------- 1. Give every new run a stable identity ----------

alter table public.scores
  add column if not exists run_id uuid;

alter table public.scores
  add column if not exists bonus_score integer not null default 0 check (bonus_score between 0 and 500000);

create unique index if not exists scores_user_run_unique
  on public.scores (user_id, run_id)
  where run_id is not null;

alter table public.scores drop constraint if exists scores_exact_gdg_coins;
alter table public.scores add constraint scores_exact_gdg_coins
  check (run_id is null or gdg_coins = pills);

-- The live game reaches roughly 71.3 m/s while boosted. Keep a small amount of
-- frame-timing headroom without changing the submitted duration telemetry.
alter table public.scores drop constraint if exists scores_distance_vs_time;
alter table public.scores add constraint scores_distance_vs_time
  check (duration_seconds = 0 or distance <= duration_seconds * 75);

-- Legacy rows counted pills inside `coins`; new run-ID rows keep standard coins
-- and pills separate. Preserve the old envelope while validating the new meaning.
alter table public.scores drop constraint if exists scores_coins_vs_distance;
alter table public.scores add constraint scores_coins_vs_distance
  check (
    (run_id is null and coins <= distance + 50)
    or
    (run_id is not null and coins + pills <= distance + 50)
  );

alter table public.scores drop constraint if exists scores_score_matches_run;
alter table public.scores add constraint scores_score_matches_run
  check (
    (
      run_id is null
      and score >= distance * 2 + coins
      and score <= distance * 2 + coins * 400
    )
    or
    (
      run_id is not null
      and score >= distance * 2 + coins + pills * 25 + bonus_score
      and score <= distance * 2 + (coins + pills) * 400 + bonus_score
    )
  );

alter table public.scores drop constraint if exists scores_bonus_matches_run;
alter table public.scores add constraint scores_bonus_matches_run
  check (
    run_id is null
    or (bonus_score % 50 = 0 and bonus_score <= (duration_seconds + 1) * 60)
  );

-- ---------- 2. Make score and leaderboard rows client-immutable ----------

drop policy if exists "owner insert scores" on public.scores;
drop policy if exists "allow update scores" on public.scores;
drop policy if exists "allow delete scores" on public.scores;
drop policy if exists "no direct insert scores" on public.scores;
drop policy if exists "no update scores" on public.scores;
drop policy if exists "no delete scores" on public.scores;

create policy "no direct insert scores" on public.scores
  for insert with check (false);
create policy "no update scores" on public.scores
  for update using (false);
create policy "no delete scores" on public.scores
  for delete using (false);

drop policy if exists "allow write leaderboard" on public.leaderboard;

revoke insert, update, delete on public.scores from anon, authenticated;
revoke insert, update, delete on public.leaderboard from anon, authenticated;
grant select on public.scores to anon, authenticated;
grant select on public.leaderboard to anon, authenticated;

-- ---------- 3. Keep duplicate retries outside the hourly rate count ----------

create or replace function public.enforce_score_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count integer;
begin
  if new.run_id is not null and exists (
    select 1
    from public.scores s
    where s.user_id = new.user_id
      and s.run_id = new.run_id
  ) then
    return new;
  end if;

  select count(*) into recent_count
  from public.scores s
  where s.user_id = new.user_id
    and s.created_at > now() - interval '1 hour';

  if recent_count >= 20 then
    raise exception 'Score submission rate limit exceeded. Try again later.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- ---------- 4. Recompute exact totals and deterministic ranks ----------

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
      u.id,
      u.username,
      u.display_name,
      coalesce(max(s.score), 0),
      coalesce(sum(s.coins), 0)::integer,
      coalesce(sum(
        case
          when s.run_id is not null then s.pills
          when s.pills > 0 then s.pills
          when s.gdg_coins > 0 then s.gdg_coins
          when s.id is not null then greatest(1, floor(s.coins / 15.0))::integer
          else 0
        end
      ), 0)::integer,
      coalesce(max(s.distance), 0),
      coalesce(count(s.id), 0)::integer,
      coalesce(max(s.created_at), now()),
      now()
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

  update public.leaderboard
  set rank = null
  where best_score <= 0 and rank is not null;

  with ranked as (
    select
      user_id,
      row_number() over (
        order by best_score desc, best_distance desc, last_played asc, user_id asc
      )::integer as new_rank
    from public.leaderboard
    where best_score > 0
  )
  update public.leaderboard l
  set rank = r.new_rank
  from ranked r
  where l.user_id = r.user_id
    and l.rank is distinct from r.new_rank;

  return null;
end;
$$;

-- ---------- 5. Submit a run through one authenticated transaction ----------

create or replace function public.submit_game_score(
  p_run_id uuid,
  p_score integer,
  p_coins integer,
  p_pills integer,
  p_bonus_score integer,
  p_distance integer,
  p_duration_seconds integer
)
returns table (
  submission_status text,
  score_id uuid,
  is_personal_best boolean,
  best_score integer,
  total_coins integer,
  total_gdg_coins integer,
  best_distance integer,
  total_games integer,
  rank integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  submitting_user_id uuid := auth.uid();
  inserted_score_id uuid;
  existing_score_id uuid;
  prior_best integer;
  result_status text := 'saved';
  result_is_personal_best boolean := false;
begin
  if submitting_user_id is null or auth.role() <> 'authenticated' then
    raise exception 'You must be signed in to save a score.'
      using errcode = 'insufficient_privilege';
  end if;

  if p_run_id is null then
    raise exception 'A run ID is required.' using errcode = 'not_null_violation';
  end if;

  if p_score is null or p_coins is null or p_pills is null or p_bonus_score is null
     or p_distance is null or p_duration_seconds is null then
    raise exception 'Run totals cannot be null.' using errcode = 'not_null_violation';
  end if;

  if p_score < 0 or p_coins < 0 or p_pills < 0 or p_bonus_score < 0 or p_distance < 0
     or p_duration_seconds < 1 then
    raise exception 'Run totals must be non-negative and duration must be positive.'
      using errcode = 'check_violation';
  end if;

  if not exists (select 1 from public.users u where u.id = submitting_user_id) then
    raise exception 'Your driver profile is missing. Sign out and sign in again.'
      using errcode = 'foreign_key_violation';
  end if;

  select s.id into existing_score_id
  from public.scores s
  where s.user_id = submitting_user_id and s.run_id = p_run_id;

  if existing_score_id is not null then
    result_status := 'duplicate';
    inserted_score_id := existing_score_id;
  else
    select max(s.score) into prior_best
    from public.scores s
    where s.user_id = submitting_user_id;

    insert into public.scores (
      user_id,
      username,
      display_name,
      run_id,
      score,
      coins,
      pills,
      gdg_coins,
      bonus_score,
      distance,
      duration_seconds
    )
    select
      u.id,
      u.username,
      u.display_name,
      p_run_id,
      p_score,
      p_coins,
      p_pills,
      p_pills,
      p_bonus_score,
      p_distance,
      p_duration_seconds
    from public.users u
    where u.id = submitting_user_id
    on conflict (user_id, run_id) where run_id is not null do nothing
    returning id into inserted_score_id;

    if inserted_score_id is null then
      select s.id into inserted_score_id
      from public.scores s
      where s.user_id = submitting_user_id and s.run_id = p_run_id;
      result_status := 'duplicate';
    else
      result_is_personal_best := prior_best is null or p_score > prior_best;
    end if;
  end if;

  return query
  select
    result_status,
    inserted_score_id,
    result_is_personal_best,
    coalesce(l.best_score, p_score),
    coalesce(l.total_coins, p_coins),
    coalesce(l.total_gdg_coins, p_pills),
    coalesce(l.best_distance, p_distance),
    coalesce(l.total_games, 1),
    l.rank
  from public.users u
  left join public.leaderboard l on l.user_id = u.id
  where u.id = submitting_user_id;
end;
$$;

revoke all on function public.submit_game_score(uuid, integer, integer, integer, integer, integer, integer) from public;
grant execute on function public.submit_game_score(uuid, integer, integer, integer, integer, integer, integer) to authenticated;

-- ---------- 6. Repair existing aggregates with the corrected formula ----------

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
  u.id,
  u.username,
  u.display_name,
  coalesce(max(s.score), 0),
  coalesce(sum(s.coins), 0)::integer,
  coalesce(sum(
    case
      when s.run_id is not null then s.pills
      when s.pills > 0 then s.pills
      when s.gdg_coins > 0 then s.gdg_coins
      when s.id is not null then greatest(1, floor(s.coins / 15.0))::integer
      else 0
    end
  ), 0)::integer,
  coalesce(max(s.distance), 0),
  coalesce(count(s.id), 0)::integer,
  coalesce(max(s.created_at), now()),
  now()
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

update public.leaderboard set rank = null where best_score <= 0;

with ranked as (
  select
    user_id,
    row_number() over (
      order by best_score desc, best_distance desc, last_played asc, user_id asc
    )::integer as new_rank
  from public.leaderboard
  where best_score > 0
)
update public.leaderboard l
set rank = r.new_rank
from ranked r
where l.user_id = r.user_id;
