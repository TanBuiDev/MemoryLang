import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.4'
import { getAiProvider } from './ai-providers.ts'
import { generateGroundedReply } from './grounding.ts'
import { executeLearningTool } from './learning-tools.ts'
import { buildTutorPrompt } from './prompt.ts'
import { detectResponseLanguage } from './response-language.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const languageCodes = new Set(['vi', 'en', 'ko', 'ja', 'zh', 'fr', 'de', 'other'])

type ChatRequest = {
  action?: unknown
  sessionId?: unknown
  message?: unknown
  sourceLanguage?: unknown
  nativeLanguage?: unknown
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return errorResponse('INVALID_REQUEST', 'Only POST is supported.', 400)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return errorResponse('UNAUTHORIZED', 'Missing authorization.', 401)

  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  )
  const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
  if (authError || !user) return errorResponse('UNAUTHORIZED', 'Invalid user session.', 401)

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  try {
    const body = await req.json() as ChatRequest
    const parsed = validateRequest(body)
    if (!parsed.ok) return errorResponse('INVALID_REQUEST', parsed.message, 400)

    const session = await getOrCreateSession(supabaseAdmin, user.id, parsed.value)
    if (!session) return errorResponse('SESSION_NOT_FOUND', 'Chat session was not found.', 404)

    const quota = await getQuota(supabaseAdmin, user.id)
    if (quota.used >= quota.limit) return errorResponse('CHAT_QUOTA_EXCEEDED', 'Daily AI chat limit reached.', 429)

    const { data: userMessage, error: userMessageError } = await supabaseAdmin
      .from('chat_messages')
      .insert({ session_id: session.id, user_id: user.id, role: 'user', content: parsed.value.message })
      .select('*')
      .single()
    if (userMessageError) throw userMessageError

    const history = await loadHistory(supabaseAdmin, session.id)
    const provider = getAiProvider()
    const responseLanguage = detectResponseLanguage(parsed.value.message, parsed.value.nativeLanguage)
    let generated
    try {
      generated = await generateGroundedReply({
        provider,
        input: {
          systemPrompt: buildTutorPrompt({
            nativeLanguage: parsed.value.nativeLanguage,
            sourceLanguage: parsed.value.sourceLanguage,
            responseLanguage,
          }),
          history: history.slice(0, -1),
          message: parsed.value.message,
          userId: user.id,
          responseLanguage,
        },
        executeTool: (toolCall) => executeLearningTool(supabaseUser, toolCall),
      })
    } catch (error) {
      await supabaseAdmin.from('chat_usage_events').insert({
        user_id: user.id,
        session_id: session.id,
        provider: provider.name,
        request_status: 'failed',
        error_code: 'AI_SERVICE_UNAVAILABLE',
      })
      console.error('ai-chat provider error', { userId: user.id, provider: provider.name, message: error instanceof Error ? error.message : 'unknown' })
      return errorResponse('AI_SERVICE_UNAVAILABLE', 'AI provider is unavailable.', 503)
    }

    const { data: assistantMessage, error: assistantMessageError } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        session_id: session.id,
        user_id: user.id,
        role: 'assistant',
        content: generated.text,
        metadata: { evidence: generated.evidence },
      })
      .select('*')
      .single()
    if (assistantMessageError) throw assistantMessageError

    const messageCount = session.message_count + 2
    const now = new Date().toISOString()
    const nextTitle = session.message_count === 0 ? makeTitle(parsed.value.message) : session.title
    const { data: updatedSession, error: sessionError } = await supabaseAdmin
      .from('chat_sessions')
      .update({ title: nextTitle, message_count: messageCount, last_message_at: now })
      .eq('id', session.id)
      .eq('user_id', user.id)
      .select('*')
      .single()
    if (sessionError) throw sessionError

    await supabaseAdmin.from('chat_usage_events').insert({
      user_id: user.id,
      session_id: session.id,
      provider: generated.provider,
      model: generated.model,
      input_tokens: generated.inputTokens,
      output_tokens: generated.outputTokens,
      request_status: 'succeeded',
    })

    return jsonResponse({
      session: updatedSession,
      userMessage,
      assistantMessage,
      quota: { remainingToday: Math.max(0, quota.limit - quota.used - 1), limitToday: quota.limit },
      usage: {
        provider: generated.provider,
        model: generated.model,
        inputTokens: generated.inputTokens,
        outputTokens: generated.outputTokens,
      },
    })
  } catch (error) {
    console.error('ai-chat request error', { userId: user.id, message: error instanceof Error ? error.message : 'unknown' })
    return errorResponse('AI_SERVICE_UNAVAILABLE', 'AI Tutor could not complete this request.', 503)
  }
})

