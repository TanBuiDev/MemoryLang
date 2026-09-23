import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Headphones, Lightbulb, RotateCcw, Swords, Volume2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'
import { gameMissionService } from '@/services/supabase/gameMission.service'
import { studyService } from '@/services/supabase/study.service'
import { gameMissionLocalDb, gameMissionAttemptKey, type StoredGameMissionAttempt } from '@/services/local/gameMissionLocalDb'
import { buildMissionTermGroups, createCurriculumContentVersion, createCurriculumFingerprint } from '@/features/games/mission/curriculum'
import { calculateMissionScore, createMissionDefinition, evaluateMissionReadiness } from '@/features/games/mission/missionEngine'
import { normalizeMissionAnswer } from '@/features/games/mission/generators'
import { buildMissionReviewActions } from '@/features/games/mission/missionSrsAdapter'
import { getDeckGameConfig } from '@/features/games/mission/gameConfig'
import type { AnswerRecord, GameTerm, MissionAttemptState, MissionDefinition, QuestionDefinition } from '@/features/games/mission/mission.types'
import type { Deck } from '@/types/deck.types'
import { speak, stopSpeaking } from '@/utils/audio'

interface LoadedMission {
  deck: Deck
  allTerms: GameTerm[]
  missionTerms: GameTerm[]
  definition: MissionDefinition
  missionCount: number
  fingerprint: string
}

interface MissionResult {
  score: number
  accuracy: number
  firstTryAccuracy: number
}

function stageLabel(type: MissionDefinition['stages'][number]['type']) {
  switch (type) {
    case 'learn': return 'Làm quen'
    case 'matching': return 'Nối nghĩa'
    case 'listening_choice': return 'Nghe chọn nghĩa'
    case 'listening_typing': return 'Nghe và viết'
    case 'context_cloze': return 'Ngữ cảnh'
    case 'meaning_recall': return 'Gọi lại từ trí nhớ'
    case 'spelling': return 'Chính tả'
    case 'boss': return 'Boss Battle'
  }
}

