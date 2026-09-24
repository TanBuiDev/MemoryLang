import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MissionMatchingStage } from './MissionMatchingStage'
import type { QuestionDefinition } from '../mission.types'

const questions: QuestionDefinition[] = [
  { id: 'a', type: 'matching', targetTermId: 'a', prompt: 'supplier', acceptedAnswers: ['nhà cung cấp'] },
  { id: 'b', type: 'matching', targetTermId: 'b', prompt: 'compete', acceptedAnswers: ['cạnh tranh'] },
]

describe('Mission Matching selection', () => {
  it('marks an occupied translation with its row and lets Enter move it', () => {
    const onSelect = vi.fn()
    render(<MissionMatchingStage
      questions={questions}
      selections={{ a: 'nhà cung cấp', b: 'cạnh tranh' }}
      reviewed={false}
      options={[{ value: 'nhà cung cấp', label: 'nhà cung cấp' }, { value: 'cạnh tranh', label: 'cạnh tranh' }]}
      onSelect={onSelect}
      onCheck={vi.fn()}
      onContinue={vi.fn()}
    />)
    fireEvent.click(screen.getByRole('button', { name: /nghĩa của compete/i }))
    const occupied = screen.getByRole('button', { name: /nhà cung cấp.*đã chọn cho supplier/i })
    fireEvent.keyDown(occupied, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith('b', 'nhà cung cấp')
  })
})
