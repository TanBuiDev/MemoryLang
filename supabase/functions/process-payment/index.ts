import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  buildPaymentUrls,
  classifyPaymentRequest,
  createPayOSSignature,
  generateOrderCode,
  getPaymentStatusFromWebhook,
  isSupportedBillingCycle,
  isAlreadySucceeded,
  mergePaymentMetadata,
  verifyPayOSSignature,
} from './payment-helpers.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const requestKind = classifyPaymentRequest(body)

    // Supabase client với service_role (bypass RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (requestKind === 'payos-webhook') {
      return await handleWebhook(body, supabaseAdmin)
    }

    if (requestKind !== 'app-action') {
      return jsonResponse({ error: 'Invalid payment request' }, 400)
    }

    const authHeader = req.headers.get('Authorization')
    const origin = req.headers.get('origin')

    switch (body.action) {
      case 'create':
        return await handleCreate(body, supabaseAdmin, authHeader, origin)
      case 'check-status':
        return await handleCheckStatus(body, supabaseAdmin, authHeader)
      case 'cancel':
        return await handleCancel(body, supabaseAdmin, authHeader)
      case 'cancel-subscription':
        return await handleCancelSubscription(supabaseAdmin, authHeader)
      default:
        return jsonResponse({ error: `Unknown action: ${body.action}` }, 400)
    }
  } catch (err) {
    console.error('process-payment error:', err)
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Tạo payment link PayOS → trả về QR code URL
 */
async function handleCreate(
  body: { plan: string; cycle: string },
  supabaseAdmin: ReturnType<typeof createClient>,
  authHeader: string | null,
  origin: string | null,
) {
  if (!authHeader) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const user = await getAuthenticatedUser(authHeader)
  if (!user) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const { plan, cycle } = body
  const amount = await getExpectedAmountFromDb(supabaseAdmin, cycle)
  if (plan !== 'pro' || amount === null) {
    return jsonResponse({ error: 'Invalid plan or cycle' }, 400)
  }

  const orderCode = generateOrderCode()
  const description = `MLP${String(orderCode).slice(-6)}`
  const { returnUrl, cancelUrl } = buildPaymentUrls(origin, Deno.env.get('SITE_URL'))

  // Gọi PayOS API tạo payment link
  const payosClientId = Deno.env.get('PAYOS_CLIENT_ID')
  const payosApiKey = Deno.env.get('PAYOS_API_KEY')
  const payosChecksumKey = Deno.env.get('PAYOS_CHECKSUM_KEY')

  if (!payosClientId || !payosApiKey || !payosChecksumKey) {
    return jsonResponse({ error: 'PayOS credentials not configured' }, 500)
  }

  // Tạo checksum cho request
  const checksumData = {
    amount,
    cancelUrl,
    description,
    orderCode,
    returnUrl,
  }
  const signature = await createPayOSSignature(checksumData, payosChecksumKey)

  const payosResponse = await fetch('https://api-merchant.payos.vn/v2/payment-requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': payosClientId,
      'x-api-key': payosApiKey,
    },
    body: JSON.stringify({
      orderCode,
      amount,
      description,
      cancelUrl: checksumData.cancelUrl,
      returnUrl: checksumData.returnUrl,
      signature,
    }),
  })

  const payosData = await payosResponse.json()

  if (payosData.code !== '00') {
    console.error('PayOS create error:', payosData)
    return jsonResponse({ error: 'Failed to create payment' }, 500)
  }

  const paymentLinkId = payosData.data?.paymentLinkId ?? null

  // Lưu payment log (pending)
  const { error: insertError } = await supabaseAdmin.from('payment_logs').insert({
    user_id: user.id,
    amount,
    payment_method: 'payos',
    payos_order_code: String(orderCode),
    status: 'pending',
    metadata: {
      plan,
      cycle,
      description,
      paymentLinkId,
      checkoutUrl: payosData.data?.checkoutUrl ?? null,
    },
  })

  if (insertError) {
    console.error('Failed to insert payment log:', insertError.message)
    return jsonResponse({ error: 'Failed to create payment record' }, 500)
  }

  return jsonResponse({
    checkoutUrl: payosData.data.checkoutUrl,
    qrCode: payosData.data.qrCode,
    orderCode: String(orderCode),
    amount,
  })
}

