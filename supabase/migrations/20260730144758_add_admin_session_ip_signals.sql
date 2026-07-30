-- Keep a privacy-preserving network signal for security comparison and show
-- only a masked network prefix in the email alert.
drop function if exists security.record_admin_session_alert(uuid, uuid, text);

create function security.record_admin_session_alert(
  p_user_id uuid,
  p_auth_session_id uuid,
  p_user_agent text,
  p_ip_hash text,
  p_network_label text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
  v_is_new boolean;
begin
  select not exists (
    select 1
    from security.admin_security_events events
    where events.subject_user_id = p_user_id
      and events.event_type = 'admin_session.new_device'
      and coalesce(events.device_label, '') = left(coalesce(p_user_agent, ''), 180)
      and coalesce(events.ip_hash, '') = coalesce(p_ip_hash, '')
  ) into v_is_new;

  if not v_is_new then return null; end if;

  insert into security.admin_security_events(
    subject_user_id, event_type, auth_session_id, ip_hash, device_label
  ) values (
    p_user_id,
    'admin_session.new_device',
    p_auth_session_id,
    nullif(p_ip_hash, ''),
    left(coalesce(p_user_agent, ''), 180)
  ) returning id into v_event_id;

  insert into security.security_email_outbox(
    event_id, recipient_user_id, recipient_email, template, payload
  )
  select
    v_event_id,
    recipients.id,
    recipients.email,
    'security_alert',
    jsonb_build_object(
      'eventLabel', 'Đăng nhập quản trị từ thiết bị hoặc mạng mới.',
      'deviceLabel', left(coalesce(p_user_agent, 'Không xác định'), 180),
      'networkLabel', coalesce(nullif(p_network_label, ''), 'Không xác định')
    )
  from (
    select p_user_id id, email from public.profiles where id = p_user_id
    union
    select profiles.id, profiles.email
    from security.user_roles roles
    join security.roles role_def on role_def.id = roles.role_id
    join public.profiles profiles on profiles.id = roles.user_id
    where role_def.code in ('super_admin', 'security_admin')
      and roles.revoked_at is null
      and (roles.expires_at is null or roles.expires_at > now())
  ) recipients;

  return v_event_id;
end;
$$;

revoke all on function security.record_admin_session_alert(uuid, uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function security.record_admin_session_alert(uuid, uuid, text, text, text)
  to service_role;
