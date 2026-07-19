DROP FUNCTION public.list_ai_grammar_topics(integer);

CREATE FUNCTION public.list_ai_grammar_topics(p_limit integer DEFAULT 5)
RETURNS TABLE (
  id uuid,
  title text,
  category text,
  level text,
  access_tier text,
  total_count bigint
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.title,
    t.category,
    t.level,
    t.access_tier,
    count(*) OVER () AS total_count
  FROM public.grammar_topics t
  WHERE t.is_published = true
    AND (
      t.access_tier = 'free'
      OR public.is_admin()
      OR public.is_user_pro(auth.uid())
    )
  ORDER BY t.created_at ASC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 5), 1), 10);
$$;

REVOKE ALL ON FUNCTION public.list_ai_grammar_topics(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_ai_grammar_topics(integer) TO authenticated;
