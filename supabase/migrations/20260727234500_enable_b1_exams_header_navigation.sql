insert into public.feature_flags (flag, enabled, description)
values ('exams_module', true, 'Nút điều hướng chính: Đề thi')
on conflict (flag) do update
set enabled = true,
    description = excluded.description;
