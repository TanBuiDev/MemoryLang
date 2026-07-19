import { describe, expect, it } from 'vitest'
import { formatVerifiedToolResponse } from './grounded-response'

describe('formatVerifiedToolResponse', () => {
  it('renders learning totals in Vietnamese from the verified overview fields', () => {
    expect(formatVerifiedToolResponse({
      language: 'vi',
      toolCalls: [{ name: 'get_learning_overview', args: {} }],
      results: [{
        name: 'get_learning_overview',
        data: { totalVocabulary: 1554, memorizedWords: 0, difficultWords: 3, reviewDue: 8 },
      }],
    })).toBe('Bạn hiện có 1.554 từ vựng đang học. Trong đó có 0 từ đã ghi nhớ theo SRS, 3 từ khó và 8 từ cần ôn.')
  })

  it('uses the catalog total instead of an unrelated history number', () => {
    expect(formatVerifiedToolResponse({
      language: 'vi',
      toolCalls: [{ name: 'list_grammar_topics', args: { limit: 5 } }],
      results: [{
        name: 'list_grammar_topics',
        data: [
          { title: 'Used to + V', total_count: 3 },
          { title: 'Common Conjunctions', total_count: 3 },
        ],
      }],
    })).toBe('Bạn hiện có thể truy cập 3 chủ đề ngữ pháp. Một số chủ đề là: Used to + V, Common Conjunctions.')
  })
})
