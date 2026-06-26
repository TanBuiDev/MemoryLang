-- Drop duplicate foreign key constraint on user_terms pointing to global_terms
ALTER TABLE user_terms DROP CONSTRAINT IF EXISTS user_terms_global_term_id_fkey;
