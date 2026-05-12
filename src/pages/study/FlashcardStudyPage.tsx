import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { hasRelatedTerms, relationshipDisplayOrder, relationshipLabelKeys } from '@/components/vocabulary/relationshipDisplay'
import { demoVocabulary } from '@/features/demo/demoData'
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

function getText(value?: string | null) {
  return value?.trim() || null
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

export function FlashcardStudyPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { sessionId } = useParams()
  const { t } = useI18n()
  const user = useAuthStore((state) => state.user)
  const { mode, cardLimit, shuffle, selectedDeckId } = useStudyStore()
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(mode === 'one_side')
  const shouldUseRemoteData = isSupabaseConfigured && Boolean(user)
  const isReviewSession = sessionId === 'review-session'
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
  const vocabulary = useMemo(
    () => prepareSessionVocabulary(rawVocabulary, { limit: cardLimit, shuffle: !isReviewSession && shuffle }),
    [cardLimit, isReviewSession, rawVocabulary, shuffle],
  )
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

  function next() {
    if (index >= vocabulary.length - 1) {
      navigate('/app/study/result/demo-session')
      return
    }
    setIndex(index + 1)
    setFlipped(mode === 'one_side')
  }

  function record(action: ReviewAction) {
    if (!item) return
    if (!shouldUseRemoteData) {
      next()
      return
    }
    reviewMutation.mutate({ entry: item, action }, { onSuccess: next })
  }

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
      <Card className="mx-auto mt-6 min-h-96 max-w-3xl p-8 text-center">
        <p className="text-sm font-black uppercase text-muted-foreground">{t('study.cardProgress', { current: index + 1, total: vocabulary.length })}</p>
        <p className="mt-8 text-5xl font-black">{cardItem.source_text}</p>
        {[cardItem.part_of_speech, cardItem.ipa].filter(Boolean).length > 0 ? (
          <p className="mt-4 font-mono text-2xl">{[cardItem.part_of_speech, cardItem.ipa].filter(Boolean).join(' · ')}</p>
        ) : null}
        {flipped ? (
          <FlashcardDetails item={cardItem} relationships={relationships} />
        ) : null}
      </Card>
      <div className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-2">
        <Button variant="ghost" onClick={() => speak(item.source_text)}>{t('actions.playAudio')}</Button>
        {mode === 'two_side' ? <Button variant="secondary" onClick={() => setFlipped(!flipped)}>{t('study.flip')}</Button> : null}
        <Button disabled={reviewMutation.isPending} onClick={() => record('know')}>{t('study.know')}</Button>
        <Button disabled={reviewMutation.isPending} variant="ghost" onClick={() => record('dont_know')}>{t('study.dontKnow')}</Button>
        <Button disabled={reviewMutation.isPending} variant="secondary" onClick={() => record('difficult')}>{t('study.difficult')}</Button>
        <Button disabled={reviewMutation.isPending} variant="primary" onClick={() => record('memorized')}>{t('study.memorized')}</Button>
      </div>
    </>
  )
}
