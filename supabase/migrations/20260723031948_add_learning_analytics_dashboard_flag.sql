insert into public.feature_flags (flag, enabled, description)
values (
  'learning_analytics_dashboard',
  true,
  'Hiển thị khối Phân tích học tập từ Java Statistics API trên dashboard người học'
)
on conflict (flag) do nothing;
