-- Migration: Thêm cấu hình số lượng và giới hạn ký tự ghi chú vào app_settings
-- Ngày tạo: 2026-06-30

INSERT INTO public.app_settings (key, value, description) VALUES
  ('quick_notes_max_count', 
   '50'::jsonb, 
   'Số lượng ghi chú nhanh tối đa được phép lưu của mỗi người dùng'),
  ('quick_notes_max_length',
   '1000'::jsonb,
   'Số lượng ký tự tối đa được viết trong mỗi ghi chú nhanh')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
