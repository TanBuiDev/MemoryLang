export const AI_TUTOR_TOOL_NAMES = [
  'get_learning_overview',
  'get_review_queue',
  'search_my_vocabulary',
  'get_deck_overview',
  'list_grammar_topics',
  'get_grammar_topic',
] as const

export type AiTutorToolName = (typeof AI_TUTOR_TOOL_NAMES)[number]

export type AiTutorToolCall = {
  name: AiTutorToolName
  args: Record<string, unknown>
}

export type GeminiFunctionDeclaration = {
  name: AiTutorToolName
  description: string
  parameters: Record<string, unknown>
}

const MAX_LIST_LIMIT = 10

export const aiTutorFunctionDeclarations: GeminiFunctionDeclaration[] = [
  {
    name: 'get_learning_overview',
    description: 'Returns the authenticated learner\'s verified vocabulary, review, deck, and quiz summary. Use for questions about learning progress or counts.',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'get_review_queue',
    description: 'Returns the authenticated learner\'s due or difficult vocabulary. Use for questions about what to review next.',
    parameters: {
      type: 'OBJECT',
      properties: {
        kind: { type: 'STRING', enum: ['due', 'difficult'] },
        limit: { type: 'INTEGER', minimum: 1, maximum: MAX_LIST_LIMIT },
      },
      required: ['kind'],
    },
  },
  {
    name: 'search_my_vocabulary',
    description: 'Searches the authenticated learner\'s active vocabulary by word or translation.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', minLength: 1, maxLength: 80 },
        limit: { type: 'INTEGER', minimum: 1, maximum: MAX_LIST_LIMIT },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_deck_overview',
    description: 'Returns the authenticated learner\'s own decks and their vocabulary counts.',
    parameters: {
      type: 'OBJECT',
      properties: { limit: { type: 'INTEGER', minimum: 1, maximum: MAX_LIST_LIMIT } },
    },
  },
  {
    name: 'list_grammar_topics',
    description: 'Lists published grammar topics that the authenticated learner can access. It does not represent lesson completion.',
    parameters: {
      type: 'OBJECT',
      properties: { limit: { type: 'INTEGER', minimum: 1, maximum: MAX_LIST_LIMIT } },
    },
  },
  {
    name: 'get_grammar_topic',
    description: 'Returns one accessible grammar topic and a safe summary of its lesson blocks.',
    parameters: {
      type: 'OBJECT',
      properties: { topicId: { type: 'STRING', format: 'uuid' } },
      required: ['topicId'],
    },
  },
]

export function validateToolCall(value: unknown): { ok: true; value: AiTutorToolCall } | { ok: false; message: string } {
  if (!isRecord(value) || typeof value.name !== 'string' || !AI_TUTOR_TOOL_NAMES.includes(value.name as AiTutorToolName)) {
    return { ok: false, message: 'Unsupported AI Tutor tool.' }
  }

  const args = isRecord(value.args) ? value.args : {}
  switch (value.name as AiTutorToolName) {
    case 'get_learning_overview':
      return { ok: true, value: { name: value.name, args: {} } }
    case 'get_review_queue': {
      const kind = args.kind
      if (kind !== 'due' && kind !== 'difficult') return { ok: false, message: 'Review queue kind must be due or difficult.' }
      return { ok: true, value: { name: value.name, args: { kind, limit: clampLimit(args.limit) } } }
    }
    case 'search_my_vocabulary': {
      const query = typeof args.query === 'string' ? args.query.trim() : ''
      if (!query || query.length > 80) return { ok: false, message: 'Vocabulary search query must contain 1 to 80 characters.' }
      return { ok: true, value: { name: value.name, args: { query, limit: clampLimit(args.limit) } } }
    }
    case 'get_deck_overview':
    case 'list_grammar_topics':
      return { ok: true, value: { name: value.name, args: { limit: clampLimit(args.limit) } } }
    case 'get_grammar_topic': {
      const topicId = typeof args.topicId === 'string' ? args.topicId : ''
      if (!isUuid(topicId)) return { ok: false, message: 'Grammar topic ID must be a UUID.' }
      return { ok: true, value: { name: value.name, args: { topicId } } }
    }
  }
}

function clampLimit(value: unknown): number {
  const limit = typeof value === 'number' && Number.isInteger(value) ? value : 5
  return Math.min(MAX_LIST_LIMIT, Math.max(1, limit))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-1[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}
