-- Tự động seed từ vựng từ global_terms cho user mới khi họ truy cập danh sách từ vựng lần đầu
-- Copy cả translation từ meaning đầu tiên trong global_terms
CREATE OR REPLACE FUNCTION public.seed_user_vocabulary(p_user_id uuid)
RETURNS integer AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO public.user_terms (user_id, global_term_id, status, translation)
  SELECT 
    p_user_id, 
    gt.id, 
    'new',
    CASE 
      WHEN gt.meanings IS NOT NULL AND jsonb_array_length(gt.meanings) > 0 
      THEN (gt.meanings->0->>'text')
      ELSE NULL
    END
  FROM public.global_terms gt
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_terms ut 
    WHERE ut.global_term_id = gt.id AND ut.user_id = p_user_id
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
