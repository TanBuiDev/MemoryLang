import { describe, expect, it } from 'vitest'
import { getReadingVocabularyMatchMessage } from '@/utils/readingAdminUi'

describe('getReadingVocabularyMatchMessage', () => {
  it('uses friendly language without exposing the database table name', () => {
    const message = getReadingVocabularyMatchMessage(6)

    expect(message).toBe('Đã tìm thấy 6 từ vựng có sẵn trong hệ thống.')
    expect(message).not.toContain('global_terms')
  })
})
