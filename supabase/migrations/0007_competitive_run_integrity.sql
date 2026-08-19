-- ============================================================
-- GDG Go — Migration 0007: Competitive run integrity
-- ============================================================
-- Replaces one-shot, client-authored score submission with a server-issued,
-- single-use run lifecycle:
--
--   start_game_run()       -> server UUID + opaque run secret
--   checkpoint_game_run()  -> append-only, server-timed telemetry checkpoints
--   submit_game_score()    -> finalizes only the latest accepted checkpoint
--
-- The browser still renders the game, but it no longer gets to invent an
-- arbitrary run UUID or insert an unchecked final total. All score arithmetic
-- and hard gameplay ceilings are owned by the database.
-- ============================================================

-- ---------- 1. Private run and checkpoint storage ----------

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.game_runs (
  id                    uuid primary key default gen_random_uuid(),
  run_secret            uuid not null default gen_random_uuid(),
  user_id               uuid not null references auth.users (id) on delete cascade,
  build_version         text not null check (char_length(build_version) between 1 and 80),
  car_id                text not null check (char_length(car_id) between 1 and 40),
  status                text not null default 'active'
                          check (status in ('active', 'submitted', 'abandoned', 'expired')),
  issued_at             timestamptz not null default now(),
  expires_at            timestamptz not null default (now() + interval '2 hours 15 minutes'),
  last_checkpoint_at    timestamptz,
  last_checkpoint_id    uuid,
  last_sequence         integer not null default 0 check (last_sequence >= 0),
  last_score            integer not null default 0,
  last_coin_score       integer not null default 0,
  last_coins            integer not null default 0,
  last_pills            integer not null default 0,
  last_bonus_score      integer not null default 0,
  last_distance         integer not null default 0,
  last_duration_seconds integer not null default 0,
  final_score_id        uuid references public.scores (id) on delete set null,
  submitted_at          timestamptz
);

create unique index if not exists game_runs_secret_unique
  on private.game_runs (run_secret);
create index if not exists game_runs_user_issued_idx
  on private.game_runs (user_id, issued_at desc);
create index if not exists game_runs_active_idx
  on private.game_runs (user_id, expires_at)
  where status = 'active';
create unique index if not exists game_runs_one_active_per_user
  on private.game_runs (user_id)
  where status = 'active';

create table if not exists private.game_run_checkpoints (
  checkpoint_id   uuid primary key,
  run_id          uuid not null references private.game_runs (id) on delete cascade,
  sequence_number integer not null check (sequence_number > 0),
  received_at     timestamptz not null default now(),
  score           integer not null,
  coin_score      integer not null,
  coins           integer not null,
  pills           integer not null,
  bonus_score     integer not null,
  distance        integer not null,
  duration_seconds integer not null,
  unique (run_id, sequence_number)
);

create index if not exists game_run_checkpoints_run_idx
  on private.game_run_checkpoints (run_id, sequence_number);

alter table private.game_runs enable row level security;
alter table private.game_run_checkpoints enable row level security;
revoke all on private.game_runs from public, anon, authenticated;
revoke all on private.game_run_checkpoints from public, anon, authenticated;

-- ---------- 2. Gameplay-derived hard ceilings ----------

-- Scene values used below (Assets/Scenes/Game.unity):
--   startSpeed=19, maxSpeed=46, rampDistance=1000, boostMultiplier=1.55
--   coin pattern interval >= 30*0.85=25.5m, at most 7 pickups per pattern
--   standard coin max=1*8*2=16, GDG Coin max=25*8*2=400
--   near-miss value=50, cooldown=0.85s, obstacle interval >= 30*0.85=25.5m

create or replace function private.max_run_distance(p_duration_seconds integer)
returns integer
language sql
immutable
strict
set search_path = ''
as $$
  select case
    when p_duration_seconds <= 0 then 0
    when p_duration_seconds + 1 <= 22 then
      ceil(
        (19.0 / 0.027) *
        (exp(0.04185 * (p_duration_seconds + 1)::double precision) - 1.0) +
        10.0
      )::integer
    else
      ceil(
        1000.0 + ((p_duration_seconds + 1)::double precision - 21.25) * 71.3 + 10.0
      )::integer
  end
$$;

create or replace function private.max_run_pickups(p_distance integer)
returns integer
language sql
immutable
strict
set search_path = ''
as $$
  -- Integer division by 25 deliberately rounds the real 25.5m minimum down.
  -- Three extra patterns cover the initial streaming window and collision/rounding slack.
  select ((greatest(p_distance, 0) / 25) + 3) * 7
