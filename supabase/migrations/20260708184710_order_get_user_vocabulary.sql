CREATE OR REPLACE FUNCTION public.get_user_vocabulary(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  global_term_id uuid,
  status text,
  view_count integer,
  correct_count integer,
  wrong_count integer,
  audio_play_count integer,
  last_reviewed_at timestamptz,
  next_review_at timestamptz,
  flagged boolean,
  deleted_at timestamptz,
  created_at timestamptz,
  source_text text,
  normalized_text text,
  source_language text,
  native_language text,
  item_type text,
  part_of_speech text,
  ipa text,
  audio_url text,
  image_url text,
  meanings jsonb,
  examples jsonb,
  note text,
  tags text[],
  translation text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ut.id AS id,
    gt.id AS global_term_id,
    COALESCE(ut.status, 'new') AS status,
    COALESCE(ut.view_count, 0) AS view_count,
    COALESCE(ut.correct_count, 0) AS correct_count,
    COALESCE(ut.wrong_count, 0) AS wrong_count,
    COALESCE(ut.audio_play_count, 0) AS audio_play_count,
    ut.last_reviewed_at,
    ut.next_review_at,
    COALESCE(ut.flagged, false) AS flagged,
    ut.deleted_at,
    COALESCE(ut.created_at, gt.created_at) AS created_at,
    gt.source_text,
    gt.normalized_text,
    gt.source_language,
    gt.native_language,
    gt.item_type,
    gt.part_of_speech,
    gt.ipa,
    gt.audio_url,
    gt.image_url,
    gt.meanings,
    gt.examples,
    gt.note,
    gt.tags,
    gt.translation
  FROM public.global_terms gt
  LEFT JOIN public.user_terms ut ON ut.global_term_id = gt.id AND ut.user_id = p_user_id
  WHERE gt.deleted_at IS NULL
    AND (ut.deleted_at IS NULL OR ut.id IS NULL)
  ORDER BY gt.created_at ASC, gt.id ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_vocabulary(uuid) TO authenticated;;
