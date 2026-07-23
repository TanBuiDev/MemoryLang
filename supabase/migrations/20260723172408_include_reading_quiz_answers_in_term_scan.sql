CREATE OR REPLACE FUNCTION public.scan_reading_article_terms(p_article_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_scannable_text text;
  v_match_count integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required'
      USING ERRCODE = '42501';
  END IF;

  SELECT concat_ws(
    ' ',
    reading_articles.plain_text,
    (
      SELECT string_agg(answer_option ->> 'text', ' ')
      FROM public.reading_questions
      CROSS JOIN LATERAL jsonb_array_elements(
        COALESCE(reading_questions.options, '[]'::jsonb)
      ) AS answer_option
      WHERE reading_questions.article_id = p_article_id
        AND answer_option ->> 'is_correct' = 'true'
        AND nullif(btrim(answer_option ->> 'text'), '') IS NOT NULL
    )
  )
  INTO v_scannable_text
  FROM public.reading_articles
  WHERE reading_articles.id = p_article_id
    AND reading_articles.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reading article not found'
      USING ERRCODE = 'P0002';
  END IF;

  DELETE FROM public.reading_article_terms
  WHERE reading_article_terms.article_id = p_article_id;

  WITH unique_tokens AS (
    SELECT DISTINCT (word_match)[1] AS normalized_text
    FROM regexp_matches(
      lower(v_scannable_text),
      '[[:alpha:]''’]+',
      'g'
    ) AS word_match
  )
  INSERT INTO public.reading_article_terms (article_id, global_term_id)
  SELECT p_article_id, global_terms.id
  FROM unique_tokens
  JOIN public.global_terms
    ON global_terms.normalized_text = unique_tokens.normalized_text
  WHERE global_terms.source_language = 'en'
    AND global_terms.native_language = 'vi'
    AND global_terms.item_type = 'word'
    AND global_terms.deleted_at IS NULL
  ON CONFLICT (article_id, global_term_id) DO NOTHING;

  GET DIAGNOSTICS v_match_count = ROW_COUNT;
  RETURN v_match_count;
END;
$$;

REVOKE ALL ON FUNCTION public.scan_reading_article_terms(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.scan_reading_article_terms(uuid) TO authenticated;
