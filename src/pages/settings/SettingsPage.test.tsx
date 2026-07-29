import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { useAuthStore } from '@/stores/useAuthStore'

vi.mock('@/services/supabase/client', () => ({
  isSupabaseConfigured: true,
}))

vi.mock('@/services/supabase/auth.service', () => ({
  authService: {
    updateProfile: vi.fn(),
    setPassword: vi.fn(),
    signOutAllDevices: vi.fn(),
    deleteAccount: vi.fn(),
  },
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  )
}

describe('SettingsPage Neobrutalist UI', () => {
  beforeEach(() => {
    window.localStorage.clear()
    useAuthStore.setState({
      user: { id: 'user-1', email: 'user@example.com' } as never,
      profile: { display_name: 'Test User' } as never,
    })
  })

  it('renders Profile, Languages, Email preferences and Danger zone sections', () => {
    renderPage()

    expect(screen.getByText('Hồ sơ')).toBeInTheDocument()
    expect(screen.getByText('Ngôn ngữ')).toBeInTheDocument()
    expect(screen.getByText('Cấu hình Email Thông báo')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Dữ liệu/i })).toBeInTheDocument()
  })

  it('renders email notification checkboxes and allows toggling', async () => {
    const user = userEvent.setup()
    renderPage()

    const reminderCheckbox = screen.getByRole('checkbox', { name: 'Email nhắc nhở ôn tập hàng ngày' })
    const digestCheckbox = screen.getByRole('checkbox', { name: 'Báo cáo tiến độ học tập hàng tuần' })

    expect(reminderCheckbox).toBeChecked()
    expect(digestCheckbox).toBeChecked()

    await user.click(reminderCheckbox)
    expect(reminderCheckbox).not.toBeChecked()
  })

  it('opens delete account modal when clicking delete button', async () => {
    const user = userEvent.setup()
    renderPage()

    const deleteBtn = screen.getByRole('button', { name: /Xóa tài khoản/i })
    await user.click(deleteBtn)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('DELETE')).toBeInTheDocument()
  })
})
