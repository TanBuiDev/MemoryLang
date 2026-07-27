-- The remaining B1 DeFull objective sections were reviewed and their Signs
-- images are present, so make them visible alongside the already-published
-- writing, listening, and speaking resources.
update public.practice_activities
set is_published = true
where source_key in (
  'grammar-use-of-english',
  'signs',
  'reading-text-2-coasteering',
  'reading-text-3-karina-moore',
  'cloze-text-15-william-the-hero',
  'sentence-transformation'
);
