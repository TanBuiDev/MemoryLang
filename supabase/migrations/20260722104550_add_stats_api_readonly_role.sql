do $$
begin
  if not exists (
    select 1
    from pg_roles
    where rolname = 'memorylang_stats_readonly'
  ) then
    create role memorylang_stats_readonly
      login
      nosuperuser
      nocreatedb
      nocreaterole
      noinherit
      nobypassrls;
  end if;
end
$$;

-- Reapply every security-sensitive attribute when the migration is replayed.
-- PostgreSQL only permits a superuser to change SUPERUSER/BYPASSRLS, even when
-- setting them to false. Supabase migrations normally run as a non-superuser
-- CREATEROLE role, so fail closed on privileged drift unless replayed by a
-- superuser that can repair it. No branch creates or rotates a password.
do $$
declare
  migration_runner_is_superuser boolean;
  stats_role_is_superuser boolean;
  stats_role_bypasses_rls boolean;
begin
  select rolsuper
  into migration_runner_is_superuser
  from pg_roles
  where rolname = current_user;

  select rolsuper, rolbypassrls
  into stats_role_is_superuser, stats_role_bypasses_rls
  from pg_roles
  where rolname = 'memorylang_stats_readonly';

  if migration_runner_is_superuser then
    alter role memorylang_stats_readonly
      login
      nosuperuser
      nocreatedb
      nocreaterole
      noinherit
      nobypassrls;
  else
    if stats_role_is_superuser or stats_role_bypasses_rls then
      raise exception
        'memorylang_stats_readonly has SUPERUSER or BYPASSRLS drift; replay this migration as a superuser to repair it';
    end if;

    alter role memorylang_stats_readonly
      login
      nocreatedb
      nocreaterole
      noinherit;
  end if;
end
$$;

do $$
declare
  granted_role name;
begin
  for granted_role in
    select parent_role.rolname
    from pg_auth_members memberships
    join pg_roles member_role on member_role.oid = memberships.member
    join pg_roles parent_role on parent_role.oid = memberships.roleid
    where member_role.rolname = 'memorylang_stats_readonly'
  loop
    execute format(
      'revoke %I from memorylang_stats_readonly',
      granted_role
    );
  end loop;

  if exists (
    select 1
    from pg_auth_members memberships
    join pg_roles member_role on member_role.oid = memberships.member
    where member_role.rolname = 'memorylang_stats_readonly'
  ) then
    raise exception
      'memorylang_stats_readonly still has direct role memberships after revocation';
  end if;
end
$$;

comment on role memorylang_stats_readonly is
  'Read-only JDBC role for the MemoryLang statistics API. Password provisioning and rotation happen out of band.';

alter role memorylang_stats_readonly
  set default_transaction_read_only = on;

revoke all privileges on schema public from memorylang_stats_readonly;
revoke all privileges on all tables in schema public from memorylang_stats_readonly;

grant usage on schema public to memorylang_stats_readonly;
grant select on table
  public.study_sessions,
  public.user_terms,
  public.global_terms,
  public.decks,
  public.deck_terms,
  public.quiz_results
to memorylang_stats_readonly;

-- PostgreSQL grants EXECUTE on new routines to PUBLIC by default. Preserve
-- each Supabase runtime role's effective access to existing public routines,
-- including deliberately restricted RPCs, while removing all effective
-- routine access from the dedicated JDBC role.
do $$
declare
  public_routine record;
  anon_can_execute boolean;
  authenticated_can_execute boolean;
  service_role_can_execute boolean;
  routine_signature text;
begin
  for public_routine in
    select
      routines.oid,
      schemas.nspname,
      routines.proname,
      pg_get_function_identity_arguments(routines.oid) as identity_arguments
    from pg_proc routines
    join pg_namespace schemas on schemas.oid = routines.pronamespace
    where schemas.nspname = 'public'
  loop
    anon_can_execute := has_function_privilege(
      'anon',
      public_routine.oid,
      'EXECUTE'
    );
    authenticated_can_execute := has_function_privilege(
      'authenticated',
      public_routine.oid,
      'EXECUTE'
    );
    service_role_can_execute := has_function_privilege(
      'service_role',
      public_routine.oid,
      'EXECUTE'
    );
    routine_signature := format(
      '%I.%I(%s)',
      public_routine.nspname,
      public_routine.proname,
      public_routine.identity_arguments
    );

    execute format(
      'revoke execute on routine %s from public, memorylang_stats_readonly',
      routine_signature
    );

    if anon_can_execute then
      execute format(
        'grant execute on routine %s to anon',
        routine_signature
      );
    end if;
    if authenticated_can_execute then
      execute format(
        'grant execute on routine %s to authenticated',
        routine_signature
      );
    end if;
    if service_role_can_execute then
      execute format(
        'grant execute on routine %s to service_role',
        routine_signature
      );
    end if;
  end loop;
end
$$;

-- This snapshot covers routines that exist when this migration runs. Every
-- later public routine migration must explicitly revoke PUBLIC execution, grant
-- only its intended Supabase roles, and rerun the stats privilege audit.

drop policy if exists "stats_api_user_terms_select" on public.user_terms;
create policy "stats_api_user_terms_select"
  on public.user_terms
  as restrictive
  for select
  to memorylang_stats_readonly
  using (
    (select auth.uid()) is not null
    and user_id = (select auth.uid())
  );

drop policy if exists "stats_api_study_sessions_select" on public.study_sessions;
create policy "stats_api_study_sessions_select"
  on public.study_sessions
  as restrictive
  for select
  to memorylang_stats_readonly
  using (
    (select auth.uid()) is not null
    and user_id = (select auth.uid())
  );

drop policy if exists "stats_api_quiz_results_select" on public.quiz_results;
create policy "stats_api_quiz_results_select"
  on public.quiz_results
  as restrictive
  for select
  to memorylang_stats_readonly
  using (
    (select auth.uid()) is not null
    and user_id = (select auth.uid())
  );

drop policy if exists "stats_api_decks_select" on public.decks;
create policy "stats_api_decks_select"
  on public.decks
  as restrictive
  for select
  to memorylang_stats_readonly
  using (
    (select auth.uid()) is not null
    and user_id = (select auth.uid())
  );

drop policy if exists "stats_api_deck_terms_select" on public.deck_terms;
create policy "stats_api_deck_terms_select"
  on public.deck_terms
  as restrictive
  for select
  to memorylang_stats_readonly
  using (
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.decks
      where decks.id = deck_terms.deck_id
        and decks.user_id = (select auth.uid())
    )
  );

drop policy if exists "stats_api_global_terms_select" on public.global_terms;
create policy "stats_api_global_terms_select"
  on public.global_terms
  as permissive
  for select
  to memorylang_stats_readonly
  using (deleted_at is null);
