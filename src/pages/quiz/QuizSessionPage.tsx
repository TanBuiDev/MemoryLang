/* eslint-disable react-hooks/set-state-in-effect */
import { useQuery } from '@tanstack/react-query'
import { Volume2, Flag } from 'lucide-react'
import { type FormEvent, type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Input, Label } from '@/components/ui/input'
import { getDemoVocabularyForDeck } from '@/features/demo/demoData'
import {
  buildQuizSessionStorageKey,
  clearStoredQuizSession,
  readActiveQuizSessionStorageKey,
  readStoredQuizSession,
  type StoredQuizSession,
  writeStoredQuizSession,
} from '@/features/quiz/sessionPersistence'
import { addTranslationSuggestion } from '@/features/quiz/translationSuggestions'
import { checkTranslationAnswer, generateTranslationQuestions } from '@/features/quiz/translationInputQuiz'
import { formatStudyHotkey, hotkeyFromKeyboardEvent } from '@/features/study/studyHotkeys'
import { useI18n } from '@/i18n'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { deckService } from '@/services/supabase/deck.service'
import { quizService } from '@/services/supabase/quiz.service'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { useQuizStore } from '@/stores/useQuizStore'
import { speak } from '@/utils/audio'
import { filterActiveVocabulary } from '@/utils/vocabulary'

function appendUnique(ids: string[], id: string) {
  return ids.includes(id) ? ids : [...ids, id]
}

const quizHotkeys = {
  checkAnswer: 'Enter',
  revealAnswer: 'Alt+A',
  clearAnswer: 'Escape',
  playAudio: 'Ctrl+Space',
  overrideCorrect: 'Alt+O',
} as const

type AnswerFeedback =
  | { type: 'none' }
  | { type: 'exact' }
  | { type: 'fuzzy'; matchedAnswer: string }
  | { type: 'incorrect' }

