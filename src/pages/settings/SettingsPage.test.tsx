import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultStudyHotkeys } from '@/features/study/studyHotkeys'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { useAuthStore } from '@/stores/useAuthStore'
import { useStudyStore } from '@/stores/useStudyStore'

vi.mock('@/services/supabase/client', () => ({
  isSupabaseConfigured: false,
}))

vi.mock('@/services/supabase/auth.service', () => ({
  authService: {
    updateProfile: vi.fn(),
    setPassword: vi.fn(),
    signOutAllDevices: vi.fn(),
  },
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  )
}

describe('SettingsPage study hotkeys', () => {
  beforeEach(() => {
    window.localStorage.clear()
    useAuthStore.setState({ user: null, profile: null })
    useStudyStore.setState({ hotkeys: defaultStudyHotkeys })
  })

  it('captures shortcuts and prevents saving duplicate assignments', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(screen.getByText('Phím tắt khi học')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mở rộng phím tắt' }))
    const confirmCapture = screen.getByRole('button', { name: /Gán phím.*Đã nhớ/ })
    const rememberCapture = screen.getByRole('button', { name: /Gán phím.*Nhớ$/ })

    await user.click(confirmCapture)
    fireEvent.keyDown(confirmCapture, { key: 'r' })
    expect(confirmCapture).toHaveTextContent('R')

    await user.click(rememberCapture)
    fireEvent.keyDown(rememberCapture, { key: 'r' })

    expect(screen.getByText('Phím tắt đang bị trùng. Hãy chọn phím khác trước khi lưu.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lưu cài đặt' })).toBeDisabled()
  })

  it('resets configured shortcuts to their defaults before saving', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Mở rộng phím tắt' }))
    const confirmCapture = screen.getByRole('button', { name: /Gán phím.*Đã nhớ/ })

    await user.click(confirmCapture)
    fireEvent.keyDown(confirmCapture, { key: 'r', ctrlKey: true })
    expect(confirmCapture).toHaveTextContent('Ctrl + R')
    await user.click(screen.getByRole('button', { name: 'Khôi phục mặc định' }))

    expect(confirmCapture).toHaveTextContent('Space')

    await user.click(confirmCapture)
    fireEvent.keyDown(confirmCapture, { key: 'r', ctrlKey: true })
    await user.click(screen.getByRole('button', { name: 'Lưu cài đặt' }))

    expect(useStudyStore.getState().hotkeys.confirmRemember).toBe('Ctrl+R')
  })
})