$$;

create or replace function private.max_run_bonus(
  p_distance integer,
  p_duration_seconds integer
)
returns integer
language sql
immutable
strict
set search_path = ''
as $$
  select greatest(0, least(
    ((greatest(p_duration_seconds, 0) * 100 / 85) + 2) * 50,
    ((greatest(p_distance - 40, 0) / 25) + 3) * 50,
    (greatest(p_duration_seconds, 0) + 1) * 60
  ))
$$;

create or replace function private.combo_multiplier_sum(p_pickups integer)
returns integer
language sql
immutable
strict
set search_path = ''
as $$
  -- Multiplier changes after pickups 8, 16, ... and caps at x8. The
  -- generate_series side is bounded to 55 rows regardless of hostile input.
  select coalesce(sum(least(1 + i / 8, 8)), 0)::integer
         + greatest(p_pickups - 55, 0) * 8
  from generate_series(1, least(greatest(p_pickups, 0), 55)) as g(i)
$$;

create or replace function private.max_run_pickup_score(
  p_coins integer,
  p_pills integer
)
returns integer
language sql
immutable
strict
set search_path = ''
as $$
  -- Assume an unbroken combo, permanent 2x, and put all high-value GDG Coins
  -- at the strongest combo positions. This is deliberately generous but much
  -- tighter than pretending every pickup starts at x8.
  select (
    2::bigint * (
      25::bigint * private.combo_multiplier_sum(greatest(p_coins, 0) + greatest(p_pills, 0))
      - 24::bigint * private.combo_multiplier_sum(greatest(p_coins, 0))
    )
  )::integer
$$;

create or replace function private.max_run_gdg_coins(
  p_distance integer,
  p_total_pickups integer
)
returns integer
language sql
immutable
strict
set search_path = ''
as $$
  -- The scene rolls random GDG Coins at 5.5% and guarantees one about every
  -- 100m. One eighth of ordinary pickups plus eight coins of streaming/random
  -- slack is an intentionally high statistical ceiling, then capped to total.
  select least(
    greatest(p_total_pickups, 0),
    greatest(p_total_pickups, 0) / 8 + greatest(p_distance, 0) / 100 + 8
  )
$$;

create or replace function private.run_telemetry_is_plausible(
  p_score integer,
  p_coins integer,
  p_pills integer,
  p_coin_score integer,
  p_bonus_score integer,
  p_distance integer,
  p_duration_seconds integer
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    p_score between 0 and 1000000
    and p_coins between 0 and 100000
    and p_pills between 0 and 100000
    and p_coin_score between 0 and 1000000
    and p_bonus_score between 0 and 500000
    and p_distance between 0 and 1000000
    and p_duration_seconds between 1 and 7200
    and p_distance <= private.max_run_distance(p_duration_seconds)
    and p_coins + p_pills <= private.max_run_pickups(p_distance)
    and p_pills <= private.max_run_gdg_coins(p_distance, p_coins + p_pills)
    and p_coin_score::bigint >= p_coins::bigint + p_pills::bigint * 25
    and p_coin_score <= private.max_run_pickup_score(p_coins, p_pills)
    and p_bonus_score % 50 = 0
    and p_bonus_score <= private.max_run_bonus(p_distance, p_duration_seconds)
    and p_score::bigint = p_distance::bigint * 2 + p_coin_score::bigint + p_bonus_score::bigint,
    false
  )
$$;

revoke all on function private.max_run_distance(integer) from public, anon, authenticated;
revoke all on function private.max_run_pickups(integer) from public, anon, authenticated;
revoke all on function private.max_run_bonus(integer, integer) from public, anon, authenticated;
revoke all on function private.combo_multiplier_sum(integer) from public, anon, authenticated;
revoke all on function private.max_run_pickup_score(integer, integer) from public, anon, authenticated;
revoke all on function private.max_run_gdg_coins(integer, integer) from public, anon, authenticated;
revoke all on function private.run_telemetry_is_plausible(integer, integer, integer, integer, integer, integer, integer)
  from public, anon, authenticated;

-- ---------- 3. Mark newly verified score rows ----------

alter table public.scores
  add column if not exists coin_score integer;

alter table public.scores
  add column if not exists integrity_version smallint not null default 0;

alter table public.scores drop constraint if exists scores_integrity_version_sane;
alter table public.scores add constraint scores_integrity_version_sane
  check (integrity_version between 0 and 1);

