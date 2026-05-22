/* eslint-disable react-hooks/set-state-in-effect */
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Equal, FlipHorizontal2, Play } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import dontRememberIcon from '@/assets/brand/button-icons/dont-remember.svg'
import pronunciationIcon from '@/assets/brand/button-icons/pronunciation.svg'
import rememberIcon from '@/assets/brand/button-icons/remember.svg'
import timerIcon from '@/assets/brand/button-icons/timer.svg'
import repeatIcon from '@/assets/brand/button-icons/repeat.svg'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { hasRelatedTerms, relationshipDisplayOrder, relationshipLabelKeys } from '@/components/vocabulary/relationshipDisplay'
import { demoVocabulary } from '@/features/demo/demoData'
import { buildStudySessionStorageKey, clearActiveStudySession, clearStoredStudySession, readActiveStudySessionStorageKey, readStoredStudySession, writeStoredStudySession } from '@/features/study/sessionPersistence'
import { prepareSessionVocabulary } from '@/features/study/sessionVocabulary'
import { useI18n } from '@/i18n'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { studyLocalDb } from '@/services/local/studyLocalDb'
import { deckService } from '@/services/supabase/deck.service'
import { createEmptyRelationshipGroups, relationshipService } from '@/services/supabase/relationship.service'
import { studyService } from '@/services/supabase/study.service'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { useStudyStore } from '@/stores/useStudyStore'
import type { RelationType, VocabularyItem } from '@/types/vocabulary.types'
import { speak } from '@/utils/audio'
import type { ReviewAction, ReviewResult } from '@/utils/spacedRepetition'
import { scheduleReview } from '@/utils/spacedRepetition'

const AUTO_AUDIO_DELAY_MS = 600
const DEFAULT_AUTO_CARD_SECONDS = 6
const MIN_AUTO_CARD_SECONDS = 4
const MAX_AUTO_CARD_SECONDS = 30
const TWO_SIDE_FRONT_RATIO = 0.45

function getText(value?: string | null) {
  return value?.trim() || null
}

function clampAutoSeconds(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_AUTO_CARD_SECONDS
  return Math.max(MIN_AUTO_CARD_SECONDS, Math.min(MAX_AUTO_CARD_SECONDS, Math.trunc(value)))
}

function getTwoSideFrontMs(totalMs: number) {
  return Math.max(1500, Math.min(totalMs - 1000, Math.round(totalMs * TWO_SIDE_FRONT_RATIO)))
}

function serializeReviewResult(result: ReviewResult) {
  return {
    status: result.status,
    nextReviewAt: result.nextReviewAt.toISOString(),
    correctIncrement: result.correctIncrement,
    wrongIncrement: result.wrongIncrement,
    repetition: result.repetition,
    intervalDays: result.intervalDays,
    easeFactor: result.easeFactor,
  }
}

function applyReviewResult(item: VocabularyItem, result: ReviewResult, reviewedAt: string): VocabularyItem {
  return {
    ...item,
    correct_count: item.correct_count + result.correctIncrement,
    wrong_count: item.wrong_count + result.wrongIncrement,
    srs_repetition: result.repetition,
    srs_interval_days: result.intervalDays,
    srs_ease_factor: result.easeFactor,
    status: result.status,
    last_reviewed_at: reviewedAt,
    next_review_at: result.nextReviewAt.toISOString(),
    updated_at: reviewedAt,
  }
}

