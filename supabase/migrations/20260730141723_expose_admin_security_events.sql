create or replace function public.get_admin_security_events(p_limit integer default 100)
returns table (id uuid, occurred_at timestamptz, subject_email text, actor_email text, event_type text, device_label text)
language plpgsql security definer set search_path = '' as $$
begin
  if not security.has_permission('audit.read.security') then raise exception 'Forbidden.' using errcode = '42501'; end if;
  return query
  select events.id, events.occurred_at, subject.email, actor.email, events.event_type, events.device_label
  from security.admin_security_events events
  join public.profiles subject on subject.id = events.subject_user_id
  left join public.profiles actor on actor.id = events.actor_user_id
  order by events.occurred_at desc limit greatest(1, least(coalesce(p_limit, 100), 200));
end;
$$;
revoke all on function public.get_admin_security_events(integer) from public, anon, service_role;
grant execute on function public.get_admin_security_events(integer) to authenticated;
