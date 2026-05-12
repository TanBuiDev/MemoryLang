import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { QuizSetupPage } from '@/pages/quiz/QuizSetupPage'
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
    useQuizStore.setState({ selectedDeckId: null })
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
})
