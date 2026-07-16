create table public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'New chat' check (char_length(title) between 1 and 120),
  source_language text not null check (source_language in ('vi', 'en', 'ko', 'ja', 'zh', 'fr', 'de', 'other')),
  native_language text not null check (native_language in ('vi', 'en', 'ko', 'ja', 'zh', 'fr', 'de', 'other')),
  message_count integer not null default 0 check (message_count >= 0),
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 10000),
  created_at timestamptz not null default now()
);

create table public.chat_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid references public.chat_sessions(id) on delete set null,
  provider text not null check (provider in ('gemini', 'openai')),
  model text,
  input_tokens integer,
  output_tokens integer,
  request_status text not null check (request_status in ('succeeded', 'failed')),
  error_code text,
  created_at timestamptz not null default now()
);

create index chat_sessions_user_recent_idx on public.chat_sessions(user_id, last_message_at desc);
create index chat_messages_session_created_idx on public.chat_messages(session_id, created_at asc);
create index chat_messages_user_session_idx on public.chat_messages(user_id, session_id);
create index chat_usage_events_user_status_created_idx on public.chat_usage_events(user_id, request_status, created_at desc);

create trigger chat_sessions_updated_at
  before update on public.chat_sessions
  for each row execute function public.set_updated_at();

alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_usage_events enable row level security;

create policy "users manage own chat sessions"
  on public.chat_sessions for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "users read own chat messages"
  on public.chat_messages for select to authenticated
  using (user_id = auth.uid());

create policy "admins read chat usage events"
  on public.chat_usage_events for select to authenticated
  using (public.is_admin());
