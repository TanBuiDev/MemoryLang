-- ========================================
-- CONTENT GATING — access_tier + teaser
-- Migration: 20260715000001_add_content_gating.sql
-- ========================================

-- 1. Thêm access_tier + teaser_config vào listening_topics
ALTER TABLE public.listening_topics
  ADD COLUMN IF NOT EXISTS access_tier TEXT NOT NULL DEFAULT 'free'
    CHECK (access_tier IN ('free', 'pro'));
ALTER TABLE public.listening_topics
  ADD COLUMN IF NOT EXISTS teaser_config JSONB NOT NULL DEFAULT '{
    "enabled": true,
    "type": "title_only"
  }'::JSONB;
-- 2. Thêm access_tier + teaser_config vào grammar_topics
ALTER TABLE public.grammar_topics
  ADD COLUMN IF NOT EXISTS access_tier TEXT NOT NULL DEFAULT 'free'
    CHECK (access_tier IN ('free', 'pro'));
ALTER TABLE public.grammar_topics
  ADD COLUMN IF NOT EXISTS teaser_config JSONB NOT NULL DEFAULT '{
    "enabled": true,
    "type": "theory_only"
  }'::JSONB;
-- 3. Indexes cho filter by access_tier
CREATE INDEX IF NOT EXISTS listening_topics_access_tier_idx
  ON public.listening_topics(access_tier);
CREATE INDEX IF NOT EXISTS grammar_topics_access_tier_idx
  ON public.grammar_topics(access_tier);
-- 4. RPC: Bulk update access_tier (admin only, validated by SECURITY DEFINER + is_admin check)
CREATE OR REPLACE FUNCTION public.bulk_update_access_tier(
  p_table TEXT,
  p_ids UUID[],
  p_tier TEXT
) RETURNS void AS $$
BEGIN
  -- Chỉ admin mới được gọi
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin only';
  END IF;

  -- Validate tier
  IF p_tier NOT IN ('free', 'pro') THEN
    RAISE EXCEPTION 'Invalid tier: %. Must be free or pro', p_tier;
  END IF;

  IF p_table = 'listening_topics' THEN
    UPDATE public.listening_topics
    SET access_tier = p_tier
    WHERE id = ANY(p_ids);
  ELSIF p_table = 'grammar_topics' THEN
    UPDATE public.grammar_topics
    SET access_tier = p_tier
    WHERE id = ANY(p_ids);
  ELSE
    RAISE EXCEPTION 'Invalid table: %. Must be listening_topics or grammar_topics', p_table;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- 5. RPC: Update teaser_config cho một topic (admin only)
CREATE OR REPLACE FUNCTION public.update_teaser_config(
  p_table TEXT,
  p_id UUID,
  p_config JSONB
) RETURNS void AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin only';
  END IF;

  IF p_table = 'listening_topics' THEN
    UPDATE public.listening_topics
    SET teaser_config = p_config
    WHERE id = p_id;
  ELSIF p_table = 'grammar_topics' THEN
    UPDATE public.grammar_topics
    SET teaser_config = p_config
    WHERE id = p_id;
  ELSE
    RAISE EXCEPTION 'Invalid table: %. Must be listening_topics or grammar_topics', p_table;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
