-- ============================================================
-- GDG Go — score integrity
-- ============================================================
-- Run AFTER 0001_init.sql, in the Supabase SQL editor.
--
-- WHY THIS EXISTS
-- The game is a public web build. The client computes its own score and POSTs it,
-- and the anon key plus the player's JWT are both visible in the browser. Nothing
-- stops someone opening devtools and calling the REST endpoint directly with
-- score = 999999999. RLS in 0001 only checks *who* is writing, never *what*.
--
-- WHAT THIS DOES AND DOESN'T DO
-- These are plausibility bounds, not proof. They make the trivial attack (post an
-- absurd number) fail, and force anyone determined to at least submit internally
-- consistent values within the envelope a real run could produce. That is the
-- right trade for an event leaderboard; true anti-cheat needs server-authoritative
-- simulation or a signed replay, which is far beyond this game's scope.
--
-- The bounds come straight from the gameplay constants:
--   GameSession.PointsPerMetre     = 2
--   GameSession.maxMultiplier      = 8
--   TwoX power-up                  = x2 on top
--   CoinType.GDGPill               = 25 points
--   WorldScroller.maxSpeed         = 42, boostMultiplier = 1.55  -> ~65 m/s peak
-- If you retune any of those, retune the matching bound here or honest scores
-- will start bouncing.
-- ============================================================

-- ---------- 1. Record how long the run took ----------

alter table public.scores
  add column if not exists duration_seconds integer not null default 0;

-- ---------- 2. Plausibility bounds ----------

-- Highest a single coin can ever be worth: 25 (GDG pill) x 8 (max combo) x 2 (TwoX).
-- Lowest is 1. Score is exactly meters*2 + the coin total, so the achievable score
-- for a given (distance, coins) pair is a closed interval.

alter table public.scores drop constraint if exists scores_duration_sane;
alter table public.scores add constraint scores_duration_sane
  check (duration_seconds between 0 and 7200);

-- Peak speed is ~65 m/s; 70 leaves headroom for frame-timing jitter.
alter table public.scores drop constraint if exists scores_distance_vs_time;
alter table public.scores add constraint scores_distance_vs_time
  check (duration_seconds = 0 or distance <= duration_seconds * 70);

-- Coins are spaced ~2.4m apart in patterns; one per metre is already generous.
alter table public.scores drop constraint if exists scores_coins_vs_distance;
alter table public.scores add constraint scores_coins_vs_distance
  check (coins <= distance + 50);

-- The score must be reachable from this exact (distance, coins) pair.
alter table public.scores drop constraint if exists scores_score_matches_run;
alter table public.scores add constraint scores_score_matches_run
  check (
    score >= distance * 2 + coins
    and score <= distance * 2 + coins * 400
  );

-- ---------- 3. Submission rate limit ----------
-- A run has to actually be played, so a burst of inserts is a script, not a player.
-- 20 per hour is far above real play and far below what a scripted flood needs.

create or replace function public.enforce_score_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count integer;
begin
  select count(*) into recent_count
  from public.scores
  where user_id = new.user_id
    and created_at > now() - interval '1 hour';

  if recent_count >= 20 then
    raise exception 'Score submission rate limit exceeded. Try again later.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists scores_rate_limit on public.scores;
create trigger scores_rate_limit
  before insert on public.scores
  for each row execute function public.enforce_score_rate_limit();

-- ---------- 4. Stop players forging someone else's name ----------
-- username / display_name are sent by the client alongside the score. Without this
-- a player could submit under another person's name. Overwrite both from the
-- authenticated profile row and ignore whatever the client claimed.

create or replace function public.stamp_score_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select u.username, u.display_name
    into new.username, new.display_name
  from public.users u
  where u.id = new.user_id;

  if new.username is null then
    raise exception 'No profile row for this user; cannot record a score.'
      using errcode = 'foreign_key_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists scores_stamp_identity on public.scores;
create trigger scores_stamp_identity
  before insert on public.scores
  for each row execute function public.stamp_score_identity();

-- ---------- 5. Leaderboard read path ----------
-- The Top-N query orders by score desc; created_at breaks ties so the earlier run
-- wins, which is both fairer and stable across refreshes.

drop index if exists scores_leaderboard;
create index scores_leaderboard
  on public.scores (score desc, created_at asc);
