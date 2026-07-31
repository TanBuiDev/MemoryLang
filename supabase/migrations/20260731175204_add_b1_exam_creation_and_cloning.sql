alter table public.exams
  add column exam_format text not null default 'legacy',
  add column cloned_from_exam_id uuid references public.exams(id) on delete set null,
  add column clone_mode text;

alter table public.exams
  add constraint exams_exam_format_check
    check (exam_format in ('legacy', 'b1_practice')),
  add constraint exams_clone_mode_check
    check (clone_mode is null or clone_mode in ('structure_only', 'full_content'));

create index exams_b1_clone_sources_idx
  on public.exams (updated_at desc)
  where exam_format = 'b1_practice' and deleted_at is null;

update public.exams
set exam_format = 'b1_practice'
where source_key = 'b1-de-full-copy';

create table public.b1_exam_creation_requests (
  requested_by uuid not null references public.profiles(id) on delete cascade,
  request_id uuid not null,
  exam_id uuid not null references public.exams(id),
  created_at timestamptz not null default now(),
  primary key (requested_by, request_id)
);

alter table public.b1_exam_creation_requests enable row level security;

revoke all on table public.b1_exam_creation_requests from anon, authenticated;
grant select on table public.b1_exam_creation_requests to authenticated;

create policy "users can read their B1 exam creation requests"
  on public.b1_exam_creation_requests
  for select
  to authenticated
  using (requested_by = auth.uid());
