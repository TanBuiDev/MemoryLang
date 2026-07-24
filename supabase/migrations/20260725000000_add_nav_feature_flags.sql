-- Migration: Seed navigation feature flags for all navigation items and header controls
INSERT INTO public.feature_flags (flag, enabled, description) VALUES
  -- 1. Main Navigation Items
  ('grammar_module', true, 'Nút điều hướng: Ngữ pháp'),
  ('vocabulary_module', true, 'Nút điều hướng: Từ vựng'),
  ('listening_module', true, 'Nút điều hướng: Nghe'),
  ('speaking_module', true, 'Nút điều hướng: Nói'),
  ('reading_module', true, 'Nút điều hướng: Đọc'),
  ('writing_module', true, 'Nút điều hướng: Viết'),
  ('games_module', true, 'Nút điều hướng: Trò chơi'),

  -- 2. More Dropdown Nav Items
  ('dashboard_nav', true, 'Mục menu: Bảng điều khiển'),
  ('decks_nav', true, 'Mục menu: Bộ thẻ'),
  ('study_nav', true, 'Mục menu: Học tập'),
  ('quiz_nav', true, 'Mục menu: Kiểm tra'),
  ('review_nav', true, 'Mục menu: Ôn tập'),
  ('roadmap_module', true, 'Mục menu: Lộ trình học'),
  ('exams_module', true, 'Mục menu: Kỳ thi'),
  ('videos_module', true, 'Mục menu: Video'),
  ('blog_module', true, 'Mục menu: Blog / Bài viết'),
  ('community_module', true, 'Mục menu: Cộng đồng'),
  ('contact_module', true, 'Mục menu: Liên hệ'),

  -- 3. Header Action Controls
  ('ai_tutor_button', true, 'Nút bấm: Gia sư AI (Header)'),
  ('pro_upgrade_button', true, 'Nút bấm: Nâng cấp Pro (Header)'),
  ('notifications_button', true, 'Nút bấm: Thông báo quả chuông (Header)'),
  ('profile_menu_button', true, 'Menu bấm: Hồ sơ cá nhân / Avatar (Header)')
ON CONFLICT (flag) DO UPDATE SET
  description = EXCLUDED.description;
