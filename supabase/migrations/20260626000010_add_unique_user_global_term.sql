ALTER TABLE user_terms ADD CONSTRAINT uq_user_terms_user_global UNIQUE (user_id, global_term_id);
