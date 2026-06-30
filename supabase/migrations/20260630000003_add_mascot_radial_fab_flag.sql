-- Migration: Thêm feature flag bật/tắt Mascot Radial FAB
-- Ngày tạo: 2026-06-30

INSERT INTO public.feature_flags (flag, enabled, description) VALUES
  ('mascot_radial_fab', 
   true, 
   'Bật/tắt Mascot Radial FAB (Floating Action Button) hiển thị toàn cục ở góc dưới màn hình')
ON CONFLICT (flag) DO UPDATE SET enabled = EXCLUDED.enabled;
