import { describe, expect, it, vi } from 'vitest'
import { generateGroundedReply } from './grounding'

describe('generateGroundedReply', () => {
  it('executes only validated Gemini tool calls before producing the final answer', async () => {
    const generateWithTools = vi.fn().mockResolvedValue({
      provider: 'gemini',
      model: 'gemini-2.5-flash-lite',
      inputTokens: 20,
      outputTokens: 5,
      toolCalls: [{ name: 'get_learning_overview', args: {} }],
    })
    const completeWithToolResults = vi.fn().mockResolvedValue({
      provider: 'gemini',
      model: 'gemini-2.5-flash-lite',
      inputTokens: 40,
      outputTokens: 30,
      text: 'You have learned 26 words so far.',
    })
    const executeTool = vi.fn().mockResolvedValue({
      data: { totalVocabulary: 26, reviewDue: 4 },
      evidence: { kind: 'learning_overview', label: 'Learning progress' },
    })

    const result = await generateGroundedReply({
      provider: {
        name: 'gemini',
        generate: vi.fn(),
        generateWithTools,
        completeWithToolResults,
      },
      input: {
        systemPrompt: 'Use tools for learner facts.',
        history: [],
        message: 'How many words have I learned?',
        userId: 'learner-id',
      },
      executeTool,
    })

    expect(executeTool).toHaveBeenCalledWith({ name: 'get_learning_overview', args: {} })
    expect(completeWithToolResults).toHaveBeenCalledWith(
      expect.anything(),
      [{ name: 'get_learning_overview', args: {} }],
      [{ name: 'get_learning_overview', data: { totalVocabulary: 26, reviewDue: 4 } }],
    )
    expect(result).toMatchObject({
      text: 'You have learned 26 words so far.',
      inputTokens: 60,
      outputTokens: 35,
      evidence: [{ kind: 'learning_overview', label: 'Learning progress' }],
    })
  })

  it('uses a normal provider response when function calling is unavailable', async () => {
    const generate = vi.fn().mockResolvedValue({
      provider: 'openai', model: 'gpt-test', inputTokens: 12, outputTokens: 8, text: 'Let us practise.',
    })

    const result = await generateGroundedReply({
      provider: { name: 'openai', generate },
      input: { systemPrompt: 'Tutor', history: [], message: 'Hello', userId: 'learner-id' },
      executeTool: vi.fn(),
    })

    expect(generate).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({ text: 'Let us practise.', evidence: [] })
  })
})
