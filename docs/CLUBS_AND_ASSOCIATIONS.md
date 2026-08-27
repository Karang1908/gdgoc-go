# Clubs and Associations temporary sign-in

This feature adds a third authentication option beside **Create Account** and **Sign In**.
A participant enters two mandatory values:

- an operator-issued ID;
- their name.

The issued ID is shown as the leaderboard username, and the entered name is shown beneath it.
No email address or user-chosen password is collected for this route.

## Important security model

Treat every issued ID like a temporary password. Anyone who knows an active ID can access that
ID's driver account and can change its public name on the next sign-in. The name is profile data,
not a second secret.

The application accepts the IDs your organisation already uses, including values such as
`2024A7PS0249U`; they do not need to be preloaded into Supabase. Because this route has no
password, a predictable or public ID provides convenience rather than strong authentication.

The browser cannot read or list `public.clubs_and_associations`. Its RLS and grants expose no
table operations to `anon` or `authenticated`. A narrow authenticated RPC registers one supplied
ID on first use and binds it to the matching synthetic Supabase Auth identity. Score submission still uses
the existing `auth.uid()`-owned run tickets and does not receive a new write path.

This is intentionally a temporary event-access mechanism, not a replacement for a real
password, OTP, or organisation SSO system.

## 1. Apply the database migration

In Supabase, open **SQL Editor**, paste the complete contents of
[`0010_clubs_and_associations.sql`](../supabase/migrations/0010_clubs_and_associations.sql),
and run it once.

The migration creates:

- `public.clubs_and_associations`;
- a case-insensitive unique index for `issued_id`;
- private-by-default RLS and grants;
- `public.claim_club_or_association(text, text)`, executable only by authenticated users.

The frontend and Migration `0010` must be deployed together. The new tab will show a database
RPC error if the frontend is published before the migration is applied.

Supabase Email authentication must remain enabled and **Confirm email** must remain disabled.
The current standard signup flow already has the same immediate-session requirement.

## 2. ID behavior

No provisioning query is required. The first successful sign-in automatically inserts the ID
and name into `public.clubs_and_associations`.

IDs may contain any characters and can be up to 64 characters long. Leading/trailing spaces are
ignored, matching is case-insensitive, and the exact casing supplied on first use is preserved
on the leaderboard. For example, all of these are accepted:

- `2024A7PS0249U`
- `GDG/BPDC/24-01`
- `Association Member #8`

Do not change an `issued_id` after it has been claimed. The corresponding Auth login is derived
from that ID. If an ID leaks, deactivate it and issue a new one rather than renaming it.

## 3. Test the route

1. Open the website in a private/incognito window.
2. Select **Clubs and Associations** in the authentication dialog.
3. Enter an ID such as `2024A7PS0249U` and a name; both fields must reject empty input.
4. Confirm the garage opens.
5. Confirm the navbar shows the issued ID and entered name.
6. Complete a ranked run and confirm the leaderboard shows the same ID and name.
7. Sign out, open another browser/device, and sign in with the same ID. The same score history
   should be restored.
8. Try a different new ID. It should create a separate row and separate driver identity.

After a successful sign-in, the row records:

- `display_name` — the most recently supplied name;
- `auth_user_id` — the bound Supabase Auth user;
- `claimed_at` — the first successful claim;
- `last_sign_in_at` and `sign_in_count` — basic operator audit data.

The claim also upserts `public.users`, because the existing score finalizer and leaderboard use
that table as their identity source. If a returning participant changes their name, the current
`public.leaderboard` row is updated immediately.

## 4. Disable or retire access

Disable one ID without deleting its history:

```sql
update public.clubs_and_associations
set active = false, updated_at = now()
where lower(issued_id) = lower('BPDC-K7M4Q9X2');
```

Disable the whole temporary route at the database layer:

```sql
update public.clubs_and_associations
set active = false, updated_at = now()
where active;
```

After the event, remove the tab from `AuthModal.tsx` if it should no longer be visible, but keep
the table rows unless the operator has deliberately decided how historical users and scores
should be retained. Deleting an Auth user cascades into its public profile and scores, so it is
not a safe way to revoke one leaked ID.

## 5. Database test

Against an isolated database with migrations through `0010` applied:

```bash
psql "$TEST_DATABASE_URL" -f supabase/tests/0010_clubs_and_associations_test.sql
```

The test rolls its fixture back. It verifies that browser roles cannot enumerate or mutate the
table, only authenticated users can execute the claim RPC, a correctly matched Auth identity
can register an ID on first use, and an ordinary Auth identity cannot attach itself to that ID.
