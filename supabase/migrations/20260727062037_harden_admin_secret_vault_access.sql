-- Harden the production admin vault after the initial schema was deployed.
-- Keep client-facing RPC signatures stable while replacing implicit/default
-- privileges with an explicit least-privilege contract.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.is_admin = true
  );
$function$;

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select public.is_admin();
$function$;

drop policy if exists "Admins can view secret metadata"
  on public.admin_system_secrets;
drop policy if exists "Only Admins can insert/update secrets"
  on public.admin_system_secrets;

create policy "Admins can view secret metadata"
on public.admin_system_secrets
for select
to authenticated
using ((select public.is_admin()));

create policy "Admins can insert secrets"
on public.admin_system_secrets
for insert
to authenticated
with check ((select public.is_admin()));

create policy "Admins can update secrets"
on public.admin_system_secrets
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins can delete secrets"
on public.admin_system_secrets
for delete
to authenticated
using ((select public.is_admin()));

drop policy if exists "Anyone can view active AI models"
  on public.ai_model_configs;
drop policy if exists "Admins can manage AI models"
  on public.ai_model_configs;

create policy "Anon can view active AI models"
on public.ai_model_configs
for select
to anon
using (is_active = true);

create policy "Authenticated users can view active AI models or admin catalog"
on public.ai_model_configs
for select
to authenticated
using (
  is_active = true
  or (select public.is_admin())
);

create policy "Admins can insert AI models"
on public.ai_model_configs
for insert
to authenticated
with check ((select public.is_admin()));

create policy "Admins can update AI models"
on public.ai_model_configs
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins can delete AI models"
on public.ai_model_configs
for delete
to authenticated
using ((select public.is_admin()));

drop policy if exists "Admins can view key usage logs"
  on public.admin_key_usage_logs;

create policy "Admins can view key usage logs"
on public.admin_key_usage_logs
for select
to authenticated
using ((select public.is_admin()));

revoke all on table
  public.admin_system_secrets,
  public.admin_key_usage_logs,
  public.ai_model_configs
from anon, authenticated;

grant select on table public.admin_key_usage_logs to authenticated;
grant select on table public.ai_model_configs to anon, authenticated;

create or replace function public.save_admin_secret(
  p_key_name text,
  p_secret_val text,
  p_description text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_masked text;
begin
  if not (select public.is_admin()) then
    raise exception using
      errcode = '42501',
      message = 'Access denied: Admin privileges required.';
  end if;

  if p_key_name is null or trim(p_key_name) = '' then
    raise exception 'Secret key name cannot be empty.';
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

  insert into public.admin_system_secrets (
    key_name,
    encrypted_value,
    masked_preview,
    description,
    updated_by,
    updated_at
  )
  values (
    trim(p_key_name),
    trim(p_secret_val),
    v_masked,
    p_description,
    (select auth.uid()),
    now()
  )
  on conflict (key_name) do update
  set
    encrypted_value = excluded.encrypted_value,
    masked_preview = excluded.masked_preview,
    description = coalesce(
      excluded.description,
      public.admin_system_secrets.description
    ),
    updated_by = excluded.updated_by,
    updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'key_name', trim(p_key_name),
    'masked_preview', v_masked,
    'message', 'Đã lưu Secret an toàn vào Database Vault.'
  );
end;
$function$;

create or replace function public.delete_admin_secret(p_key_name text)
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

  delete from public.admin_system_secrets
  where key_name = trim(p_key_name);

  return jsonb_build_object(
    'ok', true,
    'key_name', trim(p_key_name),
    'message', 'Đã xóa hoàn toàn Secret khỏi Database Vault.'
  );
end;
$function$;

