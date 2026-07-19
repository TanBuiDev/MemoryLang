import type { AiChatInput, AiChatOutput, AiProvider } from './ai-providers.ts'
import type { ChatEvidence } from './learning-tools.ts'
import { validateToolCall, type AiTutorToolCall } from './tool-definitions.ts'

const MAX_TOOL_CALLS_PER_TURN = 2

type ExecuteTool = (toolCall: AiTutorToolCall) => Promise<{ data: unknown; evidence: ChatEvidence }>

export async function generateGroundedReply(input: {
  provider: AiProvider
  input: AiChatInput
  executeTool: ExecuteTool
}): Promise<AiChatOutput & { evidence: ChatEvidence[] }> {
  const { provider, input: chatInput } = input
  if (!provider.generateWithTools || !provider.completeWithToolResults) {
    const output = await provider.generate(chatInput)
    return { ...output, evidence: [] }
  }

  const planned = await provider.generateWithTools(chatInput)
  if ('text' in planned) return { ...planned, evidence: [] }

  const toolCalls = uniqueToolCalls(planned.toolCalls)
    .slice(0, MAX_TOOL_CALLS_PER_TURN)
    .map(validateToolCall)
    .filter((result): result is { ok: true; value: AiTutorToolCall } => result.ok)
    .map((result) => result.value)

  if (toolCalls.length === 0) {
    throw new Error('Gemini returned no valid AI Tutor tool call')
  }

  const executed = await Promise.all(toolCalls.map((toolCall) => input.executeTool(toolCall)))
  const completed = await provider.completeWithToolResults(
    chatInput,
    toolCalls,
    executed.map((result, index) => ({ name: toolCalls[index].name, data: result.data })),
  )

  return {
    ...completed,
    inputTokens: planned.inputTokens + completed.inputTokens,
    outputTokens: planned.outputTokens + completed.outputTokens,
    evidence: uniqueEvidence(executed.map((result) => result.evidence)),
  }
}

function uniqueEvidence(evidence: ChatEvidence[]): ChatEvidence[] {
  return Array.from(new Map(evidence.map((item) => [item.kind, item])).values())
}

function uniqueToolCalls(toolCalls: Array<{ name: string; args: Record<string, unknown> }>): Array<{ name: string; args: Record<string, unknown> }> {
  return Array.from(new Map(toolCalls.map((toolCall) => [
    `${toolCall.name}:${JSON.stringify(toolCall.args)}`,
    toolCall,
  ])).values())
}
