-- Normalize translation separators in global_terms table.
-- Converts diverse separators like ',', ';', '|', '\n' to standard ' / '.

CREATE OR REPLACE FUNCTION clean_translation(val text) RETURNS text AS $$
DECLARE
  result text[] := '{}';
  current text := '';
  depth int := 0;
  i int;
  char text;
  trimmed text;
  parts text[];
  chips_part text;
  draft_part text;
BEGIN
  IF val IS NULL OR trim(val) = '' THEN
    RETURN val;
  END IF;

  -- Handle ' | ' separator if it exists (TranslationChips format: chips | draft)
  parts := string_to_array(val, ' | ');
  chips_part := COALESCE(parts[1], '');
  
  IF array_length(parts, 1) = 1 THEN
    chips_part := val;
    draft_part := '';
  ELSE
    draft_part := COALESCE(parts[2], '');
  END IF;

  FOR i IN 1..char_length(chips_part) LOOP
    char := substr(chips_part, i, 1);
    IF char = '(' THEN
      depth := depth + 1;
      current := current || char;
    ELSIF char = ')' THEN
      depth := depth - 1;
      IF depth < 0 THEN
        depth := 0;
      END IF;
      current := current || char;
    ELSIF depth = 0 AND (char = '/' OR char = ';' OR char = ',' OR char = '|' OR char = E'\n') THEN
      trimmed := trim(current);
      IF trimmed <> '' THEN
        result := array_append(result, trimmed);
      END IF;
      current := '';
    ELSE
      current := current || char;
    END IF;
  END LOOP;

  trimmed := trim(current);
  IF trimmed <> '' THEN
    result := array_append(result, trimmed);
  END IF;

  IF array_length(result, 1) IS NULL THEN
    RETURN trim(val);
  END IF;

  -- Join with ' / '
  current := array_to_string(result, ' / ');
  
  IF draft_part <> '' THEN
    current := current || ' | ' || draft_part;
  END IF;

  RETURN current;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  rec RECORD;
  meaning_elem jsonb;
  new_meanings jsonb;
  i int;
  trans_val text;
BEGIN
  -- 1. Update the flat translation column
  UPDATE public.global_terms
  SET translation = clean_translation(translation),
      updated_at = now()
  WHERE translation IS NOT NULL 
    AND deleted_at IS NULL;

  -- 2. Update the nested meanings translation property
  FOR rec IN
    SELECT id, meanings
    FROM public.global_terms
    WHERE deleted_at IS NULL
      AND meanings IS NOT NULL
      AND jsonb_array_length(meanings) > 0
  LOOP
    new_meanings := '[]'::jsonb;
    FOR i IN 0..jsonb_array_length(rec.meanings) - 1 LOOP
      meaning_elem := rec.meanings->i;
      IF meaning_elem->'translation' IS NOT NULL AND meaning_elem->>'translation' <> '' THEN
        trans_val := clean_translation(meaning_elem->>'translation');
        meaning_elem := jsonb_set(meaning_elem, '{translation}', to_jsonb(trans_val));
      END IF;
      new_meanings := new_meanings || jsonb_build_array(meaning_elem);
    END LOOP;

    -- Update the row if it changed
    IF new_meanings <> rec.meanings THEN
      UPDATE public.global_terms
      SET meanings = new_meanings,
          updated_at = now()
      WHERE id = rec.id;
    END IF;
  END LOOP;
END $$;

-- Drop the helper function as it is only needed for the migration run
DROP FUNCTION clean_translation(text);
