ALTER TABLE user_terms ADD COLUMN IF NOT EXISTS flagged boolean DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_user_terms_flagged ON user_terms (user_id, flagged) WHERE flagged = true;;
