export interface CurrentStreak {
  currentStreakDays: number
  longestStreakDays: number
  lastStudyDate: string | null
}

export interface ActivitySummary {
  days: number
  from: string
  to: string
  totalSessions: number
  totalCards: number
  viewedCards: number
  rememberedCount: number
  difficultCount: number
  rememberedRatio: number
}

export interface DashboardInsights {
  currentStreak: CurrentStreak
  activity: ActivitySummary
}

export interface StatsApiHealth {
  status: string
  groups: string[]
}

export interface ApiErrorResponse {
  timestamp: string
  status: number
  code: string
  message: string
  path: string
  requestId: string
}
