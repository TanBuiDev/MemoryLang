import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { QuizResultPage } from '@/pages/quiz/QuizResultPage'

describe('QuizResultPage', () => {
  it('shows only the translation quiz score summary', () => {
    render(
      <MemoryRouter initialEntries={['/app/quiz/result/demo-result?score=2&total=3']}>
        <QuizResultPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Điểm')).toBeInTheDocument()
    expect(screen.getByText('2/3')).toBeInTheDocument()
    expect(screen.queryByText('Độ chính xác')).not.toBeInTheDocument()
    expect(screen.queryByText('Câu sai')).not.toBeInTheDocument()
  })
})
