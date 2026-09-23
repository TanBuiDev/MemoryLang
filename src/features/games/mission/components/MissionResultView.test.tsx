import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MissionResultView } from './MissionResultView'

describe('Mission result actions', () => {
  it('offers a read-only review beside replay', () => {
    const onReview = vi.fn()
    render(<MissionResultView
      missionNumber={1}
      result={{ score: 68, accuracy: 76, firstTryAccuracy: 60 }}
      syncing={false}
      synced
      error={null}
      hasNextMission
      onRetrySync={vi.fn()}
      onBack={vi.fn()}
      onReview={onReview}
      onReplay={vi.fn()}
      onNext={vi.fn()}
    />)
    fireEvent.click(screen.getByRole('button', { name: 'Xem lại bài làm' }))
    expect(onReview).toHaveBeenCalledOnce()
  })
})
