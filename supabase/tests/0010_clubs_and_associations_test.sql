\set ON_ERROR_STOP on

begin;

do $$
begin
  if has_table_privilege('anon', 'public.clubs_and_associations', 'SELECT')
     or has_table_privilege('authenticated', 'public.clubs_and_associations', 'SELECT')
     or has_table_privilege('authenticated', 'public.clubs_and_associations', 'INSERT')
     or has_table_privilege('authenticated', 'public.clubs_and_associations', 'UPDATE')
     or has_table_privilege('authenticated', 'public.clubs_and_associations', 'DELETE') then
    raise exception 'A browser role can enumerate or mutate issued club IDs directly.';
  end if;

  if has_function_privilege(
    'anon',
    'public.claim_club_or_association(text,text)',
    'EXECUTE'
  ) then
    raise exception 'The unauthenticated role can call the club claim function.';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.claim_club_or_association(text,text)',
    'EXECUTE'
  ) then
    raise exception 'The authenticated role cannot call the club claim function.';
  end if;
end;
$$;

insert into auth.users (id, email)
values (
  '00000000-0000-4000-8000-000000000010',
  'club-' || substr(
    encode(extensions.digest(convert_to('gdg_test_10', 'UTF8'), 'sha256'), 'hex'),
    1,
    48
  ) || '@gdg-go.local'
)
on conflict (id) do update set email = excluded.email;

insert into auth.users (id, email)
values (
  '00000000-0000-4000-8000-000000000011',
  'ordinary-user@gdg-go.local'
)
on conflict (id) do update set email = excluded.email;

set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000010';
set local request.jwt.claim.role = 'authenticated';
set local role authenticated;

select username as claimed_username, display_name as claimed_display_name
from public.claim_club_or_association('gdg_test_10', 'Club Driver')
\gset

\if :{?claimed_username}
\else
  \quit 1
\endif

reset role;

do $$
begin
  if not exists (
    select 1
    from public.clubs_and_associations c
    where c.issued_id = 'GDG_TEST_10'
      and c.auth_user_id = '00000000-0000-4000-8000-000000000010'::uuid
      and c.display_name = 'Club Driver'
      and c.sign_in_count = 1
  ) then
    raise exception 'The valid issued ID was not claimed correctly.';
  end if;

  if not exists (
    select 1
    from public.users u
    where u.id = '00000000-0000-4000-8000-000000000010'::uuid
      and u.username = 'GDG_TEST_10'
      and u.display_name = 'Club Driver'
  ) then
    raise exception 'The club identity was not copied into the public profile.';
  end if;
end;
$$;

set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000011';
set local request.jwt.claim.role = 'authenticated';
set local role authenticated;

do $$
begin
  begin
    perform public.claim_club_or_association('GDG_TEST_10', 'Wrong Driver');
    raise exception 'A normal Auth identity claimed an issued club ID.';
  exception
    when insufficient_privilege then
      if sqlerrm <> 'This session is not valid for that Clubs and Associations ID.' then
        raise;
      end if;
  end;
end;
$$;

rollback;