export default function MissionGamePage() {
  const { deckId, missionIndex: missionIndexParam } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const isPro = useSubscriptionStore((state) => state.isPro)
  const missionIndex = Number(missionIndexParam)

  const [loaded, setLoaded] = useState<LoadedMission | null>(null)
  const [attempt, setAttempt] = useState<MissionAttemptState | null>(null)
  const [studySessionId, setStudySessionId] = useState<string | null>(null)
  const [storedMeta, setStoredMeta] = useState<Partial<StoredGameMissionAttempt>>({})
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<MissionResult | null>(null)
  const [answerValue, setAnswerValue] = useState('')
  const [attemptNumber, setAttemptNumber] = useState(1)
  const [hintLevel, setHintLevel] = useState(0)
  const [feedback, setFeedback] = useState<{ correct: boolean; finalized: boolean; text: string } | null>(null)
  const [matchingSelections, setMatchingSelections] = useState<Record<string, string>>({})
  const [matchingReviewed, setMatchingReviewed] = useState(false)
  const [exitOpen, setExitOpen] = useState(false)
  const syncingRef = useRef(false)

  const saveAttempt = useCallback(async (
    nextState: MissionAttemptState,
    nextSessionId: string | null,
    patch: Partial<StoredGameMissionAttempt> = {},
  ) => {
    if (!user || !deckId || !loaded) return
    const record: StoredGameMissionAttempt = {
      key: gameMissionAttemptKey(user.id, deckId, loaded.fingerprint, missionIndex),
      userId: user.id,
      deckId,
      curriculumFingerprint: loaded.fingerprint,
      missionIndex,
      studySessionId: nextSessionId,
      state: nextState,
      updatedAt: new Date().toISOString(),
      ...storedMeta,
      ...patch,
    }
    setStoredMeta((previous) => ({ ...previous, ...patch }))
    await gameMissionLocalDb.saveAttempt(record)
  }, [deckId, loaded, missionIndex, storedMeta, user])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user || !deckId || !Number.isInteger(missionIndex) || missionIndex < 0) {
        setError('Đường dẫn Mission không hợp lệ.')
        setLoading(false)
        return
      }
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
        if (!deckConfig.allowed || !deckConfig.missionEnabled) throw new Error('Mission chưa được bật cho bộ từ này.')
        if ((config.games.mission.accessTier === 'pro' || deckConfig.accessTier === 'pro') && !isPro) {
          throw new Error('Mission này yêu cầu gói Pro.')
        }
        const termsPerMission = deckConfig.termsPerMission ?? 10
        const scriptKey = deckConfig.scriptKey ?? 'standard'
        const fingerprint = createCurriculumFingerprint({
          deckId,
          orderedTermIds: terms.map((term) => term.globalTermId),
          termsPerMission,
          scriptKey,
          contentVersion: createCurriculumContentVersion(terms),
        })
        const groups = buildMissionTermGroups(terms, termsPerMission)
        const missionTerms = groups[missionIndex]
        if (!missionTerms) throw new Error('Mission không tồn tại trong phiên bản curriculum hiện tại.')
        const readiness = evaluateMissionReadiness(missionTerms)
        if (!readiness.playable) throw new Error(readiness.blocking[0]?.message ?? 'Mission chưa đủ dữ liệu.')
        const progress = await gameMissionService.listProgress(user.id, deckId, fingerprint)
        if (missionIndex > 0 && !progress.some((item) => item.mission_index === missionIndex - 1 && item.status === 'completed')) {
          throw new Error('Hãy hoàn thành Mission trước đó để mở khóa bài này.')
        }
        const { definition } = createMissionDefinition({ deckId, curriculumFingerprint: fingerprint, missionIndex, terms: missionTerms, scriptKey })
        const nextLoaded: LoadedMission = { deck, allTerms: terms, missionTerms, definition, missionCount: groups.length, fingerprint }
        await gameMissionLocalDb.clearStaleAttempts(user.id, deckId, fingerprint)
        const stored = await gameMissionLocalDb.getAttempt(user.id, deckId, fingerprint, missionIndex)
        if (cancelled) return
        setLoaded(nextLoaded)
        if (stored) {
          setAttempt(stored.state)
          setStudySessionId(stored.studySessionId)
          setStoredMeta(stored)
          if (stored.state.status === 'completed' && stored.pendingResult) {
            setResult(stored.pendingResult)
          }
        } else {
          const totalQuestions = definition.stages.reduce((sum, stage) => sum + stage.questions.length, 0)
          const session = await studyService.createSession(user.id, 'game_mission', deckId, totalQuestions)
          const now = new Date().toISOString()
          const initial: MissionAttemptState = {
            deckId,
            curriculumFingerprint: fingerprint,
            missionIndex,
            stageIndex: 0,
            questionIndex: 0,
            answers: [],
            startedAt: now,
            updatedAt: now,
            status: 'in_progress',
          }
          setAttempt(initial)
          setStudySessionId(session.id)
          const record: StoredGameMissionAttempt = {
            key: gameMissionAttemptKey(user.id, deckId, fingerprint, missionIndex),
            userId: user.id,
            deckId,
            curriculumFingerprint: fingerprint,
            missionIndex,
            studySessionId: session.id,
            state: initial,
            updatedAt: now,
          }
          await gameMissionLocalDb.saveAttempt(record)
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Không thể tải Mission.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
      stopSpeaking()
    }
  }, [deckId, isPro, missionIndex, user])

  const currentStage = loaded && attempt ? loaded.definition.stages[attempt.stageIndex] : null
  const currentQuestion = currentStage && currentStage.type !== 'learn' ? currentStage.questions[attempt?.questionIndex ?? 0] : null
  const currentLearnTerm = currentStage?.type === 'learn' && loaded
    ? loaded.missionTerms[attempt?.questionIndex ?? 0]
    : null

  useEffect(() => {
    setAnswerValue('')
    setAttemptNumber(1)
    setHintLevel(0)
    setFeedback(null)
    if (currentQuestion?.audioText) {
      void speak(currentQuestion.audioText, {
        audioUrl: currentQuestion.audioUrl,
        globalTermId: currentQuestion.targetTermId,
      })
    }
  }, [currentQuestion?.id])

  useEffect(() => {
    if (currentStage?.type !== 'matching') return
    setMatchingSelections({})
    setMatchingReviewed(false)
  }, [attempt?.stageIndex, currentStage?.type])

  const matchingOptions = useMemo(() => {
    if (currentStage?.type !== 'matching') return []
    return [...currentStage.questions]
      .map((question) => question.acceptedAnswers[0])
      .filter(Boolean)
      .reverse()
      .map((answer) => ({ value: answer, label: answer }))
  }, [currentStage])

  const progressPercent = useMemo(() => {
    if (!loaded || !attempt) return 0
    const total = loaded.definition.stages.length
    return Math.round(((attempt.stageIndex + 1) / total) * 100)
  }, [attempt, loaded])

  const persistTransition = async (next: MissionAttemptState) => {
    setAttempt(next)
    await saveAttempt(next, studySessionId)
  }

  const nextLearn = async () => {
    if (!attempt || !currentStage || !loaded) return
    stopSpeaking()
    if (attempt.questionIndex + 1 < loaded.missionTerms.length) {
      await persistTransition({ ...attempt, questionIndex: attempt.questionIndex + 1, updatedAt: new Date().toISOString() })
      return
    }
    await persistTransition({ ...attempt, stageIndex: attempt.stageIndex + 1, questionIndex: 0, updatedAt: new Date().toISOString() })
  }

  const gradeQuestion = (question: QuestionDefinition, submitted: string) => {
    const normalized = normalizeMissionAnswer(submitted)
    return question.acceptedAnswers.some((answer) => normalizeMissionAnswer(answer) === normalized)
  }

  const checkMatching = async () => {
    if (!attempt || currentStage?.type !== 'matching' || matchingReviewed) return
    if (currentStage.questions.some((question) => !matchingSelections[question.id])) return

    const now = new Date().toISOString()
    const stageQuestionIds = new Set(currentStage.questions.map((question) => question.id))
    const records: AnswerRecord[] = currentStage.questions.map((question) => {
      const selected = matchingSelections[question.id] ?? ''
      const correct = normalizeMissionAnswer(selected) === normalizeMissionAnswer(question.acceptedAnswers[0] ?? '')
      return {
        questionId: question.id,
        targetTermId: question.targetTermId,
        type: question.type,
        attempts: 1,
        hintLevel: 0,
        isCorrect: correct,
        firstTryCorrect: correct,
        score: correct ? 100 : 0,
        answeredAt: now,
      }
    })

    const next = {
      ...attempt,
      answers: [
        ...attempt.answers.filter((item) => !stageQuestionIds.has(item.questionId)),
        ...records,
      ],
      updatedAt: now,
    }
    setAttempt(next)
    setMatchingReviewed(true)
    await saveAttempt(next, studySessionId)
  }

  const continueAfterMatching = async () => {
    if (!attempt || !loaded || currentStage?.type !== 'matching' || !matchingReviewed) return
    if (attempt.stageIndex + 1 < loaded.definition.stages.length) {
      await persistTransition({
        ...attempt,
        stageIndex: attempt.stageIndex + 1,
        questionIndex: 0,
        updatedAt: new Date().toISOString(),
      })
      return
    }
    await finishMission(attempt)
  }

  const submitAnswer = async () => {
    if (!attempt || !currentQuestion || feedback?.finalized || !answerValue.trim()) return
    const correct = gradeQuestion(currentQuestion, answerValue)
    if (!correct && attemptNumber < 2) {
      setAttemptNumber(2)
      setHintLevel(1)
      setFeedback({ correct: false, finalized: false, text: 'Chưa đúng. Dùng gợi ý và thử lại một lần nữa.' })
      setAnswerValue('')
      return
    }

    const record: AnswerRecord = {
      questionId: currentQuestion.id,
      targetTermId: currentQuestion.targetTermId,
      type: currentQuestion.type,
      attempts: attemptNumber,
      hintLevel,
      isCorrect: correct,
      firstTryCorrect: correct && attemptNumber === 1,
      score: correct ? (attemptNumber === 1 ? 100 : 50) : 0,
      answeredAt: new Date().toISOString(),
    }
    const next = {
      ...attempt,
      answers: [...attempt.answers.filter((item) => item.questionId !== record.questionId), record],
      updatedAt: new Date().toISOString(),
    }
    setAttempt(next)
    await saveAttempt(next, studySessionId)
    setFeedback({
      correct,
      finalized: true,
      text: correct ? (attemptNumber === 1 ? 'Chính xác ngay lần đầu!' : 'Đúng sau khi gọi lại lần nữa.') : 'Chưa chính xác. Hãy xem đáp án và tiếp tục.',
    })
  }

  const syncCompletion = useCallback(async (state: MissionAttemptState, stats: MissionResult) => {
    if (!user || !deckId || !loaded || syncingRef.current) return
    syncingRef.current = true
    setSyncing(true)
    setError(null)
    try {
      let meta = storedMeta
      if (!meta.srsSynced) {
        const snapshots = await gameMissionService.getReviewSnapshots(user.id, loaded.missionTerms.map((term) => term.globalTermId))
        const actions = buildMissionReviewActions(state.answers, snapshots)
        const correctCount = state.answers.filter((item) => item.isCorrect).length
        const difficultCount = state.answers.filter((item) => item.hintLevel > 0 || !item.isCorrect).length
        await studyService.flushStudyChanges({
          actions,
          viewedTermIds: loaded.missionTerms.map((term) => term.globalTermId),
          sessionId: studySessionId,
          sessionPatch: studySessionId ? {
            total_cards: state.answers.length,
            viewed_cards: state.answers.length,
            remembered_count: correctCount,
            difficult_count: difficultCount,
          } : null,
        })
        meta = { ...meta, srsSynced: true }
        await saveAttempt(state, studySessionId, { pendingResult: stats, srsSynced: true })
      }
      if (studySessionId && !meta.studySessionEnded) {
        await studyService.endSession(studySessionId, {
          total_cards: state.answers.length,
          viewed_cards: state.answers.length,
          remembered_count: state.answers.filter((item) => item.isCorrect).length,
          difficult_count: state.answers.filter((item) => item.hintLevel > 0 || !item.isCorrect).length,
        })
        meta = { ...meta, studySessionEnded: true }
        await saveAttempt(state, studySessionId, { pendingResult: stats, srsSynced: true, studySessionEnded: true })
      }
      if (!meta.progressSynced) {
        await gameMissionService.completeMission(deckId, loaded.fingerprint, missionIndex, stats.score, stats.accuracy)
        await saveAttempt(state, studySessionId, {
          pendingResult: stats,
          srsSynced: true,
          studySessionEnded: true,
          progressSynced: true,
        })
      }
      await gameMissionLocalDb.clearAttempt(user.id, deckId, loaded.fingerprint, missionIndex)
      setStoredMeta({ srsSynced: true, studySessionEnded: true, progressSynced: true })
      setResult(stats)
    } catch (cause) {
      setResult(stats)
      setError(cause instanceof Error ? cause.message : 'Không thể đồng bộ kết quả. Hãy thử lại.')
    } finally {
      syncingRef.current = false
      setSyncing(false)
    }
  }, [deckId, loaded, missionIndex, saveAttempt, storedMeta, studySessionId, user])

  useEffect(() => {
    if (!user || !deckId || !loaded || !attempt || attempt.status !== 'completed' || !result) return

    if (storedMeta.progressSynced) {
      void gameMissionLocalDb.clearAttempt(user.id, deckId, loaded.fingerprint, missionIndex)
      return
    }

    void syncCompletion(attempt, result)
  }, [
    attempt,
    deckId,
    loaded,
    missionIndex,
    result,
    storedMeta.progressSynced,
    syncCompletion,
    user,
  ])

  const finishMission = async (state: MissionAttemptState) => {
    if (!loaded) return
    const completedState = { ...state, status: 'completed' as const, updatedAt: new Date().toISOString() }
    const stats = calculateMissionScore(loaded.definition, completedState.answers)
    setAttempt(completedState)
    setResult(stats)
    await saveAttempt(completedState, studySessionId, { pendingResult: stats })
    await syncCompletion(completedState, stats)
  }

  const nextQuestion = async () => {
    if (!attempt || !currentStage || !loaded || !feedback?.finalized) return
    if (attempt.questionIndex + 1 < currentStage.questions.length) {
      await persistTransition({ ...attempt, questionIndex: attempt.questionIndex + 1, updatedAt: new Date().toISOString() })
      return
    }
    if (attempt.stageIndex + 1 < loaded.definition.stages.length) {
      await persistTransition({ ...attempt, stageIndex: attempt.stageIndex + 1, questionIndex: 0, updatedAt: new Date().toISOString() })
      return
    }
    await finishMission(attempt)
  }

  const playCurrentAudio = () => {
    const term = currentLearnTerm
    if (term) {
      void speak(term.sourceText, { audioUrl: term.audioUrl, globalTermId: term.globalTermId, lang: term.sourceLanguage })
      return
    }
    if (currentQuestion?.audioText) {
      const target = loaded?.missionTerms.find((item) => item.globalTermId === currentQuestion.targetTermId)
      void speak(currentQuestion.audioText, {
        audioUrl: currentQuestion.audioUrl,
        globalTermId: currentQuestion.targetTermId,
        lang: target?.sourceLanguage,
      })
    }
  }

  const restartMission = async () => {
    if (!user || !deckId || !loaded) return
    setSyncing(true)
    setError(null)
    try {
      await gameMissionLocalDb.clearAttempt(user.id, deckId, loaded.fingerprint, missionIndex)
      const totalQuestions = loaded.definition.stages.reduce((sum, stage) => sum + stage.questions.length, 0)
      const session = await studyService.createSession(user.id, 'game_mission', deckId, totalQuestions)
      const now = new Date().toISOString()
      const initial: MissionAttemptState = {
        deckId,
        curriculumFingerprint: loaded.fingerprint,
        missionIndex,
        stageIndex: 0,
        questionIndex: 0,
        answers: [],
        startedAt: now,
        updatedAt: now,
        status: 'in_progress',
      }
      await gameMissionLocalDb.saveAttempt({
        key: gameMissionAttemptKey(user.id, deckId, loaded.fingerprint, missionIndex),
        userId: user.id,
        deckId,
        curriculumFingerprint: loaded.fingerprint,
        missionIndex,
        studySessionId: session.id,
        state: initial,
        updatedAt: now,
      })
      setStoredMeta({})
      setStudySessionId(session.id)
      setAttempt(initial)
      setResult(null)
      setAnswerValue('')
      setAttemptNumber(1)
      setHintLevel(0)
      setFeedback(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể bắt đầu lượt chơi lại.')
    } finally {
      setSyncing(false)
    }
  }

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center font-black">Đang tải Mission...</div>

  if (!loaded || !attempt || error && !result) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <div className="neo-card space-y-4 p-6">
          <h1 className="text-xl font-black">Không thể tiếp tục Mission</h1>
          <p className="font-semibold text-muted-foreground">{error ?? 'Dữ liệu Mission không khả dụng.'}</p>
          <Button variant="ghost" onClick={() => navigate(deckId ? '/app/games/mission/' + deckId : '/app/games')}>
            <ArrowLeft className="h-4 w-4" /> Quay lại
          </Button>
        </div>
      </div>
    )
  }

  if (result) {
    return (
      <div className="mx-auto max-w-2xl space-y-5 px-4 py-8">
        <div className="neo-card bg-primary p-8 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14" />
          <h1 className="mt-3 text-3xl font-black">Mission hoàn thành!</h1>
          <p className="mt-2 font-bold">Bạn đã đi hết vòng học chung của Mission {missionIndex + 1}.</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="neo-card p-4 text-center"><div className="text-2xl font-black">{result.score}</div><div className="text-xs font-bold text-muted-foreground">Điểm</div></div>
          <div className="neo-card p-4 text-center"><div className="text-2xl font-black">{result.accuracy}%</div><div className="text-xs font-bold text-muted-foreground">Chính xác</div></div>
          <div className="neo-card p-4 text-center"><div className="text-2xl font-black">{result.firstTryAccuracy}%</div><div className="text-xs font-bold text-muted-foreground">Lần đầu</div></div>
        </div>
        {!storedMeta.progressSynced && !error ? (
          <div className="neo-card bg-amber-50 p-4 font-bold text-amber-950">
            Đang đồng bộ kết quả, lịch ôn và tiến trình Mission...
          </div>
        ) : null}
        {error ? (
          <div className="neo-card space-y-3 bg-rose-50 p-4">
            <p className="font-bold text-rose-900">Kết quả đang chờ đồng bộ: {error}</p>
            <Button disabled={syncing} onClick={() => void syncCompletion(attempt, result)}>
              {syncing ? 'Đang đồng bộ...' : 'Thử đồng bộ lại'}
            </Button>
          </div>
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="ghost" className="flex-1" disabled={syncing || !storedMeta.progressSynced} onClick={() => navigate('/app/games/mission/' + deckId)}>
            Về lộ trình
          </Button>
          <Button variant="secondary" className="flex-1" disabled={syncing || !storedMeta.progressSynced} onClick={() => void restartMission()}>
            <RotateCcw className="h-4 w-4" /> Chơi lại
          </Button>
          {missionIndex + 1 < loaded.missionCount ? (
            <Button className="flex-1" disabled={Boolean(error) || syncing || !storedMeta.progressSynced} onClick={() => navigate('/app/games/mission/' + deckId + '/' + (missionIndex + 1))}>
              Mission tiếp theo
            </Button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-5">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => setExitOpen(true)}><ArrowLeft className="h-4 w-4" /> Thoát</Button>
        <div className="text-right">
          <div className="text-xs font-black uppercase text-muted-foreground">Mission {missionIndex + 1}</div>
          <div className="text-sm font-black">{currentStage ? stageLabel(currentStage.type) : ''}</div>
        </div>
      </div>

      <div className="h-4 overflow-hidden rounded-full border-2 border-border bg-card">
        <div className="h-full bg-primary transition-all" style={{ width: String(progressPercent) + '%' }} />
      </div>

      {currentStage?.type === 'learn' && currentLearnTerm ? (
        <div className="neo-card space-y-6 p-6 sm:p-8">
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Từ {attempt.questionIndex + 1}/{loaded.missionTerms.length}
            </p>
            <h1 className="mt-2 text-4xl font-black">{currentLearnTerm.sourceText}</h1>
            {currentLearnTerm.ipa ? <p className="mt-2 font-mono text-sm font-bold text-muted-foreground">{currentLearnTerm.ipa}</p> : null}
            <Button variant="secondary" className="mt-4" onClick={playCurrentAudio}>
              <Volume2 className="h-4 w-4" /> Nghe phát âm
            </Button>
          </div>
          <div className="rounded-xl border-2 border-border bg-muted/30 p-4">
            <p className="text-2xl font-black">{currentLearnTerm.translation || 'Chưa có bản dịch'}</p>
            {currentLearnTerm.examples[0]?.sentence ? (
              <div className="mt-4 border-t-2 border-dashed border-border pt-3">
                <p className="font-bold">{currentLearnTerm.examples[0].sentence}</p>
                {currentLearnTerm.examples[0].translation ? <p className="mt-1 text-sm font-semibold text-muted-foreground">{currentLearnTerm.examples[0].translation}</p> : null}
              </div>
            ) : null}
          </div>
          <Button className="w-full" onClick={() => void nextLearn()}>
            {attempt.questionIndex + 1 < loaded.missionTerms.length ? 'Từ tiếp theo' : 'Bắt đầu thử thách'}
          </Button>
        </div>
      ) : currentStage?.type === 'matching' ? (
        <div className="neo-card space-y-5 p-6 sm:p-8">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Matching</p>
            <h1 className="mt-1 text-2xl font-black">Ghép mỗi từ với nghĩa đúng</h1>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">
              Hoàn thành tất cả cặp rồi kiểm tra cùng một lúc.
            </p>
          </div>

          <div className="space-y-3">
            {currentStage.questions.map((question) => {
              const selected = matchingSelections[question.id] ?? ''
              const correct = normalizeMissionAnswer(selected) === normalizeMissionAnswer(question.acceptedAnswers[0] ?? '')
              return (
                <div
                  key={question.id}
                  className={
                    'rounded-xl border-2 p-3 ' +
                    (matchingReviewed
                      ? correct
                        ? 'border-emerald-700 bg-emerald-50'
                        : 'border-rose-700 bg-rose-50'
                      : 'border-border bg-muted/20')
                  }
                >
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] sm:items-center">
                    <p className="text-lg font-black">{question.prompt}</p>
                    <Select
                      value={selected}
                      onChange={(value) => {
                        if (matchingReviewed) return
                        setMatchingSelections((previous) => ({ ...previous, [question.id]: value }))
                      }}
                      options={matchingOptions}
                      placeholder="Chọn nghĩa..."
                      disabled={matchingReviewed}
                    />
                  </div>
                  {matchingReviewed && !correct ? (
                    <p className="mt-2 text-xs font-bold text-rose-900">
                      Đáp án đúng: {question.acceptedAnswers[0]}
                    </p>
                  ) : null}
                </div>
              )
            })}
          </div>

          {matchingReviewed ? (
            <Button className="w-full" onClick={() => void continueAfterMatching()}>
              Tiếp tục
            </Button>
          ) : (
            <Button
              className="w-full"
              disabled={currentStage.questions.some((question) => !matchingSelections[question.id])}
              onClick={() => void checkMatching()}
            >
              Kiểm tra tất cả cặp
            </Button>
          )}
        </div>
      ) : currentQuestion ? (
        <div className="neo-card space-y-5 p-6 sm:p-8">
          {currentStage?.type === 'boss' ? (
            <div className="flex items-center gap-2 font-black text-rose-700"><Swords className="h-5 w-5" /> BOSS BATTLE</div>
          ) : null}
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            Câu {attempt.questionIndex + 1}/{currentStage?.questions.length ?? 0}
          </p>
          {currentQuestion.audioText ? (
            <Button variant="secondary" onClick={playCurrentAudio}>
              <Headphones className="h-4 w-4" /> Phát lại audio
            </Button>
          ) : null}
          <h1 className="text-2xl font-black leading-relaxed">{currentQuestion.prompt}</h1>

          {hintLevel > 0 ? (
            <div className="rounded-xl border-2 border-amber-600 bg-amber-50 p-3 text-sm font-bold text-amber-950">
              <Lightbulb className="mr-2 inline h-4 w-4" />
              Gợi ý: bắt đầu bằng “{currentQuestion.hint?.firstLetter || '?'}”, {currentQuestion.hint?.wordCount || 1} từ
              {currentQuestion.hint?.ipa ? ' · ' + currentQuestion.hint.ipa : ''}
            </div>
          ) : null}

          {currentQuestion.options ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {currentQuestion.options.map((option) => (
                <Button
                  key={option.id}
                  variant={answerValue === option.label ? 'secondary' : 'ghost'}
                  className="min-h-14 whitespace-normal text-left"
                  onClick={() => !feedback?.finalized && setAnswerValue(option.label)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          ) : (
            <Input
              autoFocus
              value={answerValue}
              onChange={(event) => setAnswerValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  if (feedback?.finalized) void nextQuestion()
                  else void submitAnswer()
                }
              }}
              disabled={feedback?.finalized}
              placeholder="Nhập câu trả lời..."
              className="text-lg"
            />
          )}

          {feedback ? (
            <div className={'rounded-xl border-2 p-4 font-bold ' + (feedback.correct ? 'border-emerald-700 bg-emerald-50 text-emerald-900' : 'border-rose-700 bg-rose-50 text-rose-900')}>
              {feedback.correct ? <CheckCircle2 className="mr-2 inline h-5 w-5" /> : <XCircle className="mr-2 inline h-5 w-5" />}
              {feedback.text}
              {feedback.finalized && !feedback.correct ? (
                <div className="mt-2 text-sm">Đáp án: <strong>{currentQuestion.acceptedAnswers[0]}</strong></div>
              ) : null}
            </div>
          ) : null}

          <div className="flex gap-3">
            {!feedback?.finalized ? (
              <Button className="flex-1" disabled={!answerValue.trim()} onClick={() => void submitAnswer()}>
                Kiểm tra
              </Button>
            ) : (
              <Button className="flex-1" onClick={() => void nextQuestion()}>
                {attempt.stageIndex + 1 >= loaded.definition.stages.length && attempt.questionIndex + 1 >= (currentStage?.questions.length ?? 0)
                  ? 'Hoàn thành Mission'
                  : 'Tiếp tục'}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="neo-card p-6">
          <p className="font-bold">Stage hiện tại không có câu hỏi hợp lệ.</p>
          <Button className="mt-4" onClick={() => {
            if (!attempt || !loaded) return
            if (attempt.stageIndex + 1 < loaded.definition.stages.length) {
              void persistTransition({ ...attempt, stageIndex: attempt.stageIndex + 1, questionIndex: 0, updatedAt: new Date().toISOString() })
            } else {
              void finishMission(attempt)
            }
          }}>Bỏ qua stage</Button>
        </div>
      )}

      <ConfirmModal
        open={exitOpen}
        title="Rời Mission?"
        description="Tiến trình hiện tại đã được lưu trên thiết bị này. Bạn có thể tiếp tục lại từ lộ trình."
        confirmLabel="Rời Mission"
        cancelLabel="Tiếp tục học"
        variant="primary"
        onConfirm={() => navigate('/app/games/mission/' + deckId)}
        onCancel={() => setExitOpen(false)}
      />
    </div>
  )
}
