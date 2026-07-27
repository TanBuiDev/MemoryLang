create table if not exists public.practice_prompt_samples (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references public.practice_prompts(id) on delete cascade,
  title text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (prompt_id, title)
);

alter table public.practice_prompt_samples enable row level security;

create policy "authenticated users read prompt samples"
on public.practice_prompt_samples for select to authenticated using (true);

create policy "admins manage prompt samples"
on public.practice_prompt_samples for all to authenticated
using (public.is_admin()) with check (public.is_admin());

insert into public.practice_prompt_samples (prompt_id, title, content)
select id, 'Bài mẫu: Đơn xin việc làm thêm', $sample$
Dear ...,

My name is ... and I am currently a student. I am writing to apply for a part-time job so that I can earn some extra money and gain more work experience.

I would like to work in a convenience store or small shop. I can work in the evenings. I'm interested in jobs such as serving customers, checking goods, and helping at the cash register.

Previously, I worked part-time at a convenience store. My duties included helping customers, putting products on shelves, checking prices, cleaning the store, and doing cashier work. This experience helped me improve my communication and teamwork skills.

I am friendly, careful, hardworking, and responsible. I can learn new tasks quickly and work well with other people.

Please let me know if you have a suitable part-time position. You can contact me by email at ... or by phone at ...

Yours faithfully,
...
$sample$
from public.practice_prompts
where source_key = 'writing-topic-7'
on conflict (prompt_id, title) do update set content = excluded.content, updated_at = now();
