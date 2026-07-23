import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ReadingVocabularyPopover } from '@/components/reading/ReadingVocabularyPopover'

describe('ReadingVocabularyPopover', () => {
  it('shows only stored global term data without an add-vocabulary action', () => {
    render(
      <ReadingVocabularyPopover
        term={{
          global_term_id: 'term-grace',
          normalized_text: 'grace',
          source_text: 'Grace',
          ipa: '/ɡreɪs/',
          part_of_speech: 'noun',
          audio_url: 'https://audio.example/grace.mp3',
          translation: 'duyên dáng',
          meanings: [],
        }}
        position={{ x: 120, y: 80 }}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByRole('dialog', { name: 'Thông tin từ Grace' })).toBeInTheDocument()
    expect(screen.getByText('/ɡreɪs/')).toBeInTheDocument()
    expect(screen.getByText('noun')).toBeInTheDocument()
    expect(screen.getByText('duyên dáng')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Phát âm Grace' })).toBeInTheDocument()
    expect(screen.queryByText(/thêm vào/i)).toBeNull()
  })

  it('falls back to legacy meaning text when the translation column is empty', () => {
    render(
      <ReadingVocabularyPopover
        term={{
          global_term_id: 'term-work',
          normalized_text: 'work',
          source_text: 'work',
          ipa: null,
          part_of_speech: null,
          audio_url: null,
          translation: null,
          meanings: [{ text: 'làm việc', language: 'vi' }],
        }}
        position={{ x: 20, y: 20 }}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('làm việc')).toBeInTheDocument()
  })
})
