import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { demoDecks, demoVocabulary } from '@/features/demo/demoData'
import { useI18n } from '@/i18n'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { deckService } from '@/services/supabase/deck.service'
import { statisticsService } from '@/services/supabase/statistics.service'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { filterActiveVocabulary } from '@/utils/vocabulary'
import { isStatsApiConfigured, statsApiService } from '@/services/stats/statsApi.service'
import { StatsInsightsWidget } from './StatsInsightsWidget'
import { soundEffects } from '@/utils/soundEffects'
import {
  BookOpen,
  Clock,
  CheckCircle2,
  Target,
  Sparkles,
  Zap,
  Plus,
  Layers,
  AlertTriangle,
  ChevronRight,
  ArrowRight,
  BarChart3,
  PieChart,
  TrendingUp,
  Activity,
} from 'lucide-react'

export function DashboardPage() {
  const profile = useAuthStore((state) => state.profile)
  const user = useAuthStore((state) => state.user)
  const { t } = useI18n()
  const shouldUseRemoteData = isSupabaseConfigured && Boolean(user)

  const vocabularyQuery = useQuery({
    queryKey: ['vocabulary', user?.id],
    queryFn: () => vocabularyService.list(user!.id),
    enabled: shouldUseRemoteData,
  })

  const decksQuery = useQuery({
    queryKey: ['decks', user?.id],
    queryFn: () => deckService.list(user!.id),
    enabled: shouldUseRemoteData,
  })

  const statsQuery = useQuery({
    queryKey: ['statistics', user?.id],
    queryFn: () => statisticsService.getDashboardStats(user!.id),
    enabled: shouldUseRemoteData,
  })
  const statsApiQuery = useQuery({
    queryKey: ['stats-api', 'dashboard-insights', user?.id],
    queryFn: () => statsApiService.getDashboardInsights(),
    enabled: shouldUseRemoteData && isStatsApiConfigured,
  })

  const vocabulary = useMemo(
    () => filterActiveVocabulary(shouldUseRemoteData ? vocabularyQuery.data ?? [] : demoVocabulary),
    [shouldUseRemoteData, vocabularyQuery.data],
  )

  const decks = useMemo(
    () => (shouldUseRemoteData ? decksQuery.data ?? [] : demoDecks),
    [decksQuery.data, shouldUseRemoteData],
  )

  const total = vocabulary.length
  const reviewDue = vocabulary.filter(
    (item) => item.next_review_at && new Date(item.next_review_at) <= new Date()
  ).length
  const memorized = vocabulary.filter((item) => item.status === 'memorized').length
  const difficult = vocabulary.filter((item) => item.status === 'difficult').length
  const totalAnswers = vocabulary.reduce((sum, item) => sum + item.correct_count + item.wrong_count, 0)
  const totalCorrect = vocabulary.reduce((sum, item) => sum + item.correct_count, 0)
  const demoAccuracy = totalAnswers ? Math.round((totalCorrect / totalAnswers) * 100) : 0

  const stats = shouldUseRemoteData
    ? statsQuery.data ?? { totalVocabulary: total, averageAccuracy: 0, deckCount: decks.length, quizCount: 0 }
    : { totalVocabulary: total, averageAccuracy: demoAccuracy, deckCount: decks.length, quizCount: 0 }

  const wordsReviewedToday = vocabulary.filter((item) => {
    if (!item.last_reviewed_at) return false
    return new Date(item.last_reviewed_at).toDateString() === new Date().toDateString()
  }).length

  const dailyGoal = profile?.daily_goal ?? 10
  const dailyProgress = dailyGoal ? Math.min(100, Math.round((wordsReviewedToday / dailyGoal) * 100)) : 0
  const learning = vocabulary.filter((item) => item.status === 'learning' || item.status === 'familiar').length
  const newWords = vocabulary.filter((item) => item.status === 'new').length

  const hardList = [...vocabulary]
    .filter((item) => item.status === 'difficult' || item.wrong_count > 0)
    .sort((a, b) => b.wrong_count - a.wrong_count)
    .slice(0, 5)

  const isLoading = shouldUseRemoteData && (vocabularyQuery.isLoading || decksQuery.isLoading || statsQuery.isLoading)
  const error =
    vocabularyQuery.error instanceof Error
      ? vocabularyQuery.error.message
      : decksQuery.error instanceof Error
      ? decksQuery.error.message
      : statsQuery.error instanceof Error
      ? statsQuery.error.message
      : null

  const handleCardClick = () => {
    soundEffects.play('cardClick')
  }

  // 7-day review history calculation for SVG Bar Chart
  const last7Days = useMemo(() => {
    const days = []
    const today = new Date()
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const dateStr = d.toDateString()
      const dayShort = i === 0 ? 'Hôm nay' : dayNames[d.getDay()]

      const count = vocabulary.filter((item) => {
        if (!item.last_reviewed_at) return false
        return new Date(item.last_reviewed_at).toDateString() === dateStr
      }).length

      days.push({ dayShort, count, isToday: i === 0 })
    }
    return days
  }, [vocabulary])

  const max7DayCount = useMemo(() => {
    const max = Math.max(...last7Days.map((d) => d.count), 5)
    return max
  }, [last7Days])

  // Donut Chart calculations
  const donutSegments = useMemo(() => {
    const safeTotal = total || 1
    const parts = [
      { label: 'Từ mới', count: newWords, color: '#38bdf8', bgClass: 'bg-sky-400' },
      { label: 'Đang học', count: learning, color: '#facc15', bgClass: 'bg-amber-400' },
      { label: 'Từ khó', count: difficult, color: '#f43f5e', bgClass: 'bg-rose-500' },
      { label: 'Đã ghi nhớ', count: memorized, color: '#34d399', bgClass: 'bg-emerald-400' },
    ]

    const radius = 38
    const circumference = 2 * Math.PI * radius
    let accumulatedPercent = 0

    return parts.map((part) => {
      const percent = part.count / safeTotal
      const strokeDasharray = `${percent * circumference} ${circumference}`
      const strokeDashoffset = -accumulatedPercent * circumference
      accumulatedPercent += percent

      return {
        ...part,
        percent: Math.round(percent * 100),
        strokeDasharray,
        strokeDashoffset,
      }
    })
  }, [total, newWords, learning, difficult, memorized])

  const masteryRate = total ? Math.round((memorized / total) * 100) : 0

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Hero Welcome Banner */}
      <div className="neo-card p-6 sm:p-8 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_#000] rounded-2xl relative overflow-hidden space-y-4">
        <div className="flex items-center gap-2">
          <Badge className="bg-[#fdc800] text-slate-900 border-2 border-slate-900 font-black px-3 py-1 shadow-[2px_2px_0px_0px_#000]">
            🔥 Lộ Trình Học Hôm Nay
          </Badge>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
              {t('dashboard.welcome')}{profile?.display_name ? `, ${profile.display_name} 👋` : ' 👋'}
            </h1>
            <p className="text-slate-600 text-sm sm:text-base font-semibold">
              {t('dashboard.description')}
            </p>
          </div>

          <Link
            to="/app/study"
            onClick={handleCardClick}
            className="neo-button bg-[#fdc800] hover:bg-amber-300 text-slate-900 font-black text-sm sm:text-base px-6 py-3.5 border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-xl flex items-center justify-center gap-2.5 active:neo-button-active shrink-0 transition-all"
          >
            <span>{t('actions.startStudy')}</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="p-5 bg-white border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-2xl text-center font-black text-slate-900">
          {t('vocabulary.loading')}
        </div>
      ) : null}

      {error ? (
        <div className="p-5 bg-rose-100 border-3 border-rose-500 text-rose-950 shadow-[4px_4px_0px_0px_#000] rounded-2xl font-black">
          {error}
        </div>
      ) : null}

      {shouldUseRemoteData ? (
        <StatsInsightsWidget
          data={statsApiQuery.data}
          error={statsApiQuery.error}
          isConfigured={isStatsApiConfigured}
          isLoading={statsApiQuery.isLoading}
        />
      ) : null}

      {/* 4 Main Stat Tiles Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Vocabulary */}
        <div className="neo-card p-4 sm:p-5 bg-purple-100 border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-purple-950">
              {t('dashboard.totalVocabulary')}
            </span>
            <BookOpen className="w-5 h-5 text-purple-800 shrink-0" />
          </div>
          <div className="text-2xl sm:text-4xl font-black text-purple-950">{total}</div>
        </div>

        {/* Review Due */}
        <div className="neo-card p-4 sm:p-5 bg-rose-100 border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-rose-950">
              {t('dashboard.reviewDue')}
            </span>
            <Clock className="w-5 h-5 text-rose-700 shrink-0" />
          </div>
          <div className="text-2xl sm:text-4xl font-black text-rose-950">{reviewDue}</div>
        </div>

        {/* Memorized */}
        <div className="neo-card p-4 sm:p-5 bg-emerald-100 border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-950">
              {t('dashboard.memorized')}
            </span>
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
          </div>
          <div className="text-2xl sm:text-4xl font-black text-emerald-950">{memorized}</div>
        </div>

        {/* Accuracy */}
        <div className="neo-card p-4 sm:p-5 bg-amber-100 border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-950">
              {t('statistics.accuracy')}
            </span>
            <Target className="w-5 h-5 text-amber-800 shrink-0" />
          </div>
          <div className="text-2xl sm:text-4xl font-black text-amber-950">{stats.averageAccuracy}%</div>
        </div>
      </div>

      {/* CHARTS SECTION: 7-Day Bar Chart & Donut Chart */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5">
        {/* 1. 7-Day Review Trend SVG Bar Chart */}
        <div className="neo-card p-5 sm:p-6 bg-white border-3 border-slate-900 shadow-[5px_5px_0px_0px_#000] rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-700" />
              <span>Xu Hướng Ôn Tập 7 Ngày Qua</span>
            </h2>
            <Badge className="bg-purple-100 text-purple-950 border border-slate-900 font-bold text-xs">
              <TrendingUp className="w-3.5 h-3.5 mr-1 text-purple-700" />
              {wordsReviewedToday} từ hôm nay
            </Badge>
          </div>

          <div className="pt-2">
            <div className="h-44 flex items-end justify-between gap-2 border-b-2 border-slate-900 pb-2 px-1 relative">
              {/* Background grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 border-t border-dashed border-slate-900">
                <div className="border-b border-dashed border-slate-900 w-full" />
                <div className="border-b border-dashed border-slate-900 w-full" />
                <div className="border-b border-dashed border-slate-900 w-full" />
              </div>

              {last7Days.map((item, idx) => {
                const heightPercent = max7DayCount ? Math.max(12, Math.round((item.count / max7DayCount) * 100)) : 12

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 z-10 h-full justify-end group">
                    <span className="text-[11px] font-black text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.count} từ
                    </span>
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full max-w-[36px] border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-t-lg transition-all duration-300 group-hover:scale-105 ${
                        item.isToday
                          ? 'bg-purple-600 border-purple-950'
                          : 'bg-[#fdc800] hover:bg-amber-300'
                      }`}
                    />
                    <span
                      className={`text-xs font-black mt-1.5 ${
                        item.isToday ? 'text-purple-700 underline' : 'text-slate-600'
                      }`}
                    >
                      {item.dayShort}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 2. Vocabulary Status Donut SVG Chart & Mastery Ratio */}
        <div className="neo-card p-5 sm:p-6 bg-white border-3 border-slate-900 shadow-[5px_5px_0px_0px_#000] rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-amber-500" />
              <span>Phân Phối Trạng Thái Từ Vựng</span>
            </h2>
            <span className="text-xs font-black bg-emerald-100 text-emerald-950 border border-slate-900 px-2.5 py-1 rounded-full">
              {masteryRate}% Đã làm chủ
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 pt-1">
            {/* SVG Donut Chart */}
            <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="16"
                />
                {total > 0 &&
                  donutSegments.map((seg, i) => (
                    <circle
                      key={i}
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke={seg.color}
                      strokeWidth="16"
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                      className="transition-all duration-500"
                    />
                  ))}
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-slate-900">{total}</span>
                <span className="text-[10px] font-bold uppercase text-slate-500">Từ vựng</span>
              </div>
            </div>

            {/* Status Legend */}
            <div className="grid grid-cols-2 gap-2.5 w-full">
              {donutSegments.map((seg, i) => (
                <div
                  key={i}
                  className="neo-card p-2.5 bg-slate-50 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-xl flex items-center gap-2"
                >
                  <div className={`w-3.5 h-3.5 rounded-full border border-slate-900 shrink-0 ${seg.bgClass}`} />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[11px] font-black text-slate-600 truncate">{seg.label}</span>
                    <span className="text-sm font-black text-slate-900">{seg.count} ({seg.percent}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Vocabulary Journey Flow Diagram */}
      <div className="neo-card p-5 sm:p-6 bg-white border-3 border-slate-900 shadow-[5px_5px_0px_0px_#000] rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" />
            <span>Sơ Đồ Hành Trình Học Từ Vựng</span>
          </h2>
          <span className="text-xs font-bold text-slate-500">Chu trình ghi nhớ SR</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 relative pt-2">
          {/* Step 1 */}
          <div className="neo-card p-4 bg-sky-50 border-2 border-slate-900 shadow-[3px_3px_0px_0px_#000] rounded-xl space-y-2 relative">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-full bg-sky-400 border border-slate-900 text-slate-900 font-black text-xs flex items-center justify-center">
                1
              </span>
              <Badge className="bg-sky-200 text-sky-950 font-bold border border-slate-900 text-[10px]">
                {newWords} từ
              </Badge>
            </div>
            <h3 className="font-black text-sm text-slate-900">1. Nạp Từ Mới</h3>
            <p className="text-xs font-semibold text-slate-600">
              Từ mới được thêm vào hệ thống và bắt đầu phiên học flashcards đầu tiên.
            </p>
          </div>

          {/* Step 2 */}
          <div className="neo-card p-4 bg-amber-50 border-2 border-slate-900 shadow-[3px_3px_0px_0px_#000] rounded-xl space-y-2 relative">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-full bg-amber-400 border border-slate-900 text-slate-900 font-black text-xs flex items-center justify-center">
                2
              </span>
              <Badge className="bg-amber-200 text-amber-950 font-bold border border-slate-900 text-[10px]">
                {learning} từ
              </Badge>
            </div>
            <h3 className="font-black text-sm text-slate-900">2. Đang Luyện Tập</h3>
            <p className="text-xs font-semibold text-slate-600">
              Lặp lại ngắt quãng (Spaced Repetition) giúp khắc sâu nghĩa và cách dùng.
            </p>
          </div>

          {/* Step 3 */}
          <div className="neo-card p-4 bg-rose-50 border-2 border-slate-900 shadow-[3px_3px_0px_0px_#000] rounded-xl space-y-2 relative">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-full bg-rose-400 border border-slate-900 text-white font-black text-xs flex items-center justify-center">
                3
              </span>
              <Badge className="bg-rose-200 text-rose-950 font-bold border border-slate-900 text-[10px]">
                {difficult} từ
              </Badge>
            </div>
            <h3 className="font-black text-sm text-slate-900">3. Từ Khó Cần Chú Ý</h3>
            <p className="text-xs font-semibold text-slate-600">
              Các từ làm sai nhiều lần được ưu tiên ôn tập dồn dập trong game & quiz.
            </p>
          </div>

          {/* Step 4 */}
          <div className="neo-card p-4 bg-emerald-50 border-2 border-slate-900 shadow-[3px_3px_0px_0px_#000] rounded-xl space-y-2 relative">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-full bg-emerald-400 border border-slate-900 text-slate-900 font-black text-xs flex items-center justify-center">
                4
              </span>
              <Badge className="bg-emerald-200 text-emerald-950 font-bold border border-slate-900 text-[10px]">
                {memorized} từ
              </Badge>
            </div>
            <h3 className="font-black text-sm text-slate-900">4. Đã Làm Chủ 🏆</h3>
            <p className="text-xs font-semibold text-slate-600">
              Từ vựng đã đi vào trí nhớ dài hạn, đạt 100% độ chính xác phản xạ.
            </p>
          </div>
        </div>
      </div>

      {/* Daily Goal & Learning Health Section */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4 sm:gap-5">
        {/* Daily Goal Card */}
        <div className="neo-card p-5 sm:p-6 bg-white border-3 border-slate-900 shadow-[5px_5px_0px_0px_#000] rounded-2xl space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-500" />
                {t('dashboard.dailyGoal')}
              </h2>
              <span className="text-xs font-black bg-amber-100 text-amber-950 border border-slate-900 px-2.5 py-1 rounded-full">
                {dailyProgress}% Đạt mục tiêu
              </span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-600">
              {t('dashboard.dailyGoalProgress', { reviewed: wordsReviewedToday, goal: dailyGoal })}
            </p>
            <div className="pt-1">
              <Progress value={dailyProgress} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 pt-2">
            <Link
              to="/app/review"
              onClick={handleCardClick}
              className="neo-button py-2.5 px-4 bg-[#fdc800] hover:bg-amber-300 text-slate-900 font-black text-xs sm:text-sm border-2 border-slate-900 shadow-[3px_3px_0px_0px_#000] rounded-xl flex items-center gap-1.5 transition-all"
            >
              <Zap className="w-4 h-4" />
              <span>{t('actions.reviewToday')}</span>
            </Link>

            {profile?.is_admin && (
              <Link
                to="/app/vocabulary/new"
                onClick={handleCardClick}
                className="neo-button py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-900 font-black text-xs sm:text-sm border-2 border-slate-900 shadow-[3px_3px_0px_0px_#000] rounded-xl flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>{t('actions.addNewWord')}</span>
              </Link>
            )}
          </div>
        </div>

        {/* Learning Health Card */}
        <div className="neo-card p-5 sm:p-6 bg-white border-3 border-slate-900 shadow-[5px_5px_0px_0px_#000] rounded-2xl space-y-4">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-700" />
            {t('dashboard.learningHealth')}
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="neo-card p-3 sm:p-3.5 bg-slate-50 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-xl">
              <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-500">
                {t('dashboard.newWords')}
              </p>
              <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{newWords}</p>
            </div>

            <div className="neo-card p-3 sm:p-3.5 bg-slate-50 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-xl">
              <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-500">
                {t('dashboard.learningWords')}
              </p>
              <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{learning}</p>
            </div>

            <div className="neo-card p-3 sm:p-3.5 bg-slate-50 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-xl">
              <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-500">
                {t('dashboard.difficult')}
              </p>
              <p className="text-xl sm:text-2xl font-black text-rose-600 mt-1">{difficult}</p>
            </div>

            <div className="neo-card p-3 sm:p-3.5 bg-slate-50 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-xl">
              <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-500">
                {t('statistics.decks')}
              </p>
              <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{stats.deckCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress By Deck & Needs Attention Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5">
        {/* Recent Decks Progress Card */}
        <div className="neo-card p-5 sm:p-6 bg-white border-3 border-slate-900 shadow-[5px_5px_0px_0px_#000] rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-sky-600" />
              {t('statistics.progressByDeck')}
            </h2>
            <Link
              to="/app/decks"
              onClick={handleCardClick}
              className="text-xs font-black text-purple-700 hover:underline flex items-center gap-0.5"
            >
              <span>{t('nav.decks')}</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-3">
            {!isLoading && decks.length === 0 ? (
              <p className="p-3 bg-slate-50 border-2 border-slate-900 rounded-xl text-xs font-bold text-slate-600">
                {t('dashboard.noDecks')}
              </p>
            ) : null}

            {decks.slice(0, 5).map((deck) => {
              const progress = total ? Math.round(((deck.term_count ?? 0) / total) * 100) : 0
              return (
                <Link
                  key={deck.id}
                  to={`/app/decks/${deck.id}`}
                  onClick={handleCardClick}
                  className="block neo-card p-3.5 bg-slate-50 hover:bg-amber-50 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-xl transition-all space-y-2 group"
                >
                  <div className="flex justify-between items-center text-xs sm:text-sm font-black">
                    <span className="text-slate-900 group-hover:text-purple-700 transition-colors">
                      {deck.name}
                    </span>
                    <span className="text-slate-500 font-bold">
                      {t('dashboard.terms', { count: deck.term_count ?? 0 })}
                    </span>
                  </div>
                  <Progress value={progress} />
                </Link>
              )
            })}
          </div>
        </div>

        {/* Needs Attention / Difficult Terms Card */}
        <div className="neo-card p-5 sm:p-6 bg-white border-3 border-slate-900 shadow-[5px_5px_0px_0px_#000] rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              {t('dashboard.needsAttention')}
            </h2>
            <Link
              to="/app/vocabulary"
              onClick={handleCardClick}
              className="text-xs font-black text-purple-700 hover:underline flex items-center gap-0.5"
            >
              <span>{t('nav.vocabulary')}</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-3">
            {hardList.length === 0 ? (
              <p className="p-3 bg-slate-50 border-2 border-slate-900 rounded-xl text-xs font-bold text-slate-600">
                {t('dashboard.noDifficultWords')}
              </p>
            ) : null}

            {hardList.map((item) => (
              <Link
                key={item.id}
                to={`/app/vocabulary/${item.id}`}
                onClick={handleCardClick}
                className="flex items-center justify-between gap-3 neo-card p-3.5 bg-rose-50 hover:bg-rose-100 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-xl transition-all font-black text-xs sm:text-sm text-slate-900 group"
              >
                <span className="group-hover:text-rose-700 transition-colors">{item.source_text}</span>
                <span className="text-xs font-black bg-rose-200 text-rose-950 border border-slate-900 px-2 py-0.5 rounded-lg">
                  {t('dashboard.wrongCount', { count: item.wrong_count })}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