/**
 * Nhận webhook từ PayOS khi thanh toán thành công
 */
async function handleWebhook(
  body: {
    code?: unknown
    success?: unknown
    data: Record<string, unknown>
    signature: string
  },
  supabaseAdmin: ReturnType<typeof createClient>
) {
  const checksumKey = Deno.env.get('PAYOS_CHECKSUM_KEY')
  if (!checksumKey) {
    return jsonResponse({ error: 'Checksum key not configured' }, 500)
  }

  // Verify checksum
  if (!await verifyPayOSSignature(body.data, checksumKey, body.signature)) {
    console.error('Invalid webhook checksum')
    return jsonResponse({ error: 'Invalid signature' }, 400)
  }

  const orderCode = String(body.data.orderCode)
  const { data: paymentLog, error: paymentLogError } = await supabaseAdmin
    .from('payment_logs')
    .select('id, user_id, subscription_id, amount, status, metadata')
    .eq('payos_order_code', orderCode)
    .maybeSingle()

  if (paymentLogError) {
    console.error('Failed to load payment log:', paymentLogError.message)
    return jsonResponse({ error: 'Failed to load payment' }, 500)
  }

  if (!paymentLog) {
    return jsonResponse({ success: true, ignored: true, reason: 'unknown_order' })
  }

  if (isAlreadySucceeded(paymentLog.status)) {
    return jsonResponse({ success: true, idempotent: true })
  }

  const paymentStatus = getPaymentStatusFromWebhook(body)
  const metadata = paymentLog.metadata as Record<string, unknown> | null
  const cycle = metadata?.cycle
  const expectedAmount = Number(paymentLog.amount)
  const billingCycle = isSupportedBillingCycle(cycle) ? cycle : null

  if (!billingCycle || !Number.isFinite(expectedAmount) || Number(body.data.amount) !== expectedAmount) {
    console.error('PayOS webhook amount mismatch:', {
      orderCode,
      expectedAmount,
      cycle,
      receivedAmount: body.data.amount,
    })
    return jsonResponse({ error: 'Invalid payment amount' }, 400)
  }

  const nextMetadata = mergePaymentMetadata(paymentLog.metadata, {
    webhook: body,
    webhook_received_at: new Date().toISOString(),
  })

  const periodMonths = billingCycle === 'yearly' ? 12 : 1
  const now = new Date()
  const periodEnd = new Date(now)
  periodEnd.setMonth(periodEnd.getMonth() + periodMonths)

  const { data: processResult, error: processError } = await supabaseAdmin.rpc(
    'process_payos_webhook_payment',
    {
      p_order_code: orderCode,
      p_payment_status: paymentStatus,
      p_expected_amount: expectedAmount,
      p_cycle: billingCycle,
      p_metadata: nextMetadata,
      p_period_start: now.toISOString(),
      p_period_end: periodEnd.toISOString(),
    },
  )

  if (processError) {
    console.error('Failed to process PayOS webhook:', processError.message)
    return jsonResponse({ error: 'Failed to process webhook' }, 500)
  }

  if (processResult?.reason === 'amount_mismatch') {
    return jsonResponse({ error: 'Invalid payment amount' }, 400)
  }

  return jsonResponse({ success: true, result: processResult })
}

/**
 * Kiểm tra trạng thái thanh toán (polling fallback)
 */
async function handleCheckStatus(
  body: { orderCode: string },
  supabaseAdmin: ReturnType<typeof createClient>,
  authHeader: string | null
) {
  const user = await getAuthenticatedUser(authHeader)
  if (!user) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const { data: paymentLog, error: paymentLogError } = await supabaseAdmin
    .from('payment_logs')
    .select('status, user_id')
    .eq('payos_order_code', body.orderCode)
    .maybeSingle()

  if (paymentLogError) {
    console.error('Failed to check payment status:', paymentLogError.message)
    return jsonResponse({ error: 'Failed to check payment status' }, 500)
  }

  if (!paymentLog) {
    return jsonResponse({ error: 'Payment not found' }, 404)
  }

  if (paymentLog.user_id !== user.id) {
    return jsonResponse({ error: 'Forbidden' }, 403)
  }

  let subscription = null
  if (paymentLog.status === 'succeeded') {
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', paymentLog.user_id)
      .single()
    subscription = sub
  }

  return jsonResponse({ status: paymentLog.status, subscription })
}

