import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const requestSchema = z.object({
  action: z.enum(['grant', 'revoke']),
  targetUserId: z.string().uuid(),
  roleCode: z.enum(['support_admin', 'exam_admin', 'security_admin', 'super_admin']),
  reason: z.string().trim().min(3).max(500),
})

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders })
}

function getSessionId(authHeader: string) {
  try {
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.session_id === 'string' ? payload.session_id : null
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Only POST is supported.' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Unauthorized.' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const supabaseUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
  if (authError || !user) return json({ error: 'Unauthorized.' }, 401)

  const sessionId = getSessionId(authHeader)
  if (!sessionId) return json({ error: 'Invalid authentication session.' }, 401)

  const parsed = requestSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return json({ error: 'Invalid role change request.' }, 400)
  if (parsed.data.targetUserId === user.id) return json({ error: 'You cannot change your own role.' }, 400)

  const requiredPermission = parsed.data.action === 'grant' ? 'role.assign' : 'role.revoke'
  const [
    { data: permitted, error: permissionError },
    { data: mfaVerified, error: mfaError },
    { data: activeSession, error: sessionError },
  ] = await Promise.all([
    supabaseUser.rpc('has_permission', { p_permission_code: requiredPermission }),
    supabaseUser.rpc('is_mfa_verified'),
    supabaseUser.rpc('is_admin_session_active', { p_auth_session_id: sessionId }),
  ])
  if (permissionError || mfaError || sessionError || !permitted || !mfaVerified || !activeSession) {
    return json({ error: 'MFA and an active admin session are required.' }, 403)
  }

  if (parsed.data.roleCode === 'super_admin') {
    const { data: isSuperAdmin, error: superAdminError } = await supabaseUser.rpc('has_role', {
      p_role_code: 'super_admin',
    })
    if (superAdminError || !isSuperAdmin) return json({ error: 'Forbidden.' }, 403)
  }

  const supabaseAdmin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
  const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const { data, error } = await supabaseAdmin.rpc('manage_user_role', {
    p_actor_user_id: user.id,
    p_action: parsed.data.action,
    p_target_user_id: parsed.data.targetUserId,
    p_role_code: parsed.data.roleCode,
    p_reason: parsed.data.reason,
    p_request_id: crypto.randomUUID(),
    p_user_agent: req.headers.get('user-agent'),
    p_ip_address: forwardedFor,
  })
  if (error) {
    console.error('manage-user-role failed', error)
    return json({ error: 'Unable to change the user role.' }, 400)
  }

  return json({ data })
})
