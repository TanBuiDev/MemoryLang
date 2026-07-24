-- Migration: Seed navigation feature flags for all main modules
INSERT INTO public.feature_flags (flag, enabled, description) VALUES
  ('vocabulary_module', true, 'Bật/tắt phân hệ Từ vựng'),
  ('grammar_module', true, 'Bật/tắt phân hệ Ngữ pháp'),
  ('listening_module', true, 'Bật/tắt phân hệ Luyện nghe'),
  ('speaking_module', true, 'Bật/tắt phân hệ Luyện nói'),
  ('reading_module', true, 'Bật/tắt phân hệ Đọc hiểu'),
  ('writing_module', true, 'Bật/tắt phân hệ Luyện viết'),
  ('games_module', true, 'Bật/tắt phân hệ Trò chơi'),
  ('roadmap_module', true, 'Bật/tắt phân hệ Lộ trình'),
  ('exams_module', true, 'Bật/tắt phân hệ Luyện thi'),
  ('videos_module', true, 'Bật/tắt phân hệ Video'),
  ('blog_module', true, 'Bật/tắt phân hệ Bài viết / Tin tức'),
  ('community_module', true, 'Bật/tắt phân hệ Cộng đồng'),
  ('contact_module', true, 'Bật/tắt phân hệ Liên hệ / Trợ giúp')
ON CONFLICT (flag) DO UPDATE SET
  description = EXCLUDED.description;
