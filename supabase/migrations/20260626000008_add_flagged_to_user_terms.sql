-- Cột flagged được dùng xuyên suốt vocab list, quiz, nhưng chưa có migration
ALTER TABLE user_terms ADD COLUMN IF NOT EXISTS flagged boolean DEFAULT false;
