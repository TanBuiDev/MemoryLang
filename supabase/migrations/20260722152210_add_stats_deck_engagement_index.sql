create index study_sessions_user_deck_completed_idx
  on public.study_sessions (user_id, deck_id)
  where ended_at is not null;
