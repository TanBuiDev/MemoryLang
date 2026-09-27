import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  BOSS_BATTLE_THEMES,
  FALLBACK_BOSS,
  FALLBACK_BOSS_BACKGROUND,
} from '@/features/games/mission/bossBattleThemes'
import { authService } from '@/services/supabase/auth.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { LandingPage } from './LandingPage'

const scrollIntoViewMock = vi.fn()

describe('LandingPage', () => {
  beforeEach(() => {
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoViewMock,
    })
    scrollIntoViewMock.mockClear()
    useAuthStore.setState({
      session: null,
      user: null,
      profile: null,
      loading: false,
    })
  })

  it('renders the completed homepage sections and scrolls navigation to each target', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'Tính năng' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đấu Boss RPG' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gia sư AI' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hệ sinh thái' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Học Từ Vựng Qua Chiến Dịch & Đấu Boss RPG' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Hỏi đáp & Tra cứu tức thì với Gia sư AI 24/7' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Tất cả công cụ bạn cần để làm chủ Tiếng Anh' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Học không giới hạn cùng MemoryLang Pro' })).toBeInTheDocument()
    expect(screen.getAllByTestId('homepage-mascot-art')).toHaveLength(1)
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()

    const navigationTargets = [
      { button: 'Tính năng', sectionId: 'features' },
      { button: 'Đấu Boss RPG', sectionId: 'mission-game' },
      { button: 'Gia sư AI', sectionId: 'ai-tutor' },
      { button: 'Hệ sinh thái', sectionId: 'pillars' },
    ]

    for (const target of navigationTargets) {
      const section = document.getElementById(target.sectionId)
      expect(section).not.toBeNull()

      await user.click(screen.getByRole('button', { name: target.button }))

      expect(scrollIntoViewMock.mock.instances.at(-1)).toBe(section)
      expect(scrollIntoViewMock).toHaveBeenLastCalledWith({ behavior: 'smooth', block: 'start' })
    }
  })

  it('shows guest actions when the user is not authenticated', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Đăng nhập' })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: 'Đăng ký Miễn phí ✨' })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: /Đăng ký Học Miễn Phí/ })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: 'Trải nghiệm Demo 🚀' })).toHaveAttribute('href', '/app/dashboard')
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
    expect(screen.queryByRole('link', { name: 'Đăng ký Miễn phí ✨' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Vào tổng quan' })).toHaveAttribute('href', '/app/dashboard')
    expect(screen.getByRole('link', { name: /Vào Bảng Điều Khiển/ })).toHaveAttribute('href', '/app/dashboard')
    await user.click(screen.getByRole('button', { name: 'Đăng xuất' }))
    expect(signOutSpy).toHaveBeenCalledTimes(1)
    signOutSpy.mockRestore()
  })

  it('switches between 4 boss battle themes and falls back gracefully when images error', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    )

    // Check all 4 themes can be selected and display the right boss
    for (const theme of BOSS_BATTLE_THEMES) {
      const tabButton = screen.getByRole('button', { name: new RegExp(theme.name) })
      await user.click(tabButton)

      const bossImg = screen.getByAltText(theme.boss.name) as HTMLImageElement
      expect(bossImg).toBeInTheDocument()
      expect(bossImg.src).toContain(theme.boss.image)

      const bgImg = screen.getByAltText(theme.name) as HTMLImageElement
      expect(bgImg).toBeInTheDocument()
      expect(bgImg.src).toContain(theme.background.desktop)
    }

    // Verify onError fallback for boss image
    const currentBoss = BOSS_BATTLE_THEMES[BOSS_BATTLE_THEMES.length - 1].boss
    const bossImg = screen.getByAltText(currentBoss.name) as HTMLImageElement
    fireEvent.error(bossImg)
    expect(bossImg.src).toContain(FALLBACK_BOSS.states.idle)

    // Verify onError fallback for background image
    const currentTheme = BOSS_BATTLE_THEMES[BOSS_BATTLE_THEMES.length - 1]
    const bgImg = screen.getByAltText(currentTheme.name) as HTMLImageElement
    fireEvent.error(bgImg)
    expect(bgImg.src).toContain(FALLBACK_BOSS_BACKGROUND)
  })
})

