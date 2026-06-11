import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { buildStudySessionStorageKey, writeActiveStudySessionStorageKey, writeStoredStudySession } from '@/features/study/sessionPersistence'
import type { VocabularyItem } from '@/types/vocabulary.types'
import { AppLayout } from './AppLayout'

const storedVocabularyItem: VocabularyItem = {
  id: 'attend',
  user_id: 'user-1',
  global_term_id: null,
  source_language: 'en',
  native_language: 'vi',
  source_text: 'attend',
  normalized_text: 'attend',
  item_type: 'word',
  part_of_speech: null,
  ipa: null,
  pronunciation_text: null,
  audio_url: null,
  image_url: null,
  note: null,
  meanings: [{ text: 'be present', language: 'en' }],
  translation: 'tham dự',
  examples: [],
  tags: [],
  status: 'new',
  correct_count: 0,
  wrong_count: 0,
  view_count: 0,
  audio_play_count: 0,
  srs_repetition: 0,
  srs_interval_days: 0,
  srs_ease_factor: 2.5,
  last_reviewed_at: null,
  next_review_at: null,
  flagged: false,
  deleted_at: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

function seedActiveStudySession() {
  const sessionStorageKey = buildStudySessionStorageKey({
    userId: null,
    sessionId: 'deck-session',
    selectedDeckId: null,
    mode: 'one_side',
    cardLimit: 20,
    shuffle: false,
    remote: false,
  })

  writeStoredStudySession(sessionStorageKey, {
    vocabulary: [storedVocabularyItem],
    index: 0,
    mode: 'one_side',
    viewedTermIds: ['attend'],
    flushedViewTermIds: [],
  })
  writeActiveStudySessionStorageKey({
    userId: null,
    sessionId: 'deck-session',
    remote: false,
  }, sessionStorageKey)
}

describe('AppLayout navigation', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('exposes a homepage link from the authenticated app shell', () => {
    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <AppLayout />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: /trang chủ/i })).toHaveAttribute('href', '/')
  })

  it('resumes an active study session from app pages', () => {
    seedActiveStudySession()

    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <AppLayout />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Học' })).toHaveAttribute('href', '/app/study/session/deck-session')
  })

  it('links to study setup from the study result page instead of resuming the finished session', () => {
    seedActiveStudySession()

    render(
      <MemoryRouter initialEntries={['/app/study/result/deck-session']}>
        <AppLayout />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Học' })).toHaveAttribute('href', '/app/study')
  })
})
