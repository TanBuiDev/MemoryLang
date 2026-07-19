-- Read-only, authenticated data tools for AI Tutor.
-- Every function derives the learner from auth.uid(); callers cannot choose a user id.

CREATE OR REPLACE FUNCTION public.get_ai_learning_overview()
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'totalVocabulary', (
      SELECT count(*)
      FROM public.user_terms
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    ),
    'memorizedWords', (
      SELECT count(*)
      FROM public.user_terms
      WHERE user_id = auth.uid() AND deleted_at IS NULL AND status = 'memorized'
    ),
    'difficultWords', (
      SELECT count(*)
      FROM public.user_terms
      WHERE user_id = auth.uid() AND deleted_at IS NULL AND status = 'difficult'
    ),
    'reviewDue', (
      SELECT count(*)
      FROM public.user_terms
      WHERE user_id = auth.uid()
        AND deleted_at IS NULL
        AND next_review_at IS NOT NULL
        AND next_review_at <= now()
    ),
    'deckCount', (
      SELECT count(*)
      FROM public.decks
      WHERE user_id = auth.uid()
    ),
    'quizCount', (
      SELECT count(*)
      FROM public.quiz_results
      WHERE user_id = auth.uid()
    ),
    'averageAccuracy', (
      SELECT COALESCE(
        round(100.0 * sum(correct_answers) / NULLIF(sum(total_questions), 0)),
        0
      )
      FROM public.quiz_results
      WHERE user_id = auth.uid()
    ),
    'asOf', now()
  );
$$;

CREATE OR REPLACE FUNCTION public.get_ai_review_queue(p_kind text, p_limit integer DEFAULT 5)
RETURNS TABLE (
  source_text text,
  translation text,
  status text,
  next_review_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF p_kind NOT IN ('due', 'difficult') THEN
    RAISE EXCEPTION 'Invalid review queue kind' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT gt.source_text, gt.translation, ut.status, ut.next_review_at
  FROM public.user_terms ut
  JOIN public.global_terms gt ON gt.id = ut.global_term_id
  WHERE ut.user_id = auth.uid()
    AND ut.deleted_at IS NULL
    AND (
      (p_kind = 'due' AND ut.next_review_at IS NOT NULL AND ut.next_review_at <= now())
      OR (p_kind = 'difficult' AND ut.status = 'difficult')
    )
  ORDER BY
    CASE WHEN p_kind = 'due' THEN ut.next_review_at END ASC NULLS LAST,
    ut.wrong_count DESC,
    ut.updated_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 5), 1), 10);
END;
$$;

CREATE OR REPLACE FUNCTION public.search_ai_vocabulary(p_query text, p_limit integer DEFAULT 5)
RETURNS TABLE (
  source_text text,
  translation text,
  status text,
  next_review_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_query text := btrim(COALESCE(p_query, ''));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF char_length(v_query) NOT BETWEEN 1 AND 80 THEN
    RAISE EXCEPTION 'Vocabulary search query must contain 1 to 80 characters' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT gt.source_text, gt.translation, ut.status, ut.next_review_at
  FROM public.user_terms ut
  JOIN public.global_terms gt ON gt.id = ut.global_term_id
  WHERE ut.user_id = auth.uid()
    AND ut.deleted_at IS NULL
    AND (gt.source_text ILIKE '%' || v_query || '%' OR COALESCE(gt.translation, '') ILIKE '%' || v_query || '%')
  ORDER BY ut.last_reviewed_at DESC NULLS LAST, gt.source_text ASC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 5), 1), 10);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_ai_deck_overview(p_limit integer DEFAULT 5)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  term_count bigint
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT d.id, d.name, d.description, count(dt.global_term_id) AS term_count
  FROM public.decks d
  LEFT JOIN public.deck_terms dt ON dt.deck_id = d.id
  WHERE d.user_id = auth.uid()
  GROUP BY d.id, d.name, d.description, d.updated_at
  ORDER BY d.updated_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 5), 1), 10);
$$;

CREATE OR REPLACE FUNCTION public.list_ai_grammar_topics(p_limit integer DEFAULT 5)
RETURNS TABLE (
  id uuid,
  title text,
  category text,
  level text,
  access_tier text
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT t.id, t.title, t.category, t.level, t.access_tier
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

CREATE OR REPLACE FUNCTION public.get_ai_grammar_topic(p_topic_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'topic', jsonb_build_object(
      'id', t.id,
      'title', t.title,
      'category', t.category,
      'level', t.level
    ),
    'blocks', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('type', b.block_type, 'content', b.content))
      FROM (
        SELECT lb.block_type, lb.content
        FROM public.lesson_blocks lb
        WHERE lb.topic_id = t.id
          AND lb.block_type <> 'exercise_group'
        ORDER BY lb.sort_order ASC
        LIMIT 8
      ) b
    ), '[]'::jsonb)
  )
  FROM public.grammar_topics t
  WHERE t.id = p_topic_id
    AND t.is_published = true
    AND (
      t.access_tier = 'free'
      OR public.is_admin()
      OR public.is_user_pro(auth.uid())
    );
$$;

REVOKE ALL ON FUNCTION public.get_ai_learning_overview() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_ai_review_queue(text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_ai_vocabulary(text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_ai_deck_overview(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_ai_grammar_topics(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_ai_grammar_topic(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_ai_learning_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ai_review_queue(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_ai_vocabulary(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ai_deck_overview(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_ai_grammar_topics(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ai_grammar_topic(uuid) TO authenticated;
