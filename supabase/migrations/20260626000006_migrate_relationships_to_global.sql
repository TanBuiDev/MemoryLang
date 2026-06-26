-- Migration: Chuyển term_relationships từ user_terms.id sang global_terms.id
-- Lý do: Relationships nên thuộc về global terms (chia sẻ giữa các user), không phải user-specific

-- 0. Drop RLS policy cũ (phụ thuộc vào source_id, target_id)
DROP POLICY IF EXISTS "term_relationships through owned terms" ON public.term_relationships;

-- 1. Thêm cột tạm thời để lưu global_term_id
ALTER TABLE public.term_relationships
  ADD COLUMN IF NOT EXISTS source_global_term_id uuid,
  ADD COLUMN IF NOT EXISTS target_global_term_id uuid;

-- 2. Populate global_term_id từ user_terms
UPDATE public.term_relationships
SET source_global_term_id = ut_s.global_term_id,
    target_global_term_id = ut_t.global_term_id
FROM public.user_terms ut_s, public.user_terms ut_t
WHERE term_relationships.source_id = ut_s.id
  AND term_relationships.target_id = ut_t.id;

-- 3. Xóa relationships bị trùng lặp sau khi map sang global_term_id
DELETE FROM public.term_relationships a
USING public.term_relationships b
WHERE a.id < b.id
  AND a.source_global_term_id = b.source_global_term_id
  AND a.target_global_term_id = b.target_global_term_id
  AND a.relation_type = b.relation_type;

-- 4. Đảm bảo NOT NULL
ALTER TABLE public.term_relationships
  ALTER COLUMN source_global_term_id SET NOT NULL,
  ALTER COLUMN target_global_term_id SET NOT NULL;

-- 5. Xóa foreign keys cũ trỏ đến user_terms
ALTER TABLE public.term_relationships
  DROP CONSTRAINT IF EXISTS term_relationships_source_id_fkey,
  DROP CONSTRAINT IF EXISTS term_relationships_target_id_fkey;

-- 6. Xóa cột cũ
ALTER TABLE public.term_relationships DROP COLUMN source_id;
ALTER TABLE public.term_relationships DROP COLUMN target_id;

-- 7. Đổi tên cột mới
ALTER TABLE public.term_relationships RENAME COLUMN source_global_term_id TO source_id;
ALTER TABLE public.term_relationships RENAME COLUMN target_global_term_id TO target_id;

-- 8. Thêm foreign keys mới trỏ đến global_terms
ALTER TABLE public.term_relationships
  ADD CONSTRAINT term_relationships_source_id_fkey
    FOREIGN KEY (source_id) REFERENCES public.global_terms(id) ON DELETE CASCADE;

ALTER TABLE public.term_relationships
  ADD CONSTRAINT term_relationships_target_id_fkey
    FOREIGN KEY (target_id) REFERENCES public.global_terms(id) ON DELETE CASCADE;

-- 9. Thêm unique constraint để tránh duplicate
ALTER TABLE public.term_relationships
  ADD CONSTRAINT term_relationships_unique
    UNIQUE (source_id, target_id, relation_type);

-- 10. Cập nhật index
DROP INDEX IF EXISTS term_relationships_source_idx;
CREATE INDEX term_relationships_source_idx ON public.term_relationships(source_id);
DROP INDEX IF EXISTS term_relationships_target_idx;
CREATE INDEX term_relationships_target_idx ON public.term_relationships(target_id);

-- 11. Tạo RLS policy mới: user có thể quản lý relationships nếu họ có user_term linked đến global_term đó
CREATE POLICY "term_relationships through owned global terms" ON public.term_relationships
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_terms ut
      WHERE ut.user_id = auth.uid()
        AND ut.deleted_at IS NULL
        AND (ut.global_term_id = term_relationships.source_id OR ut.global_term_id = term_relationships.target_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_terms ut
      WHERE ut.user_id = auth.uid()
        AND ut.deleted_at IS NULL
        AND (ut.global_term_id = term_relationships.source_id OR ut.global_term_id = term_relationships.target_id)
    )
  );
