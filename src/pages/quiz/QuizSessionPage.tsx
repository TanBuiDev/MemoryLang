/* eslint-disable react-hooks/set-state-in-effect */
import { useQuery } from '@tanstack/react-query'
import { Volume2, Flag, Clock, Info } from 'lucide-react'
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
import { generateMultipleChoiceQuestions } from '@/features/quiz/multipleChoiceQuiz'
import { formatStudyHotkey, hotkeyFromKeyboardEvent } from '@/features/study/studyHotkeys'
import { useI18n } from '@/i18n'
import { shuffle } from '@/utils/shuffle'
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
  focusAnswer: '/',
  flagQuestion: 'Alt+F',
  skipQuestion: 'Alt+S',
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
  const { questionCount, quizType, autoPlayAudio, setAutoPlayAudio, selectedDeckId, audioRate, setAudioRate, audioRepeat, setAudioRepeat } = useQuizStore()
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
  const [mcSelectedIndex, setMcSelectedIndex] = useState<number | null>(null)
  const [mcFeedbackState, setMcFeedbackState] = useState<'none' | 'correct' | 'wrong'>('none')
  const [highlightedMcIndex, setHighlightedMcIndex] = useState<number | null>(null)
  const mcPendingRef = useRef<{ questionId: string; isCorrect: boolean } | null>(null)
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout>>(null)
  const answerInputRef = useRef<HTMLInputElement>(null)
  const playedAudioForQuestionRef = useRef<string | null>(null)
  const startedAtRef = useRef(Date.now())
  const lastMousePosRef = useRef({ x: 0, y: 0 })
  const isRetryRef = useRef(false)
  const startedAt = session?.startedAt ?? startedAtRef.current
  const [isCompleted, setIsCompleted] = useState(false)
  const [isTempRevealed, setIsTempRevealed] = useState(false)
  const [elapsedSec, setElapsedSec] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [startedAt])

  function speakQuestion(text: string, audioUrl?: string | null, variant?: string | null) {
    speak(text, { rate: audioRate, repeat: audioRepeat, audioUrl, variant })
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
    () => quizType === 'multiple_choice'
      ? generateMultipleChoiceQuestions(sourceVocabulary, questionCount)
      : generateTranslationQuestions(sourceVocabulary, questionCount),
    [questionCount, sourceVocabulary, quizType],
  )
  const sourceQuery = selectedDeckId ? deckTermsQuery : vocabularyQuery
  const isSourceReady = shouldUseRemoteData ? sourceQuery.isSuccess : true

  useEffect(() => {
    if (session || !isSourceReady || generatedQuestions.length === 0) return
    const initialSession: StoredQuizSession = {
      quizType,
      questions: generatedQuestions,
      index: 0,
      score: 0,
      revealedQuestionIds: [],
      completedQuestionIds: [],
      fuzzyCorrectQuestionIds: [],
      skippedQuestionIds: [],
      deckId: selectedDeckId,
      wrongQuestionIds: [],
      totalQuestionIds: [],
      startedAt: Date.now(),
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
    const flagged = sourceVocabulary.filter((item) => item.flagged).map((item) => item.id)
    if (flagged.length === 0) return
    setFlaggedTermIds((prev) => new Set([...prev, ...flagged]))
  }, [sourceVocabulary])

  useEffect(() => {
    if (!autoPlayAudio || !session) return
    const currentQuestion = session.questions[session.index]
    if (currentQuestion) {
      playedAudioForQuestionRef.current = currentQuestion.id
      speakQuestion(currentQuestion.sourceText, currentQuestion.audioUrl, currentQuestion.pronunciationText)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.index, autoPlayAudio])

  useEffect(() => {
    if (!session || !answerInputRef.current) return
    if (isMcQuestion) return
    answerInputRef.current.focus()
  }, [session?.index])

  useEffect(() => {
    setMcSelectedIndex(null)
    setMcFeedbackState('none')
    setHighlightedMcIndex(null)
  }, [session?.index])

  const question = session?.questions[session.index]
  const isRevealed = question ? (session?.revealedQuestionIds.includes(question.id) || isTempRevealed) ?? false : false
  const isMcQuestion = question && 'options' in question
  const baseHint = language === 'vi'
    ? isMcQuestion
      ? `Phím tắt: 1-4 hoặc ↑/↓ + Enter chọn đáp án, ←/→ chuyển câu, ${formatStudyHotkey(quizHotkeys.playAudio)} phát âm, ${formatStudyHotkey(quizHotkeys.flagQuestion)} đánh dấu, ${formatStudyHotkey(quizHotkeys.skipQuestion)} bỏ qua`
      : `Phím tắt: ${formatStudyHotkey(quizHotkeys.checkAnswer)} kiểm tra, ${formatStudyHotkey(quizHotkeys.revealAnswer)} xem đáp án, ${formatStudyHotkey(quizHotkeys.clearAnswer)} xóa nhanh, Tab focus ô nhập, ←/→ chuyển câu, ${formatStudyHotkey(quizHotkeys.playAudio)} phát âm, ${formatStudyHotkey(quizHotkeys.flagQuestion)} đánh dấu, ${formatStudyHotkey(quizHotkeys.skipQuestion)} bỏ qua`
    : isMcQuestion
      ? `Shortcuts: 1-4 or ↑/↓ + Enter select answer, ←/→ prev/next, ${formatStudyHotkey(quizHotkeys.playAudio)} play audio, ${formatStudyHotkey(quizHotkeys.flagQuestion)} flag, ${formatStudyHotkey(quizHotkeys.skipQuestion)} skip`
      : `Shortcuts: ${formatStudyHotkey(quizHotkeys.checkAnswer)} check, ${formatStudyHotkey(quizHotkeys.revealAnswer)} reveal, ${formatStudyHotkey(quizHotkeys.clearAnswer)} clear, Tab focus input, ←/→ prev/next, ${formatStudyHotkey(quizHotkeys.playAudio)} play audio, ${formatStudyHotkey(quizHotkeys.flagQuestion)} flag, ${formatStudyHotkey(quizHotkeys.skipQuestion)} skip`
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
      if (event.key === 'Tab' && !event.ctrlKey && !event.altKey && !event.metaKey) {
        const active = document.activeElement
        if (active !== answerInputRef.current && !isCompleted) {
          event.preventDefault()
          answerInputRef.current?.focus()
          answerInputRef.current?.select()
          return
        }
      }

      const hotkey = hotkeyFromKeyboardEvent(event as unknown as import('react').KeyboardEvent<HTMLElement>)
      if (hotkey === quizHotkeys.playAudio && question) {
        event.preventDefault()
        speakQuestion(question.sourceText, question.audioUrl, question.pronunciationText)
      }

      if (!isCompleted && session && session.questions.length > 0) {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          const isInputFocused = document.activeElement === answerInputRef.current
          if (isMcQuestion || !isInputFocused) {
            event.preventDefault()
            const totalQs = session.questions.length
            if (event.key === 'ArrowLeft') {
              const prevIndex = (session.index - 1 + totalQs) % totalQs
              goToQuestion(prevIndex)
            } else {
              const nextIndex = (session.index + 1) % totalQs
              goToQuestion(nextIndex)
            }
          }
        }
      }

      const isAlreadyCompleted = session?.completedQuestionIds.includes(question.id)
      const canSelectMc = mcSelectedIndex === null && (!isRevealed || isAlreadyCompleted)

      if (isMcQuestion && !isCompleted && canSelectMc) {
        const mcKeys = ['1', '2', '3', '4']
        const mcIndex = mcKeys.indexOf(event.key)
        if (mcIndex >= 0) {
          event.preventDefault()
          selectMcOption(mcIndex)
        } else if (event.key === 'ArrowDown') {
          event.preventDefault()
          setHighlightedMcIndex((prev) => {
            if (prev === null) return 0
            return (prev + 1) % question.options.length
          })
        } else if (event.key === 'ArrowUp') {
          event.preventDefault()
          setHighlightedMcIndex((prev) => {
            if (prev === null) return question.options.length - 1
            return (prev - 1 + question.options.length) % question.options.length
          })
        } else if (event.key === 'Enter') {
          if (highlightedMcIndex !== null) {
            event.preventDefault()
            selectMcOption(highlightedMcIndex)
          }
        }
      }

      if (hotkey === quizHotkeys.flagQuestion && question && !isCompleted) {
        event.preventDefault()
        const isAlreadyFlagged = flaggedTermIds.has(question.userTermId)
        if (shouldUseRemoteData) {
          if (isAlreadyFlagged) {
            vocabularyService.unflagTerm(question.userTermId).catch(() => { /* non-critical */ })
          } else {
            vocabularyService.flagTerm(question.userTermId).catch(() => { /* non-critical */ })
          }
        }
        setFlaggedTermIds((prev) => {
          const next = new Set(prev)
          if (isAlreadyFlagged) {
            next.delete(question.userTermId)
          } else {
            next.add(question.userTermId)
          }
          return next
        })
      }

      if (hotkey === quizHotkeys.skipQuestion && question && !isCompleted) {
        event.preventDefault()
        skipQuestion()
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown as unknown as EventListener)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown as unknown as EventListener)
  }, [
    question,
    isCompleted,
    isMcQuestion,
    mcSelectedIndex,
    isRevealed,
    highlightedMcIndex,
    selectMcOption,
    flaggedTermIds,
    shouldUseRemoteData,
    speakQuestion,
    skipQuestion,
    session,
    goToQuestion,
  ])

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

    const isAlreadyCompleted = session.completedQuestionIds.includes(question.id)

    if (isAlreadyCompleted) {
      let nextIndex = -1
      for (let i = session.index + 1; i < session.questions.length; i++) {
        if (!session.completedQuestionIds.includes(session.questions[i].id)) {
          nextIndex = i
          break
        }
      }
      if (nextIndex === -1) {
        for (let i = 0; i < session.questions.length; i++) {
          if (!session.completedQuestionIds.includes(session.questions[i].id)) {
            nextIndex = i
            break
          }
        }
      }
      if (nextIndex === -1) {
        nextIndex = (session.index + 1) % session.questions.length
      }

      setSession({
        ...session,
        index: nextIndex,
      })
      setAnswerText('')
      setAnswerFeedback({ type: 'none' })
      setAnswerShakeIteration(0)
      setIsTempRevealed(false)
      return
    }

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

    const allCompleted = session.questions.every((q) => completedQuestionIds.includes(q.id))

    if (allCompleted) {
      const totalIds = session.totalQuestionIds.length > 0
        ? session.totalQuestionIds
        : session.questions.map((q) => q.userTermId)
      const wrongIds = session.questions
        .filter((q) => session.revealedQuestionIds.includes(q.id))
        .map((q) => q.userTermId)

      const newSession = {
        ...session,
        index: session.index,
        score: nextScore,
        completedQuestionIds,
        fuzzyCorrectQuestionIds,
        revealedQuestionIds,
        wrongQuestionIds: wrongIds,
        totalQuestionIds: totalIds,
      }
      writeStoredQuizSession(sessionKey, newSession)
      setSession(newSession)
      setIsCompleted(true)
      void saveQuizResult()
      return
    }

    let nextIndex = -1
    for (let i = session.index + 1; i < session.questions.length; i++) {
      if (!completedQuestionIds.includes(session.questions[i].id)) {
        nextIndex = i
        break
      }
    }
    if (nextIndex === -1) {
      for (let i = 0; i < session.questions.length; i++) {
        if (!completedQuestionIds.includes(session.questions[i].id)) {
          nextIndex = i
          break
        }
      }
    }

    setSession({
      ...session,
      index: nextIndex,
      score: nextScore,
      completedQuestionIds,
      fuzzyCorrectQuestionIds,
      revealedQuestionIds,
    })
    setAnswerText('')
    setAnswerFeedback({ type: 'none' })
    setAnswerShakeIteration(0)
  }

  function selectMcOption(index: number) {
    if (!session || !question || !('options' in question) || mcSelectedIndex !== null) return

    const isCorrect = index === question.correctIndex
    setMcSelectedIndex(index)
    setMcFeedbackState(isCorrect ? 'correct' : 'wrong')
    mcPendingRef.current = { questionId: question.id, isCorrect }

    const delay = isCorrect ? 800 : 1500
    clearAutoAdvance()
    autoAdvanceTimerRef.current = setTimeout(() => advanceMc(), delay)
  }

  function advanceMc() {
    const pending = mcPendingRef.current
    if (!pending) return
    mcPendingRef.current = null

    setSession((prev) => {
      if (!prev) return prev

      const questionId = pending.questionId
      const isCorrect = pending.isCorrect

      const isAlreadyCompleted = prev.completedQuestionIds.includes(questionId)
      if (isAlreadyCompleted) {
        let nextIndex = -1
        for (let i = prev.index + 1; i < prev.questions.length; i++) {
          if (!prev.completedQuestionIds.includes(prev.questions[i].id)) {
            nextIndex = i
            break
          }
        }
        if (nextIndex === -1) {
          for (let i = 0; i < prev.questions.length; i++) {
            if (!prev.completedQuestionIds.includes(prev.questions[i].id)) {
              nextIndex = i
              break
            }
          }
        }
        if (nextIndex === -1) {
          nextIndex = (prev.index + 1) % prev.questions.length
        }

        return {
          ...prev,
          index: nextIndex,
        }
      }

      const completedQuestionIds = appendUnique(prev.completedQuestionIds, questionId)
      const revealedQuestionIds = isCorrect
        ? prev.revealedQuestionIds
        : appendUnique(prev.revealedQuestionIds, questionId)
      const nextScore = prev.score + (isCorrect ? 1 : 0)

      const allCompleted = prev.questions.every((q) => completedQuestionIds.includes(q.id))

      if (allCompleted) {
        const totalIds = prev.totalQuestionIds.length > 0
          ? prev.totalQuestionIds
          : prev.questions.map((q) => q.userTermId)
        const wrongIds = prev.questions
          .filter((q) => revealedQuestionIds.includes(q.id))
          .map((q) => q.userTermId)

        const finalSession = {
          ...prev,
          index: prev.index,
          score: nextScore,
          completedQuestionIds,
          revealedQuestionIds,
          wrongQuestionIds: wrongIds,
          totalQuestionIds: totalIds,
        }
        writeStoredQuizSession(sessionKey, finalSession)
        setIsCompleted(true)
        void saveQuizResult()
        return finalSession
      }

      let nextIndex = -1
      for (let i = prev.index + 1; i < prev.questions.length; i++) {
        if (!completedQuestionIds.includes(prev.questions[i].id)) {
          nextIndex = i
          break
        }
      }
      if (nextIndex === -1) {
        for (let i = 0; i < prev.questions.length; i++) {
          if (!completedQuestionIds.includes(prev.questions[i].id)) {
            nextIndex = i
            break
          }
        }
      }

      return {
        ...prev,
        index: nextIndex,
        score: nextScore,
        completedQuestionIds,
        revealedQuestionIds,
      }
    })

    setMcSelectedIndex(null)
    setMcFeedbackState('none')
  }

  function skipQuestion() {
    if (!session || !question) return

    const isAlreadyCompleted = session.completedQuestionIds.includes(question.id)
    if (isAlreadyCompleted) {
      let nextIndex = -1
      for (let i = session.index + 1; i < session.questions.length; i++) {
        if (!session.completedQuestionIds.includes(session.questions[i].id)) {
          nextIndex = i
          break
        }
      }
      if (nextIndex === -1) {
        for (let i = 0; i < session.questions.length; i++) {
          if (!session.completedQuestionIds.includes(session.questions[i].id)) {
            nextIndex = i
            break
          }
        }
      }
      if (nextIndex === -1) {
        nextIndex = (session.index + 1) % session.questions.length
      }

      setSession({
        ...session,
        index: nextIndex,
      })
      setAnswerText('')
      setAnswerFeedback({ type: 'none' })
      setAnswerShakeIteration(0)
      setMcSelectedIndex(null)
      setMcFeedbackState('none')
      setIsTempRevealed(false)
      return
    }

    if (shouldUseRemoteData) {
      vocabularyService.flagTerm(question.userTermId).catch(() => { /* non-critical */ })
    }
    setFlaggedTermIds((prev) => new Set(prev).add(question.userTermId))

    const skippedQuestionIds = appendUnique(session.skippedQuestionIds, question.id)
    const completedQuestionIds = appendUnique(session.completedQuestionIds, question.id)

    const allDone = session.questions.every(
      (q) => completedQuestionIds.includes(q.id) || skippedQuestionIds.includes(q.id)
    )

    if (allDone) {
      const newSession = {
        ...session,
        skippedQuestionIds,
        completedQuestionIds,
      }
      writeStoredQuizSession(sessionKey, newSession)
      setSession(newSession)
      setIsCompleted(true)
      void saveQuizResult()
      return
    }

    let nextIndex = -1
    for (let i = session.index + 1; i < session.questions.length; i++) {
      if (!completedQuestionIds.includes(session.questions[i].id)) {
        nextIndex = i
        break
      }
    }
    if (nextIndex === -1) {
      for (let i = 0; i < session.questions.length; i++) {
        if (!completedQuestionIds.includes(session.questions[i].id)) {
          nextIndex = i
          break
        }
      }
    }

    setSession({
      ...session,
      index: nextIndex,
      skippedQuestionIds,
      completedQuestionIds,
    })
    setAnswerText('')
    setAnswerFeedback({ type: 'none' })
    setAnswerShakeIteration(0)
    setMcSelectedIndex(null)
    setMcFeedbackState('none')
  }

  function retryWrong() {
    if (!session) return
    const wrongQuestions = session.questions.filter(
      (q) => session.wrongQuestionIds.includes(q.userTermId) && !session.skippedQuestionIds.includes(q.id)
    )
    const newSession: StoredQuizSession = {
      quizType: session.quizType,
      questions: shuffle(wrongQuestions),
      index: 0,
      score: 0,
      revealedQuestionIds: [],
      completedQuestionIds: [],
      fuzzyCorrectQuestionIds: [],
      deckId: session.deckId,
      wrongQuestionIds: [],
      totalQuestionIds: session.totalQuestionIds,
      skippedQuestionIds: [],
      startedAt: session.startedAt,
    }
    writeStoredQuizSession(sessionKey, newSession)
    setSession(newSession)
    setIsCompleted(false)
    isRetryRef.current = true
    setAnswerText('')
    setAnswerFeedback({ type: 'none' })
  }

  function revealAnswer() {
    if (!session || !question) return
    if (session.completedQuestionIds.includes(question.id)) {
      setIsTempRevealed(true)
      return
    }
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
      autoAdvanceTimerRef.current = setTimeout(() => advanceToNext(false), 1000)
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
    if (session.completedQuestionIds.includes(question.id)) return
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
    clearStoredQuizSession(sessionKey)
    navigate('/app/quiz')
  }

  async function saveQuizResult() {
    if (!session || !shouldUseRemoteData || !user || isRetryRef.current) return
    const durationMs = Date.now() - startedAt
    try {
      await quizService.saveResult({
        userId: user.id,
        deckId: session.deckId,
        quizType: session.quizType,
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
    setIsTempRevealed(false)
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

  const minutes = Math.floor(elapsedSec / 60)
  const seconds = elapsedSec % 60
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  const timerBar = (
    <div className="mb-4 inline-flex items-center gap-1.5 rounded-xl border-2 border-border bg-background/95 px-3 py-1.5 shadow-[2px_2px_0_var(--border)]" aria-label={t('quiz.timeLabel')}>
      <Clock size={14} />
      <span className="font-mono text-sm font-black tabular-nums">{formattedTime}</span>
    </div>
  )

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

  if (isCompleted && session) {
    const totalQuestions = session.questions.length
    const correctCount = session.score
    const wrongCount = session.wrongQuestionIds.length
    const skippedCount = session.skippedQuestionIds.length
    const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0
    const isPerfect = wrongCount === 0

    return (
      <>
        {timerBar}
        <div className="flex w-full justify-center pt-8">
        <Card className="max-w-md w-full p-8 text-center">
          <p className="text-lg font-black uppercase text-muted-foreground">{t('quiz.resultTitle')}</p>
          <p className="mt-2 text-5xl font-black">{correctCount}/{totalQuestions}</p>
          <p className="mt-1 text-sm font-black text-muted-foreground">
            {t('quiz.accuracy')}: {accuracy}%
          </p>
          {!isPerfect ? (
              <p className="mt-3 text-sm font-bold text-muted-foreground">
                {t('quiz.wrongAnswers')}: {wrongCount}/{totalQuestions}
              </p>
            ) : null}
            {skippedCount > 0 ? (
              <p className="mt-1 text-sm font-bold text-muted-foreground">
                {t('quiz.skippedCount', { count: skippedCount })}
              </p>
            ) : null}
          {isPerfect ? (
            <p className="mt-3 text-lg font-black text-success">{t('quiz.resultPerfect')}</p>
          ) : null}
          <div className="mt-6 flex justify-center gap-3">
            {!isPerfect ? (
              <Button onClick={retryWrong}>{t('quiz.resultRetryWrong')}</Button>
            ) : null}
            <Button variant="ghost" onClick={endQuiz}>{t('quiz.resultEnd')}</Button>
          </div>
        </Card>
      </div>
      </>
    )
  }

  return (
    <>
      <div className="flex w-full gap-8 px-8 items-start">
        <div className="flex-1">
          {timerBar}
          <div className="group relative ml-2 inline-flex">
            <span className="flex h-6 w-6 cursor-help items-center justify-center rounded-md border border-border bg-muted/50 text-muted-foreground">
              <Info size={12} />
            </span>
            <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-72 rounded-xl border-2 border-border bg-background p-3 text-xs font-black shadow-[2px_2px_0_var(--border)] opacity-0 transition-opacity group-hover:opacity-100">
              {hotkeyHint}
            </div>
          </div>
          <div className="mt-6">
            <div className="mx-auto max-w-2xl">
              <Card className="relative p-8">
                <button
                  type="button"
                  className="absolute top-3 right-3 inline-flex h-10 w-10 items-center justify-center rounded-md border-2 border-border bg-secondary text-secondary-foreground shadow-[2px_2px_0_var(--border)] hover:bg-[#321fb0] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_var(--border)]"
                  onClick={() => { playedAudioForQuestionRef.current = question.id; speakQuestion(question.sourceText, question.audioUrl, question.pronunciationText) }}
                  aria-label={language === 'vi' ? 'Phát âm thanh' : 'Play audio'}
                >
                  <Volume2 size={18} />
                </button>
                <button
                  type="button"
                  className={`absolute top-3 right-16 inline-flex h-10 w-10 items-center justify-center rounded-md border-2 shadow-[2px_2px_0_var(--border)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_var(--border)] ${flaggedTermIds.has(question.userTermId) ? 'border-warning bg-warning/20 text-warning' : 'border-border bg-background text-muted-foreground hover:bg-warning/10 hover:border-warning hover:text-warning'}`}
                  onClick={() => {
                    const isAlreadyFlagged = flaggedTermIds.has(question.userTermId)
                    if (shouldUseRemoteData) {
                      if (isAlreadyFlagged) {
                        vocabularyService.unflagTerm(question.userTermId).catch(() => { /* non-critical */ })
                      } else {
                        vocabularyService.flagTerm(question.userTermId).catch(() => { /* non-critical */ })
                      }
                    }
                    setFlaggedTermIds((prev) => {
                      const next = new Set(prev)
                      if (isAlreadyFlagged) {
                        next.delete(question.userTermId)
                      } else {
                        next.add(question.userTermId)
                      }
                      return next
                    })
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
                {isMcQuestion ? (
                  <>
                  <div className="mt-8 grid gap-3">
                    {question.options.map((option, index) => {
                      const label = String.fromCharCode(65 + index)
                      const isSelected = mcSelectedIndex === index
                      const isCorrectOption = index === question.correctIndex
                      const isHighlighted = highlightedMcIndex === index
                      let btnClass = 'neo-button inline-flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left text-sm font-black bg-card text-foreground hover:bg-muted active:neo-button-active select-none'
                      if (mcFeedbackState === 'correct' && isSelected) {
                        btnClass = 'neo-button inline-flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left text-sm font-black bg-success/20 border-success text-success select-none'
                      } else if (mcFeedbackState === 'wrong') {
                        if (isSelected) {
                          btnClass = 'neo-button inline-flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left text-sm font-black bg-danger/20 border-danger text-danger select-none'
                        } else if (isCorrectOption) {
                          btnClass = 'neo-button inline-flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left text-sm font-black bg-success/20 border-success text-success select-none'
                        }
                      } else if (isHighlighted && mcSelectedIndex === null) {
                        btnClass = 'neo-button inline-flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left text-sm font-black bg-muted border-secondary shadow-[3px_3px_0_var(--secondary)] text-foreground select-none'
                      }
                      return (
                        <button
                          key={index}
                          type="button"
                          disabled={mcSelectedIndex !== null}
                          className={btnClass}
                          onClick={() => selectMcOption(index)}
                          onMouseMove={(event) => {
                            if (mcSelectedIndex === null) {
                              const currentPos = { x: event.clientX, y: event.clientY }
                              const lastPos = lastMousePosRef.current
                              if (currentPos.x !== lastPos.x || currentPos.y !== lastPos.y) {
                                lastMousePosRef.current = currentPos
                                setHighlightedMcIndex(index)
                              }
                            }
                          }}
                          onMouseLeave={() => {
                            if (mcSelectedIndex === null && highlightedMcIndex === index) {
                              setHighlightedMcIndex(null)
                            }
                          }}
                        >
                          <span className={`flex h-7 w-7 items-center justify-center rounded-md border-2 border-border text-xs font-black tabular-nums transition-colors ${
                            isHighlighted && mcSelectedIndex === null
                              ? 'bg-primary text-primary-foreground border-border'
                              : 'bg-background text-foreground border-border'
                          }`}>{label}</span>
                          <span>{option}</span>
                        </button>
                      )
                    })}
                  </div>
                  <div className="mt-3">
                    <Button type="button" variant="ghost" className="text-muted-foreground" onClick={skipQuestion}>{t('quiz.skipQuestion')}</Button>
                  </div>
                  </>
                ) : (
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
                  {answerFeedback.type === 'exact' && !isRevealed ? (
                    <div className="rounded-md border-2 border-border bg-primary p-3 shadow-[2px_2px_0_var(--border)]">
                      <p className="text-xs font-black uppercase">{t('quiz.expectedTranslation')}</p>
                      <p className="mt-1 text-lg font-black">{question.expectedTranslation.split(/[\/,;\n]+/).map(s => s.trim()).filter(Boolean).join(' / ')}</p>
                    </div>
                  ) : null}
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
                    <Button type="button" variant="ghost" className="text-muted-foreground" onClick={skipQuestion}>{t('quiz.skipQuestion')}</Button>
                  </div>
                  <p className="text-xs font-black text-muted-foreground">{hotkeyHint}</p>
                </form>
                )}
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
                const isSkipped = session.skippedQuestionIds.includes(q.id)
                let bg = 'bg-muted text-muted-foreground hover:bg-muted/70'
                if (isCurrent) bg = 'bg-primary text-primary-foreground'
                else if (isSkipped) bg = 'bg-muted/50 text-muted-foreground/60'
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
