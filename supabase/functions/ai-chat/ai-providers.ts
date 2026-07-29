import { aiTutorFunctionDeclarations } from './tool-definitions.ts'

export type AiProviderName = 'gemini' | 'openai'

export interface AiChatInput {
  systemPrompt: string
  history: Array<{ role: 'user' | 'assistant'; content: string }>
  message: string
  userId: string
  responseLanguage?: 'vi' | 'en'
}

export interface AiChatOutput {
  text: string
  model: string
  inputTokens: number
  outputTokens: number
  provider: AiProviderName
}

export type AiToolCall = {
  name: string
  args: Record<string, unknown>
}

export type AiToolResult = {
  name: string
  data: unknown
}

export type AiToolPlanningOutput = Omit<AiChatOutput, 'text'> & {
  toolCalls: AiToolCall[]
}

export interface AiProvider {
  name: AiProviderName
  generate(input: AiChatInput): Promise<AiChatOutput>
  generateWithTools?: (input: AiChatInput) => Promise<AiToolPlanningOutput | AiChatOutput>
  completeWithToolResults?: (input: AiChatInput, toolCalls: AiToolCall[], toolResults: AiToolResult[]) => Promise<AiChatOutput>
}

export type GeminiProviderConfig = {
  apiKey: string
  model: string
}

const PROVIDER_TIMEOUT_MS = 20_000

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

function readText(parts: unknown): string {
  if (!Array.isArray(parts)) return ''
  return parts
    .map((part) => typeof part === 'object' && part !== null && typeof (part as { text?: unknown }).text === 'string'
      ? (part as { text: string }).text
      : '')
    .join('')
    .trim()
}

export function readGeminiFunctionCalls(parts: unknown): AiToolCall[] {
  if (!Array.isArray(parts)) return []
  return parts.flatMap((part) => {
    if (!isRecord(part) || !isRecord(part.functionCall)) return []
    const { name, args } = part.functionCall
    return typeof name === 'string' && isRecord(args) ? [{ name, args }] : []
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

type GeminiPayload = {
  candidates?: Array<{ content?: { parts?: unknown } }>
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
  error?: { message?: string }
}

function geminiContents(input: AiChatInput): Array<{ role: string; parts: Array<Record<string, unknown>> }> {
  return [
    ...input.history.map((item) => ({
      role: item.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: item.content }],
    })),
    { role: 'user', parts: [{ text: input.message }] },
  ]
}

async function requestGemini(apiKey: string, model: string, body: Record<string, unknown>): Promise<GeminiPayload> {
  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
  const payload = await response.json().catch(() => null) as GeminiPayload | null
  if (!response.ok) throw new Error(payload?.error?.message ?? `Gemini request failed (${response.status})`)
  return payload ?? {}
}

function geminiOutput(payload: GeminiPayload, model: string): AiChatOutput {
  const text = readText(payload.candidates?.[0]?.content?.parts)
  if (!text) throw new Error('Gemini returned no assistant message')
  return {
    provider: 'gemini',
    model,
    text,
    inputTokens: payload.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: payload.usageMetadata?.candidatesTokenCount ?? 0,
  }
}

export function createGeminiProvider(config?: GeminiProviderConfig): AiProvider {
  const apiKey = config?.apiKey ?? Deno.env.get('GEMINI_API_KEY')
  const model = config?.model ?? Deno.env.get('GEMINI_CHAT_MODEL')
  if (!apiKey || !model) throw new Error('Gemini AI provider is not configured')

  return {
    name: 'gemini',
    async generate(input) {
      const payload = await requestGemini(apiKey, model, {
        systemInstruction: { parts: [{ text: input.systemPrompt }] },
        contents: geminiContents(input),
        generationConfig: { maxOutputTokens: 500, temperature: 0.7 },
      })
      return geminiOutput(payload, model)
    },
    async generateWithTools(input) {
      const payload = await requestGemini(apiKey, model, {
        systemInstruction: { parts: [{ text: input.systemPrompt }] },
        contents: geminiContents(input),
        tools: [{ functionDeclarations: aiTutorFunctionDeclarations }],
        generationConfig: { maxOutputTokens: 500, temperature: 0.3 },
      })
      const toolCalls = readGeminiFunctionCalls(payload.candidates?.[0]?.content?.parts)
      if (toolCalls.length === 0) return geminiOutput(payload, model)
      return {
        provider: 'gemini',
        model,
        toolCalls,
        inputTokens: payload.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: payload.usageMetadata?.candidatesTokenCount ?? 0,
      }
    },
    async completeWithToolResults(input, toolCalls, toolResults) {
      const payload = await requestGemini(apiKey, model, {
        systemInstruction: { parts: [{ text: input.systemPrompt }] },
        contents: [
          ...geminiContents(input),
          { role: 'model', parts: toolCalls.map((toolCall) => ({ functionCall: toolCall })) },
          {
            role: 'user',
            parts: toolResults.map((result) => ({
              functionResponse: { name: result.name, response: { result: result.data ?? { available: false } } },
            })),
          },
        ],
        generationConfig: { maxOutputTokens: 500, temperature: 0.5 },
      })
      return geminiOutput(payload, model)
    },
  }
}

export function createOpenAiProvider(): AiProvider {
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  const model = Deno.env.get('OPENAI_CHAT_MODEL')
  if (!apiKey || !model) throw new Error('OpenAI provider is not configured')

  return {
    name: 'openai',
    async generate(input) {
      const response = await fetchWithTimeout('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          instructions: input.systemPrompt,
          input: [
            ...input.history.map((item) => ({
              role: item.role,
              content: [{ type: 'input_text', text: item.content }],
            })),
            { role: 'user', content: [{ type: 'input_text', text: input.message }] },
          ],
          max_output_tokens: 500,
          safety_identifier: input.userId,
        }),
      })
      const payload = await response.json().catch(() => null) as {
        output?: Array<{ type?: string; content?: unknown }>
        usage?: { input_tokens?: number; output_tokens?: number }
        error?: { message?: string }
      } | null
      if (!response.ok) throw new Error(payload?.error?.message ?? `OpenAI request failed (${response.status})`)

      const message = payload?.output?.find((item) => item.type === 'message')
      const text = readText(message?.content)
      if (!text) throw new Error('OpenAI returned no assistant message')
      return {
        provider: 'openai',
        model,
        text,
        inputTokens: payload?.usage?.input_tokens ?? 0,
        outputTokens: payload?.usage?.output_tokens ?? 0,
      }
    },
  }
}

export function getAiProvider(geminiConfig?: GeminiProviderConfig): AiProvider {
  return (Deno.env.get('AI_PROVIDER') ?? 'gemini').toLowerCase() === 'openai'
    ? createOpenAiProvider()
    : createGeminiProvider(geminiConfig)
}
