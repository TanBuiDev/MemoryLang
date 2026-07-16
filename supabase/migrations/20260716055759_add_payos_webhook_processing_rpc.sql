CREATE UNIQUE INDEX IF NOT EXISTS payment_logs_payos_order_unique_idx
  ON public.payment_logs(payos_order_code)
  WHERE payos_order_code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.process_payos_webhook_payment(
  p_order_code text,
  p_payment_status text,
  p_expected_amount integer,
  p_cycle text,
  p_metadata jsonb,
  p_period_start timestamptz,
  p_period_end timestamptz
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payment_logs%ROWTYPE;
  v_subscription_id uuid;
BEGIN
  IF p_payment_status NOT IN ('succeeded', 'failed') THEN
    RAISE EXCEPTION 'Invalid payment status: %', p_payment_status;
  END IF;

  IF p_cycle NOT IN ('monthly', 'yearly') THEN
    RAISE EXCEPTION 'Invalid billing cycle: %', p_cycle;
  END IF;

  SELECT *
  INTO v_payment
  FROM public.payment_logs
  WHERE payos_order_code = p_order_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('processed', false, 'reason', 'not_found');
  END IF;

  IF v_payment.status = 'succeeded' THEN
    RETURN jsonb_build_object(
      'processed', false,
      'idempotent', true,
      'subscription_id', v_payment.subscription_id
    );
  END IF;

  IF v_payment.amount <> p_expected_amount THEN
    RETURN jsonb_build_object(
      'processed', false,
      'reason', 'amount_mismatch',
      'expected_amount', v_payment.amount,
      'received_amount', p_expected_amount
    );
  END IF;

  IF p_payment_status = 'failed' THEN
    UPDATE public.payment_logs
    SET status = 'failed',
        metadata = p_metadata
    WHERE id = v_payment.id;

    RETURN jsonb_build_object('processed', true, 'status', 'failed');
  END IF;

  INSERT INTO public.subscriptions (
    user_id,
    plan_type,
    status,
    billing_cycle,
    payos_order_code,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    canceled_at
  ) VALUES (
    v_payment.user_id,
    'pro',
    'active',
    p_cycle,
    p_order_code,
    p_period_start,
    p_period_end,
    false,
    null
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan_type = EXCLUDED.plan_type,
    status = EXCLUDED.status,
    billing_cycle = EXCLUDED.billing_cycle,
    payos_order_code = EXCLUDED.payos_order_code,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    cancel_at_period_end = EXCLUDED.cancel_at_period_end,
    canceled_at = EXCLUDED.canceled_at;

  SELECT id
  INTO v_subscription_id
  FROM public.subscriptions
  WHERE user_id = v_payment.user_id;

  UPDATE public.payment_logs
  SET status = 'succeeded',
      subscription_id = v_subscription_id,
      metadata = p_metadata
  WHERE id = v_payment.id;

  RETURN jsonb_build_object(
    'processed', true,
    'status', 'succeeded',
    'subscription_id', v_subscription_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.process_payos_webhook_payment(
  text, text, integer, text, jsonb, timestamptz, timestamptz
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.process_payos_webhook_payment(
  text, text, integer, text, jsonb, timestamptz, timestamptz
) TO service_role;
