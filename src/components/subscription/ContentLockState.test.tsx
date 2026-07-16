import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ContentLockState } from './ContentLockState'

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}</div>
}

function renderLock(contentType: 'grammar' | 'listening' = 'grammar') {
  return render(
    <MemoryRouter initialEntries={['/app/grammar/topic-1']}>
      <Routes>
        <Route
          path="/app/grammar/topic-1"
          element={
            <ContentLockState
              title="Used to + V"
              contentType={contentType}
              teaserConfig={{ enabled: true, type: 'theory_only' }}
              backTo={contentType === 'grammar' ? '/app/grammar' : '/app/listening'}
            />
          }
        />
        <Route path="/app/upgrade" element={<LocationProbe />} />
        <Route path="/app/grammar" element={<LocationProbe />} />
        <Route path="/app/listening" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ContentLockState', () => {
  it('shows locked content title and upgrade CTA', () => {
    renderLock()

    expect(screen.getByText('Used to + V')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /nâng cấp pro/i })).toBeInTheDocument()
    expect(screen.getByText(/xem phần lý thuyết/i)).toBeInTheDocument()
  })

  it('navigates to upgrade', async () => {
    const user = userEvent.setup()
    renderLock()

    await user.click(screen.getByRole('button', { name: /nâng cấp pro/i }))

    expect(screen.getByTestId('location')).toHaveTextContent('/app/upgrade')
  })
})
