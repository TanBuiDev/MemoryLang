-- ========================================
-- SUBSCRIPTION & PAYMENT TABLES
-- Migration: 20260715000000_add_subscriptions.sql
-- ========================================

-- 1. Bảng subscriptions
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  plan_type TEXT NOT NULL DEFAULT 'free'
    CHECK (plan_type IN ('free', 'pro')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'cancelled', 'expired', 'past_due', 'trialing')),
  billing_cycle TEXT
    CHECK (billing_cycle IN ('monthly', 'yearly')),

  -- PayOS integration
  payos_order_code TEXT UNIQUE,

  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,

  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  canceled_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Mỗi user chỉ có 1 subscription record
  UNIQUE(user_id)
);

-- 2. Bảng payment_logs (audit trail)
CREATE TABLE public.payment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,

  amount INTEGER NOT NULL,         -- VND (49000 = 49.000đ)
  currency TEXT NOT NULL DEFAULT 'VND',

  payment_method TEXT NOT NULL DEFAULT 'payos'
    CHECK (payment_method IN ('payos', 'bank_transfer', 'manual')),
  payos_order_code TEXT,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled')),

  metadata JSONB DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Triggers
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

-- User chỉ ĐỌC được subscription/payment của mình
CREATE POLICY "users read own subscription"
  ON public.subscriptions FOR SELECT
  TO authenticated USING (user_id = auth.uid());

CREATE POLICY "admins manage subscriptions"
  ON public.subscriptions FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "users read own payment logs"
  ON public.payment_logs FOR SELECT
  TO authenticated USING (user_id = auth.uid());

CREATE POLICY "admins manage payment logs"
  ON public.payment_logs FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 5. Indexes
CREATE INDEX subscriptions_user_status_idx
  ON public.subscriptions(user_id, status);
CREATE INDEX payment_logs_user_idx
  ON public.payment_logs(user_id, created_at DESC);
CREATE INDEX payment_logs_payos_order_idx
  ON public.payment_logs(payos_order_code);

-- 6. RPC: kiểm tra user có quyền thêm từ mới không
CREATE OR REPLACE FUNCTION public.can_user_add_term(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_plan TEXT;
  v_count INTEGER;
BEGIN
  SELECT plan_type INTO v_plan
  FROM public.subscriptions
  WHERE user_id = p_user_id AND status IN ('active', 'trialing');

  -- Pro không giới hạn
  IF v_plan = 'pro' THEN RETURN true; END IF;

  -- Free: max 100 từ (không tính đã soft-delete)
  SELECT COUNT(*) INTO v_count
  FROM public.user_terms
  WHERE user_id = p_user_id AND deleted_at IS NULL;

  RETURN v_count < 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RPC: kiểm tra user có quyền tạo deck mới không
CREATE OR REPLACE FUNCTION public.can_user_add_deck(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_plan TEXT;
  v_count INTEGER;
BEGIN
  SELECT plan_type INTO v_plan
  FROM public.subscriptions
  WHERE user_id = p_user_id AND status IN ('active', 'trialing');

  -- Pro không giới hạn
  IF v_plan = 'pro' THEN RETURN true; END IF;

  -- Free: max 5 decks
  SELECT COUNT(*) INTO v_count
  FROM public.decks
  WHERE user_id = p_user_id;

  RETURN v_count < 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Tự động tạo subscription free cho user mới (cập nhật trigger handle_new_user)
-- Thêm logic: sau khi tạo profile, tạo subscription free
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan_type, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_profile_created_subscription
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();

-- 9. Backfill: Tạo subscription free cho tất cả user hiện tại
INSERT INTO public.subscriptions (user_id, plan_type, status)
SELECT id, 'free', 'active'
FROM public.profiles
WHERE id NOT IN (SELECT user_id FROM public.subscriptions)
ON CONFLICT (user_id) DO NOTHING;
