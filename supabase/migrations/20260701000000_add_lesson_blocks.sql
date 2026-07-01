-- Migration: Them bang lesson_blocks cho he thong bai hoc ngu phap dang block
-- Ngay tao: 2026-07-01

-- 1. Them cot view_count vao grammar_topics
ALTER TABLE public.grammar_topics
  ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

-- 2. Tao bang lesson_blocks
CREATE TABLE IF NOT EXISTS public.lesson_blocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id    UUID NOT NULL REFERENCES public.grammar_topics(id) ON DELETE CASCADE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  block_type  TEXT NOT NULL,
  content     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Index cho truy van blocks theo topic + sort_order
CREATE INDEX IF NOT EXISTS lesson_blocks_topic_order_idx
  ON public.lesson_blocks(topic_id, sort_order);

-- 4. Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_lesson_blocks_updated_at ON public.lesson_blocks;
CREATE TRIGGER set_lesson_blocks_updated_at
  BEFORE UPDATE ON public.lesson_blocks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. RLS cho lesson_blocks
ALTER TABLE public.lesson_blocks ENABLE ROW LEVEL SECURITY;

-- Nguoi dung xac thuc co the xem blocks cua topics da publish
CREATE POLICY "anyone can view blocks of published topics" ON public.lesson_blocks
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.grammar_topics t
    WHERE t.id = topic_id AND (t.is_published = true OR public.is_admin())
  ));

-- Admin co toan quyen quan ly blocks
CREATE POLICY "admins manage lesson blocks" ON public.lesson_blocks
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 6. Chuyen du lieu cu tu grammar_topics.explanation + grammar_exercises sang lesson_blocks
DO $$
DECLARE
  topic_record RECORD;
  exercise_record RECORD;
  next_order INTEGER;
BEGIN
  FOR topic_record IN SELECT * FROM public.grammar_topics LOOP
    next_order := 0;

    -- Chuyen explanation thanh paragraph block
    IF topic_record.explanation IS NOT NULL AND topic_record.explanation != '' THEN
      INSERT INTO public.lesson_blocks (topic_id, sort_order, block_type, content)
      VALUES (
        topic_record.id,
        next_order,
        'paragraph',
        jsonb_build_object('html', topic_record.explanation)
      );
      next_order := next_order + 1;
    END IF;

    -- Chuyen examples thanh example_list block (neu co)
    IF topic_record.examples IS NOT NULL AND jsonb_array_length(topic_record.examples::jsonb) > 0 THEN
      INSERT INTO public.lesson_blocks (topic_id, sort_order, block_type, content)
      VALUES (
        topic_record.id,
        next_order,
        'example_list',
        jsonb_build_object(
          'items',
          (SELECT jsonb_agg(
            jsonb_build_object('text', e->>'sentence', 'correct', true)
          ) FROM jsonb_array_elements(topic_record.examples::jsonb) AS e)
        )
      );
      next_order := next_order + 1;
    END IF;

    -- Chuyen exercises thanh exercise_group block (neu co)
    IF EXISTS (SELECT 1 FROM public.grammar_exercises WHERE topic_id = topic_record.id) THEN
      INSERT INTO public.lesson_blocks (topic_id, sort_order, block_type, content)
      SELECT
        topic_record.id,
        next_order,
        'exercise_group',
        jsonb_build_object(
          'instruction', 'Chon dap an dung',
          'questions',
          (SELECT jsonb_agg(
            jsonb_build_object(
              'id', gen_random_uuid()::text,
              'question', q.question,
              'options', q.options,
              'correctIndex',
                (SELECT i - 1 FROM generate_series(0, jsonb_array_length(q.options) - 1) AS i
                 WHERE q.options->>i = q.answer),
              'explanation', q.explanation
            )
          ) FROM public.grammar_exercises q WHERE q.topic_id = topic_record.id)
        );
    END IF;
  END LOOP;
END $$;
