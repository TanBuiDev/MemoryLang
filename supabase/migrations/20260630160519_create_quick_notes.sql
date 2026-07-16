CREATE TABLE public.quick_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}'::TEXT[],
  linked_vocab_id UUID REFERENCES public.user_terms(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.quick_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quick notes"
  ON public.quick_notes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quick notes"
  ON public.quick_notes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quick notes"
  ON public.quick_notes
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quick notes"
  ON public.quick_notes
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER quick_notes_updated_at
  BEFORE UPDATE ON public.quick_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();;
