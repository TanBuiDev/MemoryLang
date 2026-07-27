create function public.abandon_b1_exam_attempt(p_attempt_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  update public.exam_attempts
  set
    status = 'abandoned',
    last_activity_at = now(),
    elapsed_seconds = greatest(0, floor(extract(epoch from now() - started_at))::integer),
    overtime_seconds = greatest(
      0,
      floor(extract(epoch from now() - started_at))::integer - target_duration_seconds
    )
  where id = p_attempt_id
    and user_id = v_user_id
    and status = 'in_progress';

  if not found then
    raise exception 'exam attempt is not available' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.abandon_b1_exam_attempt(uuid) from public, anon;
grant execute on function public.abandon_b1_exam_attempt(uuid) to authenticated;
