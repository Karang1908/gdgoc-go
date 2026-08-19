\set ON_ERROR_STOP on

begin;

do $$
begin
  if private.run_telemetry_is_plausible(
    1000000, 2500, 0, 995000, 0, 2500, 34
  ) then
    raise exception 'The known fabricated maximum-score payload was accepted.';
  end if;

  if not private.run_telemetry_is_plausible(
    2600, 100, 5, 500, 100, 1000, 30
  ) then
    raise exception 'A conservative legitimate-run fixture was rejected.';
  end if;

  if private.run_telemetry_is_plausible(
    42000, 100, 0, 40000, 0, 1000, 30
  ) then
    raise exception 'The standard-coin-as-400-points exploit was accepted.';
  end if;

  if private.run_telemetry_is_plausible(
    4500, 0, 100, 2500, 0, 1000, 30
  ) then
    raise exception 'An impossible all-GDG-Coin run was accepted.';
  end if;

  if to_regprocedure(
    'public.submit_game_score(uuid,integer,integer,integer,integer,integer,integer)'
  ) is not null then
    raise exception 'The insecure migration-0005 RPC signature still exists.';
  end if;

  if has_table_privilege('authenticated', 'public.scores', 'INSERT')
     or has_table_privilege('authenticated', 'public.scores', 'UPDATE')
     or has_table_privilege('authenticated', 'public.scores', 'DELETE') then
    raise exception 'The authenticated browser role can mutate score rows directly.';
  end if;

  if has_table_privilege('authenticated', 'public.leaderboard', 'INSERT')
     or has_table_privilege('authenticated', 'public.leaderboard', 'UPDATE')
     or has_table_privilege('authenticated', 'public.leaderboard', 'DELETE') then
    raise exception 'The authenticated browser role can mutate leaderboard rows directly.';
  end if;

  if has_schema_privilege('authenticated', 'private', 'USAGE') then
    raise exception 'The authenticated browser role can inspect private run state.';
  end if;
end;
$$;

insert into auth.users (id, email)
values ('00000000-0000-4000-8000-000000000007', 'integrity-test@example.invalid')
on conflict (id) do nothing;

insert into auth.users (id, email)
values ('00000000-0000-4000-8000-000000000008', 'integrity-other@example.invalid')
on conflict (id) do nothing;

insert into public.users (id, username, display_name, email)
values ('00000000-0000-4000-8000-000000000007', 'integrity_test', 'Integrity Test', 'integrity-test@example.invalid')
on conflict (id) do update set username = excluded.username;

insert into public.users (id, username, display_name, email)
values ('00000000-0000-4000-8000-000000000008', 'integrity_other', 'Other Driver', 'integrity-other@example.invalid')
on conflict (id) do update set username = excluded.username;

set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000007';
set local request.jwt.claim.role = 'authenticated';
set local role authenticated;

select run_id as test_run_id, run_secret as test_run_secret
from public.start_game_run('integrity-test-build', 'sports')
\gset

select accepted as checkpoint_accepted
from public.checkpoint_game_run(
  :'test_run_id'::uuid,
  :'test_run_secret'::uuid,
  '00000000-0000-4000-8000-000000000701'::uuid,
  40,
  0,
  0,
  0,
  0,
  20,
  1
)
\gset

\if :checkpoint_accepted
\else
  \quit 1
\endif

select submission_status as test_submission_status, score_id as test_score_id
from public.submit_game_score(
  :'test_run_id'::uuid,
  :'test_run_secret'::uuid,
  40,
  0,
  0,
  0,
  0,
  20,
  1
)
\gset

\if :{?test_score_id}
\else
  \quit 1
\endif

-- Simulate a committed submit whose HTTP response was lost. The final
-- checkpoint retry must be accepted and the second submit must be idempotent.
select accepted as duplicate_checkpoint_accepted
from public.checkpoint_game_run(
  :'test_run_id'::uuid,
  :'test_run_secret'::uuid,
  '00000000-0000-4000-8000-000000000702'::uuid,
  40,
  0,
  0,
  0,
  0,
  20,
  1
)
\gset

\if :duplicate_checkpoint_accepted
\else
  \quit 1
\endif

select submission_status as duplicate_submission_status, score_id as duplicate_score_id
from public.submit_game_score(
  :'test_run_id'::uuid,
  :'test_run_secret'::uuid,
  40,
  0,
  0,
  0,
  0,
  20,
  1
)
\gset

\if :{?duplicate_score_id}
\else
  \quit 1
\endif

select
  :'duplicate_submission_status' = 'duplicate'
  and :'duplicate_score_id'::uuid = :'test_score_id'::uuid
  as duplicate_is_idempotent
\gset

\if :duplicate_is_idempotent
\else
  \quit 1
\endif

reset role;

select exists (
  select 1
  from public.scores
  where id = :'test_score_id'::uuid
    and score = 40
    and integrity_version = 1
    and coin_score = 0
) as score_finalized
\gset

\if :score_finalized
\else
  \quit 1
\endif

select count(*) = 1 as exactly_one_score
from public.scores
where user_id = '00000000-0000-4000-8000-000000000007'::uuid
  and run_id = :'test_run_id'::uuid
\gset

\if :exactly_one_score
\else
  \quit 1
\endif

-- Even possession of another driver's run ID and secret must not cross the
-- auth.uid() ownership boundary.
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000008';
select run_id as other_run_id, run_secret as other_run_secret
from public.start_game_run('integrity-test-build', 'sports')
\gset

set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000007';
do $$
declare
  v_run_id uuid;
  v_run_secret uuid;
begin
  select id, run_secret into v_run_id, v_run_secret
  from private.game_runs
  where user_id = '00000000-0000-4000-8000-000000000008'::uuid
    and status = 'active';

  begin
    perform public.checkpoint_game_run(
      v_run_id,
      v_run_secret,
      '00000000-0000-4000-8000-000000000704'::uuid,
      0,
      0,
      0,
      0,
      0,
      0,
      1
    );
    raise exception 'One driver checkpointed another driver''s run.';
  exception
    when insufficient_privilege then
      if sqlerrm <> 'This ranked run is not valid for the current player.' then
        raise;
      end if;
  end;
end;
$$;

-- A long run cannot wait until game-over to invent its first checkpoint.
select run_id as late_run_id, run_secret as late_run_secret
from public.start_game_run('integrity-test-build', 'sports')
\gset

update private.game_runs
set issued_at = now() - interval '30 seconds'
where id = :'late_run_id'::uuid;

do $$
declare
  v_run_id uuid;
  v_run_secret uuid;
begin
  select id, run_secret into v_run_id, v_run_secret
  from private.game_runs
  where user_id = '00000000-0000-4000-8000-000000000007'::uuid
    and status = 'active';

  begin
    perform public.checkpoint_game_run(
      v_run_id,
      v_run_secret,
      '00000000-0000-4000-8000-000000000703'::uuid,
      2000,
      0,
      0,
      0,
      0,
      1000,
      30
    );
    raise exception 'A 30-second run was accepted without periodic checkpoints.';
  exception
    when check_violation then
      if sqlerrm <> 'The first integrity checkpoint arrived too late.' then
        raise;
      end if;
  end;
end;
$$;

rollback;
