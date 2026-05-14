import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { buildQuizSessionStorageKey } from '@/features/quiz/sessionPersistence'
import { QuizSetupPage } from '@/pages/quiz/QuizSetupPage'
import { useAuthStore } from '@/stores/useAuthStore'
import { useQuizStore } from '@/stores/useQuizStore'

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <QuizSetupPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('QuizSetupPage', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    useAuthStore.setState({ user: null, profile: null })
    useQuizStore.setState({ quizType: 'true_false', questionCount: 10, selectedDeckId: null })
  })

  it('allows starting a quiz from all vocabulary by default', () => {
    renderPage()

    const deckSelect = screen.getAllByRole('combobox')[0] as HTMLSelectElement

    expect(screen.getByRole('option', { name: 'Tất cả từ vựng' })).toBeInTheDocument()
    expect(deckSelect.value).toBe('')
    expect(screen.getByRole('button', { name: 'Bắt đầu kiểm tra' })).toBeEnabled()
  })

  it('allows using every usable vocabulary item as quiz questions', () => {
    renderPage()

    const questionCountSelect = screen.getAllByRole('combobox')[2] as HTMLSelectElement

    expect(screen.getByRole('option', { name: 'Tất cả' })).toBeInTheDocument()
    expect(questionCountSelect).toHaveValue('10')
  })

  it('clears the stored quiz session when starting a fresh quiz', async () => {
    const user = userEvent.setup()
    const storageKey = buildQuizSessionStorageKey({
      userId: null,
      sessionId: 'deck-quiz',
      selectedDeckId: null,
      quizType: 'true_false',
      questionCount: 10,
      remote: false,
    })
    window.sessionStorage.setItem(storageKey, 'stored-quiz')

    renderPage()
    await user.click(screen.getByRole('button', { name: 'Bắt đầu kiểm tra' }))

    expect(window.sessionStorage.getItem(storageKey)).toBeNull()
  })
})
