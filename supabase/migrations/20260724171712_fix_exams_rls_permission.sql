-- Update RLS policies to use public.profiles and auth.jwt() instead of auth.users directly

-- 1. Policies cho exams
DROP POLICY IF EXISTS "Public users can view published exams" ON public.exams;
CREATE POLICY "Public users can view published exams"
  ON public.exams FOR SELECT
  USING (is_published = true AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Admin users can manage exams" ON public.exams;
CREATE POLICY "Admin users can manage exams"
  ON public.exams FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
    OR (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
    OR (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
    OR (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
    OR (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
  );

-- 2. Policies cho exam_passage_sets
DROP POLICY IF EXISTS "Public users can view passage sets of published exams" ON public.exam_passage_sets;
CREATE POLICY "Public users can view passage sets of published exams"
  ON public.exam_passage_sets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.exams
      WHERE exams.id = exam_passage_sets.exam_id
      AND exams.is_published = true AND exams.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Admin users can manage passage sets" ON public.exam_passage_sets;
CREATE POLICY "Admin users can manage passage sets"
  ON public.exam_passage_sets FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
    OR (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
    OR (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
    OR (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
    OR (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
  );

-- 3. Policies cho exam_questions
DROP POLICY IF EXISTS "Public users can view questions of published exams" ON public.exam_questions;
CREATE POLICY "Public users can view questions of published exams"
  ON public.exam_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.exam_passage_sets
      JOIN public.exams ON exams.id = exam_passage_sets.exam_id
      WHERE exam_passage_sets.id = exam_questions.passage_set_id
      AND exams.is_published = true AND exams.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Admin users can manage exam questions" ON public.exam_questions;
CREATE POLICY "Admin users can manage exam questions"
  ON public.exam_questions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
    OR (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
    OR (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
    OR (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
    OR (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
  );
