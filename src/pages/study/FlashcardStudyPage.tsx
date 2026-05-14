import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { hasRelatedTerms, relationshipDisplayOrder, relationshipLabelKeys } from '@/components/vocabulary/relationshipDisplay'
import { demoVocabulary } from '@/features/demo/demoData'
import { buildStudySessionStorageKey, readActiveStudySessionStorageKey, readStoredStudySession, writeStoredStudySession } from '@/features/study/sessionPersistence'
import { prepareSessionVocabulary } from '@/features/study/sessionVocabulary'
import { useI18n } from '@/i18n'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { deckService } from '@/services/supabase/deck.service'
import { createEmptyRelationshipGroups, relationshipService } from '@/services/supabase/relationship.service'
import { studyService } from '@/services/supabase/study.service'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { useStudyStore } from '@/stores/useStudyStore'
import type { RelationType, VocabularyItem } from '@/types/vocabulary.types'
import { speak } from '@/utils/audio'
import type { ReviewAction } from '@/utils/spacedRepetition'

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
  const [autoRepeat, setAutoRepeat] = useState(false)
  const [autoCardSeconds, setAutoCardSeconds] = useState(DEFAULT_AUTO_CARD_SECONDS)
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
    const source = shouldUseRemoteData
      ? selectedDeckId && !isReviewSession
        ? deckTermsQuery.data ?? []
        : vocabularyQuery.data ?? []
      : demoVocabulary

    if (!isReviewSession) return source

    const now = new Date()
    return source.filter((entry) => entry.status === 'difficult' || (entry.next_review_at && new Date(entry.next_review_at) <= now))
  }, [deckTermsQuery.data, isReviewSession, selectedDeckId, shouldUseRemoteData, vocabularyQuery.data])
  const preparedVocabulary = useMemo(
    () => prepareSessionVocabulary(rawVocabulary, { limit: cardLimit, shuffle: !isReviewSession && shuffle }),
    [cardLimit, isReviewSession, rawVocabulary, shuffle],
  )
  const isSourceReady = shouldUseRemoteData
    ? selectedDeckId && !isReviewSession
      ? deckTermsQuery.isSuccess
      : vocabularyQuery.isSuccess
    : true

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

    if (!isSourceReady) return
    writeStoredStudySession(sessionKey, { vocabulary: preparedVocabulary, index: 0, mode, viewedTermIds: [], flushedViewTermIds: [] })
    setSessionSnapshot((current) => {
      if (current?.key === sessionKey) return current
      return { key: sessionKey, vocabulary: preparedVocabulary, mode, viewedTermIds: [], flushedViewTermIds: [] }
    })
    setIndex(0)
    setFlipped(mode === 'one_side')
    setViewedTermIds([])
    setFlushedViewTermIds([])
  }, [isSourceReady, mode, preparedVocabulary, sessionKey, sessionSnapshot?.key])

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
  }, [flushedViewTermIds, index, sessionKey, sessionSnapshot, viewedTermIds])

  const item = vocabulary[index]
  const vocabularyCardQuery = useQuery({
    queryKey: ['vocabulary-card', item?.id],
    queryFn: () => relationshipService.getCard(item!.id),
    enabled: shouldUseRemoteData && Boolean(item?.id),
  })
  const cardItem = vocabularyCardQuery.data?.entry ?? item
  const relationships = vocabularyCardQuery.data?.relationships ?? createEmptyRelationshipGroups()
  const reviewMutation = useMutation({
    mutationFn: ({ entry, action }: { entry: VocabularyItem, action: ReviewAction }) => studyService.applyReviewAction(entry, action),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['vocabulary', user?.id] })
      if (selectedDeckId) await queryClient.invalidateQueries({ queryKey: ['deck-terms', selectedDeckId] })
    },
  })
  useEffect(() => {
    if (!shouldUseRemoteData || !item || sessionSnapshot?.key !== sessionKey) return
    if (viewedTermIds.includes(item.id)) return

    setViewedTermIds((current) => current.includes(item.id) ? current : [...current, item.id])
  }, [item, sessionKey, sessionSnapshot?.key, shouldUseRemoteData, viewedTermIds])

  async function flushViewedTerms() {
    if (!shouldUseRemoteData) return
    const pendingIds = viewedTermIds.filter((id) => !flushedViewTermIds.includes(id))
    if (pendingIds.length === 0) return

    await studyService.flushTermViews(pendingIds)
    setFlushedViewTermIds((current) => Array.from(new Set([...current, ...pendingIds])))
  }

  function next() {
    if (index >= vocabulary.length - 1) {
      void flushViewedTerms().finally(() => navigate('/app/study/result/demo-session'))
      return
    }
    setIndex(index + 1)
    setFlipped(sessionMode === 'one_side')
  }

  function browseTo(nextIndex: number) {
    if (nextIndex < 0 || nextIndex >= vocabulary.length) return
    setIndex(nextIndex)
    setFlipped(sessionMode === 'one_side')
  }

  function autoAdvance() {
    if (index >= vocabulary.length - 1) {
      if (autoRepeat && vocabulary.length > 1) {
        setIndex(0)
        setFlipped(sessionMode === 'one_side')
        return
      }
      setAutoEnabled(false)
      return
    }
    setIndex(index + 1)
    setFlipped(sessionMode === 'one_side')
  }

  function record(action: ReviewAction) {
    if (!item) return
    if (!shouldUseRemoteData) {
      next()
      return
    }
    reviewMutation.mutate({ entry: item, action }, { onSuccess: next })
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
  }, [autoCardMs, autoEnabled, autoRepeat, index, item, sessionMode, vocabulary.length])

  if (vocabularyQuery.isLoading || deckTermsQuery.isLoading) {
    return <Card className="font-black">{t('vocabulary.loading')}</Card>
  }

  const error =
    vocabularyQuery.error instanceof Error ? vocabularyQuery.error.message :
    deckTermsQuery.error instanceof Error ? deckTermsQuery.error.message :
    vocabularyCardQuery.error instanceof Error ? vocabularyCardQuery.error.message :
    reviewMutation.error instanceof Error ? reviewMutation.error.message :
    null

  if (error) {
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
    <>
      <PageHeader title={t('study.sessionTitle')} description={t('study.sessionDescription')} />
      <Progress value={((index + 1) / vocabulary.length) * 100} />
      <div className="mx-auto mt-6 grid max-w-5xl grid-cols-[3rem_minmax(0,1fr)_3rem] items-center gap-2 md:grid-cols-[4rem_minmax(0,48rem)_4rem] md:gap-4">
        <Button
          type="button"
          variant="ghost"
          aria-label={t('study.previousCard')}
          disabled={index === 0}
          className="h-12 min-h-12 w-12 px-0 md:h-14 md:min-h-14 md:w-14"
          onClick={() => browseTo(index - 1)}
        >
          <ChevronLeft aria-hidden="true" size={28} />
        </Button>
        {sessionMode === 'two_side' ? (
          <div
            data-testid="flashcard-shell"
            data-flipped={flipped ? 'true' : 'false'}
            className="flashcard-shell"
          >
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
          <Card className="min-h-96 p-8 text-center">
            <FlashcardFaceContent item={cardItem} current={index + 1} total={vocabulary.length} />
            <FlashcardDetails item={cardItem} relationships={relationships} />
          </Card>
        )}
        <Button
          type="button"
          variant="ghost"
          aria-label={t('study.nextCard')}
          disabled={index >= vocabulary.length - 1}
          className="h-12 min-h-12 w-12 px-0 md:h-14 md:min-h-14 md:w-14"
          onClick={() => browseTo(index + 1)}
        >
          <ChevronRight aria-hidden="true" size={28} />
        </Button>
      </div>
      <div className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-2">
        <Button variant="ghost" onClick={() => speak(item.source_text)}>{t('actions.playAudio')}</Button>
        {sessionMode === 'two_side' ? <Button variant="secondary" onClick={() => setFlipped(!flipped)}>{t('study.flip')}</Button> : null}
      </div>
      <div className="mx-auto mt-3 flex max-w-3xl flex-wrap items-center justify-center gap-3 rounded-md border-2 border-border bg-card p-3">
        <Button
          type="button"
          variant={autoEnabled ? 'secondary' : 'ghost'}
          onClick={() => setAutoEnabled((enabled) => !enabled)}
        >
          {autoEnabled ? t('study.autoStop') : t('study.autoStart')}
        </Button>
        <label className="flex items-center gap-2 text-sm font-black">
          {t('study.autoSeconds')}
          <input
            aria-label={t('study.autoSeconds')}
            type="number"
            min={MIN_AUTO_CARD_SECONDS}
            max={MAX_AUTO_CARD_SECONDS}
            value={autoCardSeconds}
            onChange={(event) => setAutoCardSeconds(clampAutoSeconds(Number(event.target.value)))}
            className="h-10 w-20 rounded-md border-2 border-border bg-background px-3 font-black"
          />
        </label>
        <Button
          type="button"
          variant={autoRepeat ? 'secondary' : 'ghost'}
          aria-pressed={autoRepeat}
          onClick={() => setAutoRepeat((repeat) => !repeat)}
        >
          {t('study.autoRepeat')}
        </Button>
      </div>
      <div className="mx-auto mt-3 grid max-w-xl grid-cols-2 gap-3">
        <Button disabled={reviewMutation.isPending} variant="ghost" className="min-h-14 text-base" onClick={() => record('dont_know')}>
          {t('study.dontKnow')}
        </Button>
        <Button disabled={reviewMutation.isPending} className="min-h-14 text-base" onClick={() => record('know')}>
          {t('study.know')}
        </Button>
      </div>
    </>
  )
}
