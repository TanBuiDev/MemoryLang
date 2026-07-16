import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UpgradeSuccessPage } from '@/pages/subscription/UpgradeSuccessPage'

vi.mock('@/stores/useSubscriptionStore', () => ({
  useSubscriptionStore: vi.fn((selector: (state: { subscription: null }) => unknown) =>
    selector({ subscription: null })
  ),
}))

describe('UpgradeSuccessPage', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      beginPath: vi.fn(),
      clearRect: vi.fn(),
      lineTo: vi.fn(),
      moveTo: vi.fn(),
      stroke: vi.fn(),
      lineWidth: 0,
      strokeStyle: '',
    } as unknown as CanvasRenderingContext2D)

    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)
  })

  it('uses the shared button sizing for success actions', () => {
    render(
      <MemoryRouter>
        <UpgradeSuccessPage />
      </MemoryRouter>
    )

    const dashboardLink = screen.getByRole('link', { name: 'Quay về Dashboard' })
    const vocabularyLink = screen.getByRole('link', { name: /Thêm từ vựng mới/ })

    expect(dashboardLink).toHaveClass('min-h-10')
    expect(dashboardLink).toHaveClass('px-4')
    expect(vocabularyLink).toHaveClass('min-h-10')
    expect(vocabularyLink).toHaveClass('px-4')
    expect(dashboardLink.parentElement).toHaveClass('flex')
    expect(dashboardLink.parentElement).toHaveClass('gap-3')
  })
})