alter table public.scores drop constraint if exists scores_verified_telemetry;
alter table public.scores add constraint scores_verified_telemetry
  check (
    integrity_version = 0
    or (
      integrity_version = 1
      and coin_score is not null
      and private.run_telemetry_is_plausible(
        score, coins, pills, coin_score, bonus_score, distance, duration_seconds
      )
    )
  );

-- ---------- 4. Issue one active server run per player ----------

create or replace function public.start_game_run(
  p_build_version text,
  p_car_id text
)
returns table (
  run_id uuid,
  run_secret uuid,
  issued_at timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_recent_starts integer;
begin
  if v_user_id is null or auth.role() <> 'authenticated' then
    raise exception 'You must be signed in to start a ranked run.'
      using errcode = 'insufficient_privilege';
  end if;

  if coalesce(char_length(trim(p_build_version)), 0) not between 1 and 80
     or coalesce(char_length(trim(p_car_id)), 0) not between 1 and 40 then
    raise exception 'Invalid run configuration.' using errcode = 'check_violation';
  end if;

  -- Serializes run creation/rate checks for this player.
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 7001));

  select count(*)::integer into v_recent_starts
  from private.game_runs r
  where r.user_id = v_user_id
    and r.issued_at > now() - interval '1 hour';

  if v_recent_starts >= 30 then
    raise exception 'Too many ranked runs were started. Try again later.'
      using errcode = 'check_violation';
  end if;

  update private.game_runs r
  set status = case when r.expires_at <= now() then 'expired' else 'abandoned' end
  where r.user_id = v_user_id and r.status = 'active';

  return query
  insert into private.game_runs (user_id, build_version, car_id)
  values (v_user_id, trim(p_build_version), trim(p_car_id))
  returning
    private.game_runs.id,
    private.game_runs.run_secret,
    private.game_runs.issued_at,
    private.game_runs.expires_at;
end;
$$;

revoke all on function public.start_game_run(text, text) from public, anon, authenticated;
grant execute on function public.start_game_run(text, text) to authenticated;

-- ---------- 5. Accept append-only, server-timed checkpoints ----------

