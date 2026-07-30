create or replace function security.record_admin_session_alert(p_user_id uuid, p_auth_session_id uuid, p_user_agent text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_event_id uuid; v_is_new boolean;
begin
  select not exists (select 1 from security.admin_sessions sessions where sessions.user_id = p_user_id and sessions.auth_session_id <> p_auth_session_id and coalesce(sessions.user_agent, '') = coalesce(p_user_agent, '')) into v_is_new;
  if not v_is_new then return null; end if;
  insert into security.admin_security_events(subject_user_id, event_type, auth_session_id, device_label)
  values (p_user_id, 'admin_session.new_device', p_auth_session_id, left(coalesce(p_user_agent, ''), 180)) returning id into v_event_id;
  insert into security.security_email_outbox(event_id, recipient_user_id, recipient_email, template, payload)
  select v_event_id, recipients.id, recipients.email, 'security_alert', jsonb_build_object('eventLabel', 'Đăng nhập quản trị từ thiết bị hoặc phiên mới.', 'deviceLabel', left(coalesce(p_user_agent, 'Không xác định'), 180))
  from (select p_user_id id, email from public.profiles where id = p_user_id union select profiles.id, profiles.email from security.user_roles roles join security.roles role_def on role_def.id = roles.role_id join public.profiles profiles on profiles.id = roles.user_id where role_def.code in ('super_admin', 'security_admin') and roles.revoked_at is null and (roles.expires_at is null or roles.expires_at > now())) recipients;
  return v_event_id;
end;
$$;
revoke all on function security.record_admin_session_alert(uuid, uuid, text) from public, anon, authenticated;
grant execute on function security.record_admin_session_alert(uuid, uuid, text) to service_role;
