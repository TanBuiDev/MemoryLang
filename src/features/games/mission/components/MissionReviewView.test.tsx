import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MissionReviewView } from './MissionReviewView'

describe('Mission answer review', () => {
  it('shows the submitted answer, prior retry and correction without an edit control', () => {
    const onPlayAudio = vi.fn()
    render(<MissionReviewView
      items={[{
        stageType: 'listening_typing',
        question: {
          id: 'q1', type: 'listening_typing', targetTermId: 'term-1',
          prompt: 'Nghe và nhập từ hoặc cụm từ', acceptedAnswers: ['supplier'],
          audioText: 'supplier', audioUrl: 'supplier.mp3',
        },
        answer: {
          questionId: 'q1', targetTermId: 'term-1', type: 'listening_typing',
          attempts: 2, hintLevel: 1, isCorrect: true, firstTryCorrect: false,
          score: 50, answeredAt: 'now', firstSubmittedAnswer: 'supply', submittedAnswer: 'supplier',
        },
      }]}
      onBack={vi.fn()}
      onPlayAudio={onPlayAudio}
    />)
    expect(screen.getByText('supply')).toBeInTheDocument()
    expect(screen.getAllByText('supplier').length).toBeGreaterThan(0)
    expect(screen.getByText(/Đúng ở lần thử thứ hai/)).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Nghe lại đáp án câu 1' }))
    expect(onPlayAudio).toHaveBeenCalledWith('q1')
  })
})
