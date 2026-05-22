import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authService } from '@/services/supabase/auth.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { LandingPage } from './LandingPage'

describe('LandingPage', () => {
  beforeEach(() => {
    useAuthStore.setState({
      session: null,
      user: null,
      profile: null,
      loading: false,
    })
  })

  it('renders the completed homepage sections and navigation links', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: /tính năng/i })).toHaveAttribute('href', '#features')
    expect(screen.getByRole('link', { name: /cách học/i })).toHaveAttribute('href', '#workflow')
    expect(screen.getByRole('heading', { name: /cách memorylang biến từ vựng/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /xem memorylang hoạt động/i })).toBeInTheDocument()
    expect(screen.getAllByTestId('homepage-mascot-art')).toHaveLength(2)
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('shows guest actions when the user is not authenticated', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Đăng nhập' })).toHaveAttribute('href', '/login')
    expect(screen.getAllByRole('link', { name: 'Bắt đầu' })[0]).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: 'Bắt đầu học' })).toHaveAttribute('href', '/login')
    expect(screen.getAllByRole('link', { name: 'Mở demo' })[0]).toHaveAttribute('href', '/app/dashboard')
  })

  it('replaces guest actions with app actions when the user is authenticated', async () => {
    const user = userEvent.setup()
    const signOutSpy = vi.spyOn(authService, 'signOut').mockResolvedValue({ error: null } as never)
    useAuthStore.setState({
      session: { user: { id: 'user-1' } } as never,
      user: { id: 'user-1' } as never,
      profile: {
        id: 'user-1',
        display_name: 'Learner',
        native_language: 'vi',
        current_target_language: 'en',
        ui_language: 'vi',
        onboarding_completed: true,
        password_set: true,
        created_at: '2026-05-16T00:00:00.000Z',
        updated_at: '2026-05-16T00:00:00.000Z',
      },
      loading: false,
    })

    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('link', { name: 'Đăng nhập' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Bắt đầu' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Vào tổng quan' })[0]).toHaveAttribute('href', '/app/dashboard')
    expect(screen.getAllByRole('link', { name: 'Tiếp tục học' })[0]).toHaveAttribute('href', '/app/study')
    await user.click(screen.getByRole('button', { name: 'Đăng xuất' }))
    expect(signOutSpy).toHaveBeenCalledTimes(1)
    signOutSpy.mockRestore()
  })
})
