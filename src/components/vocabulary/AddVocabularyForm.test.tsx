import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AddVocabularyForm } from './AddVocabularyForm'
import { enrichVocabulary } from '@/services/api/enrichVocabulary.api'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import { useAuthStore } from '@/stores/useAuthStore'

vi.mock('@/services/supabase/client', () => ({ isSupabaseConfigured: true }))
vi.mock('@/services/api/enrichVocabulary.api', () => ({ enrichVocabulary: vi.fn() }))
vi.mock('@/services/supabase/vocabulary.service', () => ({
  vocabularyService: { create: vi.fn(), findDuplicate: vi.fn() },
}))
vi.mock('@/services/local/studyLocalDb', () => ({ studyLocalDb: { enqueueMutation: vi.fn() } }))

function renderForm() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter><AddVocabularyForm onSuccess={vi.fn()} /></MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AddVocabularyForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      user: { id: 'admin-1' } as never,
      profile: { is_admin: true, current_target_language: 'fr', native_language: 'de' } as never,
    })
    vi.mocked(vocabularyService.findDuplicate).mockResolvedValue(null)
    vi.mocked(enrichVocabulary).mockResolvedValue({
      sourceText: 'bonjour',
      normalizedText: 'bonjour',
      itemType: 'word',
      ipa: null,
      partOfSpeech: null,
      meanings: [],
      examples: [],
      audioUrl: null,
      imageUrl: null,
      source: 'fallback',
    })
  })

  it('làm giàu theo ngôn ngữ đang học và ngôn ngữ mẹ đẻ của hồ sơ', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByRole('textbox', { name: 'Word, phrase, idiom, or sentence' }), 'bonjour')
    await user.click(screen.getByRole('button', { name: 'Enrich' }))

    expect(enrichVocabulary).toHaveBeenCalledWith('bonjour', 'fr', 'de')
  })

  it('dùng điều khiển Select tùy biến cho loại từ', () => {
    renderForm()

    expect(screen.getByRole('button', { name: 'Word' })).toBeInTheDocument()
  })
})
