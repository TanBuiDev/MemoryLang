ALTER TABLE user_terms ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_user_terms_deleted_at ON user_terms(deleted_at);
