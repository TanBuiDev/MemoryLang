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
