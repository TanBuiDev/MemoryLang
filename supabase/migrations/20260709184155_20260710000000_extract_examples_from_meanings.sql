-- Extract nested examples from meanings[] into the main examples[] array,
-- then clear examples from each meaning object.

DO $$
DECLARE
  rec RECORD;
  meaning_elem jsonb;
  new_meanings jsonb;
  extracted_examples jsonb;
  merged_examples jsonb;
  i int;
BEGIN
  FOR rec IN
    SELECT id, meanings, examples
    FROM public.global_terms
    WHERE deleted_at IS NULL
      AND meanings IS NOT NULL
      AND jsonb_array_length(meanings) > 0
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(meanings) AS m
        WHERE m->'examples' IS NOT NULL
          AND jsonb_array_length(m->'examples') > 0
      )
  LOOP
    extracted_examples := '[]'::jsonb;
    FOR i IN 0..jsonb_array_length(rec.meanings) - 1 LOOP
      meaning_elem := rec.meanings->i;
      IF meaning_elem->'examples' IS NOT NULL AND jsonb_array_length(meaning_elem->'examples') > 0 THEN
        extracted_examples := extracted_examples || (meaning_elem->'examples');
      END IF;
    END LOOP;

    merged_examples := COALESCE(rec.examples, '[]'::jsonb);
    FOR i IN 0..jsonb_array_length(extracted_examples) - 1 LOOP
      IF NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(merged_examples) AS ex
        WHERE ex->>'sentence' = (extracted_examples->i)->>'sentence'
      ) THEN
        merged_examples := merged_examples || jsonb_build_array(extracted_examples->i);
      END IF;
    END LOOP;

    new_meanings := '[]'::jsonb;
    FOR i IN 0..jsonb_array_length(rec.meanings) - 1 LOOP
      meaning_elem := rec.meanings->i;
      new_meanings := new_meanings || jsonb_build_array(
        meaning_elem - 'examples'
      );
    END LOOP;

    UPDATE public.global_terms
    SET meanings = new_meanings,
        examples = merged_examples,
        updated_at = now()
    WHERE id = rec.id;
  END LOOP;
END $$;;