export function QuizSessionPage() {
  const navigate = useNavigate()
  const { sessionId } = useParams()
  const { language, t } = useI18n()
  const user = useAuthStore((state) => state.user)
  const { questionCount, autoPlayAudio, setAutoPlayAudio, selectedDeckId, audioRate, setAudioRate, audioRepeat, setAudioRepeat } = useQuizStore()
  const quizType = 'translation_input' as const
  const shouldUseRemoteData = isSupabaseConfigured && Boolean(user)
  const fallbackSessionKey = buildQuizSessionStorageKey({
    userId: user?.id,
    sessionId,
    selectedDeckId,
    quizType,
    questionCount,
    remote: shouldUseRemoteData,
  })
  const sessionKey = readActiveQuizSessionStorageKey({
    userId: user?.id,
    sessionId,
    remote: shouldUseRemoteData,
  }) ?? fallbackSessionKey
  const [session, setSession] = useState<StoredQuizSession | null>(() => readStoredQuizSession(sessionKey))
  const [answerText, setAnswerText] = useState('')
  const [answerFeedback, setAnswerFeedback] = useState<AnswerFeedback>({ type: 'none' })
  const [answerShakeIteration, setAnswerShakeIteration] = useState(0)
  const [isEndQuizModalOpen, setIsEndQuizModalOpen] = useState(false)
  const [flaggedTermIds, setFlaggedTermIds] = useState<Set<string>>(new Set())
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout>>(null)
  const answerInputRef = useRef<HTMLInputElement>(null)
  const playedAudioForQuestionRef = useRef<string | null>(null)
  const startedAtRef = useRef(Date.now())

  function speakQuestion(text: string, audioUrl?: string | null) {
    speak(text, { rate: audioRate, repeat: audioRepeat, audioUrl })
  }
  const vocabularyQuery = useQuery({
    queryKey: ['vocabulary', user?.id],
    queryFn: () => vocabularyService.list(user!.id),
    enabled: shouldUseRemoteData && !selectedDeckId,
  })
  const deckTermsQuery = useQuery({
    queryKey: ['deck-terms', selectedDeckId],
    queryFn: () => deckService.listTerms(selectedDeckId!),
    enabled: shouldUseRemoteData && Boolean(selectedDeckId),
  })
  const sourceVocabulary = useMemo(() => {
    const source = shouldUseRemoteData
      ? selectedDeckId
        ? deckTermsQuery.data ?? []
        : vocabularyQuery.data ?? []
      : getDemoVocabularyForDeck(selectedDeckId)
    return filterActiveVocabulary(source)
  }, [deckTermsQuery.data, selectedDeckId, shouldUseRemoteData, vocabularyQuery.data])
  const generatedQuestions = useMemo(
    () => generateTranslationQuestions(sourceVocabulary, questionCount),
    [questionCount, sourceVocabulary],
  )
  const sourceQuery = selectedDeckId ? deckTermsQuery : vocabularyQuery
  const isSourceReady = shouldUseRemoteData ? sourceQuery.isSuccess : true

  useEffect(() => {
    if (session || !isSourceReady || generatedQuestions.length === 0) return
    const initialSession: StoredQuizSession = {
      questions: generatedQuestions,
      index: 0,
      score: 0,
      revealedQuestionIds: [],
      completedQuestionIds: [],
      fuzzyCorrectQuestionIds: [],
      deckId: selectedDeckId,
    }
    writeStoredQuizSession(sessionKey, initialSession)
    setSession(initialSession)
  }, [generatedQuestions, isSourceReady, session, sessionKey])

  useEffect(() => {
    if (!session) return
    writeStoredQuizSession(sessionKey, session)
  }, [session, sessionKey])

  useEffect(() => {
    if (answerShakeIteration === 0) return

    const timer = window.setTimeout(() => setAnswerShakeIteration(0), 320)
    return () => window.clearTimeout(timer)
  }, [answerShakeIteration])

  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!autoPlayAudio || !session) return
    const currentQuestion = session.questions[session.index]
    if (currentQuestion) {
      playedAudioForQuestionRef.current = currentQuestion.id
      speakQuestion(currentQuestion.sourceText, currentQuestion.audioUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.index, autoPlayAudio])

  useEffect(() => {
    if (!session || !answerInputRef.current) return
    answerInputRef.current.focus()
  }, [session?.index])

  const question = session?.questions[session.index]
  const isRevealed = question ? session?.revealedQuestionIds.includes(question.id) ?? false : false
  const baseHint = language === 'vi'
    ? `Phím tắt: ${formatStudyHotkey(quizHotkeys.checkAnswer)} kiểm tra, ${formatStudyHotkey(quizHotkeys.revealAnswer)} xem đáp án, ${formatStudyHotkey(quizHotkeys.clearAnswer)} xóa nhanh, ${formatStudyHotkey(quizHotkeys.playAudio)} phát âm`
    : `Shortcuts: ${formatStudyHotkey(quizHotkeys.checkAnswer)} check, ${formatStudyHotkey(quizHotkeys.revealAnswer)} reveal, ${formatStudyHotkey(quizHotkeys.clearAnswer)} clear, ${formatStudyHotkey(quizHotkeys.playAudio)} play audio`
  const overrideHint = language === 'vi'
    ? `, ${formatStudyHotkey(quizHotkeys.overrideCorrect)} tôi đã trả lời đúng`
    : `, ${formatStudyHotkey(quizHotkeys.overrideCorrect)} I answered correctly`
  const hotkeyHint = answerFeedback.type === 'incorrect' ? baseHint + overrideHint : baseHint

  useEffect(() => {
    if (question && playedAudioForQuestionRef.current !== question.id) {
      playedAudioForQuestionRef.current = null
    }
  }, [question])

  useEffect(() => {
    function handleGlobalKeyDown(event: KeyboardEvent) {
      const hotkey = hotkeyFromKeyboardEvent(event as unknown as import('react').KeyboardEvent<HTMLElement>)
      if (hotkey === quizHotkeys.playAudio && question) {
        event.preventDefault()
        speakQuestion(question.sourceText, question.audioUrl)
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown as unknown as EventListener)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown as unknown as EventListener)
  }, [question])

  function triggerAnswerShake() {
    setAnswerShakeIteration((value) => value + 1)
  }

  function clearAutoAdvance() {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current)
      autoAdvanceTimerRef.current = null
    }
  }

  function advanceToNext(isFuzzyMatch: boolean, alwaysAwardPoint = false, clearRevealed = false) {
    if (!session || !question) return

    const completedQuestionIds = appendUnique(session.completedQuestionIds, question.id)
    const fuzzyCorrectQuestionIds = isFuzzyMatch
      ? appendUnique(session.fuzzyCorrectQuestionIds, question.id)
      : session.fuzzyCorrectQuestionIds
    const revealedQuestionIds = clearRevealed
      ? session.revealedQuestionIds.filter((id) => id !== question.id)
      : session.revealedQuestionIds
    const nextScore = alwaysAwardPoint
      ? session.score + 1
      : session.score + (isRevealed ? 0 : 1)

    if (session.index >= session.questions.length - 1) {
      clearStoredQuizSession(sessionKey)
      void saveQuizResult()
      navigate('/app/quiz')
      return
    }

    setSession({
      ...session,
      index: session.index + 1,
      score: nextScore,
      completedQuestionIds,
      fuzzyCorrectQuestionIds,
      revealedQuestionIds,
    })
    setAnswerText('')
    setAnswerFeedback({ type: 'none' })
    setAnswerShakeIteration(0)
  }

  function revealAnswer() {
    if (!session || !question) return
    setSession({
      ...session,
      revealedQuestionIds: appendUnique(session.revealedQuestionIds, question.id),
    })
  }

  function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!session || !question) return

    if (answerFeedback.type === 'fuzzy') {
      advanceToNext(true)
      return
    }

    const result = checkTranslationAnswer(answerText, question.expectedTranslation)

    if (result.result === 'exact') {
      setAnswerFeedback({ type: 'exact' })
      clearAutoAdvance()
      autoAdvanceTimerRef.current = setTimeout(() => advanceToNext(false), 500)
      return
    }

    if (result.result === 'fuzzy') {
      setAnswerFeedback({ type: 'fuzzy', matchedAnswer: result.matchedCandidate ?? question.expectedTranslation })
      return
    }

    setAnswerFeedback({ type: 'incorrect' })
    triggerAnswerShake()
    answerInputRef.current?.focus()
    answerInputRef.current?.select()
  }

  function overrideAsCorrect() {
    if (!session || !question || answerFeedback.type !== 'incorrect') return
    clearAutoAdvance()

    if (shouldUseRemoteData && answerText.trim()) {
      addTranslationSuggestion(
        {
          userTermId: question.userTermId,
          sourceText: question.sourceText,
          suggestedTranslation: answerText.trim(),
          existingTranslation: question.expectedTranslation,
          createdAt: Date.now(),
        },
        user?.id,
      )
    }

    advanceToNext(false, true, true)
  }

  function endQuiz() {
    if (!session) return
    void saveQuizResult()
    clearStoredQuizSession(sessionKey)
    navigate('/app/quiz')
  }

  async function saveQuizResult() {
    if (!session || !shouldUseRemoteData || !user) return
    const durationMs = Date.now() - startedAtRef.current
    try {
      await quizService.saveResult({
        userId: user.id,
        deckId: session.deckId,
        quizType,
        totalQuestions: session.questions.length,
        correctAnswers: session.score,
        wrongAnswers: session.questions.length - session.score,
        durationMs,
        answers: [],
      })
      await quizService.pruneHistory(user.id)
    } catch {
      // save failures are non-critical
    }
  }

  function goToQuestion(index: number) {
    if (!session || index === session.index) return
    clearAutoAdvance()
    setAnswerText('')
    setAnswerFeedback({ type: 'none' })
    setAnswerShakeIteration(0)
    setSession({ ...session, index })
  }

  function clearAnswer() {
    setAnswerText('')
    setAnswerFeedback({ type: 'none' })
    clearAutoAdvance()
    setAnswerShakeIteration(0)
    answerInputRef.current?.focus()
  }

  function handleAnswerKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const hotkey = hotkeyFromKeyboardEvent(event)
    if (!hotkey) return

    if (hotkey === quizHotkeys.clearAnswer) {
      event.preventDefault()
      clearAnswer()
      return
    }

    if (hotkey === quizHotkeys.revealAnswer && !isRevealed) {
      event.preventDefault()
      revealAnswer()
    }

    if (hotkey === quizHotkeys.overrideCorrect && answerFeedback.type === 'incorrect') {
      event.preventDefault()
      overrideAsCorrect()
    }
  }

  const isAnswerShaking = answerShakeIteration > 0
  const inputBorderClass = answerFeedback.type === 'exact'
    ? isRevealed ? 'quiz-input-revealed' : 'quiz-input-success'
    : answerFeedback.type === 'fuzzy'
      ? 'quiz-input-warning'
      : answerFeedback.type === 'incorrect'
        ? 'quiz-input-danger'
        : undefined
  const shouldShake = isAnswerShaking && answerFeedback.type === 'incorrect'

  if (shouldUseRemoteData && sourceQuery.isLoading && !session) {
    return <Card className="font-black">{t('vocabulary.loading')}</Card>
  }

  if (shouldUseRemoteData && sourceQuery.isError && !session) {
    return (
      <Card className="flex flex-wrap items-center justify-between gap-3 font-black text-danger">
        <p>{t('quiz.loadError')}</p>
        <Button variant="ghost" onClick={() => sourceQuery.refetch()}>{t('quiz.retryLoad')}</Button>
      </Card>
    )
  }

  if (!question && generatedQuestions.length > 0) {
    return <Card className="font-black">{t('vocabulary.loading')}</Card>
  }

  if (!question) {
    const emptyMessage = sourceVocabulary.length === 0 ? t('quiz.noVocabulary') : t('quiz.noTranslatedVocabulary')
    return <Card className="text-center text-xl font-black">{emptyMessage}</Card>
  }

  return (
    <>
      <div className="flex w-full gap-8 px-8 items-start">
        <div className="flex-1">
          <div className="mt-6">
            <div className="mx-auto max-w-2xl">
              <Card className="relative p-8">
                <button
                  type="button"
                  className="absolute top-3 right-3 inline-flex h-10 w-10 items-center justify-center rounded-md border-2 border-border bg-secondary text-secondary-foreground shadow-[2px_2px_0_var(--border)] hover:bg-[#321fb0] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_var(--border)]"
                  onClick={() => { playedAudioForQuestionRef.current = question.id; speakQuestion(question.sourceText, question.audioUrl) }}
                  aria-label={language === 'vi' ? 'Phát âm thanh' : 'Play audio'}
                >
                  <Volume2 size={18} />
                </button>
                <button
                  type="button"
                  className={`absolute top-3 right-16 inline-flex h-10 w-10 items-center justify-center rounded-md border-2 shadow-[2px_2px_0_var(--border)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_var(--border)] ${flaggedTermIds.has(question.userTermId) ? 'border-warning bg-warning/20 text-warning' : 'border-border bg-background text-muted-foreground hover:bg-warning/10 hover:border-warning hover:text-warning'}`}
                  onClick={() => {
                    if (shouldUseRemoteData) {
                      vocabularyService.flagTerm(question.userTermId).catch(() => { /* non-critical */ })
                    }
                    setFlaggedTermIds((prev) => new Set(prev).add(question.userTermId))
                  }}
                  aria-label={language === 'vi' ? 'Đánh dấu cần kiểm tra' : 'Flag for review'}
                >
                  <Flag size={16} fill={flaggedTermIds.has(question.userTermId) ? 'currentColor' : 'none'} />
                </button>
                <p className="text-center text-sm font-black uppercase text-muted-foreground">{t('quiz.question', { number: session.index + 1 })}</p>
                <CardTitle className="mt-6 text-center text-4xl">
                  {question.sourceText}
                </CardTitle>
                <div className="mt-3 flex flex-wrap justify-center gap-2 text-sm font-black text-muted-foreground">
                  {question.ipa ? <span className="rounded-md border-2 border-border bg-background px-3 py-1">{question.ipa}</span> : null}
                  {question.partOfSpeech ? <span className="rounded-md border-2 border-border bg-background px-3 py-1">{question.partOfSpeech}</span> : null}
                </div>
                <form className="mt-8 grid gap-4" onSubmit={submitAnswer}>
                  <div>
                    <Label htmlFor="translation-answer">{t('quiz.answerLabel')}</Label>
                    <Input
                      id="translation-answer"
                      autoComplete="off"
                      autoFocus
                      ref={answerInputRef}
                      value={answerText}
                      readOnly={answerFeedback.type === 'exact'}
                      className={shouldShake ? 'quiz-input-shake' : inputBorderClass}
                      style={shouldShake ? { animationName: answerShakeIteration % 2 === 0 ? 'quiz-answer-shake-a' : 'quiz-answer-shake-b' } : undefined}
                      onAnimationEnd={() => setAnswerShakeIteration(0)}
                      onChange={(event) => {
                        setAnswerText(event.target.value)
                        if (answerFeedback.type !== 'none') setAnswerFeedback({ type: 'none' })
                        if (isAnswerShaking) setAnswerShakeIteration(0)
                      }}
                      onKeyDown={handleAnswerKeyDown}
                    />
                  </div>
                  {answerFeedback.type === 'exact' ? <p aria-live="polite" className={`font-black ${isRevealed ? 'text-muted-foreground' : 'text-success'}`}>{isRevealed ? t('quiz.correctRevealed') : t('quiz.correct')}</p> : null}
                  {answerFeedback.type === 'fuzzy' ? (
                    <p aria-live="polite" className="font-black text-warning">
                      {t('quiz.fuzzyWarning', { answer: answerFeedback.matchedAnswer })}
                    </p>
                  ) : null}
                  {answerFeedback.type === 'incorrect' ? <p aria-live="polite" className="font-black text-danger">{t('quiz.incorrect')}</p> : null}
                  {isRevealed ? (
                    <div className="rounded-md border-2 border-border bg-primary p-3 shadow-[2px_2px_0_var(--border)]">
                      <p className="text-xs font-black uppercase">{t('quiz.expectedTranslation')}</p>
                      <p className="mt-1 text-lg font-black">{question.expectedTranslation.split(/[\/,;\n]+/).map(s => s.trim()).filter(Boolean).join(' / ')}</p>
                      <p className="mt-2 text-sm font-bold">{t('quiz.revealedNotice')}</p>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-3">
                    {answerFeedback.type === 'fuzzy' ? (
                      <Button type="submit">{t('quiz.continue')}</Button>
                    ) : (
                      <Button type="submit" disabled={answerFeedback.type === 'exact'}>{t('quiz.checkAnswer')}</Button>
                    )}
                    {answerFeedback.type === 'incorrect' && !isRevealed ? <Button type="button" variant="ghost" onClick={revealAnswer}>{t('quiz.revealAnswer')}</Button> : null}
                    {answerFeedback.type === 'incorrect' ? (
                      <Button type="button" variant="ghost" className="px-3 text-xs" onClick={overrideAsCorrect}>
                        {t('quiz.overrideButton')}
                      </Button>
                    ) : null}
                  </div>
                  <p className="text-xs font-black text-muted-foreground">{hotkeyHint}</p>
                </form>
              </Card>
            </div>
          </div>
        </div>
        <aside className="w-72 flex-shrink-0 sticky top-8 space-y-3 rounded-xl border-2 border-border bg-background/95 p-4 shadow-[3px_3px_0_var(--border)]">
          <p className="text-xs font-black uppercase text-muted-foreground">{t('quiz.audioSettings')}</p>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                id="auto-play-audio"
                type="checkbox"
                checked={autoPlayAudio}
                onChange={(event) => setAutoPlayAudio(event.target.checked)}
                className="h-4 w-4 accent-secondary"
              />
              <label htmlFor="auto-play-audio" className="text-xs font-black cursor-pointer select-none">{t('quiz.autoPlayAudio')}</label>
            </div>
            <div>
              <label htmlFor="audio-rate" className="mb-1 block text-xs font-black text-muted-foreground">{t('quiz.audioRate')}</label>
              <select
                id="audio-rate"
                value={audioRate}
                onChange={(event) => setAudioRate(Number.parseFloat(event.target.value))}
                className="h-9 w-full rounded-md border-2 border-border bg-card px-2 text-xs font-semibold shadow-[2px_2px_0_var(--border)] focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value={0.5}>0.5x</option>
                <option value={0.75}>{t('quiz.audioRateSlow')}</option>
                <option value={1}>{t('quiz.audioRateNormal')}</option>
                <option value={1.25}>{t('quiz.audioRateFast')}</option>
                <option value={1.5}>1.5x</option>
              </select>
            </div>
            <div>
              <label htmlFor="audio-repeat" className="mb-1 block text-xs font-black text-muted-foreground">{t('quiz.audioRepeat')}</label>
              <select
                id="audio-repeat"
                value={audioRepeat}
                onChange={(event) => setAudioRepeat(Number.parseInt(event.target.value, 10))}
                className="h-9 w-full rounded-md border-2 border-border bg-card px-2 text-xs font-semibold shadow-[2px_2px_0_var(--border)] focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value={1}>{t('quiz.audioRepeatSingle')}</option>
                <option value={2}>{t('quiz.audioRepeatDouble')}</option>
                <option value={3}>{t('quiz.audioRepeatTriple')}</option>
              </select>
            </div>
          </div>
          <hr className="border-border" />
          <div>
            <p className="mb-2 text-xs font-black uppercase text-muted-foreground">
              {session.completedQuestionIds.length}/{session.questions.length}
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {session.questions.map((q, i) => {
                const isCurrent = i === session.index
                const isCompleted = session.completedQuestionIds.includes(q.id)
                const isFuzzy = session.fuzzyCorrectQuestionIds.includes(q.id)
                const isRevealedQ = session.revealedQuestionIds.includes(q.id)
                let bg = 'bg-muted text-muted-foreground hover:bg-muted/70'
                if (isCurrent) bg = 'bg-primary text-primary-foreground'
                else if (isRevealedQ) bg = 'bg-danger/30 text-danger'
                else if (isCompleted && isFuzzy) bg = 'bg-warning/30 text-warning'
                else if (isCompleted) bg = 'bg-success/30 text-success'

                return (
                  <button
                    key={q.id}
                    type="button"
                    className={`flex h-7 w-7 items-center justify-center rounded border-2 border-border text-xs font-black transition-colors ${bg} active:translate-x-[1px] active:translate-y-[1px]`}
                    onClick={() => goToQuestion(i)}
                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>
          </div>
          <Button type="button" variant="ghost" className="w-full text-xs" onClick={() => setIsEndQuizModalOpen(true)}>
            {t('quiz.endQuiz')}
          </Button>
        </aside>
      </div>
      <ConfirmModal
        open={isEndQuizModalOpen}
        title={t('quiz.endQuizTitle')}
        description={t('quiz.endQuizDescription')}
        confirmLabel={t('quiz.endQuizConfirm')}
        cancelLabel={t('quiz.endQuizCancel')}
        variant="danger"
        onConfirm={endQuiz}
        onCancel={() => setIsEndQuizModalOpen(false)}
      />
    </>
  )
}
