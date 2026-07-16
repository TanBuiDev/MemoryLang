create extension if not exists pgcrypto;
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  native_language text not null default 'vi',
  current_target_language text not null default 'en',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.language_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  native_language text not null,
  target_language text not null,
  level text,
  goal text,
  daily_goal int not null default 10,
  created_at timestamptz not null default now()
);
create table public.global_terms (
  id uuid primary key default gen_random_uuid(),
  source_text text not null,
  normalized_text text not null,
  source_language text not null,
  native_language text not null,
  item_type text not null default 'word',
  part_of_speech text,
  ipa text,
  pronunciation_text text,
  audio_url text,
  image_url text,
  meanings jsonb not null default '[]'::jsonb,
  examples jsonb not null default '[]'::jsonb,
  source text not null default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(normalized_text, source_language, native_language)
);
create table public.user_terms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  global_term_id uuid references public.global_terms(id) on delete set null,
  source_text text not null,
  normalized_text text not null,
  source_language text not null,
  native_language text not null,
  item_type text not null default 'word',
  part_of_speech text,
  ipa text,
  pronunciation_text text,
  audio_url text,
  image_url text,
  note text,
  meanings jsonb not null default '[]'::jsonb,
  examples jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}',
  status text not null default 'new',
  view_count int not null default 0,
  correct_count int not null default 0,
  wrong_count int not null default 0,
  audio_play_count int not null default 0,
  last_reviewed_at timestamptz,
  next_review_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  source_language text not null,
  native_language text not null,
  color text,
  icon text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.deck_terms (
  deck_id uuid not null references public.decks(id) on delete cascade,
  user_term_id uuid not null references public.user_terms(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (deck_id, user_term_id)
);
create table public.flashcard_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  mode text not null,
  front_fields jsonb not null default '[]'::jsonb,
  back_fields jsonb not null default '[]'::jsonb,
  options jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  deck_id uuid references public.decks(id) on delete set null,
  mode text not null,
  total_cards int not null default 0,
  viewed_cards int not null default 0,
  remembered_count int not null default 0,
  difficult_count int not null default 0,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
create table public.quiz_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  deck_id uuid references public.decks(id) on delete set null,
  quiz_type text not null,
  total_questions int not null,
  correct_answers int not null default 0,
  wrong_answers int not null default 0,
  duration_ms int,
  created_at timestamptz not null default now()
);
create table public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  quiz_result_id uuid not null references public.quiz_results(id) on delete cascade,
  user_term_id uuid references public.user_terms(id) on delete set null,
  question text not null,
  user_answer text,
  correct_answer text not null,
  is_correct boolean not null,
  duration_ms int,
  created_at timestamptz not null default now()
);
create index global_terms_lookup_idx on public.global_terms(normalized_text, source_language, native_language);
create index user_terms_user_text_idx on public.user_terms(user_id, normalized_text);
create index user_terms_user_status_idx on public.user_terms(user_id, status);
create index user_terms_user_next_review_idx on public.user_terms(user_id, next_review_at);
create index decks_user_language_idx on public.decks(user_id, source_language, native_language);
create index deck_terms_deck_idx on public.deck_terms(deck_id);
create index deck_terms_user_term_idx on public.deck_terms(user_term_id);
create index quiz_results_user_created_idx on public.quiz_results(user_id, created_at desc);
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger global_terms_updated_at before update on public.global_terms for each row execute function public.set_updated_at();
create trigger user_terms_updated_at before update on public.user_terms for each row execute function public.set_updated_at();
create trigger decks_updated_at before update on public.decks for each row execute function public.set_updated_at();
create trigger flashcard_templates_updated_at before update on public.flashcard_templates for each row execute function public.set_updated_at();
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer set search_path = public;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
alter table public.profiles enable row level security;
alter table public.language_profiles enable row level security;
alter table public.user_terms enable row level security;
alter table public.decks enable row level security;
alter table public.deck_terms enable row level security;
alter table public.flashcard_templates enable row level security;
alter table public.study_sessions enable row level security;
alter table public.quiz_results enable row level security;
alter table public.quiz_answers enable row level security;
alter table public.global_terms enable row level security;
create policy "profiles own rows" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "language_profiles own rows" on public.language_profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "user_terms own rows" on public.user_terms for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "decks own rows" on public.decks for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "templates own rows" on public.flashcard_templates for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "study_sessions own rows" on public.study_sessions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "quiz_results own rows" on public.quiz_results for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "deck_terms through owned decks" on public.deck_terms
for all
using (exists (select 1 from public.decks where decks.id = deck_terms.deck_id and decks.user_id = auth.uid()))
with check (exists (select 1 from public.decks where decks.id = deck_terms.deck_id and decks.user_id = auth.uid()));
create policy "quiz_answers through owned results" on public.quiz_answers
for all
using (exists (select 1 from public.quiz_results where quiz_results.id = quiz_answers.quiz_result_id and quiz_results.user_id = auth.uid()))
with check (exists (select 1 from public.quiz_results where quiz_results.id = quiz_answers.quiz_result_id and quiz_results.user_id = auth.uid()));
create policy "authenticated can read global terms" on public.global_terms
for select to authenticated using (true);
