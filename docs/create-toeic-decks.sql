-- ETS TOEIC 2026 Deck Structure (global_term_id version)
-- Run in Supabase SQL Editor

-- Step 1: Delete existing TOEIC decks (clean restart)
DELETE FROM deck_terms WHERE deck_id IN (SELECT id FROM decks WHERE name LIKE 'TEST %' OR name = 'ETS TOEIC Reading 2026');
DELETE FROM decks WHERE name LIKE 'TEST %' OR name = 'ETS TOEIC Reading 2026';

DO $$
DECLARE
  v_user_id uuid := '7112930d-527c-47dc-85f6-1f03a49d603c';
  v_parent_id uuid;
  v_deck_id uuid;
  v_global_term_id uuid;
BEGIN
  INSERT INTO decks (user_id, name, description, source_language, native_language, visibility)
  VALUES (v_user_id, 'ETS TOEIC Reading 2026', '800 tu vung', 'en', 'vi', 'public')
  RETURNING id INTO v_parent_id;

  -- TEST 01
  INSERT INTO decks (user_id, name, description, source_language, native_language, visibility, parent_id)
  VALUES (v_user_id, 'TEST 01', '80 tu', 'en', 'vi', 'public', v_parent_id)
  RETURNING id INTO v_deck_id;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'take place' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'attendee' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'antique' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'organization' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'suspicious' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'vary' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'inventory' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'expand' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'solicit' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'intend' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'prevent' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'aim' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'qualified' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'resident' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'agreement' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'opposition' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'extensive' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'guarantee' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'supplier' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'landscaping' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'suggestion' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'expertise' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'competitor' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'anniversary' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'dedication' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'loyalty' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'contribute' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'gratitude' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'refine' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'spacious' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'go through' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'various' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'secure' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'remove' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'previous' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'cooperation' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'upcoming' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'charge' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'assign' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'administrator' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'new hire' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'promote' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'advertise' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'coordinator' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'telescope' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'revise' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'representative' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'inquiry' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'general' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'release' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'indicate' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'retain' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'flavour' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'sacrifice' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'obtain' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'merger' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'nutritious' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'individual' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'opportunity' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'substitute' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'critical' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'colleague' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'courtesy' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'get the word out' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'install' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'significant' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'estimate' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'liaison' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'successive' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'expert' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'diagnose' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'replace' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'resemble' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'approve' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'inspection' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'proactive' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'procedure' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'compete' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'instrumental' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'combine' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;

  -- TEST 02
  INSERT INTO decks (user_id, name, description, source_language, native_language, visibility, parent_id)
  VALUES (v_user_id, 'TEST 02', '80 tu', 'en', 'vi', 'public', v_parent_id)
  RETURNING id INTO v_deck_id;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'reliability' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'reimbursement' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'accept' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'candidate' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'master' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'power failure' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'property' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'strategy' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'name' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'warranty' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'workplace' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'postpone' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'struggle' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'ingredient' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'savory' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'eager' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'artificial' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'substance' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'handy' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'effective' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'sustainable' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'address' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'porous' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'subscription' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'access' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'valid' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'expire' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'activate' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'distribute' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'feature' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'reveal' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'extension' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'complaint' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'issue' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'maintenance' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'summarize' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'notify' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'requirement' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'freight' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'vehicle' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'transport' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'nationwide' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'executive' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'commercial' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'demand' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'specialty' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'convert' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'virtual' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'visualization' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'suggest' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'curate' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'highlight' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'process' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'sleek' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'stabilization' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'rough' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'surface' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'discontinue' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'instruction' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'residence' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'complimentary' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'accommodate' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'catch up' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'customized' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'express' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'preserve' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'auction' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'donate' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'operation' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'thrilled' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'in advance' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'indeed' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'typically' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'smudge' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'found' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'emphasize' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'immediately' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'average' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'navigate' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'ultimately' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;

  -- TEST 03
  INSERT INTO decks (user_id, name, description, source_language, native_language, visibility, parent_id)
  VALUES (v_user_id, 'TEST 03', '80 tu', 'en', 'vi', 'public', v_parent_id)
  RETURNING id INTO v_deck_id;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'youth' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'conduct' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'regular' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'a majority of' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'represent' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'measure' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'submit' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'track' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'rapidly' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'committee' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'appendix' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'insight' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'investment' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'result' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'improve' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'appoint' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'simultaneously' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'revenue' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'undergo' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'take advantage of' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'transaction' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'potential' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'attention' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'dynamic' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'valuable' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'convince' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'audience' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'acquire' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'share' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'strength' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'quote' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'infusion' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'refrain' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'preference' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'function' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'gathering' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'innovation' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'shareholder' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'productivity' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'occur' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'optimize' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'conventional' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'commuter' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'relieved' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'desperate' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'municipal' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'entrance' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'mural' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'commission' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'approximately' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'publicize' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'significance' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'official' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'mingle' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'invaluable' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'accurate' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'recruit' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'celebrity' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'cater' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'equipment' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'distributor' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'component' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'facility' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'assembly' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'launch' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'financial' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'oversee' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'permanently' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'relocate' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'appreciate' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'perspective' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'intrigue' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'government' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'collaborate' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'commensurate' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'comply with' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'essential' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'relevant' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'formal' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'remote' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;

  -- TEST 04
  INSERT INTO decks (user_id, name, description, source_language, native_language, visibility, parent_id)
  VALUES (v_user_id, 'TEST 04', '80 tu', 'en', 'vi', 'public', v_parent_id)
  RETURNING id INTO v_deck_id;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'retire' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'applicant' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'contract' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'liquid' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'praise' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'aesthetic' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'maintain' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'confidentiality' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'architecture' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'thermostat' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'reflect' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'retreat' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'in celebration of' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'outline' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'procurement' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'pediatric' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'accurately' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'authentic' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'cuisine' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'occupy' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'enthusiasm' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'validate' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'at no charge' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'memoir' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'in person' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'specialize in' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'bold' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'reciprocate' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'competitive' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'knowledge' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'regulation' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'fluency' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'satellite' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'grant' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'calculate' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'snowpack' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'prototype' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'fluctuation' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'enhance' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'domestic' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'prestigious' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'commitment' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'tremendous' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'headquarter' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'facilitate' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'ergonomic' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'frequently' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'initiate' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'appearance' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'enclose' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'commence' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'elaborate' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'insightful' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'biography' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'admire' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'backdrop' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'refurbish' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'prompt' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'engaging' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'functionality' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'spectacular' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'secluded' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'enchanted' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'eclectic' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'audiovisual' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'durability' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'versatile' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'persist' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'commissioner' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'predecessor' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'step down' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'suspension' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'inaugural' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'proceeds' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'submission' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'administration' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'excel' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'aspect' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'verify' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'convenient' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;

  -- TEST 05
  INSERT INTO decks (user_id, name, description, source_language, native_language, visibility, parent_id)
  VALUES (v_user_id, 'TEST 05', '80 tu', 'en', 'vi', 'public', v_parent_id)
  RETURNING id INTO v_deck_id;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'accountant' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'agenda' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'sudden' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'proofread' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'experiment' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'initial' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'sealant' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'refined' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'soundproof' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'entrepreneur' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'tenure' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'achievement' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'forthcoming' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'consistently' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'implement' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'accordingly' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'align' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'tardiness' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'on behalf of' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'physiotherapy' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'inviting' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'objective' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'resource' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'informative' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'previously' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'editorial' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'prime' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'spread' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'overall' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'determine' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'avoid' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'sanctuary' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'hectic' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'bustle' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'excursion' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'cover letter' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'shortage' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'extract' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'favorable' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'crash' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'compatible' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'thrive' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'figure out' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'asset' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'supportive' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'presence' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'persevere' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'explore' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'primarily' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'breach' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'first aid' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'specific' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'administrative' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'possess' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'subordinate' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'crucially' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'proficiency' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'expenditure' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'statistical' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'industrial' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'description' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'dependent' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'in stock' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'unfamiliar' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'questionnaire' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'introductory' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'subsequent' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'waive' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'prospective' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'confidential' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'certified' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'withdraw' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'owed' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'participant' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'steady' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'acceptable' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'capacity' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'authorize' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'faulty' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'personnel' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;

  -- TEST 06
  INSERT INTO decks (user_id, name, description, source_language, native_language, visibility, parent_id)
  VALUES (v_user_id, 'TEST 06', '80 tu', 'en', 'vi', 'public', v_parent_id)
  RETURNING id INTO v_deck_id;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'composer' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'politeness' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'practical' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'workstation' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'latest' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'quarterly' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'stakeholder' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'biographer' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'distinctive' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'stationery' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'insurance' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'associated' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'ensure' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'exterior' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'incorporate' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'pleasure' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'corporate' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'appliance' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'innovative' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'geographic' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'electronics' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'patience' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'uneven' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'pavement' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'hygienist' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'handle' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'benefit' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'streamline' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'unusually' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'moderation' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'regularly' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'landscape' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'optimal' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'reasonable' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'pathway' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'rustic' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'constitute' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'fulfill' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'specification' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'paperwork' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'security' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'intricate' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'unprecedented' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'tactile' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'exploit' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'layover' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'amenity' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'awareness' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'conserve' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'fundamental' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'specified' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'eliminate' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'reduction' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'contribution' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'alternate' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'confident' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'incur' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'offset' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'placement' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'integral' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'guidance' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'botanical' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'society' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'theme' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'paradise' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'ambitious' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'cultivate' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'privilege' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'wildlife' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'cordially' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'nourish' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'deterrence' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'harmful' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'recreation' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'athletic' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'adequate' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'suitable' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'promptly' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'joint' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'profitable' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;

  -- TEST 07
  INSERT INTO decks (user_id, name, description, source_language, native_language, visibility, parent_id)
  VALUES (v_user_id, 'TEST 07', '80 tu', 'en', 'vi', 'public', v_parent_id)
  RETURNING id INTO v_deck_id;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'commute' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'understaffed' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'keep fit' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'completion' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'concern' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'tuition' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'enroll in' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'evaluate' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'milestone' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'responsive' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'chemistry' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'rapid' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'hospitality' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'payroll' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'time sheet' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'container' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'fancy' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'savour' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'socialise' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'reserve' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'opening' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'renewal' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'assume' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'tenant' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'realty' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'peninsula' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'moderately' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'scatter' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'inexpensive' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'flock to' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'alert' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'electronically' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'exclusively' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'creamery' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'physician' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'remind' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'time off' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'adjust' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'custodian' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'testimonial' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'satisfaction' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'detailed' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'reputation' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'identify' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'persuade' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'imminent' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'undoubtedly' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'visible' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'collaboration' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'corporation' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'nonprofit' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'participation' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'involve' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'dedicate' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'spearhead' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'subcompact' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'stunning' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'abundant' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'secondhand' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'credential' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'reliable' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'unsightly' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'merchandise' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'possession' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'drastically' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'informed' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'vast' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'bypass' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'deboard' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'voucher' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'demonstration' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'unintentionally' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'discard' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'lightweight' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'disposable' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'receptacle' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'overdue' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'withhold' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'malfunction' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'expedite' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;

  -- TEST 08
  INSERT INTO decks (user_id, name, description, source_language, native_language, visibility, parent_id)
  VALUES (v_user_id, 'TEST 08', '80 tu', 'en', 'vi', 'public', v_parent_id)
  RETURNING id INTO v_deck_id;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'significantly' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'sturdy' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'brief' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'functional' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'generate' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'extensively' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'proceed' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'territory' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'protocol' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'simplify' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'directions' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'laboratory' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'undergraduate' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'admission' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'semester' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'transcript' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'delighted' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'tendency' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'disclose' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'hesitate' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'candid' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'unsuitable' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'compact' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'beautify' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'integrity' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'extra' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'residential' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'paved' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'border' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'subsidiary' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'budget' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'distribution' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'researcher' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'capability' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'vacancy' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'cabin' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'compartment' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'dimension' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'permission' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'foster' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'roughly' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'unexpected' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'fulfillment' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'lodging' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'intent' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'directly' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'instructions' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'go over' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'convinced' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'personality' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'structure' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'memorable' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'politician' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'numerous' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'straightforward' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'fascinating' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'portrait' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'enigmatic' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'anecdote' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'shortcoming' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'credible' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'fictional' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'quaint' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'criticism' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'surrounding' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'minutes' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'earmark' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'adjustment' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'recruitment' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'boulevard' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'adjournment' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'utilities' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'easygoing' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'reasonably' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'satisfy' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'attune' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'resist' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'adhere' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'striped' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'outstanding' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;

  -- TEST 09
  INSERT INTO decks (user_id, name, description, source_language, native_language, visibility, parent_id)
  VALUES (v_user_id, 'TEST 09', '80 tu', 'en', 'vi', 'public', v_parent_id)
  RETURNING id INTO v_deck_id;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'vacant' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'promotion' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'consumption' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'superintendent' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'renovation' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'manufacturer' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'consideration' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'critic' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'impressive' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'choreography' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'ongoing' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'household' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'automotive' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'eligible' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'vendor' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'variation' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'imperfection' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'narrow' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'detach' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'abrasive' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'residue' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'submerge' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'utensil' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'separately' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'entrust' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'convey' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'timeless' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'precision' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'costly' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'initially' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'acquisition' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'insider' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'speculate' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'iconic' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'reliably' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'fate' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'retirement' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'deactivation' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'renew' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'displeasure' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'promise' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'sufficient' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'regard' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'assistance' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'unveil' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'advancement' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'glimpse' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'decay' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'architectural' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'transition' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'constructive' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'showcase' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'notable' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'concrete' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'overcome' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'preventive' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'gauge' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'respective' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'compensate' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'persistent' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'narrative' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'adjoining' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'heritage' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'vintage' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'purified' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'whimsical' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'infuse' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'biweekly' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'affordably' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'crease' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'encyclopaedia' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'enquiry' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'inherit' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'onboarding' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'interact' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'enrollment' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'breathtaking' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'certification' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'precondition' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'authority' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;

  -- TEST 10
  INSERT INTO decks (user_id, name, description, source_language, native_language, visibility, parent_id)
  VALUES (v_user_id, 'TEST 10', '80 tu', 'en', 'vi', 'public', v_parent_id)
  RETURNING id INTO v_deck_id;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'commend' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'garment' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'patron' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'majority' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'quarter' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'diplomat' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'removal' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'organizer' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'sound' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'aspiring' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'flourishing' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'finalize' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'caution' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'inferior' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'adjustable' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'argument' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'shrink' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'collapsible' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'durable' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'replacement' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'wholesaler' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'whisper' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'illusion' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'argue' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'plotline' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'abundance' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'challenging' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'recipe' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'separate' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'promotional' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'apparel' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'involvement' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'invention' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'timely' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'customize' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'punctuality' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'performance' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'tricky' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'stop by' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'compile' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'notification' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'manuscript' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'margin' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'ignore' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'modification' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'establish' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'diverse' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'negotiate' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'exceptionally' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'exposure' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'triumph' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'criteria' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'exceptional' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'extremely' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'forefront' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'endeavour' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'spotless' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'subsequently' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'disruption' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'embrace' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'life-size' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'synthetic' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'perimeter' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'dismantle' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'promising' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'symbolise' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'cement' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'flavourful' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'shred' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'institute' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'disease' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'quality' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'appreciative' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'consignment' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'assess' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'deduct' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'stipulate' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'identification' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'liability' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_global_term_id FROM global_terms WHERE normalized_text = 'caterer' AND source_language = 'en' AND native_language = 'vi' AND deleted_at IS NULL LIMIT 1;
  IF v_global_term_id IS NOT NULL THEN
    INSERT INTO deck_terms (deck_id, global_term_id) VALUES (v_deck_id, v_global_term_id) ON CONFLICT DO NOTHING;
  END IF;
END $$;