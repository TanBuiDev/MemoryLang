import type { AiTutorToolCall, AiTutorToolName } from './tool-definitions.ts'

export type ChatEvidenceKind = 'learning_overview' | 'review_queue' | 'vocabulary' | 'decks' | 'grammar_catalog' | 'grammar_topic'

export type ChatEvidence = {
  kind: ChatEvidenceKind
  label: string
}

type RpcResult = { data: unknown; error: { message: string } | null }

export type AuthenticatedRpcClient = {
  rpc: (functionName: string, params?: Record<string, unknown>) => PromiseLike<RpcResult>
}

export async function executeLearningTool(
  supabaseUser: AuthenticatedRpcClient,
  toolCall: AiTutorToolCall,
): Promise<{ data: unknown; evidence: ChatEvidence }> {
  const request = toolRequest(toolCall)
  const response = request.params
    ? await supabaseUser.rpc(request.functionName, request.params)
    : await supabaseUser.rpc(request.functionName)
  const { data, error } = response
  const evidence = evidenceFor(toolCall.name)

  if (error) {
    console.warn('ai-chat learning tool unavailable', { tool: toolCall.name, message: error.message })
    return { data: { available: false }, evidence }
  }

  return { data, evidence }
}

function toolRequest(toolCall: AiTutorToolCall): { functionName: string; params?: Record<string, unknown> } {
  switch (toolCall.name) {
    case 'get_learning_overview':
      return { functionName: 'get_ai_learning_overview' }
    case 'get_review_queue':
      return {
        functionName: 'get_ai_review_queue',
        params: { p_kind: toolCall.args.kind, p_limit: toolCall.args.limit },
      }
    case 'search_my_vocabulary':
      return {
        functionName: 'search_ai_vocabulary',
        params: { p_query: toolCall.args.query, p_limit: toolCall.args.limit },
      }
    case 'get_deck_overview':
      return { functionName: 'get_ai_deck_overview', params: { p_limit: toolCall.args.limit } }
    case 'list_grammar_topics':
      return { functionName: 'list_ai_grammar_topics', params: { p_limit: toolCall.args.limit } }
    case 'get_grammar_topic':
      return { functionName: 'get_ai_grammar_topic', params: { p_topic_id: toolCall.args.topicId } }
  }
}

function evidenceFor(toolName: AiTutorToolName): ChatEvidence {
  switch (toolName) {
    case 'get_learning_overview':
      return { kind: 'learning_overview', label: 'Learning progress' }
    case 'get_review_queue':
      return { kind: 'review_queue', label: 'Review queue' }
    case 'search_my_vocabulary':
      return { kind: 'vocabulary', label: 'My vocabulary' }
    case 'get_deck_overview':
      return { kind: 'decks', label: 'My decks' }
    case 'list_grammar_topics':
      return { kind: 'grammar_catalog', label: 'Available grammar lessons' }
    case 'get_grammar_topic':
      return { kind: 'grammar_topic', label: 'Grammar lesson' }
  }
}
