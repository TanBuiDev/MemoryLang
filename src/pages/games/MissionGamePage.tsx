import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'
import { useSoundStore } from '@/stores/useSoundStore'
import { supabase } from '@/services/supabase/client'
import { gameMissionService } from '@/services/supabase/gameMission.service'
import { studyService } from '@/services/supabase/study.service'
import { buildStoredGameMissionAttempt, gameMissionLocalDb, gameMissionAttemptKey, type StoredGameMissionAttempt } from '@/services/local/gameMissionLocalDb'
import { gameMissionSyncService } from '@/services/local/gameMissionSync.service'
import { buildMissionTermGroups, createCurriculumContentVersion, createCurriculumFingerprint } from '@/features/games/mission/curriculum'
import { calculateMissionScore, createMissionDefinition, evaluateMissionReadiness } from '@/features/games/mission/missionEngine'
import { normalizeMissionAnswer } from '@/features/games/mission/generators'
import { getMissionScript } from '@/features/games/mission/scriptRegistry'
import { missionAttemptReducer, shouldAutoSyncMission, type MissionAttemptAction } from '@/features/games/mission/missionReducer'
import { getDeckGameConfig } from '@/features/games/mission/gameConfig'
import { calculateMissionProgress, createSkippedMissionAnswer, getMissionContextTranslation, getMissionRetryFeedback, getSkippedMissionTerms, scoreMissionAnswer, selectMatchingTranslation } from '@/features/games/mission/missionInteraction'
import { createMissionAudioCoordinator, parseMissionSoundConfig } from '@/features/games/mission/missionAudio'
import { MissionLearnStage } from '@/features/games/mission/components/MissionLearnStage'
import { MissionMatchingStage } from '@/features/games/mission/components/MissionMatchingStage'
import { MissionQuestionStage, type MissionQuestionFeedback } from '@/features/games/mission/components/MissionQuestionStage'
import { MissionResultView } from '@/features/games/mission/components/MissionResultView'
import { MissionReviewView } from '@/features/games/mission/components/MissionReviewView'
import { buildMissionReviewItems } from '@/features/games/mission/missionReview'
import type { AnswerRecord, GameTerm, MissionAttemptState, MissionDefinition, QuestionDefinition } from '@/features/games/mission/mission.types'
import type { Deck } from '@/types/deck.types'
import { speak, stopSpeaking } from '@/utils/audio'
import { soundEffects } from '@/utils/soundEffects'

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
  const sfxEnabled = useSoundStore((state) => state.sfxEnabled)
  const toggleSfx = useSoundStore((state) => state.toggleSfx)
  const missionIndex = Number(missionIndexParam)

  const [loaded, setLoaded] = useState<LoadedMission | null>(null)
  const [attempt, dispatchAttempt] = useReducer(missionAttemptReducer, null)
  const [studySessionId, setStudySessionId] = useState<string | null>(null)
  const [storedMeta, setStoredMeta] = useState<Partial<StoredGameMissionAttempt>>({})
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<MissionResult | null>(null)
  const [answerValue, setAnswerValue] = useState('')
  const [attemptNumber, setAttemptNumber] = useState(1)
  const [hintLevel, setHintLevel] = useState(0)
  const [contextTranslationShown, setContextTranslationShown] = useState(false)
  const [firstSubmittedAnswer, setFirstSubmittedAnswer] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<MissionQuestionFeedback | null>(null)
  const [matchingSelections, setMatchingSelections] = useState<Record<string, string>>({})
  const [matchingReviewed, setMatchingReviewed] = useState(false)
  const [exitOpen, setExitOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [relearnIndex, setRelearnIndex] = useState<number | null>(null)
  const syncingRef = useRef(false)
  const finishingRef = useRef(false)
  const attemptRef = useRef<MissionAttemptState | null>(null)
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())
  const audioRef = useRef<ReturnType<typeof createMissionAudioCoordinator> | null>(null)
  if (!audioRef.current) {
    audioRef.current = createMissionAudioCoordinator(speak, stopSpeaking, (effect) => soundEffects.play(effect))
  }

  useEffect(() => soundEffects.initMobileUnlock(), [])

  useEffect(() => {
    let cancelled = false
    void supabase.from('app_settings').select('value').eq('key', 'sfx_config').maybeSingle().then(({ data }) => {
      if (cancelled || !data?.value) return
      const config = parseMissionSoundConfig(data?.value)
      useSoundStore.getState().setEngineMode(config.mode)
      useSoundStore.getState().setCustomSoundUrls(config.urls)
      if (config.mode === 'custom_files') {
        for (const [name, url] of Object.entries(config.urls)) {
          void soundEffects.preloadAudioBuffer(name, url)
        }
      }
    })
    return () => { cancelled = true }
  }, [])

  const saveAttempt = useCallback(async (
    nextState: MissionAttemptState,
    nextSessionId: string | null,
    patch: Partial<StoredGameMissionAttempt> = {},
  ) => {
    if (!user || !deckId || !loaded) return
    const record = buildStoredGameMissionAttempt({
      ...storedMeta,
      ...patch,
      key: gameMissionAttemptKey(user.id, deckId, loaded.fingerprint, missionIndex),
      userId: user.id,
      deckId,
      curriculumFingerprint: loaded.fingerprint,
      missionIndex,
      studySessionId: nextSessionId,
      state: nextState,
      updatedAt: new Date().toISOString(),
    }, nextState, new Date().toISOString())
    setStoredMeta((previous) => ({ ...previous, ...patch }))
    saveQueueRef.current = saveQueueRef.current.catch(() => undefined).then(() => gameMissionLocalDb.saveAttempt(record))
    await saveQueueRef.current
  }, [deckId, loaded, missionIndex, storedMeta, user])

  const persistAttemptAction = useCallback(async (action: MissionAttemptAction) => {
    const next = missionAttemptReducer(attemptRef.current, action)
    if (!next) return null
    attemptRef.current = next
    dispatchAttempt(action)
    await saveAttempt(next, studySessionId)
    return next
  }, [saveAttempt, studySessionId])

  const persistDraft = useCallback((draft: NonNullable<MissionAttemptState['draft']>) => {
    const current = attemptRef.current
    if (!current) return
    const action: MissionAttemptAction = { type: 'setDraft', draft, at: new Date().toISOString() }
    const next = missionAttemptReducer(current, action)
    if (!next) return
    attemptRef.current = next
    dispatchAttempt(action)
    void saveAttempt(next, studySessionId).catch(() => setError('Không thể lưu câu trả lời đang nhập.'))
  }, [saveAttempt, studySessionId])

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
          attemptRef.current = stored.state
          dispatchAttempt({ type: 'restore', state: stored.state })
          setStudySessionId(stored.studySessionId)
          setStoredMeta(stored)
          setAnswerValue(stored.state.draft?.answerValue ?? '')
          setAttemptNumber(stored.state.draft?.attemptNumber ?? 1)
          setHintLevel(stored.state.draft?.hintLevel ?? ((stored.state.draft?.attemptNumber ?? 1) > 1 ? 1 : 0))
          setContextTranslationShown(stored.state.draft?.contextTranslationShown ?? false)
          setFirstSubmittedAnswer(stored.state.draft?.firstSubmittedAnswer ?? null)
          setMatchingSelections(stored.state.draft?.matchingSelections ?? {})
          setMatchingReviewed(stored.state.draft?.matchingReviewed ?? false)
          const restoredStage = definition.stages[stored.state.stageIndex]
          const restoredQuestion = restoredStage?.questions[stored.state.questionIndex]
          const priorAnswer = stored.state.answers.find((item) => item.questionId === restoredQuestion?.id)
          setFeedback(priorAnswer ? {
            correct: priorAnswer.isCorrect,
            finalized: true,
            text: priorAnswer.skipped ? 'Không sao, hãy xem đáp án và nghe lại từ này.' : priorAnswer.isCorrect ? 'Đã trả lời đúng.' : 'Chưa đúng. Hãy xem đáp án rồi tiếp tục.',
          } : (stored.state.draft?.attemptNumber ?? 1) > 1 ? {
            correct: false,
            finalized: false,
            text: 'Chưa đúng. Bạn có thể xem gợi ý rồi thử thêm một lần.',
          } : null)
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
          attemptRef.current = initial
          dispatchAttempt({ type: 'restore', state: initial })
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
      audioRef.current?.transition()
    }
  }, [deckId, isPro, missionIndex, user])

  const currentStage = loaded && attempt ? loaded.definition.stages[attempt.stageIndex] : null
  const currentQuestion = currentStage && currentStage.type !== 'learn' ? currentStage.questions[attempt?.questionIndex ?? 0] : null
  const contextTranslation = currentQuestion?.type === 'context_cloze' && loaded
    ? getMissionContextTranslation(currentQuestion, loaded.missionTerms)
    : null
  const currentLearnTerm = currentStage?.type === 'learn' && loaded
    ? loaded.missionTerms[attempt?.questionIndex ?? 0]
    : null

  useEffect(() => {
    if (!currentLearnTerm || !attempt || result) return
    audioRef.current?.playLearn(
      attempt.startedAt + ':learn:' + attempt.questionIndex,
      currentLearnTerm.sourceText,
      {
        audioUrl: currentLearnTerm.audioUrl,
        globalTermId: currentLearnTerm.globalTermId,
        lang: currentLearnTerm.sourceLanguage,
      },
    )
  }, [attempt, currentLearnTerm, result])

  useEffect(() => {
    if (currentQuestion?.audioText) {
      const target = loaded?.missionTerms.find((item) => item.globalTermId === currentQuestion.targetTermId)
      void speak(currentQuestion.audioText, {
        audioUrl: currentQuestion.audioUrl,
        globalTermId: currentQuestion.targetTermId,
        lang: target?.sourceLanguage,
      })
    }
  }, [currentQuestion?.id, currentQuestion?.audioText, currentQuestion?.audioUrl, currentQuestion?.targetTermId, loaded])

  const matchingOptions = useMemo(() => {
    if (currentStage?.type !== 'matching') return []
    return [...currentStage.questions]
      .map((question) => question.acceptedAnswers[0])
      .filter(Boolean)
      .reverse()
      .map((answer) => ({ value: answer, label: answer }))
  }, [currentStage])

  const skippedTerms = useMemo(() => loaded && attempt
    ? getSkippedMissionTerms(loaded.missionTerms, attempt.answers)
    : [], [loaded, attempt])

  useEffect(() => {
    if (relearnIndex === null || !result) return
    const term = skippedTerms[relearnIndex]
    if (!term) return
    audioRef.current?.playLearn(
      attempt?.startedAt + ':relearn:' + relearnIndex,
      term.sourceText,
      { audioUrl: term.audioUrl, globalTermId: term.globalTermId, lang: term.sourceLanguage },
    )
  }, [relearnIndex, result, skippedTerms, attempt?.startedAt])

  const progressPercent = useMemo(() => {
    if (!loaded || !attempt) return 0
    return calculateMissionProgress(loaded.definition, attempt)
  }, [attempt, loaded])

  const persistTransition = async (next: MissionAttemptState) => {
    audioRef.current?.transition()
    setAnswerValue('')
    setAttemptNumber(1)
    setHintLevel(0)
    setContextTranslationShown(false)
    setFirstSubmittedAnswer(null)
    setFeedback(null)
    setMatchingSelections({})
    setMatchingReviewed(false)
    await persistAttemptAction({
      type: 'transition',
      stageIndex: next.stageIndex,
      questionIndex: next.questionIndex,
      at: next.updatedAt,
    })
  }

  const nextLearn = async () => {
    if (!attempt || !currentStage || !loaded) return
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
        submittedAnswer: selected,
      }
    })

    const next = missionAttemptReducer(attempt, {
      type: 'recordAnswers',
      answers: records,
      at: now,
    })
    if (!next) return
    const reviewed = missionAttemptReducer(next, { type: 'setDraft', draft: { matchingSelections, matchingReviewed: true }, at: now })
    if (!reviewed) return
    attemptRef.current = reviewed
    dispatchAttempt({ type: 'recordAnswers', answers: records, at: now })
    dispatchAttempt({ type: 'setDraft', draft: { matchingSelections, matchingReviewed: true }, at: now })
    setMatchingReviewed(true)
    if (records.every((record) => record.isCorrect)) audioRef.current?.correct(attempt.startedAt + ':matching')
    else audioRef.current?.wrong()
    await saveAttempt(reviewed, studySessionId)
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
      audioRef.current?.wrong()
      const nextHintLevel = Math.max(hintLevel, 1)
      setAttemptNumber(2)
      setHintLevel(nextHintLevel)
      setFeedback({ correct: false, finalized: false, text: getMissionRetryFeedback(answerValue, currentQuestion.acceptedAnswers[0] ?? '') })
      setAnswerValue('')
      setFirstSubmittedAnswer(answerValue)
      persistDraft({ answerValue: '', attemptNumber: 2, hintLevel: nextHintLevel, contextTranslationShown, firstSubmittedAnswer: answerValue })
      return
    }

    const effectiveHintLevel = Math.max(hintLevel, contextTranslationShown ? 1 : 0)
    const record: AnswerRecord = {
      questionId: currentQuestion.id,
      targetTermId: currentQuestion.targetTermId,
      type: currentQuestion.type,
      attempts: attemptNumber,
      hintLevel: effectiveHintLevel,
      isCorrect: correct,
      firstTryCorrect: correct && attemptNumber === 1 && effectiveHintLevel === 0,
      score: scoreMissionAnswer(correct, attemptNumber, effectiveHintLevel),
      answeredAt: new Date().toISOString(),
      submittedAnswer: answerValue,
      firstSubmittedAnswer: firstSubmittedAnswer ?? undefined,
    }
    const answerAt = new Date().toISOString()
    const next = missionAttemptReducer(attempt, {
      type: 'recordAnswers',
      answers: [{ ...record, answeredAt: answerAt }],
      at: answerAt,
    })
    if (!next) return
    attemptRef.current = next
    dispatchAttempt({
      type: 'recordAnswers',
      answers: [{ ...record, answeredAt: answerAt }],
      at: answerAt,
    })
    await saveAttempt(next, studySessionId)
    setFeedback({
      correct,
      finalized: true,
      text: correct ? (attemptNumber === 1 && effectiveHintLevel === 0 ? 'Chính xác ngay lần đầu!' : attemptNumber > 1 ? 'Đúng rồi ở lần thử thứ hai!' : 'Đúng rồi! Bạn đã dùng gợi ý.') : 'Chưa đúng. Hãy xem đáp án rồi tiếp tục.',
    })
    if (correct) {
      const target = loaded?.missionTerms.find((item) => item.globalTermId === currentQuestion.targetTermId)
      audioRef.current?.correct(
        attempt.startedAt + ':' + currentQuestion.id,
        currentQuestion.type === 'listening_typing' ? currentQuestion.audioText : undefined,
        currentQuestion.type === 'listening_typing' ? {
          audioUrl: currentQuestion.audioUrl,
          globalTermId: currentQuestion.targetTermId,
          lang: target?.sourceLanguage,
        } : undefined,
      )
    } else {
      audioRef.current?.wrong()
    }
  }

  const syncCompletion = useCallback(async (state: MissionAttemptState, stats: MissionResult) => {
    if (!user || !deckId || !loaded || syncingRef.current) return
    syncingRef.current = true
    setSyncing(true)
    setError(null)
    try {
      const synced = await gameMissionSyncService.syncCompletion({
        userId: user.id,
        deckId,
        curriculumFingerprint: loaded.fingerprint,
        missionIndex,
        studySessionId,
        state,
        stats,
        missionTermIds: loaded.missionTerms.map((term) => term.globalTermId),
      })
      setStoredMeta(synced)
      setResult(stats)
    } catch (cause) {
      const pending = await gameMissionLocalDb.getAttempt(
        user.id,
        deckId,
        loaded.fingerprint,
        missionIndex,
      )
      setStoredMeta(pending ?? {})
      setResult(stats)
      setError(cause instanceof Error ? cause.message : 'Không thể đồng bộ kết quả. Hãy thử lại.')
    } finally {
      syncingRef.current = false
      setSyncing(false)
    }
  }, [deckId, loaded, missionIndex, studySessionId, user])

  useEffect(() => {
    if (!user || !deckId || !loaded || !attempt || !result) return
    if (storedMeta.progressSynced) {
      void gameMissionLocalDb.clearAttempt(user.id, deckId, loaded.fingerprint, missionIndex)
      return
    }
    if (!shouldAutoSyncMission(attempt.status === 'completed', Boolean(result), Boolean(storedMeta.progressSynced), finishingRef.current, Boolean(error))) return
    void syncCompletion(attempt, result)
  }, [
    attempt,
    deckId,
    error,
    loaded,
    missionIndex,
    result,
    storedMeta.progressSynced,
    syncCompletion,
    user,
  ])

  const finishMission = async (state: MissionAttemptState) => {
    if (!loaded || finishingRef.current) return
    finishingRef.current = true
    try {
      const completedState = missionAttemptReducer(state, {
        type: 'complete',
        at: new Date().toISOString(),
      })
      if (!completedState) return
      const stats = calculateMissionScore(loaded.definition, completedState.answers)
      dispatchAttempt({ type: 'complete', at: completedState.updatedAt })
      setResult(stats)
      audioRef.current?.complete()
      await saveAttempt(completedState, studySessionId, { pendingResult: stats })
      await syncCompletion(completedState, stats)
    } finally {
      finishingRef.current = false
    }
  }

  const skipAnswer = async () => {
    if (!attempt || !currentQuestion || feedback?.finalized || currentQuestion.options) return
    const answeredAt = new Date().toISOString()
    const record = {
      ...createSkippedMissionAnswer(currentQuestion, attemptNumber, answerValue, answeredAt),
      firstSubmittedAnswer: firstSubmittedAnswer ?? undefined,
    }
    const next = missionAttemptReducer(attempt, { type: 'recordAnswers', answers: [record], at: answeredAt })
    if (!next) return
    attemptRef.current = next
    dispatchAttempt({ type: 'recordAnswers', answers: [record], at: answeredAt })
    await saveAttempt(next, studySessionId)
    setFeedback({ correct: false, finalized: true, text: 'Không sao, hãy xem đáp án và nghe lại từ này.' })
    const target = loaded?.missionTerms.find((item) => item.globalTermId === currentQuestion.targetTermId)
    if (target) void speak(target.sourceText, { audioUrl: target.audioUrl, globalTermId: target.globalTermId, lang: target.sourceLanguage })
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
    audioRef.current?.cancelPendingReplay()
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
    audioRef.current?.transition()
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
      attemptRef.current = initial
      setStoredMeta({})
      setStudySessionId(session.id)
      dispatchAttempt({ type: 'restore', state: initial })
      setResult(null)
      setAnswerValue('')
      setAttemptNumber(1)
      setHintLevel(0)
      setContextTranslationShown(false)
      setFirstSubmittedAnswer(null)
      setReviewOpen(false)
      setRelearnIndex(null)
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
    if (relearnIndex !== null && skippedTerms[relearnIndex]) {
      const term = skippedTerms[relearnIndex]
      return <div className="mx-auto max-w-3xl space-y-5 px-4 py-5">
        <Button variant="ghost" onClick={() => { audioRef.current?.transition(); setRelearnIndex(null) }}><ArrowLeft className="h-4 w-4" /> Về kết quả</Button>
        <p className="text-sm font-bold text-muted-foreground">Ôn lại từ đã bỏ qua · Không thay đổi điểm hoặc lịch ôn</p>
        <MissionLearnStage
          term={term}
          index={relearnIndex}
          total={skippedTerms.length}
          reviewMode
          onPlayAudio={() => void speak(term.sourceText, { audioUrl: term.audioUrl, globalTermId: term.globalTermId, lang: term.sourceLanguage })}
          onNext={() => {
            audioRef.current?.transition()
            setRelearnIndex(relearnIndex + 1 < skippedTerms.length ? relearnIndex + 1 : null)
          }}
        />
      </div>
    }
    if (reviewOpen) {
      return <MissionReviewView
        items={buildMissionReviewItems(loaded.definition, attempt.answers)}
        onBack={() => {
          audioRef.current?.transition()
          setReviewOpen(false)
        }}
        onPlayAudio={(questionId) => {
          const question = loaded.definition.stages.flatMap((stage) => stage.questions).find((item) => item.id === questionId)
          if (!question?.audioText) return
          const target = loaded.missionTerms.find((item) => item.globalTermId === question.targetTermId)
          void speak(question.audioText, {
            audioUrl: question.audioUrl,
            globalTermId: question.targetTermId,
            lang: target?.sourceLanguage,
          })
        }}
      />
    }
    return (
      <MissionResultView
        missionNumber={missionIndex + 1}
        result={result}
        syncing={syncing}
        synced={Boolean(storedMeta.progressSynced)}
        error={error}
        hasNextMission={missionIndex + 1 < loaded.missionCount}
        onRetrySync={() => void syncCompletion(attempt, result)}
        onBack={() => navigate('/app/games/mission/' + deckId)}
        onReview={() => setReviewOpen(true)}
        skippedCount={skippedTerms.length}
        onRelearn={() => setRelearnIndex(0)}
        onReplay={() => void restartMission()}
        onNext={() => navigate('/app/games/mission/' + deckId + '/' + (missionIndex + 1))}
      />
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-5">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" className="h-11 w-11 p-0" aria-label="Thoát Mission" title="Thoát Mission" onClick={() => setExitOpen(true)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            className="h-11 w-11 p-0"
            aria-label={sfxEnabled ? 'Tắt hiệu ứng âm thanh' : 'Bật hiệu ứng âm thanh'}
            title={sfxEnabled ? 'Tắt hiệu ứng âm thanh' : 'Bật hiệu ứng âm thanh'}
            aria-pressed={sfxEnabled}
            onClick={toggleSfx}
          >
            {sfxEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </Button>
          <div className="text-right">
            <div className="text-xs font-black uppercase text-muted-foreground">Mission {missionIndex + 1}</div>
            <div className="text-sm font-black">{currentStage ? stageLabel(currentStage.type) : ''}</div>
          </div>
        </div>
      </div>

      <div role="progressbar" aria-label="Tiến độ Mission" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100} className="h-4 overflow-hidden rounded-full border-2 border-border bg-card">
        <div className="h-full bg-primary transition-all" style={{ width: String(progressPercent) + '%' }} />
      </div>

      {currentStage?.type === 'learn' && currentLearnTerm ? (
        <MissionLearnStage
          term={currentLearnTerm}
          index={attempt.questionIndex}
          total={loaded.missionTerms.length}
          onPlayAudio={playCurrentAudio}
          onNext={() => void nextLearn()}
        />
      ) : currentStage?.type === 'matching' ? (
        <MissionMatchingStage
          questions={currentStage.questions}
          selections={matchingSelections}
          reviewed={matchingReviewed}
          options={matchingOptions}
          partOfSpeechByTermId={Object.fromEntries(loaded.missionTerms.map((term) => [term.globalTermId, term.partOfSpeech]))}
          onSelect={(questionId, value) => {
            const selections = selectMatchingTranslation(matchingSelections, questionId, value)
            setMatchingSelections(selections)
            persistDraft({ matchingSelections: selections })
          }}
          onCheck={() => void checkMatching()}
          onContinue={() => void continueAfterMatching()}
        />
      ) : currentQuestion ? (
        <MissionQuestionStage
          stageType={currentStage?.type ?? currentQuestion.type}
          question={currentQuestion}
          index={attempt.questionIndex}
          total={currentStage?.questions.length ?? 0}
          answerValue={answerValue}
          hintLevel={hintLevel}
          contextTranslation={contextTranslation}
          contextTranslationShown={contextTranslationShown}
          feedback={feedback}
          isLastQuestion={
            attempt.stageIndex + 1 >= loaded.definition.stages.length
            && attempt.questionIndex + 1 >= (currentStage?.questions.length ?? 0)
          }
          onAnswerChange={(value) => {
            setAnswerValue(value)
            persistDraft({ answerValue: value, attemptNumber, hintLevel, contextTranslationShown, firstSubmittedAnswer: firstSubmittedAnswer ?? undefined })
          }}
          onHint={() => {
            const nextHintLevel = Math.min(2, hintLevel + 1)
            setHintLevel(nextHintLevel)
            persistDraft({ answerValue, attemptNumber, hintLevel: nextHintLevel, contextTranslationShown, firstSubmittedAnswer: firstSubmittedAnswer ?? undefined })
          }}
          onShowTranslation={() => {
            setContextTranslationShown(true)
            persistDraft({ answerValue, attemptNumber, hintLevel, contextTranslationShown: true, firstSubmittedAnswer: firstSubmittedAnswer ?? undefined })
          }}
          onSubmit={() => void submitAnswer()}
          onSkip={() => void skipAnswer()}
          onNext={() => void nextQuestion()}
          onPlayAudio={playCurrentAudio}
        />
      ) : (
        <div className="neo-card p-6">
          <p className="font-bold">Stage hiện tại không có câu hỏi hợp lệ.</p>
          <Button className="mt-4" onClick={() => {
            if (!attempt || !loaded) return
            if (attempt.stageIndex + 1 < loaded.definition.stages.length) {
              void persistTransition({
                ...attempt,
                stageIndex: attempt.stageIndex + 1,
                questionIndex: 0,
                updatedAt: new Date().toISOString(),
              })
            } else {
              void finishMission(attempt)
            }
          }}>
            Bỏ qua stage
          </Button>
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
