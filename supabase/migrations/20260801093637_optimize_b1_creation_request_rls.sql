drop policy if exists "users can read their B1 exam creation requests"
  on public.b1_exam_creation_requests;

create policy "users can read their B1 exam creation requests"
  on public.b1_exam_creation_requests
  for select
  to authenticated
  using ((select auth.uid()) = requested_by);
