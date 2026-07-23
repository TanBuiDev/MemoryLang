import {
  Activity,
  Brain,
  CalendarDays,
  Flame,
  Layers3,
  Percent,
  ServerOff,
  Trophy,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { useI18n } from '@/i18n'
import type { DashboardInsights } from '@/services/stats/statsApi.types'

interface StatsInsightsWidgetProps {
  data?: DashboardInsights
  error?: Error | null
  isConfigured?: boolean
  isLoading?: boolean
}

export function StatsInsightsWidget({
  data,
  error,
  isConfigured = true,
  isLoading = false,
}: StatsInsightsWidgetProps) {
  const { t } = useI18n()
  const hasSessions = Boolean(data && data.activity.totalSessions > 0)

  const insights = data
    ? [
        {
          label: t('dashboard.currentStreak'),
          value: t('dashboard.dayCount', { count: data.currentStreak.currentStreakDays }),
          icon: Flame,
          color: 'bg-amber-100 text-amber-950',
        },
        {
          label: t('dashboard.longestStreak'),
          value: t('dashboard.dayCount', { count: data.currentStreak.longestStreakDays }),
          icon: Trophy,
          color: 'bg-purple-100 text-purple-950',
        },
        {
          label: t('dashboard.sessionsLast30Days'),
          value: data.activity.totalSessions,
          icon: CalendarDays,
          color: 'bg-sky-100 text-sky-950',
        },
        {
          label: t('dashboard.cardsLast30Days'),
          value: data.activity.totalCards,
          icon: Layers3,
          color: 'bg-cyan-100 text-cyan-950',
        },
        {
          label: t('dashboard.rememberedCards'),
          value: data.activity.rememberedCount,
          icon: Brain,
          color: 'bg-emerald-100 text-emerald-950',
        },
        {
          label: t('dashboard.rememberedRatio'),
          value: `${Math.round(data.activity.rememberedRatio * 100)}%`,
          icon: Percent,
          color: 'bg-lime-100 text-lime-950',
        },
      ]
    : []

  return (
    <Card className="relative overflow-hidden border-3 border-slate-900 bg-white p-5 shadow-[5px_5px_0px_0px_#000] sm:p-6">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full border-3 border-slate-900 bg-[#fdc800]/20" />

      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-purple-700" />
            <h2 className="text-xl font-black text-slate-900 sm:text-2xl">{t('dashboard.statsApiTitle')}</h2>
          </div>
          <p className="mt-1 max-w-2xl text-sm font-semibold text-slate-600">
            {t('dashboard.statsApiDescription')}
          </p>
        </div>
        <Badge className="w-fit border-2 border-slate-900 bg-[#fdc800] px-3 py-1 font-black text-slate-900 shadow-[2px_2px_0px_0px_#000]">
          {t('dashboard.last30Days')}
        </Badge>
      </div>

      {!isConfigured ? (
        <StatusMessage icon={ServerOff} tone="muted">
          {t('dashboard.statsApiNotConfigured')}
        </StatusMessage>
      ) : null}

      {isConfigured && isLoading ? (
        <StatusMessage icon={Activity} tone="loading">
          {t('dashboard.statsApiLoading')}
        </StatusMessage>
      ) : null}

      {isConfigured && error ? (
        <StatusMessage icon={ServerOff} tone="error">
          {t('dashboard.statsApiError')}
        </StatusMessage>
      ) : null}

      {isConfigured && !isLoading && !error && data && !hasSessions ? (
        <StatusMessage icon={CalendarDays} tone="muted">
          {t('dashboard.statsApiEmpty')}
        </StatusMessage>
      ) : null}

      {insights.length > 0 ? (
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {insights.map((insight) => (
            <Insight key={insight.label} {...insight} />
          ))}
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <PlaceholderInsight label={t('dashboard.sessionsLast30Days')} />
          <PlaceholderInsight label={t('dashboard.cardsLast30Days')} />
          <PlaceholderInsight label={t('dashboard.currentStreak')} />
          <PlaceholderInsight label={t('dashboard.rememberedRatio')} />
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 border-t-2 border-dashed border-slate-300 pt-3 text-xs font-bold text-slate-500">
        <CalendarDays className="h-4 w-4" />
        <span>
          {t('dashboard.lastStudyDate')}:{' '}
          <strong className="text-slate-800">
            {data?.currentStreak.lastStudyDate
              ? formatStudyDate(data.currentStreak.lastStudyDate)
              : t('dashboard.noStudyDate')}
          </strong>
        </span>
      </div>
    </Card>
  )
}

function Insight({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: string | number
  icon: typeof Activity
  color: string
}) {
  return (
    <div className={`rounded-xl border-2 border-slate-900 p-3 shadow-[3px_3px_0px_0px_#000] ${color}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-wide sm:text-xs">{label}</p>
        <Icon className="h-4 w-4 shrink-0" />
      </div>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  )
}

function PlaceholderInsight({ label }: { label: string }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-slate-400 bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500 sm:text-xs">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-400">—</p>
    </div>
  )
}

function StatusMessage({
  children,
  icon: Icon,
  tone,
}: {
  children: string
  icon: typeof Activity
  tone: 'error' | 'loading' | 'muted'
}) {
  const toneClass = {
    error: 'border-rose-500 bg-rose-100 text-rose-950',
    loading: 'border-purple-500 bg-purple-100 text-purple-950',
    muted: 'border-slate-400 bg-slate-100 text-slate-700',
  }[tone]

  return (
    <div className={`mt-4 flex items-center gap-2 rounded-xl border-2 p-3 font-bold ${toneClass}`}>
      <Icon className="h-5 w-5 shrink-0" />
      <p>{children}</p>
    </div>
  )
}

function formatStudyDate(date: string): string {
  const [year, month, day] = date.split('-')
  return year && month && day ? `${day}/${month}/${year}` : date
}
