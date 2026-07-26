-- Extend the existing exam catalog with reusable B1 practice content.

alter table public.exams
  add column source_key text,
  add column cefr_level text,
  add column default_time_minutes integer;

alter table public.exams
  add constraint exams_source_key_key unique (source_key),
  add constraint exams_cefr_level_check
    check (
      cefr_level is null
      or cefr_level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')
    ),
  add constraint exams_default_time_minutes_check
    check (
      default_time_minutes is null
      or default_time_minutes > 0
    );

create index exams_created_by_idx
  on public.exams (created_by);

create table public.practice_activities (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  skill text not null,
  activity_type text not null,
  title text not null,
  instructions text,
  content text,
  passage text,
  audio_url text,
  is_published boolean not null default false,
  access_tier text not null default 'free',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint practice_activities_source_key_not_blank
    check (btrim(source_key) <> ''),
  constraint practice_activities_skill_check
    check (
      skill in (
        'grammar',
        'signs',
        'reading',
        'cloze',
        'transformation',
        'listening',
        'writing',
        'speaking'
      )
    ),
  constraint practice_activities_activity_type_check
    check (
      activity_type in (
        'multiple_choice',
        'true_false',
        'fill_blank',
        'short_text'
      )
    ),
  constraint practice_activities_access_tier_check
    check (access_tier in ('free', 'pro')),
  constraint practice_activities_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create table public.practice_questions (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null
    references public.practice_activities(id) on delete cascade,
  source_key text not null,
  source_number text,
  question_type text not null,
  prompt text not null,
  options jsonb not null default '[]'::jsonb,
  accepted_answers jsonb not null default '[]'::jsonb,
  source_page integer,
  image_url text,
  order_index integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint practice_questions_activity_source_key_key
    unique (activity_id, source_key),
  constraint practice_questions_source_key_not_blank
    check (btrim(source_key) <> ''),
  constraint practice_questions_question_type_check
    check (
      question_type in (
        'multiple_choice',
        'true_false',
        'fill_blank',
        'short_text'
      )
    ),
  constraint practice_questions_options_array_check
    check (jsonb_typeof(options) = 'array'),
  constraint practice_questions_accepted_answers_array_check
    check (jsonb_typeof(accepted_answers) = 'array'),
  constraint practice_questions_source_page_check
    check (source_page is null or source_page > 0),
  constraint practice_questions_order_index_check
    check (order_index >= 0),
  constraint practice_questions_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create table public.practice_prompts (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  skill text not null,
  title text not null,
  prompt text not null,
  instructions text,
  content text,
  source_page integer,
  image_url text,
  audio_url text,
  is_published boolean not null default false,
  access_tier text not null default 'free',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint practice_prompts_source_key_not_blank
    check (btrim(source_key) <> ''),
  constraint practice_prompts_skill_check
    check (skill in ('writing', 'speaking')),
  constraint practice_prompts_source_page_check
    check (source_page is null or source_page > 0),
  constraint practice_prompts_access_tier_check
    check (access_tier in ('free', 'pro')),
  constraint practice_prompts_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create table public.exam_sections (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  source_key text not null,
  skill text not null,
  title text not null,
  instructions text,
  resource_type text not null,
  resource_id uuid not null,
  order_index integer not null default 0,
  is_required boolean not null default true,
  suggested_time_minutes integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exam_sections_exam_source_key_key unique (exam_id, source_key),
  constraint exam_sections_exam_order_index_key unique (exam_id, order_index),
  constraint exam_sections_source_key_not_blank
    check (btrim(source_key) <> ''),
  constraint exam_sections_skill_check
    check (
      skill in (
        'grammar',
        'signs',
        'reading',
        'cloze',
        'transformation',
        'listening',
        'writing',
        'speaking'
      )
    ),
  constraint exam_sections_resource_type_check
    check (resource_type in ('activity', 'prompt')),
  constraint exam_sections_order_index_check
    check (order_index >= 0),
  constraint exam_sections_suggested_time_minutes_check
    check (
      suggested_time_minutes is null
      or suggested_time_minutes > 0
    ),
  constraint exam_sections_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create index practice_activities_created_by_idx
  on public.practice_activities (created_by);
create index practice_questions_source_key_idx
  on public.practice_questions (source_key);
create index practice_prompts_created_by_idx
  on public.practice_prompts (created_by);
create index exam_sections_source_key_idx
  on public.exam_sections (source_key);
create index exam_sections_resource_idx
  on public.exam_sections (resource_type, resource_id);

create function public.validate_exam_section_resource()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.resource_type = 'activity' then
    if not exists (
      select 1
      from public.practice_activities
      where practice_activities.id = new.resource_id
        and practice_activities.skill = new.skill
    ) then
      raise exception using
        errcode = '23503',
        message = 'exam section activity resource does not exist or skill does not match',
        constraint = 'exam_sections_resource_reference_fkey',
        table = 'exam_sections',
        column = 'resource_id';
    end if;
  elsif new.resource_type = 'prompt' then
    if not exists (
      select 1
      from public.practice_prompts
      where practice_prompts.id = new.resource_id
        and practice_prompts.skill = new.skill
    ) then
      raise exception using
        errcode = '23503',
        message = 'exam section prompt resource does not exist or skill does not match',
        constraint = 'exam_sections_resource_reference_fkey',
        table = 'exam_sections',
        column = 'resource_id';
    end if;
  end if;

  return new;
end;
$$;

create constraint trigger validate_exam_section_resource
  after insert or update on public.exam_sections
  deferrable initially immediate
  for each row execute function public.validate_exam_section_resource();

create function public.prevent_practice_resource_orphan()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_table_name = 'practice_activities' and exists (
    select 1
    from public.exam_sections
    where exam_sections.resource_type = 'activity'
      and exam_sections.resource_id = old.id
  ) then
    raise exception using
      errcode = '23503',
      message = 'practice activity is referenced by exam_sections',
      constraint = 'exam_sections_resource_reference_fkey',
      table = 'exam_sections',
      column = 'resource_id';
  elsif tg_table_name = 'practice_prompts' and exists (
    select 1
    from public.exam_sections
    where exam_sections.resource_type = 'prompt'
      and exam_sections.resource_id = old.id
  ) then
    raise exception using
      errcode = '23503',
      message = 'practice prompt is referenced by exam_sections',
      constraint = 'exam_sections_resource_reference_fkey',
      table = 'exam_sections',
      column = 'resource_id';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger protect_practice_activity_delete
  before delete on public.practice_activities
  for each row execute function public.prevent_practice_resource_orphan();

create trigger protect_practice_activity_id_update
  before update of id, skill on public.practice_activities
  for each row execute function public.prevent_practice_resource_orphan();

create trigger protect_practice_prompt_delete
  before delete on public.practice_prompts
  for each row execute function public.prevent_practice_resource_orphan();

create trigger protect_practice_prompt_id_update
  before update of id, skill on public.practice_prompts
  for each row execute function public.prevent_practice_resource_orphan();

create trigger update_practice_activities_modtime
  before update on public.practice_activities
  for each row execute function public.update_exams_modtime();

create trigger update_practice_questions_modtime
  before update on public.practice_questions
  for each row execute function public.update_exams_modtime();

create trigger update_practice_prompts_modtime
  before update on public.practice_prompts
  for each row execute function public.update_exams_modtime();

create trigger update_exam_sections_modtime
  before update on public.exam_sections
  for each row execute function public.update_exams_modtime();

alter table public.exam_sections enable row level security;
alter table public.practice_activities enable row level security;
alter table public.practice_questions enable row level security;
alter table public.practice_prompts enable row level security;

revoke all on table
  public.exams,
  public.exam_passage_sets,
  public.exam_questions,
  public.exam_sections,
  public.practice_activities,
  public.practice_questions,
  public.practice_prompts
from anon, authenticated;

grant select, insert, update, delete on table
  public.exams,
  public.exam_passage_sets,
  public.exam_questions,
  public.exam_sections,
  public.practice_activities,
  public.practice_questions,
  public.practice_prompts
to authenticated;

drop policy if exists "Public users can view published exams" on public.exams;
drop policy if exists "authenticated can view published exams" on public.exams;
create policy "authenticated can view published exams"
on public.exams
for select
to authenticated
using (
  is_published = true
  and deleted_at is null
  and (
    access_tier = 'free'
    or (select public.is_user_pro((select auth.uid())))
  )
);

drop policy if exists "Admin users can manage exams" on public.exams;
create policy "Admin users can manage exams"
on public.exams
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "Public users can view passage sets of published exams"
  on public.exam_passage_sets;
drop policy if exists "authenticated can view passage sets of published exams"
  on public.exam_passage_sets;
create policy "authenticated can view passage sets of published exams"
on public.exam_passage_sets
for select
to authenticated
using (
  exists (
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

drop policy if exists "Admin users can manage passage sets"
  on public.exam_passage_sets;
create policy "Admin users can manage passage sets"
on public.exam_passage_sets
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "Public users can view questions of published exams"
  on public.exam_questions;
drop policy if exists "authenticated can view questions of published exams"
  on public.exam_questions;
create policy "authenticated can view questions of published exams"
on public.exam_questions
for select
to authenticated
using (
  exists (
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

drop policy if exists "Admin users can manage exam questions"
  on public.exam_questions;
create policy "Admin users can manage exam questions"
on public.exam_questions
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "authenticated can view accessible exam sections"
on public.exam_sections
for select
to authenticated
using (
  exists (
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

create policy "admins can manage exam sections"
on public.exam_sections
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "authenticated can view published practice activities"
on public.practice_activities
for select
to authenticated
using (
  is_published = true
  and (
    access_tier = 'free'
    or (select public.is_user_pro((select auth.uid())))
  )
);

create policy "admins can manage practice activities"
on public.practice_activities
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "authenticated can view accessible practice questions"
on public.practice_questions
for select
to authenticated
using (
  exists (
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

create policy "admins can manage practice questions"
on public.practice_questions
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "authenticated can view published practice prompts"
on public.practice_prompts
for select
to authenticated
using (
  is_published = true
  and (
    access_tier = 'free'
    or (select public.is_user_pro((select auth.uid())))
  )
);

create policy "admins can manage practice prompts"
on public.practice_prompts
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
