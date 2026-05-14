import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { buildStudySessionStorageKey } from '@/features/study/sessionPersistence'
import { StudySetupPage } from '@/pages/study/StudySetupPage'
import { useAuthStore } from '@/stores/useAuthStore'
import { useStudyStore } from '@/stores/useStudyStore'

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <StudySetupPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('StudySetupPage', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    useAuthStore.setState({ user: null, profile: null })
    useStudyStore.setState({ mode: 'one_side', cardLimit: 20, shuffle: false, selectedDeckId: null })
  })

  it('allows starting a study session from all vocabulary by default', () => {
    renderPage()

    const deckSelect = screen.getAllByRole('combobox')[0] as HTMLSelectElement

    expect(screen.getByRole('option', { name: 'Tất cả từ vựng' })).toBeInTheDocument()
    expect(deckSelect.value).toBe('')
    expect(screen.getByRole('button', { name: 'Bắt đầu buổi học' })).toBeEnabled()
  })

  it('allows studying every card in the selected source', () => {
    renderPage()

    const cardLimitSelect = screen.getAllByRole('combobox')[2] as HTMLSelectElement

    expect(screen.getByRole('option', { name: 'Tất cả' })).toBeInTheDocument()
    expect(cardLimitSelect).toHaveValue('20')
  })

  it('clears the stored deck session when starting a fresh session', async () => {
    const user = userEvent.setup()
    const storageKey = buildStudySessionStorageKey({
      userId: null,
      sessionId: 'deck-session',
      selectedDeckId: null,
      mode: 'one_side',
      cardLimit: 20,
      shuffle: false,
      remote: false,
    })
    window.sessionStorage.setItem(storageKey, 'stored-session')

    renderPage()
    await user.click(screen.getByRole('button', { name: 'Bắt đầu buổi học' }))

    expect(window.sessionStorage.getItem(storageKey)).toBeNull()
  })
})
