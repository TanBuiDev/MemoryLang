import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MissionQuestionStage } from './MissionQuestionStage'
import type { QuestionDefinition } from '../mission.types'

const question: QuestionDefinition = {
  id: 'context:term-1:0',
  type: 'context_cloze',
  targetTermId: 'term-1',
  prompt: 'Our main ______ is ABC Company.',
  acceptedAnswers: ['supplier'],
}

const actions = {
  onAnswerChange: vi.fn(),
  onSubmit: vi.fn(),
  onNext: vi.fn(),
  onPlayAudio: vi.fn(),
  onHint: vi.fn(),
  onShowTranslation: vi.fn(),
}

describe('Mission question hints', () => {
  it('reveals the existing context translation only on request', () => {
    const props = {
      ...actions,
      stageType: 'context_cloze' as const,
      question,
      index: 0,
      total: 1,
      answerValue: '',
      hintLevel: 0,
      contextTranslation: 'Nhà cung cấp chính của chúng tôi là Công ty ABC.',
      contextTranslationShown: false,
      feedback: null,
      isLastQuestion: false,
    }
    const view = render(<MissionQuestionStage {...props} />)
    expect(screen.queryByText(props.contextTranslation)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Xem nghĩa câu' }))
    expect(actions.onShowTranslation).toHaveBeenCalledOnce()
    view.rerender(<MissionQuestionStage {...props} contextTranslationShown />)
    expect(screen.getByText(props.contextTranslation)).toBeInTheDocument()
  })

  it('offers a labelled listening hint without showing IPA on the first level', () => {
    const listening: QuestionDefinition = {
      ...question,
      id: 'listen:term-1',
      type: 'listening_typing',
      prompt: 'Nghe và nhập từ hoặc cụm từ',
      hint: { firstLetter: 's', wordCount: 1, ipa: '/səˈplaɪər/' },
    }
    const props = {
      ...actions,
      stageType: 'listening_typing' as const,
      question: listening,
      index: 0,
      total: 1,
      answerValue: '',
      hintLevel: 0,
      contextTranslation: null,
      contextTranslationShown: false,
      feedback: null,
      isLastQuestion: false,
    }
    const view = render(<MissionQuestionStage {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Gợi ý' }))
    expect(actions.onHint).toHaveBeenCalledOnce()
    view.rerender(<MissionQuestionStage {...props} hintLevel={1} />)
    expect(screen.getByText(/bắt đầu bằng/)).toBeInTheDocument()
    expect(screen.queryByText(/səˈplaɪər/)).not.toBeInTheDocument()
    view.rerender(<MissionQuestionStage {...props} hintLevel={2} />)
    expect(screen.getByText(/səˈplaɪər/)).toBeInTheDocument()
  })
})
