-- Harden Pro content access at the database layer.
-- Topic metadata stays readable for teaser/list discovery; child payload rows
-- require a Free topic, a Pro subscription, or admin privileges.

CREATE OR REPLACE FUNCTION public.is_user_pro(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Prevent this SECURITY DEFINER helper from becoming a user lookup oracle.
  IF p_user_id <> (SELECT auth.uid()) AND NOT public.is_admin() THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.user_id = p_user_id
      AND s.plan_type = 'pro'
      AND s.status IN ('active', 'trialing')
      AND (
        s.current_period_end IS NULL
        OR s.current_period_end > now()
      )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_user_pro(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_user_pro(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_user_add_term(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF p_user_id <> (SELECT auth.uid()) AND NOT public.is_admin() THEN
    RETURN false;
  END IF;

  -- Pro không giới hạn
  IF public.is_user_pro(p_user_id) THEN
    RETURN true;
  END IF;

  -- Free: max 100 từ (không tính đã soft-delete)
  SELECT COUNT(*) INTO v_count
  FROM public.user_terms
  WHERE user_id = p_user_id AND deleted_at IS NULL;

  RETURN v_count < 100;
END;
$$;

REVOKE ALL ON FUNCTION public.can_user_add_term(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_user_add_term(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_user_add_deck(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF p_user_id <> (SELECT auth.uid()) AND NOT public.is_admin() THEN
    RETURN false;
  END IF;

  -- Pro không giới hạn
  IF public.is_user_pro(p_user_id) THEN
    RETURN true;
  END IF;

  -- Free: max 5 decks
  SELECT COUNT(*) INTO v_count
  FROM public.decks
  WHERE user_id = p_user_id;

  RETURN v_count < 5;
END;
$$;

REVOKE ALL ON FUNCTION public.can_user_add_deck(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_user_add_deck(UUID) TO authenticated;

DROP POLICY IF EXISTS "anyone can view published listening tests" ON public.listening_tests;

CREATE POLICY "users can view accessible published listening tests"
  ON public.listening_tests
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.listening_topics top
    WHERE top.id = topic_id
      AND (
        public.is_admin()
        OR (
          top.is_published = true
          AND (
            COALESCE(top.access_tier, 'free') = 'free'
            OR (SELECT public.is_user_pro((SELECT auth.uid())))
          )
        )
      )
  ));

DROP POLICY IF EXISTS "anyone can view published listening parts" ON public.listening_parts;

CREATE POLICY "users can view accessible published listening parts"
  ON public.listening_parts
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.listening_tests t
    JOIN public.listening_topics top ON top.id = t.topic_id
    WHERE t.id = test_id
      AND (
        public.is_admin()
        OR (
          top.is_published = true
          AND (
            COALESCE(top.access_tier, 'free') = 'free'
            OR (SELECT public.is_user_pro((SELECT auth.uid())))
          )
        )
      )
  ));

DROP POLICY IF EXISTS "anyone can view blocks of published topics" ON public.lesson_blocks;

CREATE POLICY "users can view accessible blocks of published topics"
  ON public.lesson_blocks
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.grammar_topics t
    WHERE t.id = topic_id
      AND (
        public.is_admin()
        OR (
          t.is_published = true
          AND (
            COALESCE(t.access_tier, 'free') = 'free'
            OR (SELECT public.is_user_pro((SELECT auth.uid())))
          )
        )
      )
  ));

DROP POLICY IF EXISTS "anyone can view grammar exercises" ON public.grammar_exercises;

CREATE POLICY "users can view accessible grammar exercises"
  ON public.grammar_exercises
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.grammar_topics t
    WHERE t.id = topic_id
      AND (
        public.is_admin()
        OR (
          t.is_published = true
          AND (
            COALESCE(t.access_tier, 'free') = 'free'
            OR (SELECT public.is_user_pro((SELECT auth.uid())))
          )
        )
      )
  ));
