-- Migration: Multi-Key Pooling, Failover Engine, and Google AI Studio Style Key Vault

-- 1. Create table for Multi-Key Pool Vault
CREATE TABLE IF NOT EXISTS public.admin_key_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name TEXT NOT NULL,
  purpose_tag TEXT NOT NULL DEFAULT 'ai_vision',
  encrypted_value TEXT NOT NULL,
  masked_preview TEXT NOT NULL,
  model_name TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
  status TEXT NOT NULL DEFAULT 'active',
  priority_order INTEGER NOT NULL DEFAULT 1,
  error_count INTEGER NOT NULL DEFAULT 0,
  total_calls INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  last_error_at TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_key_pools ENABLE ROW LEVEL SECURITY;

-- Index for failover lookup
CREATE INDEX IF NOT EXISTS idx_key_pools_failover_lookup
  ON public.admin_key_pools(purpose_tag, status, priority_order ASC);

-- Migrate existing secrets into Key Pool if present
INSERT INTO public.admin_key_pools (key_name, purpose_tag, encrypted_value, masked_preview, model_name, status, updated_at)
SELECT
  CASE
    WHEN key_name = 'GEMINI_API_KEY' THEN 'Google Gemini API Key'
    WHEN key_name = 'DEEPL_API_KEY' THEN 'DeepL Translation Key'
    WHEN key_name = 'PAYOS_CHECKSUM_KEY' THEN 'PayOS Checksum Key'
    ELSE key_name
  END,
  CASE
    WHEN key_name = 'GEMINI_API_KEY' THEN 'ai_vision'
    WHEN key_name = 'DEEPL_API_KEY' THEN 'translation'
    WHEN key_name = 'PAYOS_CHECKSUM_KEY' THEN 'payment'
    ELSE 'ai_vision'
  END,
  encrypted_value,
  masked_preview,
  'gemini-2.0-flash',
  'active',
  updated_at
FROM public.admin_system_secrets
ON CONFLICT DO NOTHING;

