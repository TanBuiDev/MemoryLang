-- Migration: Thêm chế độ bảo trì (Maintenance Mode)
-- Cho phép admin chủ động đóng web với thông báo tùy chỉnh

-- 1. Seed maintenance_mode setting
INSERT INTO public.app_settings (key, value, description)
VALUES (
  'maintenance_mode',
  '{"enabled": false, "message": "", "estimated_end": null}'::jsonb,
  'Chế độ bảo trì: enabled (bật/tắt), message (thông báo cho người dùng), estimated_end (thời gian kết thúc dự kiến ISO 8601)'
)
ON CONFLICT (key) DO NOTHING;

-- 2. Cho phép anonymous users đọc maintenance_mode config
-- Người dùng chưa đăng nhập cần biết web đang bảo trì để hiển thị trang thông báo
CREATE POLICY "anon can read maintenance mode" ON public.app_settings
  FOR SELECT TO anon
  USING (key = 'maintenance_mode');
