-- 1. Thêm cột vào global_terms
ALTER TABLE global_terms ADD COLUMN IF NOT EXISTS translation text;
ALTER TABLE global_terms ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE global_terms ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- 2. Copy dữ liệu từ meanings[0].text sang translation
UPDATE global_terms
SET translation = (meanings->0->>'text')
WHERE translation IS NULL
  AND meanings IS NOT NULL
  AND jsonb_array_length(meanings) > 0;

-- 3. Drop cột khỏi user_terms (sau khi đã an toàn)
ALTER TABLE user_terms DROP COLUMN IF EXISTS note;
ALTER TABLE user_terms DROP COLUMN IF EXISTS tags;
ALTER TABLE user_terms DROP COLUMN IF EXISTS translation;;