/**
 * Hủy giao dịch chưa hoàn tất
 */
async function handleCancel(
  body: { orderCode: string },
  supabaseAdmin: ReturnType<typeof createClient>,
  authHeader: string | null
) {
  const user = await getAuthenticatedUser(authHeader)
  if (!user) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const { data: paymentLog, error: paymentLogError } = await supabaseAdmin
    .from('payment_logs')
    .select('id, user_id, status, metadata')
    .eq('payos_order_code', body.orderCode)
    .maybeSingle()

  if (paymentLogError) {
    console.error('Failed to load payment for cancellation:', paymentLogError.message)
    return jsonResponse({ error: 'Failed to load payment' }, 500)
  }

  if (!paymentLog) {
    return jsonResponse({ error: 'Payment not found' }, 404)
  }

  if (paymentLog.user_id !== user.id) {
    return jsonResponse({ error: 'Forbidden' }, 403)
  }

  if (paymentLog.status !== 'pending') {
    return jsonResponse({ success: true, status: paymentLog.status })
  }

  try {
    await cancelPayOSPayment(paymentLog.metadata, body.orderCode)
  } catch (err) {
    console.warn('PayOS cancel failed; marking local payment cancelled only:', (err as Error).message)
  }

  await supabaseAdmin
    .from('payment_logs')
    .update({ status: 'cancelled' })
    .eq('id', paymentLog.id)
    .eq('status', 'pending')

  return jsonResponse({ success: true })
}

/**
 * Hủy subscription (downgrade khi hết kỳ)
 */
async function handleCancelSubscription(
  supabaseAdmin: ReturnType<typeof createClient>,
  authHeader: string | null
) {
  const user = await getAuthenticatedUser(authHeader)
  if (!user) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  await supabaseAdmin
    .from('subscriptions')
    .update({
      cancel_at_period_end: true,
      canceled_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .eq('status', 'active')

  return jsonResponse({ success: true })
}

async function getExpectedAmountFromDb(
  supabaseAdmin: ReturnType<typeof createClient>,
  cycle: unknown,
): Promise<number | null> {
  if (!isSupportedBillingCycle(cycle)) return null

  const { data, error } = await supabaseAdmin
    .from('subscription_plans')
    .select('amount')
    .eq('plan_type', 'pro')
    .eq('billing_cycle', cycle)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    console.error('Failed to load subscription plan pricing:', error.message)
    return null
  }

  return typeof data?.amount === 'number' ? data.amount : null
}

async function getAuthenticatedUser(authHeader: string | null) {
  if (!authHeader) return null

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  )
  const { data: { user }, error } = await userClient.auth.getUser()
  if (error || !user) return null
  return user
}

async function cancelPayOSPayment(metadata: unknown, orderCode: string) {
  const payosClientId = Deno.env.get('PAYOS_CLIENT_ID')
  const payosApiKey = Deno.env.get('PAYOS_API_KEY')
  if (!payosClientId || !payosApiKey) return

  const targetId =
    metadata &&
    typeof metadata === 'object' &&
    typeof (metadata as Record<string, unknown>).paymentLinkId === 'string'
      ? (metadata as Record<string, string>).paymentLinkId
      : orderCode

  const response = await fetch(`https://api-merchant.payos.vn/v2/payment-requests/${targetId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': payosClientId,
      'x-api-key': payosApiKey,
    },
    body: JSON.stringify({
      cancellationReason: 'User requested cancellation',
    }),
  })

  let payload: { code?: string; desc?: string } | null = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok || (payload?.code && payload.code !== '00')) {
    console.warn('PayOS cancel response was not successful:', {
      status: response.status,
      code: payload?.code,
      desc: payload?.desc,
    })
  }
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
