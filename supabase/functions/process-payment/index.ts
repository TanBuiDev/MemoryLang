import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  buildPaymentUrls,
  classifyPaymentRequest,
  createPayOSSignature,
  generateOrderCode,
  getExpectedAmount,
  getPaymentStatusFromWebhook,
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

  // Lấy user từ token
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  )
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const { plan, cycle } = body
  const amount = getExpectedAmount(cycle)
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
  body: { data: Record<string, unknown>; signature: string },
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
  const paymentStatus = body.data.code === '00' ? 'succeeded' : 'failed'

  // Cập nhật payment log
  await supabaseAdmin
    .from('payment_logs')
    .update({ status: paymentStatus })
    .eq('payos_order_code', orderCode)

  if (paymentStatus === 'succeeded') {
    // Tìm payment log để lấy user_id và metadata
    const { data: paymentLog } = await supabaseAdmin
      .from('payment_logs')
      .select('user_id, metadata')
      .eq('payos_order_code', orderCode)
      .single()

    if (paymentLog) {
      const cycle = (paymentLog.metadata as Record<string, string>)?.cycle || 'monthly'
      const periodMonths = cycle === 'yearly' ? 12 : 1
      const periodEnd = new Date()
      periodEnd.setMonth(periodEnd.getMonth() + periodMonths)

      // Upsert subscription
      await supabaseAdmin.from('subscriptions').upsert(
        {
          user_id: paymentLog.user_id,
          plan_type: 'pro',
          status: 'active',
          billing_cycle: cycle,
          payos_order_code: orderCode,
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd.toISOString(),
          cancel_at_period_end: false,
          canceled_at: null,
        },
        { onConflict: 'user_id' }
      )

      // Cập nhật subscription_id trong payment_log
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('id')
        .eq('user_id', paymentLog.user_id)
        .single()

      if (sub) {
        await supabaseAdmin
          .from('payment_logs')
          .update({ subscription_id: sub.id })
          .eq('payos_order_code', orderCode)
      }
    }
  }

  return jsonResponse({ success: true })
}

/**
 * Kiểm tra trạng thái thanh toán (polling fallback)
 */
async function handleCheckStatus(
  body: { orderCode: string },
  supabaseAdmin: ReturnType<typeof createClient>,
  authHeader: string | null
) {
  if (!authHeader) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const { data: paymentLog } = await supabaseAdmin
    .from('payment_logs')
    .select('status, user_id')
    .eq('payos_order_code', body.orderCode)
    .single()

  if (!paymentLog) {
    return jsonResponse({ error: 'Payment not found' }, 404)
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
  if (!authHeader) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  await supabaseAdmin
    .from('payment_logs')
    .update({ status: 'cancelled' })
    .eq('payos_order_code', body.orderCode)
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
  if (!authHeader) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  // Lấy user từ token
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader! } } }
  )
  const { data: { user } } = await userClient.auth.getUser()
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

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
