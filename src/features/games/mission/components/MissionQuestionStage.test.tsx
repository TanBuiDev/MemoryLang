import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
  onSkip: vi.fn(),
}

describe('Mission question hints', () => {
  beforeEach(() => vi.clearAllMocks())
  it('offers hint and skip on recall and cloze without requiring a wrong guess', () => {
    render(<MissionQuestionStage
      {...actions}
      stageType="context_cloze"
      question={{ ...question, hint: { firstLetter: 's', wordCount: 1 } }}
      index={0}
      total={1}
      answerValue=""
      hintLevel={0}
      contextTranslation={null}
      contextTranslationShown={false}
      feedback={null}
      isLastQuestion={false}
    />)
    fireEvent.click(screen.getByRole('button', { name: 'Gợi ý' }))
    fireEvent.click(screen.getByRole('button', { name: 'Chưa nhớ từ này' }))
    expect(actions.onHint).toHaveBeenCalledOnce()
    expect(actions.onSkip).toHaveBeenCalledOnce()
  })
  it('focuses Continue after grading so Enter advances without returning to the input', () => {
    const onNext = vi.fn()
    render(<MissionQuestionStage
      {...actions}
      onNext={onNext}
      stageType="context_cloze"
      question={question}
      index={0}
      total={1}
      answerValue="supplier"
      hintLevel={0}
      contextTranslation={null}
      contextTranslationShown={false}
      feedback={{ correct: true, finalized: true, text: 'Chính xác!' }}
      isLastQuestion={false}
    />)
    const next = screen.getByRole('button', { name: 'Tiếp tục' })
    expect(next).toHaveFocus()
    fireEvent.keyDown(next, { key: 'Enter' })
    expect(onNext).toHaveBeenCalledOnce()
  })
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

  it('advances on Enter key press after grading transitions from typing state', () => {
    const onNext = vi.fn()
    const props = {
      ...actions,
      onNext,
      stageType: 'listening_typing' as const,
      question: {
        id: 'listen:term-1',
        type: 'listening_typing' as const,
        targetTermId: 'term-1',
        prompt: 'Nghe và nhập từ hoặc cụm từ',
        acceptedAnswers: ['approve'],
      },
      index: 0,
      total: 1,
      answerValue: 'approve',
      hintLevel: 1,
      contextTranslation: null,
      contextTranslationShown: false,
      feedback: null,
      isLastQuestion: false,
    }
    const view = render(<MissionQuestionStage {...props} />)
    // Simulate grading transition to finalized state
    view.rerender(
      <MissionQuestionStage
        {...props}
        feedback={{ correct: true, finalized: true, text: 'Đúng rồi! Bạn đã dùng gợi ý.' }}
      />
    )

    // Press Enter anywhere on window
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(onNext).toHaveBeenCalledOnce()
  })

  it('renders feedback indicator directly inside the input container instead of a separate banner', () => {
    const props = {
      ...actions,
      stageType: 'context_cloze' as const,
      question: {
        id: 'cloze:term-1',
        type: 'context_cloze' as const,
        targetTermId: 'term-1',
        prompt: 'He was acting very ______ today.',
        acceptedAnswers: ['suspicious'],
      },
      index: 0,
      total: 1,
      answerValue: 'suspicious',
      hintLevel: 0,
      contextTranslation: null,
      contextTranslationShown: false,
      feedback: { correct: true, finalized: true, text: 'Chính xác ngay lần đầu!' },
      isLastQuestion: false,
    }
    const { rerender } = render(<MissionQuestionStage {...props} />)
    const input = screen.getByDisplayValue('suspicious')
    expect(input).toBeInTheDocument()
    expect(input.className).toContain('border-emerald-700')
    expect(input.className).toContain('bg-emerald-50')
    // No separate standalone feedback banner text
    expect(screen.queryByText('Chính xác ngay lần đầu!')).not.toBeInTheDocument()

    // When incorrect
    rerender(
      <MissionQuestionStage
        {...props}
        answerValue="wrong"
        feedback={{ correct: false, finalized: true, text: 'Chưa chính xác.' }}
      />
    )
    const wrongInput = screen.getByDisplayValue('wrong')
    expect(wrongInput.className).toContain('border-rose-700')
    expect(wrongInput.className).toContain('bg-rose-50')
    expect(screen.getByText('Đáp án đúng:')).toBeInTheDocument()
    expect(screen.getByText('suspicious')).toBeInTheDocument()
  })
})
