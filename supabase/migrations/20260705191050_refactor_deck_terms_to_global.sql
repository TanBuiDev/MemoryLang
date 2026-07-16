-- Step 1: Add global_term_id column
ALTER TABLE public.deck_terms ADD COLUMN IF NOT EXISTS global_term_id uuid;

-- Step 2: Migrate existing data
UPDATE public.deck_terms dt
SET global_term_id = ut.global_term_id
FROM public.user_terms ut
WHERE dt.user_term_id = ut.id AND dt.global_term_id IS NULL;

-- Step 3: Make NOT NULL after data migration
ALTER TABLE public.deck_terms ALTER COLUMN global_term_id SET NOT NULL;

-- Step 4: Add FK constraint
ALTER TABLE public.deck_terms ADD CONSTRAINT fk_deck_terms_global_term
  FOREIGN KEY (global_term_id) REFERENCES public.global_terms(id) ON DELETE CASCADE;

-- Step 5: Drop old PK and user_term_id
ALTER TABLE public.deck_terms DROP CONSTRAINT IF EXISTS deck_terms_pkey;
ALTER TABLE public.deck_terms DROP COLUMN IF EXISTS user_term_id;

-- Step 6: Add new PK
ALTER TABLE public.deck_terms ADD PRIMARY KEY (deck_id, global_term_id);

-- Step 7: Drop old indexes and create new ones
DROP INDEX IF EXISTS deck_terms_user_term_idx;
CREATE INDEX IF NOT EXISTS idx_deck_terms_global_term ON public.deck_terms(global_term_id);

-- Step 8: Update RLS - allow access to deck_terms of owned OR public decks
DROP POLICY IF EXISTS "deck_terms through owned decks" ON public.deck_terms;
CREATE POLICY "deck_terms_select" ON public.deck_terms
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.decks
    WHERE decks.id = deck_terms.deck_id
    AND (decks.visibility = 'public' OR decks.user_id = auth.uid())
  ));
CREATE POLICY "deck_terms_insert" ON public.deck_terms
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.decks
    WHERE decks.id = deck_terms.deck_id
    AND decks.user_id = auth.uid()
  ));
CREATE POLICY "deck_terms_delete" ON public.deck_terms
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.decks
    WHERE decks.id = deck_terms.deck_id
    AND decks.user_id = auth.uid()
  ));;
