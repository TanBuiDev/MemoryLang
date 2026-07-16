-- Migration already applied via manual steps above.
-- This placeholder records the migration.
ALTER TABLE public.term_relationships DROP CONSTRAINT IF EXISTS term_relationships_relation_type_check;
ALTER TABLE public.term_relationships ADD CONSTRAINT term_relationships_relation_type_check CHECK (relation_type IN ('synonym', 'antonym', 'noun', 'verb', 'adjective', 'adverb'));
;
