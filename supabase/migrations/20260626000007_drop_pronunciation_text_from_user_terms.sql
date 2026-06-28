-- pronunciation_text đã có trên global_terms và không được dùng trên user_terms
ALTER TABLE user_terms DROP COLUMN IF EXISTS pronunciation_text;
