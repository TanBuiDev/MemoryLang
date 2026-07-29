import { describe, expect, it } from 'vitest'
import { createGeminiProvider, readGeminiFunctionCalls } from './ai-providers'

describe('readGeminiFunctionCalls', () => {
  it('extracts native Gemini function calls without treating them as text', () => {
    expect(readGeminiFunctionCalls([
      { functionCall: { name: 'get_learning_overview', args: {} } },
      { functionCall: { name: 'get_review_queue', args: { kind: 'due', limit: 3 } } },
    ])).toEqual([
      { name: 'get_learning_overview', args: {} },
      { name: 'get_review_queue', args: { kind: 'due', limit: 3 } },
    ])
  })

  it('ignores malformed function calls', () => {
    expect(readGeminiFunctionCalls([
      { functionCall: { name: 42, args: {} } },
      { functionCall: { name: 'search_my_vocabulary', args: 'word' } },
    ])).toEqual([])
  })
})

describe('createGeminiProvider', () => {
  it('uses an explicitly supplied server-side key and model', () => {
    const provider = createGeminiProvider({
      apiKey: 'managed-chat-key',
      model: 'gemini-2.5-flash',
    })

    expect(provider.name).toBe('gemini')
  })
})
