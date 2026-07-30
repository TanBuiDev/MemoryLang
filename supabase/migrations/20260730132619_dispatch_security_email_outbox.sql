create or replace function security.claim_security_email_outbox(p_event_id uuid)
returns table (id uuid, recipient_email text, payload jsonb)
language plpgsql security definer set search_path = '' as $$
begin
  return query
  update security.security_email_outbox outbox
  set attempt_count = outbox.attempt_count + 1
  where outbox.event_id = p_event_id and outbox.sent_at is null
  returning outbox.id, outbox.recipient_email, outbox.payload;
end;
$$;
create or replace function security.mark_security_email_sent(p_outbox_id uuid, p_error text default null)
returns void language sql security definer set search_path = '' as $$
  update security.security_email_outbox set sent_at = case when p_error is null then now() else null end, last_error = p_error where id = p_outbox_id;
$$;
revoke all on function security.claim_security_email_outbox(uuid) from public, anon, authenticated;
revoke all on function security.mark_security_email_sent(uuid, text) from public, anon, authenticated;
grant execute on function security.claim_security_email_outbox(uuid) to service_role;
grant execute on function security.mark_security_email_sent(uuid, text) to service_role;
