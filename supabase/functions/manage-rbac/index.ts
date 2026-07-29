import { createClient } from 'npm:@supabase/supabase-js'
import { z } from 'npm:zod'

const adminRole = z.enum(['support_admin', 'exam_admin', 'security_admin', 'super_admin'])
const roleRequestSchema = z.object({
  kind: z.literal('role'),
  action: z.enum(['grant', 'revoke']),
  targetUserId: z.string().uuid(),
  roleCode: adminRole,
  reason: z.string().trim().min(3).max(500),
})
const permissionRequestSchema = z.object({
  kind: z.literal('permission'),
  action: z.enum(['grant', 'revoke']),
  roleCode: z.enum(['support_admin', 'exam_admin', 'security_admin']),
  permissionCode: z.string().regex(/^[a-z_]+\.[a-z_]+(?:\.[a-z_]+)?$/),
  reason: z.string().trim().min(3).max(500),
})
const requestSchema = z.discriminatedUnion('kind', [roleRequestSchema, permissionRequestSchema])

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
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Unauthorized.' }, 401)

  const parsed = requestSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return json({ error: 'Invalid request.' }, 400)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const supabaseUser = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
  const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
  const sessionId = getSessionId(authHeader)
  if (authError || !user || !sessionId) return json({ error: 'Unauthorized.' }, 401)
  if (parsed.data.kind === 'role' && parsed.data.targetUserId === user.id) return json({ error: 'Invalid request.' }, 400)

  const [{ data: mfaVerified, error: mfaError }, { data: activeSession, error: sessionError }] = await Promise.all([
    supabaseUser.rpc('is_mfa_verified'),
    supabaseUser.rpc('is_admin_session_active', { p_auth_session_id: sessionId }),
  ])
  if (mfaError || sessionError || !mfaVerified || !activeSession) return json({ error: 'Forbidden.' }, 403)

  if (parsed.data.kind === 'role') {
    const requiredPermission = parsed.data.action === 'grant' ? 'role.assign' : 'role.revoke'
    const { data: permitted, error: permissionError } = await supabaseUser.rpc('has_permission', { p_permission_code: requiredPermission })
    if (permissionError || !permitted) return json({ error: 'Forbidden.' }, 403)
    if (parsed.data.roleCode === 'super_admin') {
      const { data: superAdmin, error: superAdminError } = await supabaseUser.rpc('has_role', { p_role_code: 'super_admin' })
      if (superAdminError || !superAdmin) return json({ error: 'Forbidden.' }, 403)
    }
  } else {
    const { data: superAdmin, error: superAdminError } = await supabaseUser.rpc('has_role', { p_role_code: 'super_admin' })
    if (superAdminError || !superAdmin) return json({ error: 'Forbidden.' }, 403)
  }

  const supabaseAdmin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
  const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const commonArgs = { p_actor_user_id: user.id, p_request_id: crypto.randomUUID(), p_user_agent: req.headers.get('user-agent'), p_ip_address: forwardedFor }
  const { data, error } = parsed.data.kind === 'role'
    ? await supabaseAdmin.rpc('manage_user_role', { ...commonArgs, p_action: parsed.data.action, p_target_user_id: parsed.data.targetUserId, p_role_code: parsed.data.roleCode, p_reason: parsed.data.reason })
    : await supabaseAdmin.rpc('manage_role_permission', { ...commonArgs, p_action: parsed.data.action, p_role_code: parsed.data.roleCode, p_permission_code: parsed.data.permissionCode, p_reason: parsed.data.reason })

  if (error) {
    console.error('manage-rbac failed', error)
    return json({ error: 'Unable to update access configuration.' }, 400)
  }
  return json({ data })
})
