-- 1. Thêm cột deleted_at cho soft delete trên global_terms
ALTER TABLE global_terms ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_global_terms_deleted_at ON global_terms(deleted_at);

-- 2. Cập nhật RLS SELECT policy: chỉ trả về các term chưa bị xóa
DROP POLICY IF EXISTS "authenticated can read global terms" ON global_terms;
CREATE POLICY "authenticated can read global terms" ON global_terms 
  FOR SELECT TO authenticated USING (deleted_at IS NULL);
;
