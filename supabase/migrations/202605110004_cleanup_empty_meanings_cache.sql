-- Delete global_terms cache entries with empty meanings (cleared by previous migration).
-- These will be re-created from the dictionary API on next access.
delete from public.global_terms
where meanings = '[]'::jsonb;