create or replace function public.checkpoint_game_run(
  p_run_id uuid,
  p_run_secret uuid,
  p_checkpoint_id uuid,
  p_score integer,
  p_coins integer,
  p_pills integer,
  p_coin_score integer,
  p_bonus_score integer,
  p_distance integer,
  p_duration_seconds integer
)
returns table (
  accepted boolean,
  checkpoint_sequence integer,
  server_received_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_run private.game_runs%rowtype;
  v_existing_sequence integer;
  v_server_age integer;
  v_delta_duration integer;
  v_delta_distance integer;
  v_delta_coins integer;
  v_delta_pills integer;
  v_delta_coin_score integer;
  v_delta_bonus integer;
  v_next_sequence integer;
begin
  if v_user_id is null or auth.role() <> 'authenticated' then
    raise exception 'You must be signed in to record a ranked run.'
      using errcode = 'insufficient_privilege';
  end if;

  if p_run_id is null or p_run_secret is null or p_checkpoint_id is null then
    raise exception 'Run and checkpoint identities are required.'
      using errcode = 'not_null_violation';
  end if;

  select r.* into v_run
  from private.game_runs r
  where r.id = p_run_id
  for update;

  if not found or v_run.user_id <> v_user_id or v_run.run_secret <> p_run_secret then
    raise exception 'This ranked run is not valid for the current player.'
      using errcode = 'insufficient_privilege';
  end if;

  select c.sequence_number into v_existing_sequence
  from private.game_run_checkpoints c
  where c.checkpoint_id = p_checkpoint_id and c.run_id = p_run_id;

  if v_existing_sequence is not null then
    return query select true, v_existing_sequence, now();
    return;
  end if;

  -- A submit can commit even if its HTTP response never reaches the browser. Let
  -- an exact final retry pass through to submit_game_score(), which will return
  -- the already-banked score instead of leaving it in the local retry queue.
  if v_run.status = 'submitted'
     and p_score is not distinct from v_run.last_score
     and p_coin_score is not distinct from v_run.last_coin_score
     and p_coins is not distinct from v_run.last_coins
     and p_pills is not distinct from v_run.last_pills
     and p_bonus_score is not distinct from v_run.last_bonus_score
     and p_distance is not distinct from v_run.last_distance
     and p_duration_seconds is not distinct from v_run.last_duration_seconds then
    return query select true, v_run.last_sequence, now();
    return;
  end if;

  if v_run.status <> 'active' or v_run.expires_at <= now() then
    raise exception 'This ranked run is no longer active.' using errcode = 'check_violation';
  end if;

  if not private.run_telemetry_is_plausible(
    p_score, p_coins, p_pills, p_coin_score, p_bonus_score, p_distance, p_duration_seconds
  ) then
    raise exception 'Run telemetry failed the competitive integrity checks.'
      using errcode = 'check_violation';
  end if;

  v_server_age := floor(extract(epoch from (now() - v_run.issued_at)))::integer;
  if p_duration_seconds > v_server_age + 5 then
    raise exception 'The run clock is ahead of server time.' using errcode = 'check_violation';
  end if;
  if v_server_age - p_duration_seconds > 300 then
    raise exception 'The run clock stopped matching server time.' using errcode = 'check_violation';
  end if;

  if p_duration_seconds < v_run.last_duration_seconds
     or p_distance < v_run.last_distance
     or p_coins < v_run.last_coins
     or p_pills < v_run.last_pills
     or p_coin_score < v_run.last_coin_score
     or p_bonus_score < v_run.last_bonus_score
     or p_score < v_run.last_score then
    raise exception 'Run telemetry moved backwards.' using errcode = 'check_violation';
  end if;

  v_delta_duration := p_duration_seconds - v_run.last_duration_seconds;
  v_delta_distance := p_distance - v_run.last_distance;
  v_delta_coins := p_coins - v_run.last_coins;
  v_delta_pills := p_pills - v_run.last_pills;
  v_delta_coin_score := p_coin_score - v_run.last_coin_score;
  v_delta_bonus := p_bonus_score - v_run.last_bonus_score;

  if v_run.last_sequence = 0 then
    if p_duration_seconds > 15 then
      raise exception 'The first integrity checkpoint arrived too late.'
        using errcode = 'check_violation';
    end if;
  else
    if v_delta_duration > 15 then
      raise exception 'An integrity checkpoint gap was too large.'
        using errcode = 'check_violation';
    end if;
    if v_delta_distance > (v_delta_duration + 2) * 72 + 12 then
      raise exception 'Distance advanced faster than the game permits.'
        using errcode = 'check_violation';
    end if;
    if v_delta_coins + v_delta_pills > private.max_run_pickups(v_delta_distance) then
      raise exception 'Too many pickups appeared between checkpoints.'
        using errcode = 'check_violation';
    end if;
    if v_delta_coin_score::bigint < v_delta_coins::bigint + v_delta_pills::bigint * 25
       or v_delta_coin_score::bigint > v_delta_coins::bigint * 16 + v_delta_pills::bigint * 400 then
      raise exception 'Pickup score advanced outside the permitted range.'
        using errcode = 'check_violation';
    end if;
    if v_delta_bonus > private.max_run_bonus(v_delta_distance, greatest(v_delta_duration, 1)) then
      raise exception 'Bonus score advanced faster than the game permits.'
        using errcode = 'check_violation';
    end if;
  end if;

  v_next_sequence := v_run.last_sequence + 1;

  insert into private.game_run_checkpoints (
    checkpoint_id, run_id, sequence_number, score, coin_score, coins, pills,
    bonus_score, distance, duration_seconds
  ) values (
    p_checkpoint_id, p_run_id, v_next_sequence, p_score, p_coin_score, p_coins, p_pills,
    p_bonus_score, p_distance, p_duration_seconds
  );

  update private.game_runs r
  set last_checkpoint_at = now(),
      last_checkpoint_id = p_checkpoint_id,
      last_sequence = v_next_sequence,
      last_score = p_score,
      last_coin_score = p_coin_score,
      last_coins = p_coins,
      last_pills = p_pills,
      last_bonus_score = p_bonus_score,
      last_distance = p_distance,
      last_duration_seconds = p_duration_seconds
  where r.id = p_run_id;

  return query select true, v_next_sequence, now();
end;
$$;

revoke all on function public.checkpoint_game_run(uuid, uuid, uuid, integer, integer, integer, integer, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.checkpoint_game_run(uuid, uuid, uuid, integer, integer, integer, integer, integer, integer, integer)
  to authenticated;

-- ---------- 6. Remove the old one-shot RPC and finalize verified runs ----------

revoke all on function public.submit_game_score(uuid, integer, integer, integer, integer, integer, integer)
  from public, anon, authenticated;
drop function if exists public.submit_game_score(uuid, integer, integer, integer, integer, integer, integer);

create or replace function public.submit_game_score(
  p_run_id uuid,
  p_run_secret uuid,
  p_score integer,
  p_coins integer,
  p_pills integer,
  p_coin_score integer,
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
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_run private.game_runs%rowtype;
  v_score_id uuid;
  v_prior_best integer;
  v_is_personal_best boolean := false;
begin
  if v_user_id is null or auth.role() <> 'authenticated' then
    raise exception 'You must be signed in to save a ranked score.'
      using errcode = 'insufficient_privilege';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 7002));

  select r.* into v_run
  from private.game_runs r
  where r.id = p_run_id
  for update;

  if not found or v_run.user_id <> v_user_id or v_run.run_secret <> p_run_secret then
    raise exception 'This ranked run is not valid for the current player.'
      using errcode = 'insufficient_privilege';
  end if;

  if v_run.status = 'submitted' and v_run.final_score_id is not null then
    return query
    select
      'duplicate'::text,
      v_run.final_score_id,
      false,
      l.best_score,
      l.total_coins,
      l.total_gdg_coins,
      l.best_distance,
      l.total_games,
      l.rank
    from public.leaderboard l
    where l.user_id = v_user_id;
    return;
  end if;

  if v_run.status <> 'active' or v_run.expires_at <= now() then
    raise exception 'This ranked run is no longer active.' using errcode = 'check_violation';
  end if;

  if v_run.last_checkpoint_at is null or now() - v_run.last_checkpoint_at > interval '30 seconds' then
    raise exception 'The final run checkpoint is missing or stale.' using errcode = 'check_violation';
  end if;

  if p_score is distinct from v_run.last_score
     or p_coin_score is distinct from v_run.last_coin_score
     or p_coins is distinct from v_run.last_coins
     or p_pills is distinct from v_run.last_pills
     or p_bonus_score is distinct from v_run.last_bonus_score
     or p_distance is distinct from v_run.last_distance
     or p_duration_seconds is distinct from v_run.last_duration_seconds then
    raise exception 'The submitted result does not match the accepted final checkpoint.'
      using errcode = 'check_violation';
  end if;

  if not private.run_telemetry_is_plausible(
    p_score, p_coins, p_pills, p_coin_score, p_bonus_score, p_distance, p_duration_seconds
  ) then
    raise exception 'Run telemetry failed the competitive integrity checks.'
      using errcode = 'check_violation';
  end if;

  select max(s.score) into v_prior_best
  from public.scores s
  where s.user_id = v_user_id;

  insert into public.scores (
    user_id, username, display_name, run_id, score, coins, pills, gdg_coins,
    coin_score, bonus_score, distance, duration_seconds, integrity_version
  )
  select
    u.id, u.username, u.display_name, p_run_id, p_score, p_coins, p_pills, p_pills,
    p_coin_score, p_bonus_score, p_distance, p_duration_seconds, 1
  from public.users u
  where u.id = v_user_id
  returning id into v_score_id;

  if v_score_id is null then
    raise exception 'Your driver profile is missing.' using errcode = 'foreign_key_violation';
  end if;

  v_is_personal_best := v_prior_best is null or p_score > v_prior_best;

  update private.game_runs r
  set status = 'submitted', final_score_id = v_score_id, submitted_at = now()
  where r.id = p_run_id;

  return query
  select
    'saved'::text,
    v_score_id,
    v_is_personal_best,
    l.best_score,
    l.total_coins,
    l.total_gdg_coins,
    l.best_distance,
    l.total_games,
    l.rank
  from public.leaderboard l
  where l.user_id = v_user_id;
end;
$$;

revoke all on function public.submit_game_score(uuid, uuid, integer, integer, integer, integer, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.submit_game_score(uuid, uuid, integer, integer, integer, integer, integer, integer, integer)
  to authenticated;

-- Keep the underlying score and leaderboard tables immutable to browser roles.
revoke insert, update, delete on public.scores from anon, authenticated;
revoke insert, update, delete on public.leaderboard from anon, authenticated;

-- Trigger helpers are implementation details, not public RPCs. PostgreSQL will
-- reject direct trigger-function calls anyway; explicit revocation keeps the
-- exposed API surface minimal and prevents that behavior from being relied on.
revoke all on function public.enforce_score_rate_limit() from public, anon, authenticated;
revoke all on function public.stamp_score_identity() from public, anon, authenticated;
revoke all on function public.recompute_leaderboard() from public, anon, authenticated;
