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

  it('groups translations by part of speech instead of merging them into one badge', () => {
    render(
      <ReadingVocabularyPopover
        term={{
          global_term_id: 'term-interest',
          normalized_text: 'interest',
          source_text: 'interest',
          ipa: '/ˈɪntrəst/',
          part_of_speech: 'noun, verb',
          audio_url: null,
          translation: 'sự quan tâm; làm quan tâm',
          meanings: [
            {
              text: 'a feeling of wanting to know',
              language: 'en',
              part_of_speech: 'noun',
              translation: 'sự quan tâm; sự hứng thú',
            },
            {
              text: 'to attract attention',
              language: 'en',
              part_of_speech: 'verb',
              translation: 'làm quan tâm; thu hút',
            },
          ],
        }}
        position={{ x: 20, y: 20 }}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('noun')).toBeInTheDocument()
    expect(screen.getByText('verb')).toBeInTheDocument()
    expect(screen.getByText('sự quan tâm; sự hứng thú')).toBeInTheDocument()
    expect(screen.getByText('làm quan tâm; thu hút')).toBeInTheDocument()
    expect(screen.queryByText('noun, verb')).toBeNull()
  })
})
