create index if not exists game_mission_progress_deck_id_idx
  on public.game_mission_progress(deck_id);

drop index if exists public.game_mission_progress_user_updated_idx;
