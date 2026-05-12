import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { StudySetupPage } from '@/pages/study/StudySetupPage'
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
    useStudyStore.setState({ selectedDeckId: null })
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
})
