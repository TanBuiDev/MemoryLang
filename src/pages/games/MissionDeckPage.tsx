import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, CheckCircle2, Crown, Lock, Play, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'
import { gameMissionService } from '@/services/supabase/gameMission.service'
import { gameMissionLocalDb } from '@/services/local/gameMissionLocalDb'
import { buildMissionTermGroups, createCurriculumFingerprint } from '@/features/games/mission/curriculum'
import { evaluateMissionReadiness } from '@/features/games/mission/missionEngine'
import { getDeckGameConfig, type GameHubConfig } from '@/features/games/mission/gameConfig'
import type { Deck } from '@/types/deck.types'
import type { GameTerm, MissionProgress } from '@/features/games/mission/mission.types'

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
        const fingerprint = createCurriculumFingerprint({
          deckId,
          orderedTermIds: terms.map((term) => term.globalTermId),
          termsPerMission,
          scriptKey,
        })
        const groups = buildMissionTermGroups(terms, termsPerMission)
        const progress = await gameMissionService.listProgress(user.id, deckId, fingerprint)
        await gameMissionLocalDb.clearStaleAttempts(user.id, deckId, fingerprint)
        const activeAttempts = await Promise.all(
          groups.map((_, index) => gameMissionLocalDb.getAttempt(user.id, deckId, fingerprint, index)),
        )
        const activeMissionIndexes = activeAttempts
          .map((attempt, index) => attempt?.state.status === 'in_progress' ? index : -1)
          .filter((index) => index >= 0)
        if (!cancelled) setLoaded({
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
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Không thể tải lộ trình Mission.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [deckId, user])

  const completed = useMemo(
    () => new Set((loaded?.progress ?? []).filter((item) => item.status === 'completed').map((item) => item.mission_index)),
    [loaded?.progress],
  )

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center font-black">Đang chuẩn bị lộ trình Mission...</div>
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
        <div className="neo-card space-y-4 p-8 text-center">
          <Crown className="mx-auto h-12 w-12 text-amber-500" />
          <h1 className="text-2xl font-black">Mission này dành cho Pro</h1>
          <p className="font-semibold text-muted-foreground">Nâng cấp để mở lộ trình học theo Mission của bộ từ này.</p>
          <div className="flex justify-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/app/games')}>Quay lại</Button>
            <Button onClick={() => navigate('/app/upgrade')}>Xem gói Pro</Button>
          </div>
        </div>
      </div>
    )
  }

  if (!allReady) {
    const messages = readiness.flatMap((item) => item.blocking.map((issue) => issue.message))
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="neo-card space-y-4 p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-7 w-7 text-amber-600" />
            <h1 className="text-xl font-black">Bộ từ chưa đạt điều kiện Mission</h1>
          </div>
          <ul className="list-disc space-y-1 pl-6 text-sm font-semibold text-muted-foreground">
            {Array.from(new Set(messages)).map((message) => <li key={message}>{message}</li>)}
          </ul>
          <Button variant="ghost" onClick={() => navigate('/app/games')}>Quay lại Game Hub</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <Button variant="ghost" onClick={() => navigate('/app/games')}>
        <ArrowLeft className="h-4 w-4" /> Game Hub
      </Button>

      <section className="neo-card bg-secondary p-6 text-secondary-foreground">
        <p className="text-xs font-black uppercase tracking-widest opacity-80">Shared Curriculum</p>
        <h1 className="mt-1 text-3xl font-black">{loaded.deck.name}</h1>
        <p className="mt-2 max-w-2xl text-sm font-semibold opacity-90">
          {loaded.deck.description || 'Hoàn thành lần lượt các Mission để học toàn bộ bộ từ vựng.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
          <span className="rounded border-2 border-border bg-card px-3 py-1 text-foreground">{loaded.terms.length} từ</span>
          <span className="rounded border-2 border-border bg-card px-3 py-1 text-foreground">{loaded.groups.length} Mission</span>
          <span className="rounded border-2 border-border bg-card px-3 py-1 text-foreground">{completed.size}/{loaded.groups.length} hoàn thành</span>
        </div>
      </section>

      {readiness.some((item) => item.warnings.length > 0) ? (
        <div className="neo-card flex items-start gap-3 bg-amber-50 p-4 text-amber-950">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm font-bold">
            Một số từ thiếu context/audio phù hợp. Engine sẽ tự bỏ qua câu không an toàn thay vì tạo câu hỏi mơ hồ.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loaded.groups.map((group, index) => {
          const progress = loaded.progress.find((item) => item.mission_index === index)
          const done = completed.has(index)
          const inProgress = !done && loaded.activeMissionIndexes.includes(index)
          const unlocked = index === 0 || completed.has(index - 1)
          return (
            <article key={index} className="neo-card flex min-h-52 flex-col justify-between p-5">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-muted-foreground">Mission {String(index + 1).padStart(2, '0')}</span>
                  {done ? <CheckCircle2 className="h-6 w-6 text-emerald-600" /> : unlocked ? <Play className="h-6 w-6 text-primary" /> : <Lock className="h-6 w-6 text-muted-foreground" />}
                </div>
                <h2 className="mt-3 text-xl font-black">{group.length} từ mục tiêu</h2>
                <p className="mt-2 line-clamp-3 text-sm font-semibold text-muted-foreground">
                  {group.slice(0, 5).map((term) => term.sourceText).join(' · ')}
                  {group.length > 5 ? ' · …' : ''}
                </p>
                {done ? (
                  <p className="mt-3 text-xs font-black text-emerald-700">
                    Tốt nhất: {progress?.best_accuracy ?? 0}% chính xác
                  </p>
                ) : null}
              </div>
              <Button
                variant={done ? 'ghost' : 'primary'}
                disabled={!unlocked}
                onClick={() => navigate('/app/games/mission/' + deckId + '/' + index)}
              >
                {done ? <RotateCcw className="h-4 w-4" /> : unlocked ? <Play className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                {done ? 'Chơi lại' : inProgress ? 'Tiếp tục' : unlocked ? 'Bắt đầu' : 'Chưa mở'}
              </Button>
            </article>
          )
        })}
      </div>
    </div>
  )
}
