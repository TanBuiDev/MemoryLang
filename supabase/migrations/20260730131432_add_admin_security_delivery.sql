create or replace function security.record_admin_mfa_reset(
  p_actor_user_id uuid, p_target_user_id uuid, p_user_agent text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_event_id uuid; v_target_email text;
begin
  select email into v_target_email from public.profiles where id = p_target_user_id;
  if v_target_email is null then raise exception 'Target account does not exist.' using errcode = '22023'; end if;
  insert into security.admin_security_events(subject_user_id, actor_user_id, event_type, device_label)
  values (p_target_user_id, p_actor_user_id, 'admin_mfa.reset', left(coalesce(p_user_agent, ''), 180)) returning id into v_event_id;
  insert into security.security_email_outbox(event_id, recipient_user_id, recipient_email, template, payload)
  select v_event_id, recipients.id, recipients.email, 'security_alert', jsonb_build_object('eventLabel', 'MFA quản trị đã được đặt lại. Mọi phiên quản trị hiện có đã bị thu hồi.', 'deviceLabel', 'Quản trị viên bảo mật')
  from (
    select p_target_user_id as id, v_target_email as email
    union
    select profiles.id, profiles.email from security.user_roles roles join security.roles role_def on role_def.id = roles.role_id join public.profiles profiles on profiles.id = roles.user_id
    where role_def.code in ('super_admin', 'security_admin') and roles.revoked_at is null and (roles.expires_at is null or roles.expires_at > now())
  ) recipients;
  insert into security.audit_logs(actor_user_id, target_user_id, event_type, user_agent)
  values (p_actor_user_id, p_target_user_id, 'admin_mfa.reset', p_user_agent);
  return v_event_id;
end;
$$;
revoke all on function security.record_admin_mfa_reset(uuid, uuid, text) from public, anon, authenticated;
grant execute on function security.record_admin_mfa_reset(uuid, uuid, text) to service_role;
