import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MissionMatchingStage } from './MissionMatchingStage'
import type { QuestionDefinition } from '../mission.types'

const questions = [
  { id: 'q1', prompt: 'word one', acceptedAnswers: ['nghĩa một'] },
  { id: 'q2', prompt: 'word two', acceptedAnswers: ['nghĩa hai'] },
] as QuestionDefinition[]
const options = [
  { value: 'nghĩa một', label: 'nghĩa một' },
  { value: 'nghĩa hai', label: 'nghĩa hai' },
]

describe('Mission Matching Stage', () => {
  it('does not offer a translation already assigned to another pair', () => {
    const { container } = render(
      <MissionMatchingStage
        questions={questions}
        selections={{ q1: 'nghĩa một' }}
        reviewed={false}
        options={options}
        onSelect={() => undefined}
        onCheck={() => undefined}
        onContinue={() => undefined}
      />,
    )
    const selectors = container.querySelectorAll('select')
    expect(Array.from(selectors[0].options).map((option) => option.value)).toContain('nghĩa một')
    expect(Array.from(selectors[1].options).map((option) => option.value)).not.toContain('nghĩa một')
  })
})
