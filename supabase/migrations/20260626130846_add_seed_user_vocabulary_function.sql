CREATE OR REPLACE FUNCTION public.seed_user_vocabulary(p_user_id uuid)
RETURNS integer AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO public.user_terms (user_id, global_term_id, status)
  SELECT p_user_id, gt.id, 'new'
  FROM public.global_terms gt
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_terms ut 
    WHERE ut.global_term_id = gt.id AND ut.user_id = p_user_id
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;;
