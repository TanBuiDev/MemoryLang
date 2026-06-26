-- 1. Tạo helper function để kiểm tra xem user hiện tại có phải admin hay không
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Cập nhật RLS Policy của bảng global_terms
DROP POLICY IF EXISTS "authenticated can read global terms" ON global_terms;
CREATE POLICY "authenticated can read global terms" ON global_terms 
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "only admin can write global terms" ON global_terms;
CREATE POLICY "only admin can write global terms" ON global_terms 
  FOR ALL TO authenticated 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());
