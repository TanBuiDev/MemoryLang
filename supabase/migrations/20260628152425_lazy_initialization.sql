-- 1. Vô hiệu hóa tính năng seed tự động hàng loạt để tiết kiệm tài nguyên
CREATE OR REPLACE FUNCTION public.seed_user_vocabulary(p_user_id uuid)
RETURNS integer AS $$
BEGIN
  -- Trả về 0 và không chèn bản ghi trống nào nữa
  RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Tạo hàm get_user_vocabulary dùng LEFT JOIN động
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
    AND (ut.deleted_at IS NULL OR ut.id IS NULL);
END;
$$;

-- Cấp quyền thực thi hàm get_user_vocabulary cho các user đã đăng nhập
GRANT EXECUTE ON FUNCTION public.get_user_vocabulary(uuid) TO authenticated;

-- 3. Tạo trigger cascade soft-delete
CREATE OR REPLACE FUNCTION public.sync_global_term_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND (OLD.deleted_at IS NULL OR OLD.deleted_at <> NEW.deleted_at) THEN
    UPDATE public.user_terms
    SET deleted_at = NEW.deleted_at
    WHERE global_term_id = NEW.id AND deleted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Xóa trigger cũ nếu có
DROP TRIGGER IF EXISTS trg_sync_global_term_soft_delete ON public.global_terms;

CREATE TRIGGER trg_sync_global_term_soft_delete
AFTER UPDATE ON public.global_terms
FOR EACH ROW
EXECUTE FUNCTION public.sync_global_term_soft_delete();

-- 4. Cập nhật hàm apply_study_review_batch để chèn user_term động khi ôn tập
CREATE OR REPLACE FUNCTION public.apply_study_review_batch(
  actions jsonb default '[]'::jsonb,
  viewed_term_ids uuid[] default '{}'::uuid[],
  session_patch jsonb default null
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  current_action jsonb;
  current_session_id uuid;
  v_term_id uuid;
  v_user_term_id uuid;
  v_view_id uuid;
BEGIN
  -- 1. Xử lý các action (cập nhật SRS)
  FOR current_action IN
    SELECT value
    FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb))
  LOOP
    v_term_id := (current_action->>'term_id')::uuid;
    
    -- Thử tìm user_term_id tương ứng
    SELECT id INTO v_user_term_id
    FROM public.user_terms
    WHERE user_id = auth.uid()
      AND (id = v_term_id OR global_term_id = v_term_id);

    -- Nếu chưa có, tự động chèn mới
    IF v_user_term_id IS NULL THEN
      -- Nếu v_term_id thực chất là global_term_id, ta chèn mới bản ghi
      INSERT INTO public.user_terms (user_id, global_term_id, status)
      VALUES (auth.uid(), v_term_id, 'new')
      RETURNING id INTO v_user_term_id;
    END IF;

    -- Thực hiện update tiến trình học
    UPDATE public.user_terms
    SET
      correct_count = correct_count + COALESCE((current_action->>'correct_increment')::int, 0),
      wrong_count = wrong_count + COALESCE((current_action->>'wrong_increment')::int, 0),
      status = COALESCE(current_action->>'status', status),
      last_reviewed_at = COALESCE((current_action->>'reviewed_at')::timestamptz, now()),
      next_review_at = nullif(current_action->>'next_review_at', '')::timestamptz,
      srs_repetition = COALESCE((current_action->>'srs_repetition')::int, srs_repetition),
      srs_interval_days = COALESCE((current_action->>'srs_interval_days')::int, srs_interval_days),
      srs_ease_factor = COALESCE((current_action->>'srs_ease_factor')::numeric(4,2), srs_ease_factor)
    WHERE id = v_user_term_id;
  END LOOP;

  -- 2. Xử lý các viewed_term_ids
  IF COALESCE(array_length(viewed_term_ids, 1), 0) > 0 THEN
    -- Đảm bảo tất cả viewed_term_ids đều đã được chèn vào user_terms
    FOREACH v_view_id IN ARRAY viewed_term_ids
    LOOP
      SELECT id INTO v_user_term_id
      FROM public.user_terms
      WHERE user_id = auth.uid()
        AND (id = v_view_id OR global_term_id = v_view_id);

      IF v_user_term_id IS NULL THEN
        INSERT INTO public.user_terms (user_id, global_term_id, status)
        VALUES (auth.uid(), v_view_id, 'new')
        RETURNING id INTO v_user_term_id;
      END IF;

      UPDATE public.user_terms
      SET view_count = view_count + 1
      WHERE id = v_user_term_id;
    END LOOP;
  END IF;

  -- 3. Cập nhật study session
  IF session_patch IS NOT NULL AND session_patch ? 'session_id' THEN
    current_session_id := nullif(session_patch->>'session_id', '')::uuid;

    IF current_session_id IS NOT NULL THEN
      UPDATE public.study_sessions
      SET
        total_cards = COALESCE((session_patch->>'total_cards')::int, total_cards),
        viewed_cards = COALESCE((session_patch->>'viewed_cards')::int, viewed_cards),
        remembered_count = COALESCE((session_patch->>'remembered_count')::int, remembered_count),
        difficult_count = COALESCE((session_patch->>'difficult_count')::int, difficult_count),
        ended_at = now()
      WHERE id = current_session_id
        AND user_id = auth.uid();
    END IF;
  END IF;
END;
$$;;
