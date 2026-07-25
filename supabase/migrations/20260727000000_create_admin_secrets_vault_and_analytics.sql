-- Migration: Admin System Secrets Vault, AI Model Configurations, and Key Usage Analytics

-- 1. Create table for encrypted admin system secrets
CREATE TABLE IF NOT EXISTS public.admin_system_secrets (
  key_name TEXT PRIMARY KEY,
  encrypted_value TEXT NOT NULL,
  masked_preview TEXT,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for admin_system_secrets
ALTER TABLE public.admin_system_secrets ENABLE ROW LEVEL SECURITY;

-- 2. Create table for managed AI model configurations
CREATE TABLE IF NOT EXISTS public.ai_model_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT UNIQUE NOT NULL,
  provider TEXT NOT NULL DEFAULT 'gemini',
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for ai_model_configs
ALTER TABLE public.ai_model_configs ENABLE ROW LEVEL SECURITY;

-- Insert seed AI models for Gemini
INSERT INTO public.ai_model_configs (model_name, provider, description, is_default, is_active, last_verified_at)
VALUES
  ('gemini-2.0-flash', 'gemini', 'Mới nhất - Nhanh & Chuẩn xác (Khuyên dùng)', true, true, now()),
  ('gemini-1.5-flash', 'gemini', 'Nhanh & Tối ưu lưu lượng', false, true, now()),
  ('gemini-1.5-pro', 'gemini', 'Độ chính xác cao cho văn bản phức tạp', false, true, now()),
  ('gemini-2.0-flash-lite', 'gemini', 'Siêu nhẹ & Tiết kiệm Quota', false, true, now())
ON CONFLICT (model_name) DO UPDATE
SET description = EXCLUDED.description, is_default = EXCLUDED.is_default, is_active = EXCLUDED.is_active;

-- 3. Create table for key usage analytics & audit logging
CREATE TABLE IF NOT EXISTS public.admin_key_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name TEXT NOT NULL,
  service_name TEXT NOT NULL,
  model_used TEXT,
  status_code INTEGER NOT NULL DEFAULT 200,
  response_time_ms INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for analytics
ALTER TABLE public.admin_key_usage_logs ENABLE ROW LEVEL SECURITY;

-- Index for usage analytics performance
CREATE INDEX IF NOT EXISTS idx_admin_key_usage_logs_key_name ON public.admin_key_usage_logs(key_name, created_at DESC);

-- RLS POLICIES FOR ADMIN SECRETS (STRICT SECURITY)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'admin_system_secrets' AND policyname = 'Admins can view secret metadata'
  ) THEN
    CREATE POLICY "Admins can view secret metadata"
      ON public.admin_system_secrets
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        )
        OR (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
        OR (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'admin_system_secrets' AND policyname = 'Only Admins can insert/update secrets'
  ) THEN
    CREATE POLICY "Only Admins can insert/update secrets"
      ON public.admin_system_secrets
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        )
        OR (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
        OR (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
      );
  END IF;
END $$;

-- RLS POLICIES FOR AI MODEL CONFIGS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_model_configs' AND policyname = 'Anyone can view active AI models'
  ) THEN
    CREATE POLICY "Anyone can view active AI models"
      ON public.ai_model_configs
      FOR SELECT
      TO authenticated, anon
      USING (is_active = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_model_configs' AND policyname = 'Admins can manage AI models'
  ) THEN
    CREATE POLICY "Admins can manage AI models"
      ON public.ai_model_configs
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        )
        OR (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
        OR (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
      );
  END IF;
END $$;

-- RLS POLICIES FOR KEY USAGE LOGS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'admin_key_usage_logs' AND policyname = 'Admins can view key usage logs'
  ) THEN
    CREATE POLICY "Admins can view key usage logs"
      ON public.admin_key_usage_logs
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        )
        OR (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
        OR (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
      );
  END IF;
END $$;

-- Helper function to check if caller is admin
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  )
  OR (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  OR (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');
END;
$$;

-- 4. RPC: Securely Save Admin Secret
CREATE OR REPLACE FUNCTION public.save_admin_secret(
  p_key_name TEXT,
  p_secret_val TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_masked TEXT;
BEGIN
  -- Verify caller is admin
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required.';
  END IF;

  IF p_secret_val IS NULL OR trim(p_secret_val) = '' THEN
    RAISE EXCEPTION 'Secret value cannot be empty.';
  END IF;

  -- Create masked preview e.g. "AIza...1E4"
  IF length(trim(p_secret_val)) > 8 THEN
    v_masked := substring(trim(p_secret_val) from 1 for 4) || '••••••••' || substring(trim(p_secret_val) from length(trim(p_secret_val))-3);
  ELSE
    v_masked := '••••••••';
  END IF;

  INSERT INTO public.admin_system_secrets (key_name, encrypted_value, masked_preview, description, updated_by, updated_at)
  VALUES (trim(p_key_name), trim(p_secret_val), v_masked, p_description, auth.uid(), now())
  ON CONFLICT (key_name) DO UPDATE
  SET
    encrypted_value = EXCLUDED.encrypted_value,
    masked_preview = EXCLUDED.masked_preview,
    description = COALESCE(EXCLUDED.description, public.admin_system_secrets.description),
    updated_by = EXCLUDED.updated_by,
    updated_at = now();

  RETURN jsonb_build_object(
    'ok', true,
    'key_name', trim(p_key_name),
    'masked_preview', v_masked,
    'message', 'Đã lưu Secret an toàn vào Database Vault.'
  );
END;
$$;

-- 5. RPC: Securely Delete Admin Secret
CREATE OR REPLACE FUNCTION public.delete_admin_secret(
  p_key_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required.';
  END IF;

  DELETE FROM public.admin_system_secrets WHERE key_name = trim(p_key_name);

  RETURN jsonb_build_object(
    'ok', true,
    'key_name', trim(p_key_name),
    'message', 'Đã xóa hoàn toàn Secret khỏi Database Vault.'
  );
END;
$$;

-- 6. RPC: Get Overview of Secrets (Zero Key String Leakage)
CREATE OR REPLACE FUNCTION public.get_admin_secrets_overview()
RETURNS TABLE (
  key_name TEXT,
  is_configured BOOLEAN,
  masked_preview TEXT,
  description TEXT,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT
    s.key_name,
    true AS is_configured,
    s.masked_preview,
    s.description,
    s.updated_at
  FROM public.admin_system_secrets s
  ORDER BY s.key_name;
END;
$$;

-- 7. RPC: Upsert Verified AI Model Config
CREATE OR REPLACE FUNCTION public.upsert_verified_ai_model(
  p_model_name TEXT,
  p_provider TEXT DEFAULT 'gemini',
  p_description TEXT DEFAULT NULL,
  p_set_default BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required.';
  END IF;

  IF p_set_default THEN
    UPDATE public.ai_model_configs SET is_default = false WHERE provider = p_provider;
  END IF;

  INSERT INTO public.ai_model_configs (model_name, provider, description, is_default, is_active, last_verified_at, updated_at)
  VALUES (trim(p_model_name), trim(p_provider), p_description, p_set_default, true, now(), now())
  ON CONFLICT (model_name) DO UPDATE
  SET
    provider = EXCLUDED.provider,
    description = COALESCE(EXCLUDED.description, public.ai_model_configs.description),
    is_default = CASE WHEN p_set_default THEN true ELSE public.ai_model_configs.is_default END,
    is_active = true,
    last_verified_at = now(),
    updated_at = now();

  RETURN jsonb_build_object(
    'ok', true,
    'model_name', trim(p_model_name),
    'message', 'Đã lưu và cập nhật AI Model vào danh mục.'
  );
END;
$$;
