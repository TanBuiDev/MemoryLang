-- Database migration cho hệ thống Admin — MemoryLang
-- Ngày tạo: 2026-06-26

-- 1. Thêm cột is_admin và email vào bảng profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Cập nhật email cho các user hiện tại từ auth.users
DO $$
BEGIN
  UPDATE public.profiles p
  SET email = u.email
  FROM auth.users u
  WHERE p.id = u.id AND p.email IS NULL;
EXCEPTION
  WHEN OTHERS THEN
    -- Nếu không có đủ quyền truy cập auth.users trực tiếp ở môi trường dev cụ thể, bỏ qua lỗi này
    NULL;
END $$;

-- Cập nhật trigger handle_new_user để lưu email khi đăng ký mới
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, ui_language, email)
  VALUES (
    new.id, 
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 
    'vi', 
    new.email
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Tạo hàm is_admin() bảo mật tránh đệ quy RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Cập nhật RLS Policy cho profiles để Admin có thể xem và quản lý
-- Lưu ý: RLS Policy cũ "profiles own rows" vẫn được giữ nguyên cho người dùng thường
CREATE POLICY "admins select all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_admin() OR id = auth.uid());

CREATE POLICY "admins update all profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR id = auth.uid())
  WITH CHECK (public.is_admin() OR id = auth.uid());

-- 4. Tạo bảng cấu hình hệ thống app_settings
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read app settings" ON public.app_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins manage app settings" ON public.app_settings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE TRIGGER app_settings_updated_at BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Tạo bảng cấu hình giọng nói tts_voice_config
CREATE TABLE IF NOT EXISTS public.tts_voice_config (
  language_code text PRIMARY KEY,
  voice_name text NOT NULL,
  speaking_rate numeric DEFAULT 1.0,
  pitch numeric DEFAULT 0,
  ssml_gender text DEFAULT 'NEUTRAL',
  audio_encoding text DEFAULT 'MP3',
  enabled boolean DEFAULT true
);

ALTER TABLE public.tts_voice_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read tts voice config" ON public.tts_voice_config
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins manage tts voice config" ON public.tts_voice_config
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 6. Tạo bảng feature_flags
CREATE TABLE IF NOT EXISTS public.feature_flags (
  flag text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  description text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read feature flags" ON public.feature_flags
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins manage feature flags" ON public.feature_flags
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE TRIGGER feature_flags_updated_at BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. Tạo bảng lịch sử hoạt động admin admin_audit_log
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read audit log" ON public.admin_audit_log
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "admins insert audit log" ON public.admin_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- 8. Seed dữ liệu mặc định cho app_settings
INSERT INTO public.app_settings (key, value, description) VALUES
  ('default_daily_goal', '10', 'Daily goal mặc định cho user mới'),
  ('default_study_mode', '"two_side"', 'Study mode mặc định'),
  ('default_srs_ease_factor', '2.5', 'SRS ease factor mặc định'),
  ('default_speech_rate', '1.0', 'TTS speaking rate mặc định'),
  ('default_speech_pitch', '0', 'TTS pitch mặc định'),
  ('cors_origins', '["https://memorylang.app"]', 'CORS allowed origins')
ON CONFLICT (key) DO NOTHING;

-- 9. Seed dữ liệu mặc định cho feature_flags
INSERT INTO public.feature_flags (flag, enabled, description) VALUES
  ('listening_module', 'false', 'Bật/tắt phân hệ luyện nghe'),
  ('grammar_module', 'false', 'Bật/tắt phân hệ ngữ pháp'),
  ('template_builder', 'false', 'Bật/tắt chức năng tạo template thẻ học (MVP 2)'),
  ('matching_quiz', 'false', 'Bật/tắt bài trắc nghiệm nối từ (MVP 3)'),
  ('fill_blank_quiz', 'false', 'Bật/tắt bài trắc nghiệm điền từ (MVP 3)'),
  ('google_oauth', 'true', 'Cho phép đăng nhập qua Google OAuth'),
  ('image_search', 'true', 'Cho phép tìm kiếm hình ảnh minh họa'),
  ('tts_auto_generate', 'true', 'Tự động tạo giọng đọc TTS khi làm giàu từ vựng')
ON CONFLICT (flag) DO NOTHING;

-- 10. Seed dữ liệu mặc định cho tts_voice_config
INSERT INTO public.tts_voice_config (language_code, voice_name, speaking_rate, pitch, ssml_gender, audio_encoding, enabled) VALUES
  ('en-US', 'en-US-Wavenet-D', 1.0, 0, 'MALE', 'MP3', true),
  ('en-GB', 'en-GB-Wavenet-B', 1.0, 0, 'MALE', 'MP3', true),
  ('vi-VN', 'vi-VN-Wavenet-A', 1.0, 0, 'FEMALE', 'MP3', true),
  ('ja-JP', 'ja-JP-Wavenet-B', 1.0, 0, 'FEMALE', 'MP3', true),
  ('ko-KR', 'ko-KR-Wavenet-B', 1.0, 0, 'FEMALE', 'MP3', true),
  ('zh-CN', 'cmn-CN-Wavenet-B', 1.0, 0, 'FEMALE', 'MP3', true),
  ('fr-FR', 'fr-FR-Wavenet-B', 1.0, 0, 'FEMALE', 'MP3', true),
  ('de-DE', 'de-DE-Wavenet-B', 1.0, 0, 'FEMALE', 'MP3', true)
ON CONFLICT (language_code) DO NOTHING;
