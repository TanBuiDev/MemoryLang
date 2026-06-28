-- Chuyển note, tags, translation từ user_terms sang global_terms
-- Lý do: chỉ admin được quyền sửa dữ liệu, user chỉ xem

-- 1. Thêm cột vào global_terms
ALTER TABLE global_terms ADD COLUMN IF NOT EXISTS translation text;
ALTER TABLE global_terms ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE global_terms ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- 2. Copy translation từ meaning có language khớp native_language
--    (bỏ qua English definition, chỉ lấy bản dịch thực sự)
UPDATE global_terms
SET translation = sub.best_meaning
FROM (
  SELECT id, (
    SELECT m->>'text'
    FROM jsonb_array_elements(meanings) AS m
    WHERE m->>'language' = native_language
    LIMIT 1
  ) as best_meaning
  FROM global_terms
  WHERE meanings IS NOT NULL AND jsonb_array_length(meanings) > 0
) sub
WHERE global_terms.id = sub.id AND sub.best_meaning IS NOT NULL;

-- 3. Xóa cột khỏi user_terms
ALTER TABLE user_terms DROP COLUMN IF EXISTS note;
ALTER TABLE user_terms DROP COLUMN IF EXISTS tags;
ALTER TABLE user_terms DROP COLUMN IF EXISTS translation;
