import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

describe('AdminSidebar', () => {
  it('shows Gói đăng ký in the admin sidebar', () => {
    render(
      <MemoryRouter>
        <AdminSidebar />
      </MemoryRouter>,
    )

    const link = screen.getByRole('link', { name: /Gói đăng ký/i })

    expect(link).toHaveAttribute('href', '/app/admin/subscriptions')
  })
})
