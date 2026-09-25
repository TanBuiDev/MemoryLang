import {
  CheckCircle2,
  ListChecks,
  RotateCcw,
  BookOpen,
  Star,
  Trophy,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Volume2,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AnswerRecord, GameTerm } from '../mission.types'

interface MissionResultViewProps {
  missionNumber: number
  result: {
    score: number
    accuracy: number
    firstTryAccuracy: number
  }
  syncing: boolean
  synced: boolean
  error: string | null
  hasNextMission: boolean
  onRetrySync: () => void
  onBack: () => void
  onReview: () => void
  skippedCount?: number
  onRelearn?: () => void
  onReplay: () => void
  onNext: () => void
  missionTerms?: GameTerm[]
  answers?: AnswerRecord[]
  onPlayAudio?: (term: GameTerm) => void
}

export function MissionResultView({
  missionNumber,
  result,
  syncing,
  synced,
  error,
  hasNextMission,
  onRetrySync,
  onBack,
  onReview,
  skippedCount = 0,
  onRelearn,
  onReplay,
  onNext,
  missionTerms = [],
  answers = [],
  onPlayAudio,
}: MissionResultViewProps) {
  // Calculate 1 to 3 stars
  const starsEarned =
    result.accuracy >= 90 ? 3 : result.accuracy >= 75 ? 2 : result.accuracy >= 50 ? 1 : 1

  const titleBadge =
    starsEarned === 3
      ? { text: 'XUẤT SẮC!', color: 'bg-yellow-300 text-slate-900' }
      : starsEarned === 2
        ? { text: 'LÀM RẤT TỐT!', color: 'bg-indigo-200 text-indigo-950' }
        : { text: 'HOÀN THÀNH!', color: 'bg-emerald-200 text-emerald-950' }

  // Derive mastered vs needs practice terms
  const wrongTargetIds = new Set(
    answers.filter((a) => !a.isCorrect || a.hintLevel > 0).map((a) => a.targetTermId)
  )
  const masteredTerms = missionTerms.filter((t) => !wrongTargetIds.has(t.globalTermId))
  const reviewTerms = missionTerms.filter((t) => wrongTargetIds.has(t.globalTermId))

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 animate-in fade-in duration-200">
      {/* Hero Victory Card */}
      <div className="neo-card bg-[#fdc800] border-4 border-slate-900 shadow-[6px_6px_0px_#000] rounded-2xl p-6 sm:p-8 text-center space-y-4">
        {/* Title Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-2 border-slate-900 bg-white font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_#000]">
          <Trophy className="h-4 w-4 text-amber-600" />
          <span>{titleBadge.text}</span>
        </div>

        {/* 3 Stars Container */}
        <div className="flex items-center justify-center gap-3 pt-1 pb-2">
          {[1, 2, 3].map((starIndex) => {
            const isFilled = starIndex <= starsEarned
            return (
              <div
                key={starIndex}
                className={
                  'flex items-center justify-center rounded-2xl border-3 border-slate-900 shadow-[3px_3px_0px_#000] transition-transform ' +
                  (starIndex === 2 ? 'w-16 h-16 sm:w-20 sm:h-20 -translate-y-2' : 'w-14 h-14 sm:w-16 sm:h-16') +
                  (isFilled ? ' bg-amber-300 text-slate-900' : ' bg-slate-100 text-slate-400')
                }
              >
                <Star
                  className={
                    (starIndex === 2 ? 'w-9 h-9 sm:w-11 sm:h-11' : 'w-7 h-7 sm:w-9 sm:h-9') +
                    (isFilled ? ' fill-slate-900' : ' fill-slate-300')
                  }
                />
              </div>
            )
          })}
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Mission hoàn thành!
        </h1>
        <p className="font-bold text-slate-800 text-sm sm:text-base">
          Bạn đã hoàn thành Mission {missionNumber}.
        </p>

        {/* XP Reward Chip */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border-2 border-slate-900 rounded-xl font-black text-xs text-slate-900 shadow-[2px_2px_0px_#000]">
          <Sparkles className="h-4 w-4 text-amber-600" />
          <span>+50 XP Thưởng Hoàn Thành</span>
        </div>
      </div>

      {/* 3 Metric Tiles */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="neo-card p-4 sm:p-5 text-center bg-white border-3 border-slate-900 shadow-[3px_3px_0px_#000] rounded-xl">
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{result.score}</div>
          <div className="text-xs font-black uppercase text-slate-600 mt-1">Điểm</div>
        </div>
        <div className="neo-card p-4 sm:p-5 text-center bg-white border-3 border-slate-900 shadow-[3px_3px_0px_#000] rounded-xl">
          <div className="text-2xl sm:text-3xl font-black text-indigo-700">{result.accuracy}%</div>
          <div className="text-xs font-black uppercase text-slate-600 mt-1">Chính xác</div>
        </div>
        <div className="neo-card p-4 sm:p-5 text-center bg-white border-3 border-slate-900 shadow-[3px_3px_0px_#000] rounded-xl">
          <div className="text-2xl sm:text-3xl font-black text-emerald-700">
            {result.firstTryAccuracy}%
          </div>
          <div className="text-xs font-black uppercase text-slate-600 mt-1">Lần đầu</div>
        </div>
      </div>

      {/* Sync Status Notifications */}
      {!synced && !error ? (
        <div className="neo-card bg-amber-50 border-2 border-slate-900 p-4 font-bold text-xs text-amber-950 rounded-xl shadow-[2px_2px_0px_#000] flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-600 animate-spin" />
          <span>Đang đồng bộ kết quả, lịch ôn và tiến trình Mission...</span>
        </div>
      ) : null}

      {error ? (
        <div className="neo-card space-y-3 bg-rose-50 border-3 border-rose-600 p-4 rounded-xl shadow-[3px_3px_0px_#000]">
          <p className="font-bold text-xs text-rose-900">Kết quả đang chờ đồng bộ: {error}</p>
          <Button
            className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black text-xs py-2 rounded-lg"
            disabled={syncing}
            onClick={onRetrySync}
          >
            {syncing ? 'Đang đồng bộ...' : 'Thử đồng bộ lại'}
          </Button>
        </div>
      ) : null}

      {/* Vocabulary Breakdown Section (When terms are provided) */}
      {missionTerms.length > 0 ? (
        <div className="neo-card bg-white border-3 border-slate-900 shadow-[4px_4px_0px_#000] rounded-xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b-2 border-slate-900">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-purple-700" />
              <span>Tổng Kết Từ Vựng ({missionTerms.length} từ)</span>
            </h2>
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> {masteredTerms.length} Đã nhớ
              </span>
              {reviewTerms.length > 0 ? (
                <span className="text-amber-700 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" /> {reviewTerms.length} Cần ôn
                </span>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
            {missionTerms.map((term) => {
              const isMastered = !wrongTargetIds.has(term.globalTermId)
              return (
                <div
                  key={term.globalTermId}
                  className={
                    'flex items-center justify-between p-2.5 rounded-lg border-2 text-xs font-bold ' +
                    (isMastered
                      ? 'border-emerald-500 bg-emerald-50/60 text-emerald-950'
                      : 'border-amber-500 bg-amber-50/60 text-amber-950')
                  }
                >
                  <div className="truncate mr-2">
                    <span className="font-black text-sm">{term.sourceText}</span>
                    <span className="text-slate-500 text-[11px] block truncate">
                      {term.translation}
                    </span>
                  </div>
                  {onPlayAudio ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 w-8 p-0 rounded-lg hover:bg-white shrink-0"
                      onClick={() => onPlayAudio(term)}
                      aria-label={'Phát âm ' + term.sourceText}
                    >
                      <Volume2 className="h-4 w-4 text-slate-700" />
                    </Button>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      {/* Review Actions */}
      <div className="space-y-2.5">
        <Button
          variant="ghost"
          className="w-full py-3 border-2 border-slate-900 bg-slate-50 hover:bg-slate-100 text-slate-900 font-black text-sm rounded-xl shadow-[2px_2px_0px_#000] flex items-center justify-center gap-2"
          onClick={onReview}
        >
          <ListChecks className="h-4 w-4" />
          <span>Xem lại bài làm</span>
        </Button>

        {skippedCount > 0 && onRelearn ? (
          <Button
            variant="secondary"
            className="w-full py-3 bg-[#432dd7] hover:bg-indigo-700 text-white font-black text-sm border-2 border-slate-900 shadow-[3px_3px_0px_#000] rounded-xl flex items-center justify-center gap-2"
            onClick={onRelearn}
          >
            <BookOpen className="h-4 w-4" />
            <span>Ôn lại {skippedCount} từ đã bỏ qua</span>
          </Button>
        ) : null}
      </div>

      {/* Navigation Footer */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          variant="ghost"
          className="flex-1 py-3.5 border-2 border-slate-900 bg-white hover:bg-slate-100 text-slate-900 font-black text-sm rounded-xl shadow-[3px_3px_0px_#000] flex items-center justify-center gap-2"
          disabled={syncing || !synced}
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Về lộ trình</span>
        </Button>

        <Button
          variant="secondary"
          className="flex-1 py-3.5 border-2 border-slate-900 bg-slate-100 hover:bg-slate-200 text-slate-900 font-black text-sm rounded-xl shadow-[3px_3px_0px_#000] flex items-center justify-center gap-2"
          disabled={syncing || !synced}
          onClick={onReplay}
        >
          <RotateCcw className="h-4 w-4" />
          <span>Chơi lại</span>
        </Button>

        {hasNextMission ? (
          <Button
            className="flex-1 py-3.5 border-3 border-slate-900 bg-[#fdc800] hover:bg-amber-300 text-slate-900 font-black text-sm rounded-xl shadow-[4px_4px_0px_#000] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            disabled={Boolean(error) || syncing || !synced}
            onClick={onNext}
          >
            <span>Mission tiếp theo</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  )
}