function FlashcardDetails({
  item,
  relationships,
}: {
  item: VocabularyItem
  relationships: Record<RelationType, VocabularyItem[]>
}) {
  const { t } = useI18n()
  const meaning = getText(item.meanings[0]?.text)
  const translation = getText(item.translation)
  const example = item.examples.find((entry) => getText(entry.sentence) || getText(entry.translation))
  const hasRelations = hasRelatedTerms(relationships)
  const hasDetails = meaning || translation || example || getText(item.note) || item.image_url || hasRelations

  if (!hasDetails) {
    return (
      <div className="mt-8 rounded-md border-2 border-border bg-muted p-4 text-left">
        <p className="font-black text-muted-foreground">{t('study.noCardDetails')}</p>
      </div>
    )
  }

  return (
    <div className="mt-8 grid gap-4 rounded-md border-2 border-border bg-muted p-4 text-left">
      {item.image_url ? (
        <img
          src={item.image_url}
          alt={item.source_text}
          className="max-h-56 w-full rounded-md border-2 border-border object-contain bg-card"
        />
      ) : null}
      {meaning ? (
        <div>
          <p className="text-xs font-black uppercase text-muted-foreground">{t('vocabulary.meaning')}</p>
          <p className="mt-1 text-2xl font-black">{meaning}</p>
        </div>
      ) : null}
      {translation && translation !== meaning ? (
        <div>
          <p className="text-xs font-black uppercase text-muted-foreground">{t('vocabulary.translation')}</p>
          <p className="mt-1 text-xl font-black text-primary">{translation}</p>
        </div>
      ) : null}
      {example ? (
        <div>
          <p className="text-xs font-black uppercase text-muted-foreground">{t('vocabulary.example')}</p>
          {getText(example.sentence) ? <p className="mt-1 font-semibold">{example.sentence}</p> : null}
          {getText(example.translation) ? <p className="font-semibold text-muted-foreground">{example.translation}</p> : null}
        </div>
      ) : null}
      {getText(item.note) ? (
        <div>
          <p className="text-xs font-black uppercase text-muted-foreground">{t('vocabulary.note')}</p>
          <p className="mt-1 font-semibold">{item.note}</p>
        </div>
      ) : null}
      {hasRelations ? (
        <div>
          <p className="text-xs font-black uppercase text-muted-foreground">{t('vocabulary.relatedTerms')}</p>
          <div className="mt-2 grid gap-2">
            {relationshipDisplayOrder.map((relationType) => {
              const terms = relationships[relationType]
              if (terms.length === 0) return null

              return (
                <div key={relationType} className="rounded-md border-2 border-border bg-card p-3">
                  <p className="text-sm font-black">{t(relationshipLabelKeys[relationType])}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {terms.map((term) => (
                      <span key={`${relationType}:${term.id}`} className="rounded-md border-2 border-border bg-muted px-2 py-1 text-sm font-black">
                        {term.source_text}
                        {term.translation ? <span className="font-semibold text-muted-foreground"> - {term.translation}</span> : null}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function FlashcardFaceContent({
  item,
  current,
  total,
}: {
  item: VocabularyItem
  current: number
  total: number
}) {
  const { t } = useI18n()

  return (
    <>
      <p className="text-sm font-black uppercase text-muted-foreground">{t('study.cardProgress', { current, total })}</p>
      <p className="mt-8 text-5xl font-black">{item.source_text}</p>
      {[item.part_of_speech, item.ipa].filter(Boolean).length > 0 ? (
        <p className="mt-4 font-mono text-2xl">{[item.part_of_speech, item.ipa].filter(Boolean).join(' · ')}</p>
      ) : null}
    </>
  )
}

function AutoCountdownBadge({
  remainingSeconds,
}: {
  remainingSeconds: number
}) {
  const { t } = useI18n()

  return (
    <div
      data-testid="auto-countdown"
      aria-label={t('study.autoCountdown', { seconds: remainingSeconds })}
      className="absolute right-4 top-4 z-10 rounded-md border-2 border-border bg-primary px-3 py-1 font-mono text-sm font-black text-primary-foreground shadow-[3px_3px_0_var(--border)] md:right-5 md:top-5 md:text-base"
    >
      {remainingSeconds}s
    </div>
  )
}

function EndSessionButton({ onClick }: { onClick: () => void }) {
  const { t } = useI18n()

  return (
    <Button
      type="button"
      variant="ghost"
      className="absolute left-4 top-4 z-20 min-h-0 px-3 py-1.5 text-xs md:left-5 md:top-5"
      onClick={onClick}
    >
      {t('study.endSession')}
    </Button>
  )
}

function StudyToolbarButton({
  label,
  icon,
  active = false,
  tone = active ? 'secondary' : 'ghost',
  className,
  ...props
}: {
  label: string
  icon: string
  active?: boolean
  tone?: 'ghost' | 'primary' | 'secondary'
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const toneClasses = {
    ghost: 'bg-card text-foreground hover:bg-muted',
    primary: 'bg-primary text-primary-foreground hover:bg-[#ffe05c]',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-[#321fb0]',
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={[
        'study-toolbar-button neo-button inline-flex h-12 min-h-12 w-12 items-center justify-center rounded-md border-2 border-border p-2 active:neo-button-active disabled:pointer-events-none disabled:opacity-50 md:h-14 md:min-h-14 md:w-14',
        toneClasses[tone],
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    >
      <img src={icon} alt="" aria-hidden="true" className="h-8 w-8 md:h-9 md:w-9" />
    </button>
  )
}

function AnimatedStudyCardFrame({
  children,
  motionKey,
}: {
  children: ReactNode
  motionKey: string
}) {
  const frameRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const latestHeightRef = useRef<number | null>(null)
  const pendingTargetHeightRef = useRef<number | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const [height, setHeight] = useState<number | null>(null)

  useLayoutEffect(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    const content = contentRef.current
    if (!content) return

    const setMeasuredHeight = (nextHeight: number) => {
      latestHeightRef.current = nextHeight
      setHeight(nextHeight)
    }

    const measureContent = () => {
      const nextHeight = content.scrollHeight
      if (nextHeight <= 0) return
      if (pendingTargetHeightRef.current !== null) return
      if (latestHeightRef.current !== null && Math.abs(latestHeightRef.current - nextHeight) <= 1) return

      setMeasuredHeight(nextHeight)
    }

    const nextHeight = content.scrollHeight
    if (nextHeight > 0) {
      const currentHeight = frameRef.current?.getBoundingClientRect().height ?? 0
      const shouldAnimateFromCurrent =
        latestHeightRef.current !== null &&
        currentHeight > 0 &&
        Math.abs(currentHeight - nextHeight) > 1

      if (shouldAnimateFromCurrent) {
        pendingTargetHeightRef.current = nextHeight
        setMeasuredHeight(currentHeight)
        animationFrameRef.current = window.requestAnimationFrame(() => {
          pendingTargetHeightRef.current = null
          animationFrameRef.current = null
          setMeasuredHeight(nextHeight)
        })
      } else {
        setMeasuredHeight(nextHeight)
      }
    }

    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measureContent)
    observer?.observe(content)
    window.addEventListener('resize', measureContent)

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      pendingTargetHeightRef.current = null
      observer?.disconnect()
      window.removeEventListener('resize', measureContent)
    }
  }, [motionKey])

  return (
    <div
      ref={frameRef}
      data-testid="study-card-motion-frame"
      className="study-card-motion-frame"
      style={height === null ? undefined : { height: `${height}px` }}
    >
      <div ref={contentRef} className="study-card-motion-content">
        {children}
      </div>
    </div>
  )
}

export function FlashcardStudyPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { sessionId } = useParams()
  const { t } = useI18n()
  const user = useAuthStore((state) => state.user)
  const { mode, cardLimit, shuffle, selectedDeckId } = useStudyStore()
  const shouldUseRemoteData = isSupabaseConfigured && Boolean(user)
  const isReviewSession = sessionId === 'review-session'
  const fallbackSessionKey = buildStudySessionStorageKey({
    userId: user?.id,
    sessionId,
    selectedDeckId,
    mode,
    cardLimit,
    shuffle: !isReviewSession && shuffle,
    remote: shouldUseRemoteData,
  })
  const sessionKey = readActiveStudySessionStorageKey({
    userId: user?.id,
    sessionId,
    remote: shouldUseRemoteData,
  }) ?? fallbackSessionKey
  const initialStoredSession = readStoredStudySession(sessionKey)
  const [index, setIndex] = useState(initialStoredSession?.index ?? 0)
  const [flipped, setFlipped] = useState((initialStoredSession?.mode ?? mode) === 'one_side')
  const [autoEnabled, setAutoEnabled] = useState(false)
  const [autoSettingsOpen, setAutoSettingsOpen] = useState(false)
  const [autoRepeat, setAutoRepeat] = useState(false)
  const [autoCardSeconds, setAutoCardSeconds] = useState(DEFAULT_AUTO_CARD_SECONDS)
  const [autoRemainingSeconds, setAutoRemainingSeconds] = useState(DEFAULT_AUTO_CARD_SECONDS)
  const [pendingAction, setPendingAction] = useState<ReviewAction | null>(null)
  const [endSessionOpen, setEndSessionOpen] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [cachedVocabulary, setCachedVocabulary] = useState<VocabularyItem[]>([])
  const [rememberedCount, setRememberedCount] = useState(0)
  const [forgotCount, setForgotCount] = useState(0)
  const [viewedTermIds, setViewedTermIds] = useState<string[]>(initialStoredSession?.viewedTermIds ?? [])
  const [flushedViewTermIds, setFlushedViewTermIds] = useState<string[]>(initialStoredSession?.flushedViewTermIds ?? [])
  const [sessionSnapshot, setSessionSnapshot] = useState<{ key: string, vocabulary: VocabularyItem[], mode: typeof mode, viewedTermIds: string[], flushedViewTermIds: string[] } | null>(
    initialStoredSession
      ? {
          key: sessionKey,
          vocabulary: initialStoredSession.vocabulary,
          mode: initialStoredSession.mode,
          viewedTermIds: initialStoredSession.viewedTermIds,
          flushedViewTermIds: initialStoredSession.flushedViewTermIds,
        }
      : null,
  )
  const vocabularyQuery = useQuery({
    queryKey: ['vocabulary', user?.id, isReviewSession ? 'review' : 'all'],
    queryFn: () => vocabularyService.list(user!.id),
    enabled: shouldUseRemoteData && (!selectedDeckId || isReviewSession),
  })
  const deckTermsQuery = useQuery({
    queryKey: ['deck-terms', selectedDeckId],
    queryFn: () => deckService.listTerms(selectedDeckId!),
    enabled: shouldUseRemoteData && Boolean(selectedDeckId) && !isReviewSession,
  })
  const rawVocabulary = useMemo(() => {
    const remoteSource = shouldUseRemoteData
      ? selectedDeckId && !isReviewSession
        ? deckTermsQuery.data ?? []
        : vocabularyQuery.data ?? []
      : demoVocabulary
    const source = shouldUseRemoteData && remoteSource.length === 0 && cachedVocabulary.length > 0
      ? cachedVocabulary
      : remoteSource

    if (!isReviewSession) return source

    const now = new Date()
    return source.filter((entry) => entry.status === 'difficult' || (entry.next_review_at && new Date(entry.next_review_at) <= now))
  }, [cachedVocabulary, deckTermsQuery.data, isReviewSession, selectedDeckId, shouldUseRemoteData, vocabularyQuery.data])
  const preparedVocabulary = useMemo(
    () => prepareSessionVocabulary(rawVocabulary, { limit: cardLimit, shuffle: !isReviewSession && shuffle }),
    [cardLimit, isReviewSession, rawVocabulary, shuffle],
  )
  const isSourceReady = shouldUseRemoteData
    ? selectedDeckId && !isReviewSession
      ? deckTermsQuery.isSuccess
      : vocabularyQuery.isSuccess
    : true
  const hasLocalFallback = shouldUseRemoteData && cachedVocabulary.length > 0

  useEffect(() => {
    if (sessionSnapshot?.key === sessionKey) return

    const storedSession = readStoredStudySession(sessionKey)
    if (storedSession) {
      setSessionSnapshot((current) => {
        if (current?.key === sessionKey) return current
        return {
          key: sessionKey,
          vocabulary: storedSession.vocabulary,
          mode: storedSession.mode,
          viewedTermIds: storedSession.viewedTermIds,
          flushedViewTermIds: storedSession.flushedViewTermIds,
        }
      })
      setIndex(storedSession.index)
      setFlipped(storedSession.mode === 'one_side')
      setViewedTermIds(storedSession.viewedTermIds)
      setFlushedViewTermIds(storedSession.flushedViewTermIds)
      return
    }

    if (!isSourceReady && !hasLocalFallback) return
    writeStoredStudySession(sessionKey, { vocabulary: preparedVocabulary, index: 0, mode, viewedTermIds: [], flushedViewTermIds: [] })
    void studyLocalDb.saveActiveSession(sessionKey, { vocabulary: preparedVocabulary, index: 0, mode, viewedTermIds: [], flushedViewTermIds: [] })
    setSessionSnapshot((current) => {
      if (current?.key === sessionKey) return current
      return { key: sessionKey, vocabulary: preparedVocabulary, mode, viewedTermIds: [], flushedViewTermIds: [] }
    })
    setIndex(0)
    setFlipped(mode === 'one_side')
    setViewedTermIds([])
    setFlushedViewTermIds([])
  }, [hasLocalFallback, isSourceReady, mode, preparedVocabulary, sessionKey, sessionSnapshot?.key])

  const vocabulary = sessionSnapshot?.key === sessionKey ? sessionSnapshot.vocabulary : preparedVocabulary
  const sessionMode = sessionSnapshot?.key === sessionKey ? sessionSnapshot.mode : initialStoredSession?.mode ?? mode
  const autoCardMs = autoCardSeconds * 1000

  useEffect(() => {
    if (sessionSnapshot?.key !== sessionKey) return
    writeStoredStudySession(sessionKey, {
      vocabulary: sessionSnapshot.vocabulary,
      index,
      mode: sessionSnapshot.mode,
      viewedTermIds,
      flushedViewTermIds,
    })
    void studyLocalDb.saveActiveSession(sessionKey, {
      vocabulary: sessionSnapshot.vocabulary,
      index,
      mode: sessionSnapshot.mode,
      viewedTermIds,
      flushedViewTermIds,
    })
  }, [flushedViewTermIds, index, sessionKey, sessionSnapshot, viewedTermIds])

  const item = vocabulary[index]
  const vocabularyCardQuery = useQuery({
    queryKey: ['vocabulary-card', item?.id],
    queryFn: () => relationshipService.getCard(item!.id, item),
    staleTime: 5 * 60 * 1000,
    enabled: shouldUseRemoteData && Boolean(item?.id),
  })
  const cardItem = vocabularyCardQuery.data?.entry ?? item
  const relationships = vocabularyCardQuery.data?.relationships ?? createEmptyRelationshipGroups()
  const relationshipSignature = relationshipDisplayOrder
    .map((relationType) => relationships[relationType].map((term) => term.id).join(','))
    .join('|')
  useEffect(() => {
    if (!shouldUseRemoteData || !user) return
    const source = selectedDeckId && !isReviewSession ? deckTermsQuery.data : vocabularyQuery.data
    if (!source || source.length === 0) return
    void studyLocalDb.cacheVocabulary(user.id, selectedDeckId && !isReviewSession ? selectedDeckId : null, source)
  }, [deckTermsQuery.data, isReviewSession, selectedDeckId, shouldUseRemoteData, user, vocabularyQuery.data])

  useEffect(() => {
    if (!shouldUseRemoteData || !user) return
    void studyLocalDb.getCachedVocabulary(user.id, selectedDeckId && !isReviewSession ? selectedDeckId : null)
      .then(setCachedVocabulary)
      .catch(() => setCachedVocabulary([]))
  }, [isReviewSession, selectedDeckId, shouldUseRemoteData, user])

  useEffect(() => {
    if (initialStoredSession || sessionSnapshot) return
    void studyLocalDb.getActiveSession(sessionKey)
      .then((storedSession) => {
        if (!storedSession) return
        setSessionSnapshot({
          key: sessionKey,
          vocabulary: storedSession.vocabulary,
          mode: storedSession.mode,
          viewedTermIds: storedSession.viewedTermIds,
          flushedViewTermIds: storedSession.flushedViewTermIds,
        })
        setIndex(storedSession.index)
        setFlipped(storedSession.mode === 'one_side')
        setViewedTermIds(storedSession.viewedTermIds)
        setFlushedViewTermIds(storedSession.flushedViewTermIds)
      })
      .catch(() => undefined)
  }, [initialStoredSession, sessionKey, sessionSnapshot])
  useEffect(() => {
    if (!shouldUseRemoteData || !item || sessionSnapshot?.key !== sessionKey) return
    if (viewedTermIds.includes(item.id)) return

    setViewedTermIds((current) => current.includes(item.id) ? current : [...current, item.id])
    if (user) void studyLocalDb.addPendingViewTermIds(user.id, [item.id])
  }, [item, sessionKey, sessionSnapshot?.key, shouldUseRemoteData, user, viewedTermIds])

  useEffect(() => {
    if (!autoEnabled) setAutoRepeat(false)
  }, [autoEnabled])

  async function flushStudyChanges(extraTermIds: string[] = [], sessionPatch?: Parameters<typeof studyService.flushStudyChanges>[0]['sessionPatch']) {
    if (!shouldUseRemoteData || !user) return
    const pendingIds = Array.from(new Set([...viewedTermIds, ...extraTermIds]))
      .filter((id) => !flushedViewTermIds.includes(id))
    if (pendingIds.length > 0) await studyLocalDb.addPendingViewTermIds(user.id, pendingIds)
    if (sessionPatch) await studyLocalDb.savePendingSessionSummary(user.id, sessionId ?? null, sessionPatch)

    const pending = await studyLocalDb.getPendingStudyChanges(user.id)
    if (pending.actions.length === 0 && pending.viewedTermIds.length === 0 && !pending.sessionPatch) return

    try {
      await studyService.flushStudyChanges({
        actions: pending.actions,
        viewedTermIds: pending.viewedTermIds,
        sessionId: pending.sessionId,
        sessionPatch: pending.sessionPatch,
      })
      await studyLocalDb.clearPendingStudyChanges(user.id)
      setFlushedViewTermIds((current) => Array.from(new Set([...current, ...pendingIds])))
      await queryClient.invalidateQueries({ queryKey: ['vocabulary', user.id] })
      if (selectedDeckId) await queryClient.invalidateQueries({ queryKey: ['deck-terms', selectedDeckId] })
      setSyncError(null)
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : t('study.syncPending'))
    }
  }

  function countViewed(extraTermIds: string[] = []) {
    return Array.from(new Set([...viewedTermIds, ...extraTermIds])).length
  }

  async function saveSessionSummary(extraTermIds: string[] = [], extraRemembered = 0, extraForgot = 0) {
    if (!shouldUseRemoteData || !user || !sessionId) return
    const sessionPatch = {
      total_cards: vocabulary.length,
      viewed_cards: countViewed(extraTermIds),
      remembered_count: rememberedCount + extraRemembered,
      difficult_count: forgotCount + extraForgot,
    }
    await flushStudyChanges(extraTermIds, sessionPatch)
    if (!syncError) await studyService.pruneHistory(user.id)
  }

  function finishSession(extraRemembered = 0, extraForgot = 0) {
    setAutoEnabled(false)
    setAutoSettingsOpen(false)
    const extraTermIds = item ? [item.id] : []
    void saveSessionSummary(extraTermIds, extraRemembered, extraForgot).finally(() => {
      clearStoredStudySession(sessionKey)
      void studyLocalDb.clearActiveSession(sessionKey)
      clearActiveStudySession({ userId: user?.id, sessionId, remote: shouldUseRemoteData })
      navigate('/app/study')
    })
  }

  function next(extraRemembered = 0, extraForgot = 0) {
    if (index >= vocabulary.length - 1) {
      const extraTermIds = item ? [item.id] : []
      void saveSessionSummary(extraTermIds, extraRemembered, extraForgot).finally(() => {
        clearStoredStudySession(sessionKey)
        void studyLocalDb.clearActiveSession(sessionKey)
        clearActiveStudySession({ userId: user?.id, sessionId, remote: shouldUseRemoteData })
        navigate('/app/study')
      })
      return
    }
    prefetchCard(index + 1)
    setAutoRemainingSeconds(autoCardSeconds)
    setIndex(index + 1)
    setFlipped(sessionMode === 'one_side')
  }

  function browseTo(nextIndex: number) {
    if (nextIndex < 0 || nextIndex >= vocabulary.length) return
    prefetchCard(nextIndex)
    setAutoRemainingSeconds(autoCardSeconds)
    setIndex(nextIndex)
    setFlipped(sessionMode === 'one_side')
  }

  function prefetchCard(cardIndex: number) {
    if (!shouldUseRemoteData) return
    const nextItem = vocabulary[cardIndex]
    if (!nextItem) return
    queryClient.prefetchQuery({
      queryKey: ['vocabulary-card', nextItem.id],
      queryFn: () => relationshipService.getCard(nextItem.id, nextItem),
      staleTime: 5 * 60 * 1000,
    })
  }

  function autoAdvance() {
    if (index >= vocabulary.length - 1) {
      if (autoRepeat && vocabulary.length > 1) {
        setAutoRemainingSeconds(autoCardSeconds)
        setIndex(0)
        setFlipped(sessionMode === 'one_side')
        return
      }
      setAutoEnabled(false)
      return
    }
    setAutoRemainingSeconds(autoCardSeconds)
    setIndex(index + 1)
    setFlipped(sessionMode === 'one_side')
  }

  function record(action: ReviewAction) {
    if (!item) return
    if (!shouldUseRemoteData) {
      next()
      return
    }
    const rememberedIncrement = action === 'know' ? 1 : 0
    const forgotIncrement = action === 'dont_know' ? 1 : 0
    const reviewedAt = new Date().toISOString()
    const result = scheduleReview(action, {
      correctCount: item.correct_count,
      wrongCount: item.wrong_count,
      repetition: item.srs_repetition,
      intervalDays: item.srs_interval_days,
      easeFactor: item.srs_ease_factor,
    })
    const updatedItem = applyReviewResult(item, result, reviewedAt)

    setPendingAction(action)
    setSessionSnapshot((current) => {
      if (!current || current.key !== sessionKey) return current
      return {
        ...current,
        vocabulary: current.vocabulary.map((entry) => entry.id === item.id ? updatedItem : entry),
      }
    })
    if (user) {
      void studyLocalDb.addPendingReviewAction(user.id, {
        termId: item.id,
        action,
        reviewedAt,
        result: serializeReviewResult(result),
      }).catch((error) => setSyncError(error instanceof Error ? error.message : t('study.syncPending')))
    }
    setRememberedCount((current) => current + rememberedIncrement)
    setForgotCount((current) => current + forgotIncrement)
    setPendingAction(null)
    next(rememberedIncrement, forgotIncrement)
  }

  useEffect(() => {
    if (!autoEnabled || !item) return

    const timer = window.setTimeout(() => {
      speak(item.source_text)
    }, AUTO_AUDIO_DELAY_MS)

    return () => window.clearTimeout(timer)
  }, [autoEnabled, index, item])

  useEffect(() => {
    if (!autoEnabled || !item) return

    if (sessionMode === 'two_side') {
      setFlipped(false)
      const flipTimer = window.setTimeout(() => {
        setFlipped(true)
      }, getTwoSideFrontMs(autoCardMs))
      const advanceTimer = window.setTimeout(autoAdvance, autoCardMs)

      return () => {
        window.clearTimeout(flipTimer)
        window.clearTimeout(advanceTimer)
      }
    }

    const advanceTimer = window.setTimeout(autoAdvance, autoCardMs)
    return () => window.clearTimeout(advanceTimer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCardMs, autoEnabled, autoRepeat, index, item, sessionMode, vocabulary.length])

  useEffect(() => {
    if (!autoEnabled || !item) return

    const countdownTimers = Array.from({ length: Math.max(0, autoCardSeconds - 1) }, (_, index) => {
      const elapsedSeconds = index + 1
      return window.setTimeout(() => {
        setAutoRemainingSeconds(autoCardSeconds - elapsedSeconds)
      }, elapsedSeconds * 1000)
    })

    return () => countdownTimers.forEach((timer) => window.clearTimeout(timer))
  }, [autoCardSeconds, autoEnabled, index, item])

  if (!hasLocalFallback && (vocabularyQuery.isLoading || deckTermsQuery.isLoading)) {
    return <Card className="font-black">{t('vocabulary.loading')}</Card>
  }

  const error =
    vocabularyQuery.error instanceof Error ? vocabularyQuery.error.message :
    deckTermsQuery.error instanceof Error ? deckTermsQuery.error.message :
    vocabularyCardQuery.error instanceof Error ? vocabularyCardQuery.error.message :
    null

  if (error && !hasLocalFallback) {
    return <Card className="font-black text-danger">{error}</Card>
  }

  if (!item) {
    return (
      <Card className="text-center">
        <p className="text-xl font-black">{t('vocabulary.emptyTitle')}</p>
        <p className="mt-2 text-sm font-semibold text-muted-foreground">{t('vocabulary.emptyDescription')}</p>
        <Button asChild className="mt-4"><Link to="/app/vocabulary/new">{t('vocabulary.add')}</Link></Button>
      </Card>
    )
  }

  return (
    <div className="pb-44 md:pb-8">
      <ConfirmModal
        open={endSessionOpen}
        title={t('study.endSessionTitle')}
        description={t('study.endSessionDescription')}
        confirmLabel={t('study.endSessionConfirm')}
        cancelLabel={t('study.continueSession')}
        variant="primary"
        onConfirm={() => {
          setEndSessionOpen(false)
          finishSession()
        }}
        onCancel={() => setEndSessionOpen(false)}
      />
      <div className="mx-auto mt-6 flex max-w-5xl items-start gap-2 md:gap-4">
        {syncError ? <p className="sr-only">{syncError}</p> : null}
        <div className="grid grid-cols-[3rem_minmax(0,1fr)_3rem] md:grid-cols-[4rem_minmax(0,1fr)_4rem] items-start gap-2 md:gap-4 flex-1 min-w-0">
        <Button
          type="button"
          variant="ghost"
          aria-label={t('study.previousCard')}
          disabled={index === 0}
          className="sticky top-[50vh] -translate-y-1/2 h-12 min-h-12 w-12 px-0 md:h-14 md:min-h-14 md:w-14 justify-self-center"
          onClick={() => browseTo(index - 1)}
        >
          <ChevronLeft aria-hidden="true" size={28} />
        </Button>
        <AnimatedStudyCardFrame motionKey={`${cardItem.id}:${sessionMode}:${flipped ? 'back' : 'front'}:${relationshipSignature}`}>
          {sessionMode === 'two_side' ? (
            <div
              data-testid="flashcard-shell"
              data-flipped={flipped ? 'true' : 'false'}
              className="flashcard-shell relative"
            >
              <EndSessionButton onClick={() => setEndSessionOpen(true)} />
              {autoEnabled ? <AutoCountdownBadge remainingSeconds={autoRemainingSeconds} /> : null}
              <div className="flashcard-inner">
                <Card
                  data-testid="flashcard-front"
                  aria-hidden={flipped}
                  className="flashcard-face flashcard-front p-8 text-center"
                >
                  <FlashcardFaceContent item={cardItem} current={index + 1} total={vocabulary.length} />
                </Card>
                <Card
                  data-testid="flashcard-back"
                  aria-hidden={!flipped}
                  className="flashcard-face flashcard-back p-8 text-center"
                >
                  <FlashcardFaceContent item={cardItem} current={index + 1} total={vocabulary.length} />
                  <FlashcardDetails item={cardItem} relationships={relationships} />
                </Card>
              </div>
            </div>
          ) : (
            <Card className="relative min-h-96 p-8 text-center">
              <EndSessionButton onClick={() => setEndSessionOpen(true)} />
              {autoEnabled ? <AutoCountdownBadge remainingSeconds={autoRemainingSeconds} /> : null}
              <FlashcardFaceContent item={cardItem} current={index + 1} total={vocabulary.length} />
              <FlashcardDetails item={cardItem} relationships={relationships} />
            </Card>
          )}
        </AnimatedStudyCardFrame>
        <Button
          type="button"
          variant="ghost"
          aria-label={t('study.nextCard')}
          disabled={index >= vocabulary.length - 1}
          className="sticky top-[50vh] -translate-y-1/2 h-12 min-h-12 w-12 px-0 md:h-14 md:min-h-14 md:w-14 justify-self-center"
          onClick={() => browseTo(index + 1)}
        >
          <ChevronRight aria-hidden="true" size={28} />
        </Button>
        </div>
        <div
        data-testid="study-action-toolbar"
        className="fixed inset-x-0 bottom-0 z-30 pointer-events-none md:sticky md:inset-auto md:top-6 md:self-start md:z-auto md:pointer-events-auto md:flex md:flex-col md:flex-shrink-0"
      >
        <div
          data-testid="study-toolbar-buttons"
          className="pointer-events-auto mx-auto flex w-full max-w-[48rem] flex-wrap items-center justify-center gap-2 rounded-md border-2 border-border bg-card/95 p-2 shadow-[5px_5px_0_var(--border)] backdrop-blur md:w-auto md:max-w-none md:flex-col md:gap-2 md:p-3"
        >
          <StudyToolbarButton label={t('actions.playAudio')} icon={pronunciationIcon} onClick={() => speak(item.source_text)} />
          {sessionMode === 'two_side' ? (
            <button
              type="button"
              aria-label={t('study.flip')}
              title={t('study.flip')}
              className="study-toolbar-button neo-button inline-flex h-12 min-h-12 w-12 items-center justify-center rounded-md border-2 border-border bg-secondary p-2 text-secondary-foreground active:neo-button-active md:h-14 md:min-h-14 md:w-14"
              onClick={() => setFlipped(!flipped)}
            >
              <FlipHorizontal2 aria-hidden="true" size={28} strokeWidth={2.5} />
            </button>
          ) : null}
          <div
            data-testid="auto-timer-control"
            className="relative"
          >
            <StudyToolbarButton
              label={autoEnabled ? t('study.autoStop') : t('study.autoStart')}
              icon={timerIcon}
              active={autoEnabled || autoSettingsOpen}
              aria-haspopup="dialog"
              aria-expanded={autoSettingsOpen}
              onClick={() => setAutoSettingsOpen((open) => !open)}
            />
            {autoSettingsOpen ? (
              <div
                role="dialog"
                aria-label={t('study.autoSeconds')}
                data-testid="auto-settings-panel"
                className="study-auto-settings-panel absolute bottom-full left-1/2 z-40 mb-3 flex -translate-x-1/2 items-center gap-2 rounded-md border-2 border-border bg-card p-2 shadow-[5px_5px_0_var(--border)] md:bottom-auto md:left-auto md:right-full md:top-1/2 md:mr-3 md:-translate-y-1/2 md:translate-x-0"
              >
                <input
                  aria-label={t('study.autoSeconds')}
                  type="number"
                  min={MIN_AUTO_CARD_SECONDS}
                  max={MAX_AUTO_CARD_SECONDS}
                  value={autoCardSeconds}
                  onChange={(event) => {
                    const seconds = clampAutoSeconds(Number(event.target.value))
                    setAutoCardSeconds(seconds)
                    setAutoRemainingSeconds(seconds)
                  }}
                  className="h-10 w-16 rounded-md border-2 border-border bg-background px-2 text-center font-mono text-base font-black text-foreground"
                />
                <button
                  type="button"
                  aria-label={autoEnabled ? t('study.autoStop') : t('study.autoStart')}
                  title={autoEnabled ? t('study.autoStop') : t('study.autoStart')}
                  className={[
                    'neo-button inline-flex h-10 min-h-10 w-10 items-center justify-center rounded-md border-2 border-border p-1.5 active:neo-button-active',
                    autoEnabled ? 'bg-secondary text-secondary-foreground' : 'bg-primary text-primary-foreground',
                  ].join(' ')}
                  onClick={() => {
                    setAutoRemainingSeconds(autoCardSeconds)
                    setAutoEnabled((enabled) => !enabled)
                    setAutoSettingsOpen(false)
                  }}
                >
                  {autoEnabled ? (
                    <Equal aria-hidden="true" className="h-7 w-7" strokeWidth={3.5} />
                  ) : (
                    <Play aria-hidden="true" className="h-7 w-7" fill="currentColor" strokeWidth={3} />
                  )}
                </button>
              </div>
            ) : null}
          </div>
          <StudyToolbarButton
            label={t('study.autoRepeat')}
            icon={repeatIcon}
            active={autoRepeat}
            disabled={!autoEnabled}
            aria-pressed={autoRepeat}
            onClick={() => {
              if (!autoEnabled) return
              setAutoRepeat((repeat) => !repeat)
            }}
          />
          <span className="mx-1 hidden h-10 w-0.5 bg-border md:mx-0 md:block md:h-0.5 md:w-10" aria-hidden="true" />
          <StudyToolbarButton
            label={t('study.dontKnow')}
            icon={dontRememberIcon}
            disabled={pendingAction === 'dont_know'}
            className={`h-14 min-h-14 w-16 md:w-20${pendingAction && pendingAction !== 'dont_know' ? ' pointer-events-none' : ''}`}
            onClick={() => record('dont_know')}
          />
          <StudyToolbarButton
            label={t('study.know')}
            icon={rememberIcon}
            tone="primary"
            disabled={pendingAction === 'know'}
            className={`h-14 min-h-14 w-16 md:w-20${pendingAction && pendingAction !== 'know' ? ' pointer-events-none' : ''}`}
            onClick={() => record('know')}
          />
        </div>
        </div>
      </div>
    </div>
  )
}
