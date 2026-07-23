import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { useI18n } from '@/i18n'
import type { DashboardInsights } from '@/services/stats/statsApi.types'

interface StatsInsightsWidgetProps {
  data?: DashboardInsights
  error?: Error | null
  isLoading?: boolean
}

export function StatsInsightsWidget({ data, error, isLoading = false }: StatsInsightsWidgetProps) {
  const { t } = useI18n()

  return (
    <Card className="mt-6">
      <CardTitle>{t('dashboard.statsApiTitle')}</CardTitle>
      <CardDescription className="mt-2">{t('dashboard.statsApiDescription')}</CardDescription>
      {isLoading ? <p className="mt-4 rounded-md border-2 border-border bg-muted p-3 font-black">{t('dashboard.statsApiLoading')}</p> : null}
      {error ? <p className="mt-4 rounded-md border-2 border-border bg-danger/10 p-3 font-black text-danger">{t('dashboard.statsApiError')}</p> : null}
      {!isLoading && !error && data?.activity.totalSessions === 0 ? (
        <p className="mt-4 rounded-md border-2 border-border bg-muted p-3 font-black text-muted-foreground">{t('dashboard.statsApiEmpty')}</p>
      ) : null}
      {!isLoading && !error && data && data.activity.totalSessions > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Insight label={t('dashboard.currentStreak')} value={t('dashboard.dayCount', { count: data.currentStreak.currentStreakDays })} />
          <Insight label={t('dashboard.longestStreak')} value={t('dashboard.dayCount', { count: data.currentStreak.longestStreakDays })} />
          <Insight label={t('dashboard.sessionsLast30Days')} value={data.activity.totalSessions} />
          <Insight label={t('dashboard.rememberedRatio')} value={`${Math.round(data.activity.rememberedRatio * 100)}%`} />
        </div>
      ) : null}
    </Card>
  )
}

function Insight({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border-2 border-border bg-muted p-3">
      <p className="text-xs font-black uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  )
}
