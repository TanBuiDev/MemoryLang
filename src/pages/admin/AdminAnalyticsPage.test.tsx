import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminAnalyticsPage from '@/pages/admin/AdminAnalyticsPage'
import { adminService } from '@/services/supabase/admin.service'
import { statsApiService } from '@/services/stats/statsApi.service'

vi.mock('@/services/supabase/admin.service', () => ({
  adminService: {
    listFeatureFlags: vi.fn(),
    updateFeatureFlag: vi.fn(),
  },
}))

vi.mock('@/services/stats/statsApi.service', () => ({
  isStatsApiConfigured: true,
  statsApiService: {
    getHealth: vi.fn(),
    getDashboardInsights: vi.fn(),
  },
}))

const listFeatureFlags = vi.mocked(adminService.listFeatureFlags)
const updateFeatureFlag = vi.mocked(adminService.updateFeatureFlag)
const getHealth = vi.mocked(statsApiService.getHealth)
const getDashboardInsights = vi.mocked(statsApiService.getDashboardInsights)

describe('AdminAnalyticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listFeatureFlags.mockResolvedValue([{
      flag: 'learning_analytics_dashboard',
      enabled: false,
      description: 'Hiển thị phân tích học tập',
      updated_at: '2026-07-23T02:00:00.000Z',
    }])
    getHealth.mockResolvedValue({ status: 'UP', groups: ['liveness', 'readiness'] })
    getDashboardInsights.mockResolvedValue({
      currentStreak: { currentStreakDays: 2, longestStreakDays: 5, lastStudyDate: '2026-07-23' },
      activity: {
        days: 30,
        from: '2026-06-24',
        to: '2026-07-23',
        totalSessions: 8,
        totalCards: 90,
        viewedCards: 82,
        rememberedCount: 70,
        difficultCount: 12,
        rememberedRatio: 0.85,
      },
    })
    updateFeatureFlag.mockResolvedValue({
      flag: 'learning_analytics_dashboard',
      enabled: true,
      description: 'Hiển thị phân tích học tập',
      updated_at: '2026-07-23T03:00:00.000Z',
    })
  })

  it('shows visibility and Java API monitoring status', async () => {
    render(<AdminAnalyticsPage />)

    expect(await screen.findByText('ĐANG ẨN')).toBeInTheDocument()
    expect(await screen.findByText('UP')).toBeInTheDocument()
    expect(await screen.findByText('8 phiên')).toBeInTheDocument()
    expect(screen.getByText('90 thẻ')).toBeInTheDocument()
  })

  it('lets an admin show learning analytics for learners', async () => {
    render(<AdminAnalyticsPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Hiện cho người học' }))

    await waitFor(() => {
      expect(updateFeatureFlag).toHaveBeenCalledWith(
        'learning_analytics_dashboard',
        true,
        expect.any(String),
      )
    })
    expect(await screen.findByText('ĐANG HIỆN')).toBeInTheDocument()
  })
})
