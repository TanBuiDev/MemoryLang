create or replace function public.is_user_pro(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.subscriptions s
    where s.user_id = p_user_id
      and s.plan_type = 'pro'
      and s.status in ('active', 'trialing')
      and (
        s.current_period_end is null
        or s.current_period_end > now()
      )
  );
end;
$$;
revoke all on function public.is_user_pro(uuid) from public;
create or replace function public.can_user_add_term(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_term_count integer;
begin
  if auth.uid() is distinct from p_user_id and not public.is_admin() then
    raise exception 'Permission denied';
  end if;

  if public.is_user_pro(p_user_id) then
    return true;
  end if;

  select count(*)
  into v_term_count
  from public.user_terms
  where user_id = p_user_id
    and deleted_at is null;

  return v_term_count < 100;
end;
$$;
create or replace function public.can_user_add_deck(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deck_count integer;
begin
  if auth.uid() is distinct from p_user_id and not public.is_admin() then
    raise exception 'Permission denied';
  end if;

  if public.is_user_pro(p_user_id) then
    return true;
  end if;

  select count(*)
  into v_deck_count
  from public.decks
  where user_id = p_user_id;

  return v_deck_count < 5;
end;
$$;
create or replace function public.can_user_create_decks(
  p_user_id uuid,
  p_new_deck_count integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deck_count integer;
begin
  if auth.uid() is distinct from p_user_id and not public.is_admin() then
    raise exception 'Permission denied';
  end if;

  if p_new_deck_count <= 0 then
    return true;
  end if;

  if public.is_user_pro(p_user_id) then
    return true;
  end if;

  select count(*)
  into v_deck_count
  from public.decks
  where user_id = p_user_id;

  return v_deck_count + p_new_deck_count <= 5;
end;
$$;
revoke all on function public.can_user_add_term(uuid) from public;
revoke all on function public.can_user_add_deck(uuid) from public;
revoke all on function public.can_user_create_decks(uuid, integer) from public;
grant execute on function public.can_user_add_term(uuid) to authenticated;
grant execute on function public.can_user_add_deck(uuid) to authenticated;
grant execute on function public.can_user_create_decks(uuid, integer) to authenticated;
