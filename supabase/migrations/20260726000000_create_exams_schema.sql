-- Schema Migration: Phân hệ Đề thi chuẩn hóa TOEIC / IELTS (Exams, Passage Sets, Questions)

-- 1. Bảng Đề thi tổng (Exams)
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,                  -- Ví dụ: "ETS TOEIC Reading 2026 Test 1"
  category TEXT NOT NULL DEFAULT 'TOEIC',-- 'TOEIC', 'IELTS', 'TOEFL'
  description TEXT,
  time_limit_minutes INT DEFAULT 75,     -- Thời gian đếm giờ (phút)
  total_questions INT DEFAULT 100,       -- Tổng số câu hỏi trong đề
  is_published BOOLEAN DEFAULT false,
  access_tier TEXT DEFAULT 'free',       -- 'free', 'pro'
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 2. Bảng Cụm bài đọc / Đoạn văn theo Part (Exam Passage Sets)
CREATE TABLE IF NOT EXISTS public.exam_passage_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  part_number INT NOT NULL,             -- Part 5, 6, 7 (TOEIC) hoặc Passage 1, 2, 3 (IELTS)
  passage_type TEXT DEFAULT 'single',   -- 'none' (Part 5), 'single', 'double', 'triple' (Part 7)
  title TEXT,                           -- Ví dụ: "Questions 147-148 refer to the following email."
  instruction_text TEXT,                -- Hướng dẫn làm bài
  passages JSONB DEFAULT '[]'::jsonb,   -- Array: [{ "id": "p1", "type": "email", "title": "...", "content_html": "..." }]
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Bảng Câu hỏi thuộc Cụm bài đọc (Exam Questions)
CREATE TABLE IF NOT EXISTS public.exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passage_set_id UUID NOT NULL REFERENCES public.exam_passage_sets(id) ON DELETE CASCADE,
  question_number INT NOT NULL,         -- Số câu thi thực tế: 101, 102 ... 200
  question_text TEXT NOT NULL,          -- Nội dung câu hỏi
  question_type TEXT DEFAULT 'multiple_choice', -- 'multiple_choice', 'fill_blank'
  options JSONB NOT NULL DEFAULT '[]'::jsonb,   -- Array: [{ "key": "A", "text": "...", "is_correct": true }]
  points INT DEFAULT 1,
  explanation_html TEXT,                -- Lời giải chi tiết
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes tối ưu hiệu năng truy vấn
CREATE INDEX IF NOT EXISTS idx_exams_category ON public.exams(category);
CREATE INDEX IF NOT EXISTS idx_exams_is_published ON public.exams(is_published);
CREATE INDEX IF NOT EXISTS idx_exam_passage_sets_exam_id ON public.exam_passage_sets(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_passage_set_id ON public.exam_questions(passage_set_id);

-- Trigger cập nhật updated_at tự động
CREATE OR REPLACE FUNCTION update_exams_modtime()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_exams_modtime ON public.exams;
CREATE TRIGGER update_exams_modtime
  BEFORE UPDATE ON public.exams
  FOR EACH ROW EXECUTE FUNCTION update_exams_modtime();

DROP TRIGGER IF EXISTS update_exam_passage_sets_modtime ON public.exam_passage_sets;
CREATE TRIGGER update_exam_passage_sets_modtime
  BEFORE UPDATE ON public.exam_passage_sets
  FOR EACH ROW EXECUTE FUNCTION update_exams_modtime();

DROP TRIGGER IF EXISTS update_exam_questions_modtime ON public.exam_questions;
CREATE TRIGGER update_exam_questions_modtime
  BEFORE UPDATE ON public.exam_questions
  FOR EACH ROW EXECUTE FUNCTION update_exams_modtime();

-- Phân quyền RLS
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_passage_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;

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
