import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StatsInsightsWidget } from './StatsInsightsWidget'

vi.mock('@/i18n', () => ({
  useI18n: () => ({ t: (key: string, params?: Record<string, number>) => ({
    'dashboard.statsApiTitle': 'Learning insights',
    'dashboard.statsApiDescription': 'Calculated by the local statistics API.',
    'dashboard.statsApiLoading': 'Loading learning insights…',
    'dashboard.statsApiError': 'Learning insights are temporarily unavailable.',
    'dashboard.statsApiEmpty': 'Complete a study session to see insights.',
    'dashboard.currentStreak': 'Current streak',
    'dashboard.longestStreak': 'Longest streak',
    'dashboard.sessionsLast30Days': 'Sessions (30 days)',
    'dashboard.rememberedRatio': 'Remembered ratio',
    'dashboard.dayCount': `${params?.count ?? 0} days`,
  }[key] ?? key) }),
}))

describe('StatsInsightsWidget', () => {
  it('renders loading, error and empty states', () => {
    const { rerender } = render(<StatsInsightsWidget isLoading />)
    expect(screen.getByText('Loading learning insights…')).toBeInTheDocument()

    rerender(<StatsInsightsWidget error={new Error('secret backend detail')} />)
    expect(screen.getByText('Learning insights are temporarily unavailable.')).toBeInTheDocument()
    expect(screen.queryByText('secret backend detail')).not.toBeInTheDocument()

    rerender(<StatsInsightsWidget data={{
      currentStreak: { currentStreakDays: 0, longestStreakDays: 0, lastStudyDate: null },
      activity: {
        days: 30, from: '2026-06-24', to: '2026-07-23', totalSessions: 0, totalCards: 0,
        viewedCards: 0, rememberedCount: 0, difficultCount: 0, rememberedRatio: 0,
      },
    }} />)
    expect(screen.getByText('Complete a study session to see insights.')).toBeInTheDocument()
  })

  it('renders the current streak and 30-day activity summary', () => {
    render(<StatsInsightsWidget data={{
      currentStreak: { currentStreakDays: 4, longestStreakDays: 9, lastStudyDate: '2026-07-23' },
      activity: {
        days: 30, from: '2026-06-24', to: '2026-07-23', totalSessions: 8, totalCards: 90,
        viewedCards: 82, rememberedCount: 70, difficultCount: 12, rememberedRatio: 0.8537,
      },
    }} />)

    expect(screen.getByText('4 days')).toBeInTheDocument()
    expect(screen.getByText('9 days')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('85%')).toBeInTheDocument()
  })
})
