create or replace function public.clear_b1_exam_audio_asset_atomically(
  p_exam_id uuid,
  p_resource_type text,
  p_resource_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null or not security.has_permission('exam.update') then
    raise exception using errcode = '42501', message = 'B1_MEDIA_UPDATE_FORBIDDEN';
  end if;

  if p_resource_type not in ('activity', 'prompt') then
    raise exception using errcode = '22023', message = 'B1_MEDIA_RESOURCE_UNAVAILABLE';
  end if;

  if not exists (
    select 1
    from public.exam_sections section
    join public.exams exam on exam.id = section.exam_id
    where section.exam_id = p_exam_id
      and section.resource_type = p_resource_type
      and section.resource_id = p_resource_id
      and exam.exam_format = 'b1_practice'
      and exam.deleted_at is null
  ) then
    raise exception using errcode = '22023', message = 'B1_MEDIA_RESOURCE_UNAVAILABLE';
  end if;

  if p_resource_type = 'activity' then
    update public.practice_activities
    set audio_url = null
    where id = p_resource_id;
  else
    update public.practice_prompts
    set audio_url = null
    where id = p_resource_id;
  end if;

  delete from public.exam_media_asset_usages
  where resource_type = p_resource_type
    and resource_id = p_resource_id
    and usage_role = 'audio';
end;
$function$;

revoke all on function public.clear_b1_exam_audio_asset_atomically(uuid, text, uuid) from public, anon;
grant execute on function public.clear_b1_exam_audio_asset_atomically(uuid, text, uuid) to authenticated;
