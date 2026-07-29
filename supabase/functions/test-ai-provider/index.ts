import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.4'
import { z } from 'https://esm.sh/zod@4.4.3'

const requestSchema = z.object({ keyId: z.string().uuid() })

function getSessionId(authHeader: string) {
  try {
    const payload = JSON.parse(atob(authHeader.replace(/^Bearer\s+/i, '').split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.session_id === 'string' ? payload.session_id : null
  } catch { return null }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  if (req.method !== 'POST') return json({ ok: false, message: 'Only POST is supported.' }, 405)
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ ok: false, message: 'Unauthorized.' }, 401)
  const supabaseUser = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authHeader } } })
  const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
  if (authError || !user) return json({ ok: false, message: 'Unauthorized.' }, 401)
  const sessionId = getSessionId(authHeader)
  const [{ data: permitted, error: permissionError }, { data: activeSession, error: sessionError }] = await Promise.all([
    supabaseUser.rpc('has_permission', { p_permission_code: 'audit.read.security' }),
    sessionId ? supabaseUser.rpc('is_admin_session_active', { p_auth_session_id: sessionId }) : Promise.resolve({ data: false, error: null }),
  ])
  if (permissionError || sessionError || !permitted || !activeSession) return json({ ok: false, message: 'Forbidden.' }, 403)
  const parsed = requestSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return json({ ok: false, message: 'Invalid key identifier.' }, 400)
  const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
  const { data: key, error: keyError } = await supabaseAdmin.from('admin_key_pools').select('id, key_name, encrypted_value, model_name, purpose_tag').eq('id', parsed.data.keyId).single()
  if (keyError || !key || !['ai_vision', 'ai_chat'].includes(key.purpose_tag)) return json({ ok: false, message: 'Key is unavailable for Gemini testing.' }, 404)
  const model = key.model_name.trim().replace(/^models\//i, '') || 'gemini-2.0-flash'
  try {
    const providerResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key.encrypted_value}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(15_000), body: JSON.stringify({ contents: [{ parts: [{ text: 'Ping' }] }] }) })
    const ok = providerResponse.ok || providerResponse.status === 429
    await supabaseAdmin.from('admin_key_pools').update({ status: ok ? 'active' : 'disabled', updated_at: new Date().toISOString() }).eq('id', key.id)
    await supabaseAdmin.from('admin_key_usage_logs').insert({ key_name: key.key_name, service_name: 'test-ai-provider', model_used: model, status_code: providerResponse.status, response_time_ms: 0, error_message: ok ? null : `Gemini request failed with HTTP ${providerResponse.status}` })
    return json({ ok, message: ok ? 'Kết nối Gemini đã được kiểm tra trên máy chủ.' : 'Gemini từ chối key hoặc model này.' })
  } catch {
    await supabaseAdmin.from('admin_key_pools').update({ status: 'disabled', updated_at: new Date().toISOString() }).eq('id', key.id)
    return json({ ok: false, message: 'Không thể kết nối Gemini từ máy chủ.' }, 502)
  }
})
