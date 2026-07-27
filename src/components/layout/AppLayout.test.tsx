import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppLayout } from './AppLayout'

describe('AppLayout navigation', () => {
  it('exposes a homepage link via the logo', () => {
    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <AppLayout />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: /memorylang logo/i })).toHaveAttribute('href', '/')
  })

  it('has study link in More dropdown', () => {
    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <AppLayout />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Thêm' }))
    expect(screen.getByRole('link', { name: 'Học' })).toHaveAttribute('href', '/app/study')
  })

  it('exposes the B1 exam list directly in the header', () => {
    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <AppLayout />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Đề thi' })).toHaveAttribute('href', '/app/exams')
  })

})
