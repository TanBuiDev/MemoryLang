create or replace function public.record_admin_mfa_reset(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_user_agent text default null
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select security.record_admin_mfa_reset(
    p_actor_user_id,
    p_target_user_id,
    p_user_agent
  );
$$;

create or replace function public.claim_security_email_outbox(p_event_id uuid)
returns table (id uuid, recipient_email text, payload jsonb)
language sql
security invoker
set search_path = ''
as $$
  select * from security.claim_security_email_outbox(p_event_id);
$$;

create or replace function public.mark_security_email_sent(
  p_outbox_id uuid,
  p_error text default null
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select security.mark_security_email_sent(p_outbox_id, p_error);
$$;

revoke all on function public.record_admin_mfa_reset(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.claim_security_email_outbox(uuid)
  from public, anon, authenticated;
revoke all on function public.mark_security_email_sent(uuid, text)
  from public, anon, authenticated;

grant execute on function public.record_admin_mfa_reset(uuid, uuid, text)
  to service_role;
grant execute on function public.claim_security_email_outbox(uuid)
  to service_role;
grant execute on function public.mark_security_email_sent(uuid, text)
  to service_role;
