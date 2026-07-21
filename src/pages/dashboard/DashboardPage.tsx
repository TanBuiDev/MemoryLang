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
