ALTER TABLE public.reading_articles
  DROP CONSTRAINT IF EXISTS reading_articles_cefr_level_check,
  DROP CONSTRAINT IF EXISTS reading_articles_difficulty_check,
  DROP CONSTRAINT IF EXISTS reading_articles_purpose_check,
  DROP CONSTRAINT IF EXISTS reading_articles_access_tier_check;

INSERT INTO public.app_settings (key, value, description)
VALUES (
  'reading_article_options',
  '{
    "cefr_level": [
      {"value":"A1","label":"A1 - Beginner"},
      {"value":"A2","label":"A2 - Elementary"},
      {"value":"B1","label":"B1 - Intermediate"},
      {"value":"B2","label":"B2 - Upper Intermediate"},
      {"value":"C1","label":"C1 - Advanced"},
      {"value":"C2","label":"C2 - Mastery"}
    ],
    "difficulty": [
      {"value":"easy","label":"Dễ (Easy)"},
      {"value":"medium","label":"Vừa (Medium)"},
      {"value":"hard","label":"Khó (Hard)"}
    ],
    "purpose": [
      {"value":"General","label":"Đọc Giao tiếp Chung"},
      {"value":"IELTS","label":"Luyện thi IELTS"},
      {"value":"TOEFL","label":"Luyện thi TOEFL"},
      {"value":"Academic","label":"Học thuật Academic"}
    ],
    "access_tier": [
      {"value":"free","label":"Free Tier (Tất cả người dùng)"},
      {"value":"pro","label":"Pro Tier (Chỉ Pro Users)"}
    ]
  }'::jsonb,
  'Các tùy chọn phân loại dùng trong trình biên tập bài đọc'
)
ON CONFLICT (key) DO NOTHING;

DROP POLICY IF EXISTS "reading_articles_public_read" ON public.reading_articles;
CREATE POLICY "reading_articles_public_read"
ON public.reading_articles
FOR SELECT
TO public
USING (
  is_published = true
  AND deleted_at IS NULL
  AND (
    access_tier = 'free'
    OR public.is_user_pro((SELECT auth.uid()))
  )
);

DROP POLICY IF EXISTS "reading_questions_public_read" ON public.reading_questions;
CREATE POLICY "reading_questions_public_read"
ON public.reading_questions
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.reading_articles
    WHERE reading_articles.id = reading_questions.article_id
      AND reading_articles.is_published = true
      AND reading_articles.deleted_at IS NULL
      AND (
        reading_articles.access_tier = 'free'
        OR public.is_user_pro((SELECT auth.uid()))
      )
  )
);
