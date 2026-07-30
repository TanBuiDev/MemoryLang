import { createClient } from '@supabase/supabase-js'

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers })

function getSessionId(authHeader: string) {
  try {
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.session_id === 'string' ? payload.session_id : null
  } catch { return null }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return json({ error: 'Only POST is supported.' }, 405)
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Unauthorized.' }, 401)
  const supabaseUser = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authHeader } } })
  const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
  if (authError || !user) return json({ error: 'Unauthorized.' }, 401)
  const sessionId = getSessionId(authHeader)
  if (!sessionId) return json({ error: 'Invalid authentication session.' }, 401)
  const { data, error } = await supabaseUser.rpc('start_admin_session', {
    p_auth_session_id: sessionId,
    p_ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    p_user_agent: req.headers.get('user-agent'),
  })
  if (error) return json({ error: error.code === '42501' ? 'MFA verification is required.' : 'Unable to start an admin session.' }, error.code === '42501' ? 403 : 400)
  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
  const { data: eventId } = await admin.rpc('record_admin_session_alert', { p_user_id: user.id, p_auth_session_id: sessionId, p_user_agent: req.headers.get('user-agent') })
  if (eventId) {
    const { data: outbox } = await admin.rpc('claim_security_email_outbox', { p_event_id: eventId })
    for (const email of outbox ?? []) {
      const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, { method: 'POST', headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ to: email.recipient_email, subject: 'Cảnh báo bảo mật MemoryLang', template: 'security_alert', data: email.payload }) })
      await admin.rpc('mark_security_email_sent', { p_outbox_id: email.id, p_error: response.ok ? null : 'Email dispatch failed.' })
    }
  }
  return json({ data: { expiresAt: data.expires_at } })
})
