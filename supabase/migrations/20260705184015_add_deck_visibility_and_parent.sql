-- Add visibility column (public/private)
ALTER TABLE public.decks ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private'
  CHECK (visibility IN ('private', 'public'));

-- Add parent_id for hierarchical decks
ALTER TABLE public.decks ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.decks(id) ON DELETE CASCADE;

-- Index for finding child decks
CREATE INDEX IF NOT EXISTS idx_decks_parent_id ON public.decks(parent_id);

-- Drop old monolithic policy
DROP POLICY IF EXISTS "decks own rows" ON public.decks;

-- SELECT: public decks visible to all; private decks only to owner
CREATE POLICY "decks_select" ON public.decks
  FOR SELECT
  USING (visibility = 'public' OR user_id = auth.uid());

-- INSERT: regular users can only create private; admin can create both
CREATE POLICY "decks_insert" ON public.decks
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (visibility = 'private' OR (visibility = 'public' AND is_admin()))
  );

-- UPDATE: only owner
CREATE POLICY "decks_update" ON public.decks
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: only owner
CREATE POLICY "decks_delete" ON public.decks
  FOR DELETE
  USING (user_id = auth.uid());;
