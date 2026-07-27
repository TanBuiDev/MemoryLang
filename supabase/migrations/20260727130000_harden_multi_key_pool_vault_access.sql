-- Intentionally ordered after 20260727120000_upgrade_multi_key_pool_vault.sql.

drop policy if exists "Admins can manage key pools"
  on public.admin_key_pools;
drop policy if exists "Admins can view key pools"
  on public.admin_key_pools;
drop policy if exists "Admins can insert key pools"
  on public.admin_key_pools;
drop policy if exists "Admins can update key pools"
  on public.admin_key_pools;
drop policy if exists "Admins can delete key pools"
  on public.admin_key_pools;

create policy "Admins can view key pools"
on public.admin_key_pools
for select
to authenticated
using ((select public.is_admin()));

create policy "Admins can insert key pools"
on public.admin_key_pools
for insert
to authenticated
with check ((select public.is_admin()));

create policy "Admins can update key pools"
on public.admin_key_pools
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins can delete key pools"
on public.admin_key_pools
for delete
to authenticated
using ((select public.is_admin()));

revoke all on table public.admin_key_pools from anon, authenticated;

create or replace function public.upsert_key_pool_item(
  p_id uuid default null,
  p_key_name text default 'API Key',
  p_purpose_tag text default 'ai_vision',
  p_secret_val text default null,
  p_model_name text default 'gemini-2.0-flash',
  p_is_active boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_masked text;
  v_new_id uuid;
begin
  if not (select public.is_admin()) then
    raise exception using
      errcode = '42501',
      message = 'Access denied: Admin privileges required.';
  end if;

  if p_key_name is null or trim(p_key_name) = '' then
    raise exception 'Key name cannot be empty.';
  end if;

  if p_purpose_tag is null or trim(p_purpose_tag) = '' then
    raise exception 'Purpose tag cannot be empty.';
  end if;

  if p_model_name is null or trim(p_model_name) = '' then
    raise exception 'Model name cannot be empty.';
  end if;

  if p_id is not null
    and (p_secret_val is null or trim(p_secret_val) = '') then
    update public.admin_key_pools
    set
      key_name = trim(p_key_name),
      purpose_tag = trim(p_purpose_tag),
      model_name = trim(p_model_name),
      status = case when p_is_active then 'active' else 'disabled' end,
      updated_by = (select auth.uid()),
      updated_at = now()
    where id = p_id;

    return jsonb_build_object(
      'ok', true,
      'id', p_id,
      'message', 'Đã cập nhật cấu hình Key.'
    );
  end if;

  if p_secret_val is null or trim(p_secret_val) = '' then
    raise exception 'Secret value cannot be empty.';
  end if;

  if length(trim(p_secret_val)) > 8 then
    v_masked :=
      substring(trim(p_secret_val) from 1 for 4)
      || '••••••••'
      || substring(trim(p_secret_val) from length(trim(p_secret_val)) - 3);
  else
    v_masked := '••••••••';
  end if;

  if p_id is not null then
    update public.admin_key_pools
    set
      key_name = trim(p_key_name),
      purpose_tag = trim(p_purpose_tag),
      encrypted_value = trim(p_secret_val),
      masked_preview = v_masked,
      model_name = trim(p_model_name),
      status = case when p_is_active then 'active' else 'disabled' end,
      updated_by = (select auth.uid()),
      updated_at = now()
    where id = p_id;
    v_new_id := p_id;
  else
    insert into public.admin_key_pools (
      key_name,
      purpose_tag,
      encrypted_value,
      masked_preview,
      model_name,
      status,
      updated_by
    )
    values (
      trim(p_key_name),
      trim(p_purpose_tag),
      trim(p_secret_val),
      v_masked,
      trim(p_model_name),
      case when p_is_active then 'active' else 'disabled' end,
      (select auth.uid())
    )
    returning id into v_new_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'id', v_new_id,
    'masked_preview', v_masked,
    'message', 'Đã lưu API Key mới vào Key Pool Vault.'
  );
end;
$function$;

