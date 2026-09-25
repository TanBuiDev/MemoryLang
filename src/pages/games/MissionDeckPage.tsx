import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Crown,
  Eye,
  Lock,
  Play,
  RotateCcw,
  Sparkles,
  Star,
  Volume2,
  X,
  BookOpen,
  Compass,
  LayoutGrid,
  Trophy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { cn } from '@/utils/cn'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'
import { gameMissionService } from '@/services/supabase/gameMission.service'
import { gameMissionLocalDb } from '@/services/local/gameMissionLocalDb'
import {
  buildMissionTermGroups,
  createCurriculumContentVersion,
  createCurriculumFingerprint,
} from '@/features/games/mission/curriculum'
import { evaluateMissionReadiness } from '@/features/games/mission/missionEngine'
import { getMissionScript } from '@/features/games/mission/scriptRegistry'
import { getDeckGameConfig, type GameHubConfig } from '@/features/games/mission/gameConfig'
import { formatMissionPartOfSpeech } from '@/features/games/mission/missionInteraction'
import type { Deck } from '@/types/deck.types'
import type { GameTerm, MissionProgress } from '@/features/games/mission/mission.types'
import { speak } from '@/utils/audio'

interface LoadedDeck {
  deck: Deck
  terms: GameTerm[]
  groups: GameTerm[][]
  fingerprint: string
  progress: MissionProgress[]
  config: GameHubConfig
  termsPerMission: number
  scriptKey: string
  activeMissionIndexes: number[]
}

