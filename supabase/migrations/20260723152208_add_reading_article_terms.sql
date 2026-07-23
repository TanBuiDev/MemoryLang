DROP POLICY IF EXISTS "reading_articles_admin_all" ON public.reading_articles;
CREATE POLICY "reading_articles_admin_all"
ON public.reading_articles
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "reading_questions_admin_all" ON public.reading_questions;
CREATE POLICY "reading_questions_admin_all"
ON public.reading_questions
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

GRANT SELECT ON TABLE public.global_terms TO authenticated;

CREATE TABLE public.reading_article_terms (
  article_id uuid NOT NULL REFERENCES public.reading_articles(id) ON DELETE CASCADE,
  global_term_id uuid NOT NULL REFERENCES public.global_terms(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (article_id, global_term_id)
);

CREATE INDEX reading_article_terms_global_term_idx
  ON public.reading_article_terms(global_term_id);

ALTER TABLE public.reading_article_terms ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.reading_article_terms FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.reading_article_terms TO authenticated;

CREATE POLICY "read accessible reading article terms"
ON public.reading_article_terms
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.reading_articles
    WHERE reading_articles.id = reading_article_terms.article_id
  )
);

CREATE POLICY "admins insert reading article terms"
ON public.reading_article_terms
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
);

CREATE POLICY "admins delete reading article terms"
ON public.reading_article_terms
FOR DELETE
TO authenticated
USING (
  public.is_admin()
);

CREATE OR REPLACE FUNCTION public.scan_reading_article_terms(p_article_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_plain_text text;
  v_match_count integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required'
      USING ERRCODE = '42501';
  END IF;

  SELECT reading_articles.plain_text
  INTO v_plain_text
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
      lower(v_plain_text),
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

CREATE OR REPLACE FUNCTION public.get_reading_article_terms(p_article_id uuid)
RETURNS TABLE (
  global_term_id uuid,
  normalized_text text,
  source_text text,
  ipa text,
  part_of_speech text,
  audio_url text,
  translation text,
  meanings jsonb
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    global_terms.id,
    global_terms.normalized_text,
    global_terms.source_text,
    global_terms.ipa,
    global_terms.part_of_speech,
    global_terms.audio_url,
    global_terms.translation,
    global_terms.meanings
  FROM public.reading_article_terms
  JOIN public.global_terms
    ON global_terms.id = reading_article_terms.global_term_id
  WHERE reading_article_terms.article_id = p_article_id
    AND global_terms.deleted_at IS NULL
  ORDER BY length(global_terms.normalized_text) DESC, global_terms.normalized_text;
$$;

REVOKE ALL ON FUNCTION public.scan_reading_article_terms(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_reading_article_terms(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.scan_reading_article_terms(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_reading_article_terms(uuid) TO authenticated;
