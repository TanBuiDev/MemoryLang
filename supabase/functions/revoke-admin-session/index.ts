import { createClient } from '@supabase/supabase-js'

const headers = { 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers })

function getSessionId(authHeader: string) {
  try {
    const payload = JSON.parse(atob(authHeader.replace(/^Bearer\s+/i, '').split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
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
  const { error } = await supabaseUser.rpc('revoke_own_admin_session', { p_auth_session_id: sessionId })
  if (error) return json({ error: 'Unable to revoke the admin session.' }, 400)
  return json({ data: { revoked: true } })
})
