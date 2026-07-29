-- Exam administrators can inspect drafts; learner policies remain unchanged.
drop policy if exists "authenticated can view published exams" on public.exams;
drop policy if exists "Admin users can insert exams" on public.exams;
drop policy if exists "Admin users can update exams" on public.exams;
drop policy if exists "Admin users can delete exams" on public.exams;
create policy "rbac reads exams" on public.exams for select to authenticated using (
  security.has_permission('exam.read') or (is_published and deleted_at is null and (access_tier = 'free' or public.is_user_pro(auth.uid())))
);
create policy "rbac creates exams" on public.exams for insert to authenticated with check (security.has_permission('exam.create'));
create policy "rbac updates exams" on public.exams for update to authenticated using (security.has_permission('exam.update')) with check (security.has_permission('exam.update') or security.has_permission('exam.publish'));
create policy "rbac deletes exams" on public.exams for delete to authenticated using (security.has_permission('exam.delete'));

drop policy if exists "authenticated can view passage sets of published exams" on public.exam_passage_sets;
drop policy if exists "Admin users can insert passage sets" on public.exam_passage_sets;
drop policy if exists "Admin users can update passage sets" on public.exam_passage_sets;
drop policy if exists "Admin users can delete passage sets" on public.exam_passage_sets;
create policy "rbac reads passage sets" on public.exam_passage_sets for select to authenticated using (security.has_permission('exam.read') or exists (select 1 from public.exams e where e.id = exam_id and e.is_published and e.deleted_at is null and (e.access_tier = 'free' or public.is_user_pro(auth.uid()))));
create policy "rbac writes passage sets" on public.exam_passage_sets for all to authenticated using (security.has_permission('exam.update')) with check (security.has_permission('exam.update'));

drop policy if exists "authenticated can view questions of published exams" on public.exam_questions;
drop policy if exists "Admin users can insert exam questions" on public.exam_questions;
drop policy if exists "Admin users can update exam questions" on public.exam_questions;
drop policy if exists "Admin users can delete exam questions" on public.exam_questions;
create policy "rbac reads exam questions" on public.exam_questions for select to authenticated using (security.has_permission('exam.read') or exists (select 1 from public.exam_passage_sets ps join public.exams e on e.id = ps.exam_id where ps.id = passage_set_id and e.is_published and e.deleted_at is null and (e.access_tier = 'free' or public.is_user_pro(auth.uid()))));
create policy "rbac writes exam questions" on public.exam_questions for all to authenticated using (security.has_permission('exam_question.update')) with check (security.has_permission('exam_question.create') or security.has_permission('exam_question.update'));

drop policy if exists "authenticated can view accessible exam sections" on public.exam_sections;
drop policy if exists "admins can insert exam sections" on public.exam_sections;
drop policy if exists "admins can update exam sections" on public.exam_sections;
drop policy if exists "admins can delete exam sections" on public.exam_sections;
create policy "rbac reads exam sections" on public.exam_sections for select to authenticated using (security.has_permission('exam.read') or exists (select 1 from public.exams e where e.id = exam_id and e.is_published and e.deleted_at is null and (e.access_tier = 'free' or public.is_user_pro(auth.uid()))));
create policy "rbac writes exam sections" on public.exam_sections for all to authenticated using (security.has_permission('exam.update')) with check (security.has_permission('exam.update'));

drop policy if exists "authenticated can view published practice activities" on public.practice_activities;
drop policy if exists "admins can insert practice activities" on public.practice_activities;
drop policy if exists "admins can update practice activities" on public.practice_activities;
drop policy if exists "admins can delete practice activities" on public.practice_activities;
create policy "rbac reads practice activities" on public.practice_activities for select to authenticated using (security.has_permission('exam.read') or (is_published and (access_tier = 'free' or public.is_user_pro(auth.uid()))));
create policy "rbac writes practice activities" on public.practice_activities for all to authenticated using (security.has_permission('exam.update')) with check (security.has_permission('exam.update'));

drop policy if exists "authenticated can view accessible practice questions" on public.practice_questions;
drop policy if exists "admins can insert practice questions" on public.practice_questions;
drop policy if exists "admins can update practice questions" on public.practice_questions;
drop policy if exists "admins can delete practice questions" on public.practice_questions;
create policy "rbac reads practice questions" on public.practice_questions for select to authenticated using (security.has_permission('exam.read') or exists (select 1 from public.practice_activities a where a.id = activity_id and a.is_published and (a.access_tier = 'free' or public.is_user_pro(auth.uid()))));
create policy "rbac writes practice questions" on public.practice_questions for all to authenticated using (security.has_permission('exam_question.update')) with check (security.has_permission('exam_question.create') or security.has_permission('exam_question.update'));

drop policy if exists "authenticated can view published practice prompts" on public.practice_prompts;
drop policy if exists "admins can insert practice prompts" on public.practice_prompts;
drop policy if exists "admins can update practice prompts" on public.practice_prompts;
drop policy if exists "admins can delete practice prompts" on public.practice_prompts;
create policy "rbac reads practice prompts" on public.practice_prompts for select to authenticated using (security.has_permission('exam.read') or (is_published and (access_tier = 'free' or public.is_user_pro(auth.uid()))));
create policy "rbac writes practice prompts" on public.practice_prompts for all to authenticated using (security.has_permission('exam.update')) with check (security.has_permission('exam.update'));

drop policy if exists "Admins manage exam media assets" on public.exam_media_assets;
drop policy if exists "Admins manage exam media usages" on public.exam_media_asset_usages;
create policy "rbac manages exam media assets" on public.exam_media_assets for all to authenticated using (security.has_permission('exam.update')) with check (security.has_permission('exam.update'));
create policy "rbac manages exam media usages" on public.exam_media_asset_usages for all to authenticated using (security.has_permission('exam.update')) with check (security.has_permission('exam.update'));
