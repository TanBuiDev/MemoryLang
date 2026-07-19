import { describe, expect, it, vi } from 'vitest'
import { executeLearningTool } from './learning-tools'

describe('executeLearningTool', () => {
  it('calls the overview RPC and returns compact evidence', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { totalVocabulary: 26, reviewDue: 4 },
      error: null,
    })

    const result = await executeLearningTool({ rpc }, {
      name: 'get_learning_overview',
      args: {},
    })

    expect(rpc).toHaveBeenCalledWith('get_ai_learning_overview')
    expect(result).toEqual({
      data: { totalVocabulary: 26, reviewDue: 4 },
      evidence: { kind: 'learning_overview', label: 'Learning progress' },
    })
  })

  it('maps review queue arguments without a user id', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null })

    await executeLearningTool({ rpc }, {
      name: 'get_review_queue',
      args: { kind: 'due', limit: 3 },
    })

    expect(rpc).toHaveBeenCalledWith('get_ai_review_queue', { p_kind: 'due', p_limit: 3 })
  })

  it('returns a safe unavailable result when an RPC fails', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'permission denied' } })

    const result = await executeLearningTool({ rpc }, {
      name: 'list_grammar_topics',
      args: { limit: 5 },
    })

    expect(result).toEqual({
      data: { available: false },
      evidence: { kind: 'grammar_catalog', label: 'Available grammar lessons' },
    })
  })
})