function validateRequest(body: ChatRequest): { ok: true; value: Required<Pick<ChatRequest, 'message' | 'sourceLanguage' | 'nativeLanguage'>> & { sessionId: string | null } } | { ok: false; message: string } {
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (body.action !== 'send-message') return { ok: false, message: 'Unsupported action.' }
  if (!message || message.length > 1000) return { ok: false, message: 'Message must contain 1 to 1000 characters.' }
  if (typeof body.sourceLanguage !== 'string' || !languageCodes.has(body.sourceLanguage)) return { ok: false, message: 'Invalid source language.' }
  if (typeof body.nativeLanguage !== 'string' || !languageCodes.has(body.nativeLanguage)) return { ok: false, message: 'Invalid native language.' }
  if (body.sessionId !== null && body.sessionId !== undefined && (typeof body.sessionId !== 'string' || !isUuid(body.sessionId))) {
    return { ok: false, message: 'Invalid session ID.' }
  }
  return { ok: true, value: { message, sourceLanguage: body.sourceLanguage, nativeLanguage: body.nativeLanguage, sessionId: body.sessionId ?? null } }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

async function getOrCreateSession(supabase: ReturnType<typeof createClient>, userId: string, input: { sessionId: string | null; sourceLanguage: string; nativeLanguage: string }) {
  if (input.sessionId) {
    const { data, error } = await supabase.from('chat_sessions').select('*').eq('id', input.sessionId).eq('user_id', userId).maybeSingle()
    if (error) throw error
    return data
  }
  const { data, error } = await supabase.from('chat_sessions').insert({
    user_id: userId,
    source_language: input.sourceLanguage,
    native_language: input.nativeLanguage,
    title: 'New chat',
  }).select('*').single()
  if (error) throw error
  return data
}

async function getQuota(supabase: ReturnType<typeof createClient>, userId: string) {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const [{ data: profile, error: profileError }, { data: subscription, error: subscriptionError }, { count, error: usageError }] = await Promise.all([
    supabase.from('profiles').select('is_admin').eq('id', userId).single(),
    supabase.from('subscriptions').select('plan_type, status, current_period_end').eq('user_id', userId).maybeSingle(),
    supabase.from('chat_usage_events').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('request_status', 'succeeded').gte('created_at', startOfToday.toISOString()),
  ])
  if (profileError || subscriptionError || usageError) throw profileError ?? subscriptionError ?? usageError
  const isPro = subscription?.plan_type === 'pro'
    && ['active', 'trialing'].includes(subscription.status)
    && (!subscription.current_period_end || new Date(subscription.current_period_end) > new Date())
  return { used: count ?? 0, limit: profile?.is_admin ? 200 : isPro ? 100 : 10 }
}

async function loadHistory(supabase: ReturnType<typeof createClient>, sessionId: string) {
  const { data, error } = await supabase.from('chat_messages').select('role, content').eq('session_id', sessionId).order('created_at', { ascending: false }).limit(12)
  if (error) throw error
  return (data ?? []).reverse().filter((message): message is { role: 'user' | 'assistant'; content: string } => message.role === 'user' || message.role === 'assistant')
}

function makeTitle(message: string): string {
  return message.replace(/\s+/g, ' ').trim().slice(0, 80) || 'New chat'
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

function errorResponse(code: string, message: string, status: number) {
  return jsonResponse({ error: { code, message } }, status)
}