create or replace function public.get_admin_secrets_overview()
returns table (
  key_name text,
  is_configured boolean,
  masked_preview text,
  description text,
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
    secrets.key_name,
    true,
    secrets.masked_preview,
    secrets.description,
    secrets.updated_at
  from public.admin_system_secrets as secrets
  order by secrets.key_name;
end;
$function$;

create or replace function public.upsert_verified_ai_model(
  p_model_name text,
  p_provider text default 'gemini',
  p_description text default null,
  p_set_default boolean default false
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

  if p_provider is null or trim(p_provider) = '' then
    raise exception 'Provider cannot be empty.';
  end if;

  if p_set_default then
    update public.ai_model_configs
    set is_default = false
    where provider = trim(p_provider);
  end if;

  insert into public.ai_model_configs (
    model_name,
    provider,
    description,
    is_default,
    is_active,
    last_verified_at,
    updated_at
  )
  values (
    trim(p_model_name),
    trim(p_provider),
    p_description,
    p_set_default,
    true,
    now(),
    now()
  )
  on conflict (model_name) do update
  set
    provider = excluded.provider,
    description = coalesce(
      excluded.description,
      public.ai_model_configs.description
    ),
    is_default = case
      when p_set_default then true
      else public.ai_model_configs.is_default
    end,
    is_active = true,
    last_verified_at = now(),
    updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'model_name', trim(p_model_name),
    'message', 'Đã lưu và cập nhật AI Model vào danh mục.'
  );
end;
$function$;

create or replace function public.delete_ai_model_config(p_id uuid)
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

  delete from public.ai_model_configs
  where id = p_id;

  return jsonb_build_object(
    'ok', true,
    'message', 'Đã xóa Model khỏi danh mục.'
  );
end;
$function$;

-- Consolidate each exam/B1 SELECT path so admins retain draft visibility
-- without an overlapping FOR ALL policy.

drop policy if exists "authenticated can view published exams"
  on public.exams;
drop policy if exists "Admin users can manage exams"
  on public.exams;

create policy "authenticated can view published exams"
on public.exams
for select
to authenticated
using (
  (select public.is_admin())
  or (
    is_published = true
    and deleted_at is null
    and (
      access_tier = 'free'
      or (select public.is_user_pro((select auth.uid())))
    )
  )
);

create policy "Admin users can insert exams"
on public.exams
for insert
to authenticated
with check ((select public.is_admin()));

create policy "Admin users can update exams"
on public.exams
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admin users can delete exams"
on public.exams
for delete
to authenticated
using ((select public.is_admin()));

drop policy if exists "authenticated can view passage sets of published exams"
  on public.exam_passage_sets;
drop policy if exists "Admin users can manage passage sets"
  on public.exam_passage_sets;

create policy "authenticated can view passage sets of published exams"
on public.exam_passage_sets
for select
to authenticated
using (
  (select public.is_admin())
  or exists (
    select 1
    from public.exams
    where exams.id = exam_passage_sets.exam_id
      and exams.is_published = true
      and exams.deleted_at is null
      and (
        exams.access_tier = 'free'
        or (select public.is_user_pro((select auth.uid())))
      )
  )
);

create policy "Admin users can insert passage sets"
on public.exam_passage_sets
for insert
to authenticated
with check ((select public.is_admin()));

create policy "Admin users can update passage sets"
on public.exam_passage_sets
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admin users can delete passage sets"
on public.exam_passage_sets
for delete
to authenticated
using ((select public.is_admin()));

drop policy if exists "authenticated can view questions of published exams"
  on public.exam_questions;
drop policy if exists "Admin users can manage exam questions"
  on public.exam_questions;

create policy "authenticated can view questions of published exams"
on public.exam_questions
for select
to authenticated
using (
  (select public.is_admin())
  or exists (
    select 1
    from public.exam_passage_sets
    join public.exams on exams.id = exam_passage_sets.exam_id
    where exam_passage_sets.id = exam_questions.passage_set_id
      and exams.is_published = true
      and exams.deleted_at is null
      and (
        exams.access_tier = 'free'
        or (select public.is_user_pro((select auth.uid())))
      )
  )
);

create policy "Admin users can insert exam questions"
on public.exam_questions
for insert
to authenticated
with check ((select public.is_admin()));

create policy "Admin users can update exam questions"
on public.exam_questions
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admin users can delete exam questions"
on public.exam_questions
for delete
to authenticated
using ((select public.is_admin()));

drop policy if exists "authenticated can view accessible exam sections"
  on public.exam_sections;
drop policy if exists "admins can manage exam sections"
  on public.exam_sections;

create policy "authenticated can view accessible exam sections"
on public.exam_sections
for select
to authenticated
using (
  (select public.is_admin())
  or exists (
    select 1
    from public.exams
    where exams.id = exam_sections.exam_id
      and exams.is_published = true
      and exams.deleted_at is null
      and (
        exams.access_tier = 'free'
        or (select public.is_user_pro((select auth.uid())))
      )
      and (
        (
          exam_sections.resource_type = 'activity'
          and exists (
            select 1
            from public.practice_activities
            where practice_activities.id = exam_sections.resource_id
              and practice_activities.skill = exam_sections.skill
              and practice_activities.is_published = true
              and (
                practice_activities.access_tier = 'free'
                or (select public.is_user_pro((select auth.uid())))
              )
          )
        )
        or (
          exam_sections.resource_type = 'prompt'
          and exists (
            select 1
            from public.practice_prompts
            where practice_prompts.id = exam_sections.resource_id
              and practice_prompts.skill = exam_sections.skill
              and practice_prompts.is_published = true
              and (
                practice_prompts.access_tier = 'free'
                or (select public.is_user_pro((select auth.uid())))
              )
          )
        )
      )
  )
);

create policy "admins can insert exam sections"
on public.exam_sections
for insert
to authenticated
with check ((select public.is_admin()));

create policy "admins can update exam sections"
on public.exam_sections
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "admins can delete exam sections"
on public.exam_sections
for delete
to authenticated
using ((select public.is_admin()));

drop policy if exists "authenticated can view published practice activities"
  on public.practice_activities;
drop policy if exists "admins can manage practice activities"
  on public.practice_activities;

create policy "authenticated can view published practice activities"
on public.practice_activities
for select
to authenticated
using (
  (select public.is_admin())
  or (
    is_published = true
    and (
      access_tier = 'free'
      or (select public.is_user_pro((select auth.uid())))
    )
  )
);

create policy "admins can insert practice activities"
on public.practice_activities
for insert
to authenticated
with check ((select public.is_admin()));

create policy "admins can update practice activities"
on public.practice_activities
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "admins can delete practice activities"
on public.practice_activities
for delete
to authenticated
using ((select public.is_admin()));

drop policy if exists "authenticated can view accessible practice questions"
  on public.practice_questions;
drop policy if exists "admins can manage practice questions"
  on public.practice_questions;

create policy "authenticated can view accessible practice questions"
on public.practice_questions
for select
to authenticated
using (
  (select public.is_admin())
  or exists (
    select 1
    from public.practice_activities
    where practice_activities.id = practice_questions.activity_id
      and practice_activities.is_published = true
      and (
        practice_activities.access_tier = 'free'
        or (select public.is_user_pro((select auth.uid())))
      )
  )
);

create policy "admins can insert practice questions"
on public.practice_questions
for insert
to authenticated
with check ((select public.is_admin()));

create policy "admins can update practice questions"
on public.practice_questions
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "admins can delete practice questions"
on public.practice_questions
for delete
to authenticated
using ((select public.is_admin()));

drop policy if exists "authenticated can view published practice prompts"
  on public.practice_prompts;
drop policy if exists "admins can manage practice prompts"
  on public.practice_prompts;

create policy "authenticated can view published practice prompts"
on public.practice_prompts
for select
to authenticated
using (
  (select public.is_admin())
  or (
    is_published = true
    and (
      access_tier = 'free'
      or (select public.is_user_pro((select auth.uid())))
    )
  )
);

create policy "admins can insert practice prompts"
on public.practice_prompts
for insert
to authenticated
with check ((select public.is_admin()));

create policy "admins can update practice prompts"
on public.practice_prompts
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "admins can delete practice prompts"
on public.practice_prompts
for delete
to authenticated
using ((select public.is_admin()));

revoke all on function public.is_admin()
from public, anon, authenticated, service_role;
grant execute on function public.is_admin() to authenticated;

revoke all on function public.is_admin_user()
from public, anon, authenticated, service_role;

revoke all on function public.save_admin_secret(text,text,text)
from public, anon, authenticated, service_role;
grant execute on function public.save_admin_secret(text,text,text)
to authenticated;

revoke all on function public.delete_admin_secret(text)
from public, anon, authenticated, service_role;
grant execute on function public.delete_admin_secret(text)
to authenticated;

revoke all on function public.get_admin_secrets_overview()
from public, anon, authenticated, service_role;
grant execute on function public.get_admin_secrets_overview()
to authenticated;

revoke all on function public.upsert_verified_ai_model(text,text,text,boolean)
from public, anon, authenticated, service_role;
grant execute on function public.upsert_verified_ai_model(text,text,text,boolean)
to authenticated;

revoke all on function public.delete_ai_model_config(uuid)
from public, anon, authenticated, service_role;
grant execute on function public.delete_ai_model_config(uuid)
to authenticated;
