import { supabase } from '@/services/supabase/client'
import type { ActivitySummary, CurrentStreak, DashboardInsights } from './statsApi.types'

const statsApiUrl = (import.meta.env.VITE_STATS_API_URL || '').trim().replace(/\/+$/, '')

export const isStatsApiConfigured = Boolean(statsApiUrl)

export class StatsApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'StatsApiError'
    this.status = status
  }
}

async function currentAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.access_token) {
    throw new StatsApiError('Authentication is required', 401)
  }
  return data.session.access_token
}

async function request<T>(path: string, retryAfterRefresh = true): Promise<T> {
  if (!isStatsApiConfigured) {
    throw new StatsApiError('Statistics API is not configured', 0)
  }

  const token = await currentAccessToken()
  const response = await fetch(`${statsApiUrl}${path}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  })

  if (response.status === 401 && retryAfterRefresh) {
    const { data, error } = await supabase.auth.refreshSession()
    if (error || !data.session?.access_token) {
      throw new StatsApiError('Authentication is required', 401)
    }
    const retriedResponse = await fetch(`${statsApiUrl}${path}`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${data.session.access_token}` },
    })
    if (!retriedResponse.ok) throw new StatsApiError('Statistics API request failed', retriedResponse.status)
    return retriedResponse.json() as Promise<T>
  }

  if (!response.ok) throw new StatsApiError('Statistics API request failed', response.status)
  return response.json() as Promise<T>
}

export const statsApiService = {
  getCurrentStreak: () => request<CurrentStreak>('/api/v1/streaks/current'),
  getActivitySummary: (days = 30) => request<ActivitySummary>(`/api/v1/activity/summary?days=${days}`),
  async getDashboardInsights(): Promise<DashboardInsights> {
    const [currentStreak, activity] = await Promise.all([
      this.getCurrentStreak(),
      this.getActivitySummary(30),
    ])
    return { currentStreak, activity }
  },
}
