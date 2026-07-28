create or replace function public.create_practice_draft_version(
  p_prompt_id uuid,
  p_content text
)
returns public.practice_draft_versions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_pro boolean := false;
  v_next_version integer;
  v_word_count integer;
  v_version public.practice_draft_versions%rowtype;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_content, ''))) = 0 or length(p_content) > 30000 then
    raise exception 'draft content must contain between 1 and 30000 characters' using errcode = '22023';
  end if;

  v_is_pro := public.is_user_pro(v_user_id);
  if not exists (
    select 1
    from public.practice_prompts
    where id = p_prompt_id
      and is_published = true
      and (access_tier = 'free' or v_is_pro)
  ) then
    raise exception 'prompt is not available' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':' || p_prompt_id::text, 0));

  select coalesce(max(version_number), 0) + 1
  into v_next_version
  from public.practice_draft_versions
  where user_id = v_user_id
    and prompt_id = p_prompt_id;

  if v_next_version > 5 then
    raise exception 'a prompt can have at most five saved versions' using errcode = '23514';
  end if;

  select cardinality(regexp_split_to_array(btrim(p_content), '[[:space:]]+'))
  into v_word_count;

  insert into public.practice_draft_versions (
    user_id,
    prompt_id,
    version_number,
    content,
    word_count
  )
  values (
    v_user_id,
    p_prompt_id,
    v_next_version,
    btrim(p_content),
    v_word_count
  )
  returning * into v_version;

  return v_version;
end;
$$;

revoke all on function public.create_practice_draft_version(uuid, text) from public, anon;
grant execute on function public.create_practice_draft_version(uuid, text) to authenticated;
