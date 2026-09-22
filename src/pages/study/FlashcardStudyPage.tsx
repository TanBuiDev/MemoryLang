/* eslint-disable react-hooks/set-state-in-effect */
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, Check, ChevronLeft, ChevronRight, CloudRain, Equal, FlipHorizontal2, Play } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode, RefObject } from 'react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import dontRememberIcon from '@/assets/brand/button-icons/dont-remember.svg'
import pronunciationIcon from '@/assets/brand/button-icons/pronunciation.svg'
import rememberIcon from '@/assets/brand/button-icons/remember.svg'
import timerIcon from '@/assets/brand/button-icons/timer.svg'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { hasRelatedTerms, relationshipDisplayOrder, relationshipLabelKeys } from '@/components/vocabulary/relationshipDisplay'
import { demoVocabulary } from '@/features/demo/demoData'
import { formatStudyHotkey, hotkeyFromKeyboardEvent } from '@/features/study/studyHotkeys'
import { buildStudySessionStorageKey, clearActiveStudySession, clearStoredStudySession, readActiveStudySessionStorageKey, readStoredStudySession, writeStoredStudySession, type StoredReviewAction, type StoredStudySession } from '@/features/study/sessionPersistence'
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
import { speak, speakVI } from '@/utils/audio'
import type { ReviewAction, ReviewResult } from '@/utils/spacedRepetition'
import { scheduleReview } from '@/utils/spacedRepetition'
import { filterActiveVocabulary } from '@/utils/vocabulary'

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
  const validExamples = item.examples?.filter((ex) => getText(ex.sentence) || getText(ex.translation)) ?? []
  const hasExamples = validExamples.length > 0
  const hasRelations = hasRelatedTerms(relationships)
  const hasDetails = meaning || translation || hasExamples || getText(item.note) || item.image_url || hasRelations

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
      {hasExamples ? (
        <div>
          <p className="text-xs font-black uppercase text-muted-foreground mb-2">{t('vocabulary.examples')}</p>
          <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
            {validExamples.map((ex, index) => (
              <div key={index} className="border-l-4 border-primary pl-3 py-0.5 bg-background/30 rounded-r p-2 border-y border-r border-border/50">
                {getText(ex.sentence) ? <p className="font-semibold text-sm">{ex.sentence}</p> : null}
                {getText(ex.translation) ? <p className="text-xs font-semibold text-muted-foreground mt-1">{ex.translation}</p> : null}
              </div>
            ))}
          </div>
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

function RememberConfirmationOverlay({
  remainingSeconds,
  shortcut,
  buttonRef,
  onRemember,
}: {
  remainingSeconds: number
  shortcut: string | null
  buttonRef: RefObject<HTMLButtonElement | null>
  onRemember: () => void
}) {
  const { t } = useI18n()

  return (
    <div className="absolute inset-0 z-30 grid place-items-center rounded-md bg-background/80 p-6 backdrop-blur-[2px]">
      <div className="grid justify-items-center gap-4 text-center">
        <button
          ref={buttonRef}
          type="button"
          aria-label={t('study.confirmRemember')}
          className="neo-button grid h-44 w-44 content-center justify-items-center gap-3 rounded-md border-2 border-border bg-primary px-4 text-primary-foreground active:neo-button-active"
          onClick={onRemember}
        >
          <span className="text-2xl font-black">{t('study.confirmRemember')}</span>
          <span
            aria-live="polite"
            aria-label={t('study.confirmSecondsRemaining', { seconds: remainingSeconds })}
            className="font-mono text-lg font-black"
          >
            {remainingSeconds}s
          </span>
        </button>
        <p className="rounded-md border-2 border-border bg-card px-4 py-2 font-black">
          {t('study.confirmDefaultForgot')}
        </p>
        {shortcut ? (
          <p className="text-sm font-black text-muted-foreground">
            {t('study.confirmHotkey')}: <kbd className="rounded border-2 border-border bg-card px-2 py-1 font-mono text-foreground">{formatStudyHotkey(shortcut)}</kbd>
          </p>
        ) : null}
      </div>
    </div>
  )
}

function EndSessionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="absolute left-4 top-4 z-40 min-h-0 px-3 py-1.5 text-xs md:left-5 md:top-5"
      onClick={onClick}
    >
      {label}
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
  const { mode, cardLimit, shuffle, selectedDeckId, requireRememberConfirmation, rememberConfirmationSeconds, hotkeys } = useStudyStore()
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
  const [autoCardSeconds, setAutoCardSeconds] = useState(DEFAULT_AUTO_CARD_SECONDS)
  const [autoRemainingSeconds, setAutoRemainingSeconds] = useState(DEFAULT_AUTO_CARD_SECONDS)
  const [speakViEnabled, setSpeakViEnabled] = useState(false)
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const [confirmationRemainingSeconds, setConfirmationRemainingSeconds] = useState<number>(initialStoredSession?.rememberConfirmationSeconds ?? rememberConfirmationSeconds)
  const [completeAfterConfirmation, setCompleteAfterConfirmation] = useState(false)
  const [pendingAction, setPendingAction] = useState<ReviewAction | null>(null)
  const [sessionModal, setSessionModal] = useState<'discard' | 'complete' | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [cachedVocabulary, setCachedVocabulary] = useState<VocabularyItem[]>([])
  const [viewedTermIds, setViewedTermIds] = useState<string[]>(initialStoredSession?.viewedTermIds ?? [])
  const [flushedViewTermIds, setFlushedViewTermIds] = useState<string[]>(initialStoredSession?.flushedViewTermIds ?? [])
  const confirmationButtonRef = useRef<HTMLButtonElement>(null)
  const resolveConfirmationRef = useRef<(action: 'know' | 'dont_know') => void>(() => undefined)
  const speechPendingRef = useRef(false)
  const speechRetryRef = useRef<number | undefined>(undefined)
  const [sessionSnapshot, setSessionSnapshot] = useState<(StoredStudySession & { key: string }) | null>(
    initialStoredSession
      ? {
          key: sessionKey,
          ...initialStoredSession,
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

    if (!isReviewSession) return filterActiveVocabulary(source)

    const now = new Date()
    return filterActiveVocabulary(source.filter((entry) => entry.status === 'difficult' || (entry.next_review_at && new Date(entry.next_review_at) <= now)))
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
          ...storedSession,
        }
      })
      setIndex(storedSession.index)
      setFlipped(storedSession.mode === 'one_side')
      setViewedTermIds(storedSession.viewedTermIds)
      setFlushedViewTermIds(storedSession.flushedViewTermIds)
      return
    }

    if (!isSourceReady && !hasLocalFallback) return
    const newSession: StoredStudySession = {
      vocabulary: preparedVocabulary,
      index: 0,
      mode,
      viewedTermIds: [],
      flushedViewTermIds: [],
      requireRememberConfirmation,
      rememberConfirmationSeconds,
      ratingsByTermId: {},
      reviewActionsByTermId: {},
      hasReachedLastCard: preparedVocabulary.length <= 1,
    }
    writeStoredStudySession(sessionKey, newSession)
    void studyLocalDb.saveActiveSession(sessionKey, newSession)
    setSessionSnapshot((current) => {
      if (current?.key === sessionKey) return current
      return { key: sessionKey, ...newSession }
    })
    setIndex(0)
    setFlipped(mode === 'one_side')
    setViewedTermIds([])
    setFlushedViewTermIds([])
  }, [hasLocalFallback, isSourceReady, mode, preparedVocabulary, rememberConfirmationSeconds, requireRememberConfirmation, sessionKey, sessionSnapshot?.key])

  const vocabulary = sessionSnapshot?.key === sessionKey ? sessionSnapshot.vocabulary : preparedVocabulary
  const sessionMode = sessionSnapshot?.key === sessionKey ? sessionSnapshot.mode : initialStoredSession?.mode ?? mode
  const sessionRequiresConfirmation = sessionSnapshot?.key === sessionKey
    ? sessionSnapshot.requireRememberConfirmation
    : initialStoredSession?.requireRememberConfirmation ?? requireRememberConfirmation
  const sessionConfirmationSeconds = sessionSnapshot?.key === sessionKey
    ? sessionSnapshot.rememberConfirmationSeconds
    : initialStoredSession?.rememberConfirmationSeconds ?? rememberConfirmationSeconds
  const hasReachedLastCard = sessionSnapshot?.key === sessionKey
    ? sessionSnapshot.hasReachedLastCard || index >= vocabulary.length - 1
    : index >= vocabulary.length - 1
  const autoCardMs = autoCardSeconds * 1000

  useEffect(() => {
    if (sessionSnapshot?.key !== sessionKey) return
    writeStoredStudySession(sessionKey, {
      vocabulary: sessionSnapshot.vocabulary,
      index,
      mode: sessionSnapshot.mode,
      viewedTermIds,
      flushedViewTermIds,
      requireRememberConfirmation: sessionSnapshot.requireRememberConfirmation,
      rememberConfirmationSeconds: sessionSnapshot.rememberConfirmationSeconds,
      ratingsByTermId: sessionSnapshot.ratingsByTermId,
      reviewActionsByTermId: sessionSnapshot.reviewActionsByTermId,
      hasReachedLastCard: sessionSnapshot.hasReachedLastCard,
    })
    void studyLocalDb.saveActiveSession(sessionKey, {
      vocabulary: sessionSnapshot.vocabulary,
      index,
      mode: sessionSnapshot.mode,
      viewedTermIds,
      flushedViewTermIds,
      requireRememberConfirmation: sessionSnapshot.requireRememberConfirmation,
      rememberConfirmationSeconds: sessionSnapshot.rememberConfirmationSeconds,
      ratingsByTermId: sessionSnapshot.ratingsByTermId,
      reviewActionsByTermId: sessionSnapshot.reviewActionsByTermId,
      hasReachedLastCard: sessionSnapshot.hasReachedLastCard,
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
          ...storedSession,
          reviewActionsByTermId: storedSession.reviewActionsByTermId ?? {},
          hasReachedLastCard: storedSession.hasReachedLastCard === true,
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
  }, [item, sessionKey, sessionSnapshot?.key, shouldUseRemoteData, viewedTermIds])

  useEffect(() => {
    if (!item || sessionSnapshot?.key !== sessionKey || index < vocabulary.length - 1 || sessionSnapshot.hasReachedLastCard) return
    setSessionSnapshot((current) => current?.key === sessionKey ? { ...current, hasReachedLastCard: true } : current)
  }, [index, item, sessionKey, sessionSnapshot, vocabulary.length])

  useEffect(() => {
    if (!confirmationOpen) return

    setConfirmationRemainingSeconds(sessionConfirmationSeconds)
    confirmationButtonRef.current?.focus()
    const countdown = window.setInterval(() => {
      setConfirmationRemainingSeconds((current) => Math.max(0, current - 1))
    }, 1000)
    const expiry = window.setTimeout(() => {
      resolveConfirmationRef.current('dont_know')
    }, sessionConfirmationSeconds * 1000)

    return () => {
      window.clearInterval(countdown)
      window.clearTimeout(expiry)
    }
  }, [confirmationOpen, sessionConfirmationSeconds])

  async function flushStudyChanges(reviewActions: StoredReviewAction[] = [], extraTermIds: string[] = [], sessionPatch?: Parameters<typeof studyService.flushStudyChanges>[0]['sessionPatch']) {
    if (!shouldUseRemoteData || !user) return
    for (const action of reviewActions) await studyLocalDb.addPendingReviewAction(user.id, action)
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

  async function saveSessionSummary(extraTermIds: string[] = []) {
    if (!shouldUseRemoteData || !user || !sessionId) return
    const ratings = Object.values(sessionSnapshot?.ratingsByTermId ?? {})
    const sessionPatch = {
      total_cards: vocabulary.length,
      viewed_cards: countViewed(extraTermIds),
      remembered_count: ratings.filter((rating) => rating === 'know').length,
      difficult_count: ratings.filter((rating) => rating === 'dont_know').length,
    }
    await flushStudyChanges(Object.values(sessionSnapshot?.reviewActionsByTermId ?? {}), extraTermIds, sessionPatch)
    if (!syncError) await studyService.pruneHistory(user.id)
  }

  function clearSessionAndReturn(completed = false) {
    clearStoredStudySession(sessionKey)
    void studyLocalDb.clearActiveSession(sessionKey)
    clearActiveStudySession({ userId: user?.id, sessionId, remote: shouldUseRemoteData })
    navigate('/app/study', {
      state: completed && selectedDeckId && !isReviewSession
        ? { completedDeckId: selectedDeckId }
        : undefined,
    })
  }

  function discardIncompleteSession() {
    setAutoEnabled(false)
    setAutoSettingsOpen(false)
    clearSessionAndReturn()
  }

  function completeSession() {
    setAutoEnabled(false)
    setAutoSettingsOpen(false)
    const extraTermIds = item ? [item.id] : []
    void saveSessionSummary(extraTermIds).finally(() => clearSessionAndReturn(true))
  }

  function browseTo(nextIndex: number) {
    if (nextIndex < 0 || nextIndex >= vocabulary.length) return
    prefetchCard(nextIndex)
    setAutoRemainingSeconds(autoCardSeconds)
    setIndex(nextIndex)
    setFlipped(sessionMode === 'one_side')
  }

  function requestNextCard() {
    if (index >= vocabulary.length - 1) {
      requestCompletion()
      return
    }
    if (sessionRequiresConfirmation && item && !sessionSnapshot?.ratingsByTermId[item.id]) {
      setCompleteAfterConfirmation(false)
      setConfirmationRemainingSeconds(sessionConfirmationSeconds)
      setConfirmationOpen(true)
      return
    }
    browseTo(index + 1)
  }

  function openCardSessionAction() {
    setConfirmationOpen(false)
    setCompleteAfterConfirmation(false)
    if (hasReachedLastCard) {
      requestCompletion()
      return
    }
    setSessionModal('discard')
  }

  function requestCompletion() {
    if (sessionRequiresConfirmation && item && !sessionSnapshot?.ratingsByTermId[item.id]) {
      setCompleteAfterConfirmation(true)
      setConfirmationRemainingSeconds(sessionConfirmationSeconds)
      setConfirmationOpen(true)
      return
    }
    setAutoEnabled(false)
    setSessionModal('complete')
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
    if (speechPendingRef.current) {
      window.clearTimeout(speechRetryRef.current)
      speechRetryRef.current = window.setTimeout(() => autoAdvance(), 300)
      return
    }
    if (index >= vocabulary.length - 1) {
      requestCompletion()
      return
    }
    if (sessionRequiresConfirmation && item && !sessionSnapshot?.ratingsByTermId[item.id]) {
      setCompleteAfterConfirmation(false)
      setConfirmationRemainingSeconds(sessionConfirmationSeconds)
      setConfirmationOpen(true)
      return
    }
    setAutoRemainingSeconds(autoCardSeconds)
    setIndex(index + 1)
    setFlipped(sessionMode === 'one_side')
  }

  function advanceAfterRating() {
    if (index >= vocabulary.length - 1) {
      if (completeAfterConfirmation) {
        setCompleteAfterConfirmation(false)
        setAutoEnabled(false)
        setSessionModal('complete')
      }
      return
    }
    browseTo(index + 1)
  }

  function record(action: ReviewAction) {
    if (!item || (action !== 'know' && action !== 'dont_know')) return
    if (sessionSnapshot?.ratingsByTermId[item.id]) {
      advanceAfterRating()
      return
    }
    setConfirmationOpen(false)
    const reviewedAt = new Date().toISOString()
    const result = scheduleReview(action, {
      correctCount: item.correct_count,
      wrongCount: item.wrong_count,
      repetition: item.srs_repetition,
      intervalDays: item.srs_interval_days,
      easeFactor: item.srs_ease_factor,
    })
    const updatedItem = applyReviewResult(item, result, reviewedAt)
    const provisionalAction: StoredReviewAction = {
      termId: item.id,
      action,
      reviewedAt,
      result: serializeReviewResult(result),
    }

    setPendingAction(action)
    setSessionSnapshot((current) => {
      if (!current || current.key !== sessionKey) return current
      return {
        ...current,
        vocabulary: current.vocabulary.map((entry) => entry.id === item.id ? updatedItem : entry),
        ratingsByTermId: { ...current.ratingsByTermId, [item.id]: action },
        reviewActionsByTermId: { ...current.reviewActionsByTermId, [item.id]: provisionalAction },
      }
    })
    setPendingAction(null)
    advanceAfterRating()
  }

  useEffect(() => {
    resolveConfirmationRef.current = (action) => record(action)
  })

  useEffect(() => {
    function handleHotkey(event: KeyboardEvent) {
      const target = event.target
      if (target instanceof HTMLElement && (
        target.isContentEditable ||
        target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'TEXTAREA'
      )) return
      if (sessionModal) return

      const hotkey = hotkeyFromKeyboardEvent(event)
      if (!hotkey) return
      if (confirmationOpen) {
        if (hotkey === hotkeys.confirmRemember) {
          event.preventDefault()
          record('know')
        }
        return
      }

      let handled = true
      if (hotkey === hotkeys.know && !sessionRequiresConfirmation) record('know')
      else if (hotkey === hotkeys.dontKnow && !sessionRequiresConfirmation) record('dont_know')
      else if (hotkey === hotkeys.flip && sessionMode === 'two_side') setFlipped((current) => !current)
      else if (hotkey === hotkeys.previous && index > 0) browseTo(index - 1)
      else if (hotkey === hotkeys.next) requestNextCard()
      else if (hotkey === hotkeys.playAudio) speak(item.source_text, { audioUrl: item.audio_url, globalTermId: item.global_term_id })
      else if (hotkey === hotkeys.toggleAuto) {
        setAutoRemainingSeconds(autoCardSeconds)
        setAutoEnabled((enabled) => !enabled)
        setAutoSettingsOpen(false)
      } else if (hotkey === hotkeys.endSession) openCardSessionAction()
      else handled = false

      if (handled) event.preventDefault()
    }

    document.addEventListener('keydown', handleHotkey)
    return () => document.removeEventListener('keydown', handleHotkey)
  // Existing handlers intentionally provide current component state to keyboard dispatch.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCardSeconds, confirmationOpen, hotkeys, index, item, sessionModal, sessionMode, sessionRequiresConfirmation, sessionSnapshot, vocabulary.length])

  useEffect(() => {
    if (!autoEnabled || !item || confirmationOpen) return

    speechPendingRef.current = true
    let viTimer: number | undefined

    const timer = window.setTimeout(() => {
      const playback = speak(item.source_text, {
        audioUrl: item.audio_url,
        globalTermId: item.global_term_id,
        onEnd: () => {
          const translation = item.translation
          if (speakViEnabled && translation) {
            viTimer = window.setTimeout(() => {
              speakVI(translation, () => { speechPendingRef.current = false })
            }, 2000)
          } else {
            speechPendingRef.current = false
          }
        },
      })
      if (!playback) {
        speechPendingRef.current = false
      } else {
        void playback
          .then((spoke) => {
            if (!spoke) speechPendingRef.current = false
          })
          .catch(() => {
            speechPendingRef.current = false
          })
      }
    }, AUTO_AUDIO_DELAY_MS)

    return () => {
      speechPendingRef.current = false
      window.clearTimeout(timer)
      window.clearTimeout(viTimer)
      window.speechSynthesis?.cancel()
    }
  }, [autoEnabled, confirmationOpen, index, item, speakViEnabled])

  useEffect(() => {
    if (!autoEnabled || !item || confirmationOpen) return

    if (sessionMode === 'two_side') {
      setFlipped(false)
      const flipTimer = window.setTimeout(() => {
        setFlipped(true)
      }, getTwoSideFrontMs(autoCardMs))
      const advanceTimer = window.setTimeout(autoAdvance, autoCardMs)

      return () => {
        window.clearTimeout(flipTimer)
        window.clearTimeout(advanceTimer)
        window.clearTimeout(speechRetryRef.current)
      }
    }

    const advanceTimer = window.setTimeout(autoAdvance, autoCardMs)
    return () => {
      window.clearTimeout(advanceTimer)
      window.clearTimeout(speechRetryRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCardMs, autoEnabled, confirmationOpen, index, item, sessionMode, vocabulary.length])

  useEffect(() => {
    if (!autoEnabled || !item || confirmationOpen) return

    const countdownTimers = Array.from({ length: Math.max(0, autoCardSeconds - 1) }, (_, index) => {
      const elapsedSeconds = index + 1
      return window.setTimeout(() => {
        setAutoRemainingSeconds(autoCardSeconds - elapsedSeconds)
      }, elapsedSeconds * 1000)
    })

    return () => countdownTimers.forEach((timer) => window.clearTimeout(timer))
  }, [autoCardSeconds, autoEnabled, confirmationOpen, index, item])

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
        open={sessionModal !== null}
        title={t(sessionModal === 'complete' ? 'study.completeSessionTitle' : 'study.discardSessionTitle')}
        description={t(sessionModal === 'complete' ? 'study.completeSessionDescription' : 'study.discardSessionDescription')}
        confirmLabel={t(sessionModal === 'complete' ? 'study.saveSessionResults' : 'study.discardSessionConfirm')}
        cancelLabel={t(sessionModal === 'complete' ? 'study.reviewCards' : 'study.continueSession')}
        variant={sessionModal === 'complete' ? 'primary' : 'danger'}
        onConfirm={() => {
          const modal = sessionModal
          setSessionModal(null)
          if (modal === 'complete') completeSession()
          else discardIncompleteSession()
        }}
        onCancel={() => setSessionModal(null)}
      >
        {sessionModal === 'discard' ? (
          <div className="rounded-md border-2 border-border bg-muted p-4 text-center">
            <CloudRain aria-hidden="true" className="mx-auto h-10 w-10 text-secondary" strokeWidth={2.5} />
            <p className="mt-2 text-sm font-black">{t('study.discardSessionEncouragement')}</p>
          </div>
        ) : sessionModal === 'complete' ? (
          <div className="rounded-md border-2 border-border bg-primary/20 p-4 text-center">
            <BadgeCheck aria-hidden="true" className="mx-auto h-10 w-10 text-secondary" strokeWidth={2.5} />
          </div>
        ) : null}
      </ConfirmModal>
      <div className="mx-auto mt-6 flex max-w-5xl items-start gap-2 md:gap-4 px-2 sm:px-4 md:px-0">
        {syncError ? <p className="sr-only">{syncError}</p> : null}
        <div className="grid grid-cols-1 sm:grid-cols-[3rem_minmax(0,1fr)_3rem] md:grid-cols-[4rem_minmax(0,1fr)_4rem] items-start gap-2 md:gap-4 flex-1 min-w-0">
        <Button
          type="button"
          variant="ghost"
          aria-label={t('study.previousCard')}
          disabled={confirmationOpen || index === 0}
          className="hidden sm:inline-flex sticky top-[50vh] -translate-y-1/2 h-12 min-h-12 w-12 px-0 md:h-14 md:min-h-14 md:w-14 justify-self-center"
          onClick={() => browseTo(index - 1)}
        >
          <ChevronLeft aria-hidden="true" size={28} />
        </Button>
        <div className="w-full">
          <AnimatedStudyCardFrame motionKey={`${cardItem.id}:${sessionMode}:${flipped ? 'back' : 'front'}:${relationshipSignature}`}>
            {sessionMode === 'two_side' ? (
              <div
                data-testid="flashcard-shell"
                data-flipped={flipped ? 'true' : 'false'}
                className="flashcard-shell relative"
              >
                <EndSessionButton label={t(hasReachedLastCard ? 'study.completeSession' : 'study.endSession')} onClick={openCardSessionAction} />
                {autoEnabled && !confirmationOpen ? <AutoCountdownBadge remainingSeconds={autoRemainingSeconds} /> : null}
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
                {confirmationOpen ? (
                  <RememberConfirmationOverlay
                    remainingSeconds={confirmationRemainingSeconds}
                    shortcut={hotkeys.confirmRemember}
                    buttonRef={confirmationButtonRef}
                    onRemember={() => record('know')}
                  />
                ) : null}
              </div>
            ) : (
              <Card className="relative min-h-96 p-8 text-center">
                <EndSessionButton label={t(hasReachedLastCard ? 'study.completeSession' : 'study.endSession')} onClick={openCardSessionAction} />
                {autoEnabled && !confirmationOpen ? <AutoCountdownBadge remainingSeconds={autoRemainingSeconds} /> : null}
                <FlashcardFaceContent item={cardItem} current={index + 1} total={vocabulary.length} />
                <FlashcardDetails item={cardItem} relationships={relationships} />
                {confirmationOpen ? (
                  <RememberConfirmationOverlay
                    remainingSeconds={confirmationRemainingSeconds}
                    shortcut={hotkeys.confirmRemember}
                    buttonRef={confirmationButtonRef}
                    onRemember={() => record('know')}
                  />
                ) : null}
              </Card>
            )}
          </AnimatedStudyCardFrame>
          {/* Mobile-only pagination buttons */}
          <div className="flex sm:hidden justify-between items-center mt-3 gap-2">
            <Button
              type="button"
              variant="ghost"
              aria-label={t('study.previousCard') + ' (Mobile)'}
              disabled={confirmationOpen || index === 0}
              onClick={() => browseTo(index - 1)}
              className="flex-1 min-h-11 text-xs font-bold border-2 border-border bg-card shadow-[2px_2px_0_var(--border)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            >
              <ChevronLeft size={16} className="mr-1" /> {t('study.previousCard')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              aria-label={t(index >= vocabulary.length - 1 ? 'study.completeSession' : 'study.nextCard') + ' (Mobile)'}
              disabled={confirmationOpen}
              onClick={requestNextCard}
              className="flex-1 min-h-11 text-xs font-bold border-2 border-border bg-card shadow-[2px_2px_0_var(--border)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            >
              {index >= vocabulary.length - 1 ? t('study.completeSession') : t('study.nextCard')} <ChevronRight size={16} className="ml-1" />
            </Button>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          aria-label={t(index >= vocabulary.length - 1 ? 'study.completeSession' : 'study.nextCard')}
          disabled={confirmationOpen}
          className="hidden sm:inline-flex sticky top-[50vh] -translate-y-1/2 h-12 min-h-12 w-12 px-0 md:h-14 md:min-h-14 md:w-14 justify-self-center"
          onClick={requestNextCard}
        >
          {index >= vocabulary.length - 1 ? <Check aria-hidden="true" size={28} /> : <ChevronRight aria-hidden="true" size={28} />}
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
          <StudyToolbarButton label={t('actions.playAudio')} icon={pronunciationIcon} onClick={() => speak(item.source_text, { audioUrl: item.audio_url, globalTermId: item.global_term_id })} />
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
                <button
                  type="button"
                  aria-label={t('study.speakVietnamese')}
                  title={t('study.speakVietnamese')}
                  className={[
                    'neo-button inline-flex h-10 min-h-10 w-10 items-center justify-center rounded-md border-2 border-border p-1.5 text-xs font-black active:neo-button-active',
                    speakViEnabled ? 'bg-secondary text-secondary-foreground' : 'bg-background text-muted-foreground',
                  ].join(' ')}
                  onClick={() => setSpeakViEnabled((enabled) => !enabled)}
                >
                  VI
                </button>
              </div>
            ) : null}
          </div>
          {!sessionRequiresConfirmation ? (
            <>
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
            </>
          ) : null}
        </div>
        </div>
      </div>
    </div>
  )
}
