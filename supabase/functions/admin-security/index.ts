import { createClient } from 'npm:@supabase/supabase-js'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return json({ error: 'Unauthorized.' }, 401)
  const body = await req.json().catch(() => null)
  if (!body || body.action !== 'reset_mfa' || typeof body.targetUserId !== 'string') return json({ error: 'Invalid request.' }, 400)

  const url = Deno.env.get('SUPABASE_URL') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } })
  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) return json({ error: 'Unauthorized.' }, 401)
  if (user.id === body.targetUserId) return json({ error: 'A super administrator cannot reset their own MFA.' }, 400)
  const [{ data: mfaVerified }, { data: superAdmin }] = await Promise.all([
    userClient.rpc('is_mfa_verified'),
    userClient.rpc('has_role', { p_role_code: 'super_admin' }),
  ])
  if (!mfaVerified || !superAdmin) return json({ error: 'Forbidden.' }, 403)

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
  const { data: factors, error: factorError } = await admin.auth.admin.mfa.listFactors({ userId: body.targetUserId })
  if (factorError) return json({ error: 'Unable to inspect MFA factors.' }, 400)
  await admin.auth.admin.signOut(body.targetUserId, 'global')
  for (const factor of factors?.totp ?? []) {
    const { error } = await admin.auth.admin.mfa.deleteFactor({ id: factor.id, userId: body.targetUserId })
    if (error) return json({ error: 'Unable to reset MFA.' }, 400)
  }
  const { data: eventId, error: eventError } = await admin.rpc('record_admin_mfa_reset', { p_actor_user_id: user.id, p_target_user_id: body.targetUserId, p_user_agent: req.headers.get('user-agent') })
  if (eventError) return json({ error: 'Unable to record the security event.' }, 500)
  const { data: outbox } = await admin.rpc('claim_security_email_outbox', { p_event_id: eventId })
  for (const email of outbox ?? []) {
    const response = await fetch(`${url}/functions/v1/send-email`, { method: 'POST', headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ to: email.recipient_email, subject: 'Cảnh báo bảo mật MemoryLang', template: 'security_alert', data: email.payload }) })
    await admin.rpc('mark_security_email_sent', { p_outbox_id: email.id, p_error: response.ok ? null : 'Email dispatch failed.' })
  }
  return json({ success: true })
})
