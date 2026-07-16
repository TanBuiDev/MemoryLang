-- Fix global_terms meanings: clear cached meanings that contain English definitions
-- instead of translations. The Edge Function will re-translate correctly on next access.
update public.global_terms
set meanings = '[]'::jsonb
where source_language != native_language;
-- Fix user_terms meanings: same treatment for user vocabulary items
-- that were populated from the enrichment (English definitions instead of translations).
update public.user_terms
set meanings = '[]'::jsonb
where source_language != native_language;