-- RLS POLICIES FOR ADMIN KEY POOLS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'admin_key_pools' AND policyname = 'Admins can manage key pools'
  ) THEN
    CREATE POLICY "Admins can manage key pools"
      ON public.admin_key_pools
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND is_admin = true
        )
        OR (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
        OR (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
      );
  END IF;
END $$;

-- RPC: Upsert Key Pool Item
CREATE OR REPLACE FUNCTION public.upsert_key_pool_item(
  p_id UUID DEFAULT NULL,
  p_key_name TEXT DEFAULT 'API Key',
  p_purpose_tag TEXT DEFAULT 'ai_vision',
  p_secret_val TEXT DEFAULT NULL,
  p_model_name TEXT DEFAULT 'gemini-2.0-flash',
  p_is_active BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_masked TEXT;
  v_new_id UUID;
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required.';
  END IF;

  -- Editing existing key without providing new secret string
  IF p_id IS NOT NULL AND (p_secret_val IS NULL OR trim(p_secret_val) = '') THEN
    UPDATE public.admin_key_pools
    SET
      key_name = trim(p_key_name),
      purpose_tag = trim(p_purpose_tag),
      model_name = trim(p_model_name),
      status = CASE WHEN p_is_active THEN 'active' ELSE 'disabled' END,
      updated_by = auth.uid(),
      updated_at = now()
    WHERE id = p_id;

    RETURN jsonb_build_object('ok', true, 'id', p_id, 'message', 'Đã cập nhật cấu hình Key.');
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

  IF p_id IS NOT NULL THEN
    UPDATE public.admin_key_pools
    SET
      key_name = trim(p_key_name),
      purpose_tag = trim(p_purpose_tag),
      encrypted_value = trim(p_secret_val),
      masked_preview = v_masked,
      model_name = trim(p_model_name),
      status = CASE WHEN p_is_active THEN 'active' ELSE 'disabled' END,
      updated_by = auth.uid(),
      updated_at = now()
    WHERE id = p_id;
    v_new_id := p_id;
  ELSE
    INSERT INTO public.admin_key_pools (
      key_name, purpose_tag, encrypted_value, masked_preview, model_name, status, updated_by
    ) VALUES (
      trim(p_key_name), trim(p_purpose_tag), trim(p_secret_val), v_masked, trim(p_model_name),
      CASE WHEN p_is_active THEN 'active' ELSE 'disabled' END, auth.uid()
    )
    RETURNING id INTO v_new_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_new_id,
    'masked_preview', v_masked,
    'message', 'Đã lưu API Key mới vào Key Pool Vault.'
  );
END;
$$;

-- RPC: Get Overview of All Key Pools (Zero Raw Key Leakage)
CREATE OR REPLACE FUNCTION public.get_admin_key_pools_overview()
RETURNS TABLE (
  id UUID,
  key_name TEXT,
  purpose_tag TEXT,
  masked_preview TEXT,
  model_name TEXT,
  status TEXT,
  priority_order INT,
  error_count INT,
  total_calls INT,
  last_used_at TIMESTAMPTZ,
  last_error_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
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
    k.id,
    k.key_name,
    k.purpose_tag,
    k.masked_preview,
    k.model_name,
    k.status,
    k.priority_order,
    k.error_count,
    k.total_calls,
    k.last_used_at,
    k.last_error_at,
    k.created_at,
    k.updated_at
  FROM public.admin_key_pools k
  ORDER BY k.purpose_tag ASC, k.priority_order ASC, k.created_at DESC;
END;
$$;

-- RPC: Delete Key Pool Item
CREATE OR REPLACE FUNCTION public.delete_key_pool_item(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required.';
  END IF;

  DELETE FROM public.admin_key_pools WHERE id = p_id;

  RETURN jsonb_build_object('ok', true, 'message', 'Đã xóa Key khỏi Pool.');
END;
$$;

-- RPC: Toggle Key Status (Active / Disabled)
CREATE OR REPLACE FUNCTION public.toggle_key_pool_status(p_id UUID, p_status TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required.';
  END IF;

  UPDATE public.admin_key_pools
  SET status = trim(p_status), updated_at = now()
  WHERE id = p_id;

  RETURN jsonb_build_object('ok', true, 'status', p_status);
END;
$$;

-- RPC: Update Key Model
CREATE OR REPLACE FUNCTION public.update_key_pool_model(p_id UUID, p_model_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required.';
  END IF;

  UPDATE public.admin_key_pools
  SET model_name = trim(p_model_name), updated_at = now()
  WHERE id = p_id;

  RETURN jsonb_build_object('ok', true, 'model_name', p_model_name);
END;
$$;

-- RPC: Fetch Active Candidate Keys for Edge Function Server-Side Failover Engine
CREATE OR REPLACE FUNCTION public.get_active_keys_for_service(p_purpose_tag TEXT)
RETURNS TABLE (
  id UUID,
  key_name TEXT,
  encrypted_value TEXT,
  model_name TEXT,
  priority_order INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Re-activate keys that were temporarily rate_limited more than 15 minutes ago
  UPDATE public.admin_key_pools
  SET status = 'active'
  WHERE status = 'rate_limited'
    AND last_error_at IS NOT NULL
    AND last_error_at < (now() - INTERVAL '15 minutes');

  RETURN QUERY
  SELECT
    k.id,
    k.key_name,
    k.encrypted_value,
    k.model_name,
    k.priority_order
  FROM public.admin_key_pools k
  WHERE k.purpose_tag = trim(p_purpose_tag)
    AND k.status IN ('active', 'rate_limited')
  ORDER BY
    CASE WHEN k.status = 'active' THEN 0 ELSE 1 END ASC,
    k.priority_order ASC,
    k.error_count ASC,
    k.created_at ASC;
END;
$$;

-- RPC: Record Execution Outcome & Auto Status Management
CREATE OR REPLACE FUNCTION public.record_key_execution_outcome(
  p_key_id UUID,
  p_status_code INT,
  p_response_time_ms INT,
  p_error_msg TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_status_code = 200 THEN
    UPDATE public.admin_key_pools
    SET
      total_calls = total_calls + 1,
      last_used_at = now(),
      error_count = GREATEST(0, error_count - 1),
      status = CASE WHEN status = 'rate_limited' THEN 'active' ELSE status END
    WHERE id = p_key_id;
  ELSE
    UPDATE public.admin_key_pools
    SET
      total_calls = total_calls + 1,
      error_count = error_count + 1,
      last_error_at = now(),
      status = CASE
        WHEN p_status_code = 429 THEN 'rate_limited'
        WHEN p_status_code IN (400, 401, 403) AND error_count >= 3 THEN 'disabled'
        ELSE status
      END
    WHERE id = p_key_id;
  END IF;
END;
$$;
