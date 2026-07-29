import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import AdminUsersPage from './AdminUsersPage'

describe('AdminUsersPage', () => {
  it('redirects to /app/admin/roles automatically', () => {
    render(
      <MemoryRouter initialEntries={['/app/admin/users']}>
        <Routes>
          <Route path="/app/admin/users" element={<AdminUsersPage />} />
          <Route path="/app/admin/roles" element={<div>Unified Roles Page</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Unified Roles Page')).toBeInTheDocument()
  })
})
