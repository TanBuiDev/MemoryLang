import { render, screen } from '@testing-library/react'
import { useState } from 'react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ChoiceListEditor, type EditableChoiceQuestion } from './ChoiceListEditor'

const initialQuestions: EditableChoiceQuestion[] = [{
  id: 'q-1', activity_id: 'activity-1', source_key: 'q-1', prompt: 'Choose one', order_index: 0,
  options: [{ key: 'A', text: 'First', is_correct: true }, { key: 'B', text: 'Second', is_correct: false }],
  translation: null, explanation: null,
}]

describe('ChoiceListEditor', () => {
  it('lets an admin mark an option as correct with a visual control and edit review content', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    function EditorHarness() {
      const [questions, setQuestions] = useState(initialQuestions)
      return <ChoiceListEditor questions={questions} onChange={(next) => { setQuestions(next); onChange(next) }} />
    }
    render(
      <EditorHarness />,
    )

    await user.click(screen.getByRole('button', { name: /Đặt “Second” là đáp án đúng/i }))
    await user.type(screen.getByLabelText(/Lời giải chi tiết/i), 'Vì đây là lựa chọn đúng.')

    expect(onChange).toHaveBeenLastCalledWith(expect.arrayContaining([
      expect.objectContaining({
        options: expect.arrayContaining([expect.objectContaining({ key: 'B', is_correct: true })]),
        explanation: 'Vì đây là lựa chọn đúng.',
      }),
    ]))
  })

  it('delegates deleting a question to the builder confirmation flow', async () => {
    const onRequestDeleteQuestion = vi.fn()
    const user = userEvent.setup()
    render(<ChoiceListEditor questions={initialQuestions} onChange={vi.fn()} onRequestDeleteQuestion={onRequestDeleteQuestion} />)

    await user.click(screen.getByRole('button', { name: 'Xóa câu 1' }))

    expect(onRequestDeleteQuestion).toHaveBeenCalledWith(initialQuestions[0])
  })
})
