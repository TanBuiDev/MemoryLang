import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { RelatedTermsSection } from '@/components/vocabulary/RelatedTermsSection'
import { relationshipDisplayOrder, relationshipLabelKeys } from '@/components/vocabulary/relationshipDisplay'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { Input, Label, Select, Textarea } from '@/components/ui/input'
import { demoVocabulary } from '@/features/demo/demoData'
import { vocabularyUpdateFormSchema } from '@/features/vocabulary/vocabulary.schema'
import { useI18n } from '@/i18n'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { createEmptyRelationshipGroups, relationshipService } from '@/services/supabase/relationship.service'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import { useAuthStore } from '@/stores/useAuthStore'
import type { RelationType, VocabularyItemType, VocabularyStatus } from '@/types/vocabulary.types'

const statusLabelKeys: Record<VocabularyStatus, string> = {
  new: 'vocabulary.statusNew',
  learning: 'vocabulary.statusLearning',
  familiar: 'vocabulary.statusFamiliar',
  memorized: 'vocabulary.statusMemorized',
  difficult: 'vocabulary.statusDifficult',
  need_review: 'vocabulary.statusNeedReview',
}

const itemTypeLabelKeys: Record<VocabularyItemType, string> = {
  word: 'vocabulary.word',
  phrase: 'vocabulary.phrase',
  idiom: 'vocabulary.idiom',
  sentence: 'vocabulary.sentence',
}