create or replace function public.get_admin_key_pools_overview()
returns table (
  id uuid,
  key_name text,
  purpose_tag text,
  masked_preview text,
  model_name text,
  status text,
  priority_order integer,
  error_count integer,
  total_calls integer,
  last_used_at timestamptz,
  last_error_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not (select public.is_admin()) then
    raise exception using
      errcode = '42501',
      message = 'Access denied: Admin privileges required.';
  end if;

  return query
  select
    keys.id,
    keys.key_name,
    keys.purpose_tag,
    keys.masked_preview,
    keys.model_name,
    keys.status,
    keys.priority_order,
    keys.error_count,
    keys.total_calls,
    keys.last_used_at,
    keys.last_error_at,
    keys.created_at,
    keys.updated_at
  from public.admin_key_pools as keys
  order by
    keys.purpose_tag,
    keys.priority_order,
    keys.created_at desc;
end;
$function$;

create or replace function public.delete_key_pool_item(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not (select public.is_admin()) then
    raise exception using
      errcode = '42501',
      message = 'Access denied: Admin privileges required.';
  end if;

  delete from public.admin_key_pools
  where id = p_id;

  return jsonb_build_object(
    'ok', true,
    'message', 'Đã xóa Key khỏi Pool.'
  );
end;
$function$;

create or replace function public.toggle_key_pool_status(
  p_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not (select public.is_admin()) then
    raise exception using
      errcode = '42501',
      message = 'Access denied: Admin privileges required.';
  end if;

  if p_status not in ('active', 'disabled', 'rate_limited', 'quota_exceeded') then
    raise exception 'Invalid key status.';
  end if;

  update public.admin_key_pools
  set
    status = p_status,
    updated_at = now()
  where id = p_id;

  return jsonb_build_object(
    'ok', true,
    'status', p_status
  );
end;
$function$;

create or replace function public.update_key_pool_model(
  p_id uuid,
  p_model_name text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not (select public.is_admin()) then
    raise exception using
      errcode = '42501',
      message = 'Access denied: Admin privileges required.';
  end if;

  if p_model_name is null or trim(p_model_name) = '' then
    raise exception 'Model name cannot be empty.';
  end if;

  update public.admin_key_pools
  set
    model_name = trim(p_model_name),
    updated_at = now()
  where id = p_id;

  return jsonb_build_object(
    'ok', true,
    'model_name', trim(p_model_name)
  );
end;
$function$;

create or replace function public.get_key_pool_secret_for_test(p_id uuid)
returns table (
  id uuid,
  key_name text,
  encrypted_value text,
  model_name text,
  purpose_tag text
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not (select public.is_admin()) then
    raise exception using
      errcode = '42501',
      message = 'Access denied: Admin privileges required.';
  end if;

  return query
  select
    keys.id,
    keys.key_name,
    keys.encrypted_value,
    keys.model_name,
    keys.purpose_tag
  from public.admin_key_pools as keys
  where keys.id = p_id;
end;
$function$;

create or replace function public.check_active_vision_key_configured()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_model text;
  v_count integer;
begin
  if not (select public.is_admin()) then
    raise exception using
      errcode = '42501',
      message = 'Access denied: Admin privileges required.';
  end if;

  select
    count(*),
    coalesce(max(model_name), 'gemini-2.0-flash')
  into v_count, v_model
  from public.admin_key_pools
  where purpose_tag = 'ai_vision'
    and status = 'active';

  if v_count > 0 then
    return jsonb_build_object(
      'configured', true,
      'model_name', v_model
    );
  end if;

  select count(*)
  into v_count
  from public.admin_system_secrets
  where key_name = 'GEMINI_API_KEY';

  if v_count > 0 then
    return jsonb_build_object(
      'configured', true,
      'model_name', 'gemini-2.0-flash'
    );
  end if;

  return jsonb_build_object(
    'configured', false,
    'model_name', 'gemini-2.0-flash'
  );
end;
$function$;

create or replace function public.get_active_keys_for_service(
  p_purpose_tag text
)
returns table (
  id uuid,
  key_name text,
  encrypted_value text,
  model_name text,
  priority_order integer
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  update public.admin_key_pools
  set status = 'active'
  where status = 'rate_limited'
    and last_error_at is not null
    and last_error_at < (now() - interval '15 minutes');

  return query
  select
    keys.id,
    keys.key_name,
    keys.encrypted_value,
    keys.model_name,
    keys.priority_order
  from public.admin_key_pools as keys
  where keys.purpose_tag = trim(p_purpose_tag)
    and keys.status in ('active', 'rate_limited')
  order by
    case when keys.status = 'active' then 0 else 1 end,
    keys.priority_order,
    keys.error_count,
    keys.created_at;
end;
$function$;

create or replace function public.record_key_execution_outcome(
  p_key_id uuid,
  p_status_code integer,
  p_response_time_ms integer,
  p_error_msg text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if p_status_code = 200 then
    update public.admin_key_pools
    set
      total_calls = total_calls + 1,
      last_used_at = now(),
      error_count = greatest(0, error_count - 1),
      status = case
        when status = 'rate_limited' then 'active'
        else status
      end
    where id = p_key_id;
  else
    update public.admin_key_pools
    set
      total_calls = total_calls + 1,
      error_count = error_count + 1,
      last_error_at = now(),
      status = case
        when p_status_code = 429 then 'rate_limited'
        when p_status_code in (400, 401, 403)
          and error_count >= 3 then 'disabled'
        else status
      end
    where id = p_key_id;
  end if;
end;
$function$;

revoke all on function public.upsert_key_pool_item(uuid,text,text,text,text,boolean)
from public, anon, authenticated, service_role;
grant execute on function public.upsert_key_pool_item(uuid,text,text,text,text,boolean)
to authenticated;

revoke all on function public.get_admin_key_pools_overview()
from public, anon, authenticated, service_role;
grant execute on function public.get_admin_key_pools_overview()
to authenticated;

revoke all on function public.delete_key_pool_item(uuid)
from public, anon, authenticated, service_role;
grant execute on function public.delete_key_pool_item(uuid)
to authenticated;

revoke all on function public.toggle_key_pool_status(uuid,text)
from public, anon, authenticated, service_role;
grant execute on function public.toggle_key_pool_status(uuid,text)
to authenticated;

revoke all on function public.update_key_pool_model(uuid,text)
from public, anon, authenticated, service_role;
grant execute on function public.update_key_pool_model(uuid,text)
to authenticated;

revoke all on function public.get_key_pool_secret_for_test(uuid)
from public, anon, authenticated, service_role;
grant execute on function public.get_key_pool_secret_for_test(uuid)
to authenticated;

revoke all on function public.check_active_vision_key_configured()
from public, anon, authenticated, service_role;
grant execute on function public.check_active_vision_key_configured()
to authenticated;

revoke all on function public.get_active_keys_for_service(text)
from public, anon, authenticated, service_role;
grant execute on function public.get_active_keys_for_service(text)
to service_role;

revoke all on function public.record_key_execution_outcome(uuid,integer,integer,text)
from public, anon, authenticated, service_role;
grant execute on function public.record_key_execution_outcome(uuid,integer,integer,text)
to service_role;
