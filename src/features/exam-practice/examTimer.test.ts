import { describe, expect, it } from 'vitest'
import { formatExamDuration, getAttemptTimerState } from './examTimer'

describe('exam timer', () => {
  it('shows remaining time before the learner reaches the selected duration', () => {
    expect(getAttemptTimerState('2026-07-27T10:00:00.000Z', 7200, new Date('2026-07-27T11:30:00.000Z'))).toEqual({
      elapsedSeconds: 5400,
      remainingSeconds: 1800,
      overtimeSeconds: 0,
      isOvertime: false,
    })
  })

  it('keeps counting after time is up instead of ending the mock exam', () => {
    expect(getAttemptTimerState('2026-07-27T10:00:00.000Z', 3600, new Date('2026-07-27T11:02:05.000Z'))).toEqual({
      elapsedSeconds: 3725,
      remainingSeconds: 0,
      overtimeSeconds: 125,
      isOvertime: true,
    })
  })

  it('formats durations for the shared exam clock', () => {
    expect(formatExamDuration(3725)).toBe('01:02:05')
  })
})
