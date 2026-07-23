import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  refreshSession: vi.fn(),
}))

vi.mock('@/services/supabase/client', () => ({ supabase: { auth } }))

describe('statsApiService', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.stubEnv('VITE_STATS_API_URL', 'http://localhost:8080/')
    auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'current-token' } },
      error: null,
    })
  })

  it('uses the current Supabase token without exposing it in the URL', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        currentStreakDays: 4,
        longestStreakDays: 9,
        lastStudyDate: '2026-07-23',
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        days: 30,
        from: '2026-06-24',
        to: '2026-07-23',
        totalSessions: 8,
        totalCards: 90,
        viewedCards: 82,
        rememberedCount: 70,
        difficultCount: 12,
        rememberedRatio: 0.8537,
      }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const { statsApiService } = await import('./statsApi.service')
    const result = await statsApiService.getDashboardInsights()

    expect(result.currentStreak.currentStreakDays).toBe(4)
    expect(result.activity.totalSessions).toBe(8)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/streaks/current',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer current-token' }) }),
    )
    expect(fetchMock.mock.calls[0][0]).not.toContain('current-token')
  })

  it('refreshes through Supabase once after a 401 and retries with the refreshed token', async () => {
    auth.refreshSession.mockResolvedValue({
      data: { session: { access_token: 'refreshed-token' } },
      error: null,
    })
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        currentStreakDays: 1, longestStreakDays: 2, lastStudyDate: null,
      }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const { statsApiService } = await import('./statsApi.service')
    await statsApiService.getCurrentStreak()

    expect(auth.refreshSession).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenLastCalledWith(
      'http://localhost:8080/api/v1/streaks/current',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer refreshed-token' }) }),
    )
  })

  it('fails before making a request when no authenticated session exists', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { StatsApiError, statsApiService } = await import('./statsApi.service')

    await expect(statsApiService.getCurrentStreak()).rejects.toBeInstanceOf(StatsApiError)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