export function EditVocabularyPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useI18n()
  const user = useAuthStore((state) => state.user)
  const shouldUseRemoteData = isSupabaseConfigured && Boolean(user)
  const [sourceText, setSourceText] = useState('')
  const [status, setStatus] = useState<VocabularyStatus>('new')
  const [itemType, setItemType] = useState<VocabularyItemType>('word')
  const [ipa, setIpa] = useState('')
  const [partOfSpeech, setPartOfSpeech] = useState('')
  const [meaning, setMeaning] = useState('')
  const [translation, setTranslation] = useState('')
  const [example, setExample] = useState('')
  const [exampleTranslation, setExampleTranslation] = useState('')
  const [note, setNote] = useState('')
  const [relationType, setRelationType] = useState<RelationType>('derivative')
  const [targetId, setTargetId] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [removingKey, setRemovingKey] = useState<string | null>(null)

  const vocabularyCardQuery = useQuery({
    queryKey: ['vocabulary-card', id],
    queryFn: () => relationshipService.getCard(id!),
    enabled: shouldUseRemoteData && Boolean(id),
  })
  const vocabularyListQuery = useQuery({
    queryKey: ['vocabulary', user?.id],
    queryFn: () => vocabularyService.list(user!.id),
    enabled: shouldUseRemoteData && Boolean(user?.id),
  })

  const item = shouldUseRemoteData ? vocabularyCardQuery.data?.entry : demoVocabulary.find((entry) => entry.id === id) ?? demoVocabulary[0]
  const relationships = shouldUseRemoteData ? vocabularyCardQuery.data?.relationships ?? createEmptyRelationshipGroups() : createEmptyRelationshipGroups()

  const targetOptions = useMemo(
    () => (vocabularyListQuery.data ?? []).filter((entry) => entry.id !== id),
    [id, vocabularyListQuery.data],
  )

  const invalidateVocabularyQueries = async (targetTermId?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['vocabulary-card', id] }),
      targetTermId ? queryClient.invalidateQueries({ queryKey: ['vocabulary-card', targetTermId] }) : Promise.resolve(),
      queryClient.invalidateQueries({ queryKey: ['vocabulary', user?.id] }),
      queryClient.invalidateQueries({ queryKey: ['statistics', user?.id] }),
    ])
  }

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!item || !id) throw new Error(t('vocabulary.emptyTitle'))

      const parsed = vocabularyUpdateFormSchema.safeParse({
        source_text: sourceText.trim(),
        source_language: item.source_language,
        native_language: item.native_language,
        item_type: itemType,
        status,
        part_of_speech: partOfSpeech.trim(),
        ipa: ipa.trim(),
        pronunciation_text: item.pronunciation_text ?? '',
        audio_url: item.audio_url ?? '',
        image_url: item.image_url ?? '',
        note: note.trim(),
        translation: translation.trim(),
        meanings: [{ text: meaning.trim(), language: item.native_language }],
        examples: example.trim() ? [{ sentence: example.trim(), translation: exampleTranslation.trim() }] : [],
        tags: item.tags ?? [],
      })

      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? t('vocabulary.editDescription'))
      }

      return vocabularyService.update(id, parsed.data)
    },
    onSuccess: async (updated) => {
      setFormError(null)
      await invalidateVocabularyQueries()
      navigate(`/app/vocabulary/${updated.id}`)
    },
    onError: (error) => setFormError(error instanceof Error ? error.message : String(error)),
  })

  const addRelationshipMutation = useMutation({
    mutationFn: async () => {
      if (!id || !targetId) throw new Error(t('vocabulary.relationshipTarget'))
      await relationshipService.createAuto(id, targetId, relationType)
    },
    onSuccess: async () => {
      const addedTargetId = targetId
      setTargetId('')
      setFormError(null)
      await invalidateVocabularyQueries(addedTargetId)
    },
    onError: (error) => setFormError(error instanceof Error ? error.message : String(error)),
  })

  const removeRelationshipMutation = useMutation({
    mutationFn: async ({ targetTermId, selectedRelationType }: { targetTermId: string; selectedRelationType: RelationType }) => {
      if (!id) throw new Error(t('vocabulary.emptyTitle'))
      setRemovingKey(`${selectedRelationType}:${targetTermId}`)
      await relationshipService.removeAuto(id, targetTermId, selectedRelationType)
      return targetTermId
    },
    onSuccess: async (targetTermId) => {
      setFormError(null)
      setRemovingKey(null)
      await invalidateVocabularyQueries(targetTermId)
    },
    onError: (error) => {
      setRemovingKey(null)
      setFormError(error instanceof Error ? error.message : String(error))
    },
  })

  useEffect(() => {
    if (!item) return

    // React Query loads the editable record after mount; reset the controlled form when the route item changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSourceText(item.source_text)
    setStatus(item.status)
    setItemType(item.item_type)
    setIpa(item.ipa ?? '')
    setPartOfSpeech(item.part_of_speech ?? '')
    setMeaning(item.meanings[0]?.text ?? item.translation ?? '')
    setTranslation(item.translation ?? '')
    setExample(item.examples[0]?.sentence ?? '')
    setExampleTranslation(item.examples[0]?.translation ?? '')
    setNote(item.note ?? '')
  }, [item])

  if (shouldUseRemoteData && vocabularyCardQuery.isLoading) {
    return <Card className="font-black">{t('vocabulary.loading')}</Card>
  }

  if (vocabularyCardQuery.error) {
    return <Card className="font-black text-danger">{vocabularyCardQuery.error.message}</Card>
  }

  if (!item) {
    return (
      <Card className="text-center">
        <p className="text-xl font-black">{t('vocabulary.emptyTitle')}</p>
        <p className="mt-2 text-sm font-semibold text-muted-foreground">{t('vocabulary.emptyDescription')}</p>
        <Button asChild className="mt-4"><Link to="/app/vocabulary">{t('actions.cancel')}</Link></Button>
      </Card>
    )
  }

  return (
    <>
      <PageHeader title={t('vocabulary.editTitle')} description={t('vocabulary.editDescription')} />
      <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <Card>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); updateMutation.mutate() }}>
            <div>
              <Label>{t('vocabulary.sourceText')}</Label>
              <Input value={sourceText} onChange={(event) => setSourceText(event.target.value)} />
            </div>
            <div>
              <Label>{t('vocabulary.status')}</Label>
              <Select value={status} onChange={(event) => setStatus(event.target.value as VocabularyStatus)}>
                {Object.entries(statusLabelKeys).map(([value, labelKey]) => <option key={value} value={value}>{t(labelKey)}</option>)}
              </Select>
            </div>
            <div>
              <Label>{t('vocabulary.itemType')}</Label>
              <Select value={itemType} onChange={(event) => setItemType(event.target.value as VocabularyItemType)}>
                {Object.entries(itemTypeLabelKeys).map(([value, labelKey]) => <option key={value} value={value}>{t(labelKey)}</option>)}
              </Select>
            </div>
            <div>
              <Label>{t('vocabulary.ipa')}</Label>
              <Input value={ipa} onChange={(event) => setIpa(event.target.value)} />
            </div>
            <div>
              <Label>{t('vocabulary.partOfSpeech')}</Label>
              <Input value={partOfSpeech} onChange={(event) => setPartOfSpeech(event.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>{t('vocabulary.meaning')}</Label>
              <Textarea value={meaning} onChange={(event) => setMeaning(event.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>{t('vocabulary.translation')}</Label>
              <Textarea value={translation} onChange={(event) => setTranslation(event.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>{t('vocabulary.example')}</Label>
              <Textarea value={example} onChange={(event) => setExample(event.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>{t('vocabulary.exampleTranslation')}</Label>
              <Input value={exampleTranslation} onChange={(event) => setExampleTranslation(event.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>{t('vocabulary.note')}</Label>
              <Textarea value={note} onChange={(event) => setNote(event.target.value)} />
            </div>
            {formError ? <p className="font-black text-danger md:col-span-2">{formError}</p> : null}
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <Button type="submit" disabled={updateMutation.isPending}>{t('actions.saveChanges')}</Button>
              <Button asChild variant="ghost"><Link to={`/app/vocabulary/${item.id}`}>{t('actions.cancel')}</Link></Button>
            </div>
          </form>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardTitle>{t('vocabulary.addRelationship')}</CardTitle>
            <div className="mt-4 grid gap-3">
              <div>
                <Label>{t('vocabulary.relationshipType')}</Label>
                <Select value={relationType} onChange={(event) => setRelationType(event.target.value as RelationType)} disabled={!shouldUseRemoteData}>
                  {relationshipDisplayOrder.map((type) => <option key={type} value={type}>{t(relationshipLabelKeys[type])}</option>)}
                </Select>
              </div>
              <div>
                <Label>{t('vocabulary.relationshipTarget')}</Label>
                <Select value={targetId} onChange={(event) => setTargetId(event.target.value)} disabled={!shouldUseRemoteData || vocabularyListQuery.isLoading}>
                  <option value="">{t('vocabulary.relationshipTarget')}</option>
                  {targetOptions.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.source_text}{entry.translation ? ` - ${entry.translation}` : ''}
                    </option>
                  ))}
                </Select>
              </div>
              <Button
                type="button"
                disabled={!shouldUseRemoteData || !targetId || addRelationshipMutation.isPending}
                onClick={() => addRelationshipMutation.mutate()}
              >
                {t('vocabulary.addRelationship')}
              </Button>
            </div>
          </Card>
          <RelatedTermsSection
            relationships={relationships}
            removingKey={removingKey}
            onRemove={(targetTermId, selectedRelationType) => removeRelationshipMutation.mutate({ targetTermId, selectedRelationType })}
          />
        </div>
      </div>
    </>
  )
}
