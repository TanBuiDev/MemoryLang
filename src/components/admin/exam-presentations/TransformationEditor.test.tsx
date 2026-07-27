import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { TransformationEditor, type EditableTransformationQuestion } from './TransformationEditor'

const questions: EditableTransformationQuestion[] = [{
  id: 'q-1', prompt: 'You’ll be caught! (away)\nYou won’t _____!', acceptedAnswers: ['get away with it'], translation: null, explanation: null,
}]

describe('TransformationEditor', () => {
  it('edits the keyword and answer frame as separate fields before serializing the learner prompt', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    function Harness() {
      const [value, setValue] = useState(questions)
      return <TransformationEditor questions={value} onChange={(next) => { setValue(next); onChange(next) }} />
    }
    render(<Harness />)

    await user.clear(screen.getByLabelText('Từ khóa câu 1'))
    await user.type(screen.getByLabelText('Từ khóa câu 1'), 'guilty')

    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ prompt: expect.stringContaining('(guilty)') })])
    expect(screen.queryByText(/JSON/i)).not.toBeInTheDocument()
  })

  it('delegates deleting a transformation question to the builder confirmation flow', async () => {
    const onRequestDeleteQuestion = vi.fn()
    const user = userEvent.setup()
    render(<TransformationEditor questions={questions} onChange={vi.fn()} onRequestDeleteQuestion={onRequestDeleteQuestion} />)

    await user.click(screen.getByRole('button', { name: 'Xóa câu 1' }))

    expect(onRequestDeleteQuestion).toHaveBeenCalledWith(questions[0])
  })
})
