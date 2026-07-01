-- Migration: Tao RPC tang view_count cho grammar topics
-- Ngay tao: 2026-07-01

CREATE OR REPLACE FUNCTION public.increment_grammar_view_count(p_topic_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.grammar_topics
  SET view_count = view_count + 1
  WHERE id = p_topic_id;
$$;