export default function MissionDeckPage() {
  const { deckId } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const isPro = useSubscriptionStore((state) => state.isPro)
  const [loaded, setLoaded] = useState<LoadedDeck | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [previewMissionIndex, setPreviewMissionIndex] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid')

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user || !deckId) return
      setLoading(true)
      setError(null)
      try {
        const [deck, config, terms] = await Promise.all([
          gameMissionService.getDeck(deckId),
          gameMissionService.getConfig(),
          gameMissionService.listPlayableDeckTerms(deckId),
        ])
        if (!deck) throw new Error('Không tìm thấy bộ từ vựng.')
        const deckConfig = getDeckGameConfig(config, deckId)
        if (!deckConfig.allowed || !deckConfig.missionEnabled) {
          throw new Error('Bộ từ vựng này chưa được bật cho chế độ Mission.')
        }
        const termsPerMission = deckConfig.termsPerMission ?? 10
        const scriptKey = deckConfig.scriptKey ?? 'standard'
        const script = getMissionScript(scriptKey)
        const fingerprint = createCurriculumFingerprint({
          deckId,
          orderedTermIds: terms.map((term) => term.globalTermId),
          termsPerMission,
          scriptKey,
          scriptVersion: script.version,
          contentVersion: createCurriculumContentVersion(terms),
        })
        const groups = buildMissionTermGroups(terms, termsPerMission)
        const progress = await gameMissionService.listProgress(user.id, deckId, fingerprint)
        await gameMissionLocalDb.clearStaleAttempts(user.id, deckId, fingerprint)
        const activeAttempts = await Promise.all(
          groups.map((_, index) =>
            gameMissionLocalDb.getAttempt(user.id, deckId, fingerprint, index)
          )
        )
        const activeMissionIndexes = activeAttempts
          .map((attempt, index) => (attempt?.state.status === 'in_progress' ? index : -1))
          .filter((index) => index >= 0)
        if (!cancelled)
          setLoaded({
            deck,
            terms,
            groups,
            fingerprint,
            progress,
            config,
            termsPerMission,
            scriptKey,
            activeMissionIndexes,
          })
      } catch (cause) {
        if (!cancelled)
          setError(cause instanceof Error ? cause.message : 'Không thể tải lộ trình Mission.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [deckId, user])

  const completed = useMemo(
    () =>
      new Set(
        (loaded?.progress ?? [])
          .filter((item) => item.status === 'completed')
          .map((item) => item.mission_index)
      ),
    [loaded?.progress]
  )

  const totalStars = useMemo(() => {
    if (!loaded?.progress) return 0
    return loaded.progress.reduce((sum, item) => {
      if (item.status !== 'completed') return sum
      const acc = item.best_accuracy ?? 0
      const stars = acc >= 90 ? 3 : acc >= 75 ? 2 : 1
      return sum + stars
    }, 0)
  }, [loaded?.progress])

  const maxStars = (loaded?.groups.length ?? 0) * 3

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center font-black">
        Đang chuẩn bị lộ trình Mission...
      </div>
    )
  }

  if (!loaded || error || !deckId) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <EmptyState
          title="Không thể mở Mission"
          description={error ?? 'Lộ trình này không khả dụng.'}
          actionLabel="Quay lại Game Hub"
          onAction={() => navigate('/app/games')}
        />
      </div>
    )
  }

  const missionTier = loaded.config.games.mission.accessTier
  const deckConfig = getDeckGameConfig(loaded.config, deckId)
  const needsPro = missionTier === 'pro' || deckConfig.accessTier === 'pro'
  const readiness = loaded.groups.map((group) => evaluateMissionReadiness(group))
  const allReady = readiness.every((item) => item.playable)

  if (needsPro && !isPro) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="neo-card space-y-4 p-8 text-center bg-white border-4 border-slate-900 shadow-[6px_6px_0px_#000] rounded-2xl">
          <Crown className="mx-auto h-12 w-12 text-amber-500" />
          <h1 className="text-2xl font-black">Mission này dành cho Pro</h1>
          <p className="font-semibold text-slate-600">
            Nâng cấp để mở lộ trình học theo Mission của bộ từ này.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Button variant="ghost" onClick={() => navigate('/app/games')}>
              Quay lại
            </Button>
            <Button
              className="bg-[#fdc800] hover:bg-amber-300 text-slate-900 border-2 border-slate-900 shadow-[3px_3px_0px_#000]"
              onClick={() => navigate('/app/upgrade')}
            >
              Xem gói Pro
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!allReady) {
    const messages = readiness.flatMap((item) => item.blocking.map((issue) => issue.message))
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="neo-card space-y-4 p-6 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_#000] rounded-2xl">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-7 w-7 text-amber-600" />
            <h1 className="text-xl font-black">Bộ từ chưa đạt điều kiện Mission</h1>
          </div>
          <ul className="list-disc space-y-1 pl-6 text-sm font-semibold text-slate-600">
            {Array.from(new Set(messages)).map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
          <Button variant="ghost" onClick={() => navigate('/app/games')}>
            Quay lại Game Hub
          </Button>
        </div>
      </div>
    )
  }

  const previewGroup =
    previewMissionIndex !== null ? loaded.groups[previewMissionIndex] : null

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <Button
        variant="ghost"
        className="font-bold border-2 border-slate-900 bg-white hover:bg-slate-100 shadow-[2px_2px_0px_#000] rounded-xl"
        onClick={() => navigate('/app/games')}
      >
        <ArrowLeft className="h-4 w-4" /> Game Hub
      </Button>

      {/* Curriculum Header Banner */}
      <section className="neo-card bg-[#432dd7] text-white p-6 sm:p-8 border-4 border-slate-900 shadow-[6px_6px_0px_#000] rounded-2xl space-y-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-300 border-2 border-slate-900 text-slate-900 font-black text-xs uppercase tracking-wider rounded-full shadow-[2px_2px_0px_#000]">
            <Sparkles className="h-3.5 w-3.5" /> Lộ Trình Chung
          </span>
        </div>

        <div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight">{loaded.deck.name}</h1>
          <p className="mt-2 max-w-2xl text-xs sm:text-sm font-bold text-indigo-100 leading-relaxed">
            {loaded.deck.description ||
              'Hoàn thành lần lượt các Mission để làm chủ toàn bộ bộ từ vựng theo phương pháp Spaced Repetition.'}
          </p>
        </div>

        {/* Stats Badges */}
        <div className="flex flex-wrap gap-2.5 pt-2 text-xs font-black text-slate-900">
          <span className="rounded-xl border-2 border-slate-900 bg-white px-3.5 py-1.5 shadow-[2px_2px_0px_#000] flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-purple-700" />
            {loaded.terms.length} từ
          </span>
          <span className="rounded-xl border-2 border-slate-900 bg-white px-3.5 py-1.5 shadow-[2px_2px_0px_#000]">
            {loaded.groups.length} Mission
          </span>
          <span className="rounded-xl border-2 border-slate-900 bg-emerald-300 px-3.5 py-1.5 shadow-[2px_2px_0px_#000] flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-950" />
            {completed.size}/{loaded.groups.length} hoàn thành
          </span>
          <span className="rounded-xl border-2 border-slate-900 bg-[#fdc800] px-3.5 py-1.5 shadow-[2px_2px_0px_#000] flex items-center gap-1.5">
            <Star className="h-4 w-4 fill-slate-900 text-slate-900" />
            {totalStars}/{maxStars} Sao
          </span>
        </div>
      </section>

      {/* Warnings Banner if any */}
      {readiness.some((item) => item.warnings.length > 0) ? (
        <div className="neo-card flex items-start gap-3 bg-amber-50 border-2 border-slate-900 p-4 text-amber-950 rounded-xl shadow-[3px_3px_0px_#000]">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-xs sm:text-sm font-bold">
            Một số từ thiếu context/audio phù hợp. Engine sẽ tự bỏ qua câu không an toàn thay vì
            tạo câu hỏi mơ hồ.
          </p>
        </div>
      ) : null}

      {/* View Switcher Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          {viewMode === 'map' ? (
            <Compass className="h-5 w-5 text-indigo-600" />
          ) : (
            <LayoutGrid className="h-5 w-5 text-indigo-600" />
          )}
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            {viewMode === 'map' ? 'Bản Đồ Hành Trình' : 'Danh Sách Thử Thách'} ({loaded.groups.length} Mission)
          </h2>
        </div>

        <div className="inline-flex p-1 bg-white border-2 border-slate-900 rounded-xl shadow-[2px_2px_0px_#000] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer',
              viewMode === 'grid'
                ? 'bg-[#fdc800] text-slate-900 border-2 border-slate-900 shadow-[1.5px_1.5px_0px_#000]'
                : 'text-slate-600 hover:text-slate-900 border-2 border-transparent'
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Dạng Lưới</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('map')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer',
              viewMode === 'map'
                ? 'bg-[#fdc800] text-slate-900 border-2 border-slate-900 shadow-[1.5px_1.5px_0px_#000]'
                : 'text-slate-600 hover:text-slate-900 border-2 border-transparent'
            )}
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Bản Đồ Hành Trình</span>
          </button>
        </div>
      </div>

      {/* Roadmap Path View or Grid View */}
      {viewMode === 'map' ? (
        <section className="neo-card border-4 border-slate-900 bg-amber-50/40 p-6 sm:p-10 shadow-[6px_6px_0px_#000] rounded-2xl relative overflow-hidden">
          {/* Top Destination Goal Banner */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-300 border-3 border-slate-900 text-slate-900 font-black text-xs uppercase tracking-wider rounded-xl shadow-[3px_3px_0px_#000]">
              <Trophy className="h-4 w-4" />
              <span>Đích Đến: Hoàn Thành Toàn Bộ {loaded.groups.length} Mission</span>
            </div>
          </div>

          {/* Stepper Timeline Pathway */}
          <div className="relative max-w-2xl mx-auto py-2">
            {/* Connecting Center Dashed Line */}
            <div className="absolute top-6 bottom-6 left-8 sm:left-10 w-0.5 border-l-4 border-dashed border-slate-900 -z-0" />

            <div className="space-y-8 relative z-10">
              {loaded.groups.map((group, index) => {
                const progress = loaded.progress.find((item) => item.mission_index === index)
                const done = completed.has(index)
                const inProgress = !done && loaded.activeMissionIndexes.includes(index)
                const unlocked = index === 0 || completed.has(index - 1)
                const bestAccuracy = progress?.best_accuracy ?? 0
                const stars = bestAccuracy >= 90 ? 3 : bestAccuracy >= 75 ? 2 : 1

                return (
                  <div key={index} className="flex items-start gap-4 sm:gap-6 group">
                    {/* Checkpoint Station Node */}
                    <div className="relative shrink-0">
                      <div
                        className={cn(
                          'w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-3 sm:border-4 border-slate-900 flex flex-col items-center justify-center transition-all',
                          done
                            ? 'bg-emerald-400 text-slate-900 shadow-[4px_4px_0px_#059669]'
                            : inProgress
                              ? 'bg-[#fdc800] text-slate-900 shadow-[4px_4px_0px_#000] ring-4 ring-amber-400/50 animate-pulse'
                              : unlocked
                                ? 'bg-yellow-300 text-slate-900 shadow-[4px_4px_0px_#000]'
                                : 'bg-slate-200 text-slate-400 shadow-[2px_2px_0px_#94a3b8] opacity-80'
                        )}
                      >
                        {done ? (
                          <CheckCircle2 className="h-7 w-7 sm:h-8 sm:w-8 text-slate-900 stroke-[2.5]" />
                        ) : unlocked ? (
                          <Play className="h-7 w-7 sm:h-8 sm:w-8 fill-slate-900 text-slate-900" />
                        ) : (
                          <Lock className="h-6 w-6 sm:h-7 sm:w-7 text-slate-500" />
                        )}

                        <span className="text-[10px] sm:text-xs font-black mt-0.5">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                      </div>

                      {/* 3-Star Cluster below completed node */}
                      {done && (
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-white border border-slate-900 px-1.5 py-0.5 rounded-full shadow-[1px_1px_0px_#000]">
                          {[1, 2, 3].map((s) => (
                            <Star
                              key={s}
                              className={cn(
                                'h-2.5 w-2.5',
                                s <= stars
                                  ? 'fill-[#fdc800] text-slate-900'
                                  : 'fill-slate-200 text-slate-300'
                              )}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Mission Info Card */}
                    <div
                      className={cn(
                        'flex-1 neo-card p-4 sm:p-5 border-3 border-slate-900 rounded-2xl transition-all',
                        done
                          ? 'bg-white shadow-[3px_3px_0px_#059669]'
                          : unlocked
                            ? 'bg-white shadow-[4px_4px_0px_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#000]'
                            : 'bg-slate-50 shadow-[2px_2px_0px_#000] opacity-80'
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                            Mission {String(index + 1).padStart(2, '0')}
                          </span>
                          {done ? (
                            <span className="text-[11px] font-black px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-slate-900 rounded-md shadow-[1px_1px_0px_#000]">
                              Đã hoàn thành · {bestAccuracy}%
                            </span>
                          ) : inProgress ? (
                            <span className="text-[11px] font-black px-2 py-0.5 bg-amber-300 text-slate-900 border border-slate-900 rounded-md shadow-[1px_1px_0px_#000]">
                              Đang học dở
                            </span>
                          ) : unlocked ? (
                            <span className="text-[11px] font-black px-2 py-0.5 bg-indigo-100 text-indigo-900 border border-slate-900 rounded-md shadow-[1px_1px_0px_#000]">
                              Sẵn sàng thử thách
                            </span>
                          ) : (
                            <span className="text-[11px] font-black px-2 py-0.5 bg-slate-200 text-slate-600 border border-slate-400 rounded-md">
                              Chưa mở
                            </span>
                          )}
                        </div>

                        <span className="text-xs font-bold text-slate-600">
                          {group.length} từ mục tiêu
                        </span>
                      </div>

                      {/* Words Preview Snippet */}
                      <p className="mt-2 line-clamp-1 text-xs font-bold text-slate-600">
                        {group
                          .slice(0, 5)
                          .map((term) => term.sourceText)
                          .join(' · ')}
                        {group.length > 5 ? ' · …' : ''}
                      </p>

                      {/* Action Buttons Row */}
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200">
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-9 px-2.5 text-xs font-black text-slate-700 hover:text-slate-900 border-2 border-slate-900 bg-white hover:bg-slate-100 rounded-xl shadow-[2px_2px_0px_#000] flex items-center gap-1 shrink-0"
                          onClick={() => setPreviewMissionIndex(index)}
                          title="Xem trước từ vựng"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Xem từ</span>
                        </Button>

                        <Button
                          variant={done ? 'ghost' : 'primary'}
                          disabled={!unlocked}
                          className={cn(
                            'flex-1 h-9 text-xs font-black rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_#000] flex items-center justify-center gap-1.5 cursor-pointer',
                            done
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                              : unlocked
                                ? 'bg-[#fdc800] hover:bg-amber-300 text-slate-900'
                                : 'bg-slate-100 text-slate-400 border-slate-300 cursor-not-allowed'
                          )}
                          onClick={() => navigate('/app/games/mission/' + deckId + '/' + index)}
                        >
                          {done ? (
                            <RotateCcw className="h-3.5 w-3.5" />
                          ) : unlocked ? (
                            <Play className="h-3.5 w-3.5 fill-current" />
                          ) : (
                            <Lock className="h-3.5 w-3.5" />
                          )}
                          <span>
                            {done
                              ? 'Chơi lại'
                              : inProgress
                                ? 'Tiếp tục'
                                : unlocked
                                  ? 'Bắt đầu'
                                  : 'Chưa mở'}
                          </span>
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      ) : (
        /* Mission Cards Grid */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loaded.groups.map((group, index) => {
            const progress = loaded.progress.find((item) => item.mission_index === index)
            const done = completed.has(index)
            const inProgress = !done && loaded.activeMissionIndexes.includes(index)
            const unlocked = index === 0 || completed.has(index - 1)
            const bestAccuracy = progress?.best_accuracy ?? 0
            const stars = bestAccuracy >= 90 ? 3 : bestAccuracy >= 75 ? 2 : 1

            return (
              <article
                key={index}
                className={
                  'neo-card flex min-h-56 flex-col justify-between p-5 border-3 border-slate-900 rounded-2xl transition-all ' +
                  (done
                    ? 'bg-emerald-50/50 shadow-[4px_4px_0px_#059669]'
                    : unlocked
                      ? 'bg-white shadow-[4px_4px_0px_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#000]'
                      : 'bg-slate-50 opacity-80 shadow-[2px_2px_0px_#000]')
                }
              >
                <div>
                  {/* Card Top Row: Mission Label, Icons & Stars */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-600">
                      Mission {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {done ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      ) : unlocked ? (
                        <Play className="h-5 w-5 fill-[#fdc800] text-slate-900" />
                      ) : (
                        <Lock className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Stars and Accuracy */}
                  {done ? (
                    <div className="flex items-center justify-between mt-2.5">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3].map((s) => (
                          <Star
                            key={s}
                            className={
                              'h-4 w-4 ' +
                              (s <= stars
                                ? 'fill-[#fdc800] text-slate-900'
                                : 'fill-slate-200 text-slate-400')
                            }
                          />
                        ))}
                      </div>
                      <span className="text-xs font-black text-emerald-800">
                        Tốt nhất: {bestAccuracy}%
                      </span>
                    </div>
                  ) : null}

                  {/* Target words count */}
                  <h2 className="mt-2 text-xl font-black text-slate-900">
                    {group.length} từ mục tiêu
                  </h2>

                  {/* Words preview snippet */}
                  <p className="mt-1.5 line-clamp-2 text-xs font-bold text-slate-600 leading-relaxed">
                    {group
                      .slice(0, 5)
                      .map((term) => term.sourceText)
                      .join(' · ')}
                    {group.length > 5 ? ' · …' : ''}
                  </p>
                </div>

                {/* Action Buttons Row */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200">
                  {/* View Words Preview Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-10 px-2.5 text-xs font-black text-slate-700 hover:text-slate-900 border-2 border-slate-900 bg-white hover:bg-slate-100 rounded-xl shadow-[2px_2px_0px_#000] flex items-center gap-1 shrink-0"
                    onClick={() => setPreviewMissionIndex(index)}
                    title="Xem trước từ vựng"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Xem từ</span>
                  </Button>

                  {/* Main Play/Resume Button */}
                  <Button
                    variant={done ? 'ghost' : 'primary'}
                    disabled={!unlocked}
                    className={
                      'flex-1 h-10 text-xs font-black rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_#000] flex items-center justify-center gap-1.5 cursor-pointer ' +
                      (done
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                        : unlocked
                          ? 'bg-[#fdc800] hover:bg-amber-300 text-slate-900'
                          : 'bg-slate-100 text-slate-400 border-slate-300 cursor-not-allowed')
                    }
                    onClick={() => navigate('/app/games/mission/' + deckId + '/' + index)}
                  >
                    {done ? (
                      <RotateCcw className="h-3.5 w-3.5" />
                    ) : unlocked ? (
                      <Play className="h-3.5 w-3.5 fill-current" />
                    ) : (
                      <Lock className="h-3.5 w-3.5" />
                    )}
                    <span>{done ? 'Chơi lại' : inProgress ? 'Tiếp tục' : unlocked ? 'Bắt đầu' : 'Chưa mở'}</span>
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* Vocabulary Preview Modal */}
      {previewMissionIndex !== null && previewGroup ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
        >
          <div className="neo-card bg-white max-w-xl w-full border-4 border-slate-900 shadow-[8px_8px_0px_#000] rounded-2xl flex flex-col max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b-3 border-slate-900 bg-[#432dd7] text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-yellow-300" />
                <h2 className="text-base sm:text-lg font-black uppercase tracking-tight">
                  Từ Vựng Mission {String(previewMissionIndex + 1).padStart(2, '0')} ({previewGroup.length} từ)
                </h2>
              </div>
              <Button
                type="button"
                variant="ghost"
                aria-label="Đóng"
                onClick={() => setPreviewMissionIndex(null)}
                className="h-8 w-8 p-0 text-white hover:bg-white/20 rounded-lg"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Modal Scrollable Words List */}
            <div className="overflow-y-auto p-4 sm:p-5 space-y-2.5">
              {previewGroup.map((term, tIdx) => (
                <div
                  key={term.globalTermId}
                  className="p-3 bg-slate-50 border-2 border-slate-900 rounded-xl shadow-[2px_2px_0px_#000] flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#fdc800] border border-slate-900 text-[10px] font-black text-slate-900">
                        {tIdx + 1}
                      </span>
                      <span className="font-black text-base text-slate-900 truncate">
                        {term.sourceText}
                      </span>
                      {term.partOfSpeech ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 border border-slate-400 text-slate-700 shrink-0">
                          {formatMissionPartOfSpeech(term.partOfSpeech)}
                        </span>
                      ) : null}
                    </div>

                    {term.ipa ? (
                      <p className="font-mono text-xs text-slate-500 pl-7">{term.ipa}</p>
                    ) : null}

                    <p className="font-bold text-xs sm:text-sm text-slate-800 pl-7">
                      {term.translation || 'Chưa có bản dịch'}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 w-9 p-0 rounded-xl border-2 border-slate-900 bg-white hover:bg-[#fdc800] shadow-[1.5px_1.5px_0px_#000] shrink-0"
                    aria-label={'Phát âm ' + term.sourceText}
                    onClick={() =>
                      speak(term.sourceText, {
                        audioUrl: term.audioUrl,
                        globalTermId: term.globalTermId,
                        lang: term.sourceLanguage,
                      })
                    }
                  >
                    <Volume2 className="h-4 w-4 text-slate-900" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t-3 border-slate-900 bg-slate-50 flex gap-3 shrink-0">
              <Button
                variant="ghost"
                className="flex-1 font-black text-xs sm:text-sm border-2 border-slate-900 bg-white hover:bg-slate-100 rounded-xl"
                onClick={() => setPreviewMissionIndex(null)}
              >
                Đóng
              </Button>
              <Button
                className="flex-[2] font-black text-xs sm:text-sm bg-[#fdc800] hover:bg-amber-300 text-slate-900 border-2 border-slate-900 shadow-[3px_3px_0px_#000] rounded-xl flex items-center justify-center gap-1.5"
                onClick={() => {
                  const idx = previewMissionIndex
                  setPreviewMissionIndex(null)
                  navigate('/app/games/mission/' + deckId + '/' + idx)
                }}
              >
                <Play className="h-4 w-4 fill-slate-900" />
                <span>Bắt đầu Mission này</span>
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
