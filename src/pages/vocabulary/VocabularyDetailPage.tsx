import { useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Flag } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { StatTile } from '@/components/common/StatTile'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Label, Select } from '@/components/ui/input'
import { TranslationChips } from '@/components/ui/translation-chips'
import { InlineEditableField } from '@/components/ui/inline-editable-field'
import { demoVocabulary } from '@/features/demo/demoData'
import { vocabularyUpdateFormSchema } from '@/features/vocabulary/vocabulary.schema'
import { useI18n } from '@/i18n'
import { enrichVocabulary } from '@/services/api/enrichVocabulary.api'
import { studyLocalDb } from '@/services/local/studyLocalDb'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { createEmptyRelationshipGroups, relationshipService } from '@/services/supabase/relationship.service'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { RelatedTermsSection } from '@/components/vocabulary/RelatedTermsSection'
import { relationshipDisplayOrder, relationshipLabelKeys } from '@/components/vocabulary/relationshipDisplay'
import type { RelationType, VocabularyItem, VocabularyItemType, VocabularyStatus } from '@/types/vocabulary.types'
import { speak } from '@/utils/audio'
import { filterActiveVocabulary } from '@/utils/vocabulary'

const itemTypeLabelKeys: Record<VocabularyItemType, string> = {
  word: 'vocabulary.word',
  phrase: 'vocabulary.phrase',
  idiom: 'vocabulary.idiom',
  sentence: 'vocabulary.sentence',
}

const statusLabelKeys: Record<VocabularyStatus, string> = {
  new: 'vocabulary.statusNew',
  learning: 'vocabulary.statusLearning',
  familiar: 'vocabulary.statusFamiliar',
  memorized: 'vocabulary.statusMemorized',
  difficult: 'vocabulary.statusDifficult',
  need_review: 'vocabulary.statusNeedReview',
}

export function VocabularyDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const shouldUseRemoteData = isSupabaseConfigured && Boolean(user)

  const [formError, setFormError] = useState<string | null>(null)
  const [removingKey, setRemovingKey] = useState<string | null>(null)
  const [enrichingIpa, setEnrichingIpa] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [relationType, setRelationType] = useState<RelationType>('derivative')
  const [targetId, setTargetId] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

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

  const item = shouldUseRemoteData
    ? vocabularyCardQuery.data?.entry
    : demoVocabulary.find((entry) => entry.id === id) ?? demoVocabulary[0]

  const relationships = shouldUseRemoteData
    ? vocabularyCardQuery.data?.relationships ?? createEmptyRelationshipGroups()
    : createEmptyRelationshipGroups()

  const targetOptions = useMemo(
    () => filterActiveVocabulary(vocabularyListQuery.data ?? []).filter((entry) => entry.id !== id),
    [id, vocabularyListQuery.data]
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
    mutationFn: (updatedFields: Partial<VocabularyItem>) => {
      if (!item || !id) throw new Error(t('vocabulary.emptyTitle'))

      const parsed = vocabularyUpdateFormSchema.safeParse({
        source_text: item.source_text,
        source_language: item.source_language,
        native_language: item.native_language,
        item_type: item.item_type,
        status: item.status,
        part_of_speech: item.part_of_speech,
        ipa: item.ipa,
        pronunciation_text: item.pronunciation_text,
        audio_url: item.audio_url ?? '',
        image_url: item.image_url ?? '',
        note: item.note,
        translation: item.translation,
        meanings: item.meanings,
        examples: item.examples,
        tags: item.tags ?? [],
        ...updatedFields,
      })

      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? t('vocabulary.editDescription'))
      }

      return vocabularyService.update(id, parsed.data)
    },
    onSuccess: async () => {
      setFormError(null)
      await invalidateVocabularyQueries()
      setAutoSaveStatus('saved')
      setTimeout(() => setAutoSaveStatus('idle'), 2000)
    },
    onError: async (error, variables) => {
      setFormError(error instanceof Error ? error.message : String(error))
      setAutoSaveStatus('idle')
      if (user && item) {
        await studyLocalDb.enqueueMutation({
          id: `${item.id}-update-${Date.now()}`,
          userId: user.id,
          type: 'update',
          payload: { ...item, ...variables },
          createdAt: new Date().toISOString(),
        })
      }
    },
  })

  const handleSaveField = async (fields: Partial<VocabularyItem>) => {
    try {
      setAutoSaveStatus('saving')
      await updateMutation.mutateAsync(fields)
    } catch {
      setAutoSaveStatus('idle')
    }
  }

  const deleteVocabulary = useMutation({
    mutationFn: () => vocabularyService.remove(id!),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['vocabulary', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['statistics', user?.id] }),
      ])
      navigate('/app/vocabulary')
    },
    onError: async () => {
      if (user && item) {
        await studyLocalDb.enqueueMutation({
          id: `${item.id}-delete-${Date.now()}`,
          userId: user.id,
          type: 'delete',
          payload: item,
          createdAt: new Date().toISOString(),
        })
        navigate('/app/vocabulary')
      }
    },
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
        <Button asChild className="mt-4">
          <Link to="/app/vocabulary">{t('actions.cancel')}</Link>
        </Button>
      </Card>
    )
  }

  return (
    <>
      <PageHeader
        title={
          <InlineEditableField
            value={item.source_text}
            onSave={(val) => handleSaveField({ source_text: val })}
            className="text-4xl font-black md:text-5xl border-dashed"
            placeholder={t('vocabulary.sourceText')}
          />
        }
        description={
          <div className="flex flex-wrap items-center gap-2 mt-2 h-5">
            {autoSaveStatus === 'saving' && (
              <span className="text-xs font-bold text-muted-foreground animate-pulse">{t('vocabulary.autoSaving')}</span>
            )}
            {autoSaveStatus === 'saved' && (
              <span className="text-xs font-bold text-success">{t('vocabulary.saved')}</span>
            )}
            {formError && <span className="text-xs font-bold text-danger">{formError}</span>}
          </div>
        }
        actions={
          <div className="flex gap-2">
            {item.flagged ? (
              <Button
                variant="ghost"
                onClick={async () => {
                  await vocabularyService.unflagTerm(item.id)
                  await invalidateVocabularyQueries()
                }}
              >
                <Flag className="h-4 w-4 text-warning" fill="currentColor" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                onClick={async () => {
                  await vocabularyService.flagTerm(item.id)
                  await invalidateVocabularyQueries()
                }}
              >
                <Flag className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
            <Button variant="danger" onClick={() => setIsDeleting(true)}>
              {t('vocabulary.delete')}
            </Button>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1">
          <span className="text-xs font-bold text-muted-foreground mr-1">Loại:</span>
          <InlineEditableField
            value={item.item_type}
            type="select"
            options={Object.entries(itemTypeLabelKeys).map(([val, labelKey]) => ({
              value: val,
              label: t(labelKey),
            }))}
            onSave={(val) => handleSaveField({ item_type: val as VocabularyItemType })}
            displayValue={<Badge className="cursor-pointer font-black">{t(itemTypeLabelKeys[item.item_type])}</Badge>}
          />
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs font-bold text-muted-foreground mr-1">Trạng thái:</span>
          <InlineEditableField
            value={item.status}
            type="select"
            options={Object.entries(statusLabelKeys).map(([val, labelKey]) => ({
              value: val,
              label: t(labelKey),
            }))}
            onSave={(val) => handleSaveField({ status: val as VocabularyStatus })}
            displayValue={<Badge className="cursor-pointer font-black">{t(statusLabelKeys[item.status])}</Badge>}
          />
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs font-bold text-muted-foreground mr-1">Từ loại:</span>
          <InlineEditableField
            value={item.part_of_speech ?? ''}
            type="input"
            onSave={(val) => handleSaveField({ part_of_speech: val || null })}
            placeholder={t('vocabulary.partOfSpeech')}
            displayValue={
              item.part_of_speech ? (
                <Badge className="cursor-pointer bg-muted text-foreground font-black">{item.part_of_speech}</Badge>
              ) : (
                <Badge className="cursor-pointer bg-muted text-muted-foreground italic border-dashed font-bold">
                  {t('vocabulary.partOfSpeech')}
                </Badge>
              )
            }
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <Card className="flex flex-col gap-6">
          <div>
            <Label className="text-xs uppercase text-muted-foreground mb-1 block">{t('vocabulary.ipa')}</Label>
            <div className="flex items-center gap-3">
              <div className="flex-1 max-w-[200px]">
                <InlineEditableField
                  value={item.ipa ?? ''}
                  onSave={(val) => handleSaveField({ ipa: val || null })}
                  placeholder="/.../"
                  className="font-mono text-xl font-black"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                className="h-8 px-3 text-xs"
                disabled={enrichingIpa}
                onClick={async () => {
                  setEnrichingIpa(true)
                  try {
                    const enriched = await enrichVocabulary(item.source_text, item.source_language, item.native_language)
                    await handleSaveField({
                      ipa: enriched.ipa ?? item.ipa,
                      pronunciation_text: enriched.pronunciationText ?? item.pronunciation_text,
                      part_of_speech: enriched.partOfSpeech ?? item.part_of_speech,
                    })
                  } catch {
                    /* ignored */
                  }
                  setEnrichingIpa(false)
                }}
              >
                {enrichingIpa ? (
                  <span className="inline-flex items-center gap-0.5">
                    <span className="inline-block animate-bounce [animation-delay:0ms]">.</span>
                    <span className="inline-block animate-bounce [animation-delay:150ms]">.</span>
                    <span className="inline-block animate-bounce [animation-delay:300ms]">.</span>
                  </span>
                ) : (
                  t('vocabulary.regenerateIpa')
                )}
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase text-muted-foreground mb-1 block">
              {t('vocabulary.pronunciationText')}
            </Label>
            <InlineEditableField
              value={item.pronunciation_text ?? ''}
              onSave={(val) => handleSaveField({ pronunciation_text: val || null })}
              placeholder={t('vocabulary.pronunciationTextHint')}
              className="text-sm font-semibold"
            />
          </div>

          <div>
            <Button
              onClick={() =>
                speak(item.source_text, { variant: item.pronunciation_text, audioUrl: item.audio_url })
              }
            >
              {t('actions.playAudio')}
            </Button>
          </div>

          <hr className="border-border border-dashed" />

          <div>
            <CardTitle className="text-sm uppercase text-muted-foreground mb-1">{t('vocabulary.meaning')}</CardTitle>
            <InlineEditableField
              value={item.meanings[0]?.text ?? ''}
              type="textarea"
              onSave={(val) =>
                handleSaveField({
                  meanings: val ? [{ text: val, language: item.native_language }] : [],
                })
              }
              placeholder={t('vocabulary.noNotes')}
              className="font-semibold text-muted-foreground"
            />
          </div>

          <div>
            <CardTitle className="text-sm uppercase text-muted-foreground mb-1">{t('vocabulary.translation')}</CardTitle>
            <InlineEditableField
              value={item.translation ?? ''}
              type="custom"
              onSave={(val) => handleSaveField({ translation: val })}
              placeholder={t('vocabulary.translation')}
              displayValue={<span className="text-2xl text-primary font-black underline decoration-2">{item.translation || t('vocabulary.translation')}</span>}
              renderCustomInput={(val, onChange, save, cancel) => (
                <div className="flex flex-col gap-2">
                  <TranslationChips value={val} onChange={onChange} />
                  <div className="flex gap-2 justify-end mt-1">
                    <Button
                      type="button"
                      tabIndex={-1}
                      className="h-8 py-1 px-3 text-xs bg-emerald-400"
                      onClick={save}
                    >
                      {t('actions.saveChanges')}
                    </Button>
                    <Button type="button" tabIndex={-1} className="h-8 py-1 px-3 text-xs" variant="ghost" onClick={cancel}>
                      {t('actions.cancel')}
                    </Button>
                  </div>
                </div>
              )}
            />
          </div>

          <hr className="border-border border-dashed" />

          <div>
            <CardTitle className="text-sm uppercase text-muted-foreground mb-3">{t('vocabulary.examples')}</CardTitle>
            <div className="flex flex-col gap-4">
              <div className="p-3 border-2 border-border rounded-md bg-slate-50/50">
                <Label className="text-xs text-muted-foreground font-semibold mb-1 block">Câu ví dụ (English)</Label>
                <InlineEditableField
                  value={item.examples[0]?.sentence ?? ''}
                  type="textarea"
                  onSave={(val) => {
                    const trans = item.examples[0]?.translation ?? ''
                    handleSaveField({
                      examples: val ? [{ sentence: val, translation: trans }] : [],
                    })
                  }}
                  placeholder="Ví dụ: We should apologize for an error."
                  className="font-semibold"
                />
              </div>
              <div className="p-3 border-2 border-border rounded-md bg-slate-50/50">
                <Label className="text-xs text-muted-foreground font-semibold mb-1 block">Dịch nghĩa câu ví dụ (Vietnamese)</Label>
                <InlineEditableField
                  value={item.examples[0]?.translation ?? ''}
                  type="input"
                  onSave={(val) => {
                    const sent = item.examples[0]?.sentence ?? ''
                    if (sent) {
                      handleSaveField({
                        examples: [{ sentence: sent, translation: val }],
                      })
                    }
                  }}
                  placeholder="Dịch nghĩa: Chúng tôi xin lỗi vì sai sót."
                  className="text-muted-foreground"
                />
              </div>
            </div>
          </div>

          <hr className="border-border border-dashed" />

          <div>
            <CardTitle className="text-sm uppercase text-muted-foreground mb-1">{t('vocabulary.note')}</CardTitle>
            <InlineEditableField
              value={item.note ?? ''}
              type="textarea"
              onSave={(val) => handleSaveField({ note: val || null })}
              placeholder={t('vocabulary.noNotes')}
              className="font-semibold text-muted-foreground"
            />
          </div>
        </Card>

        <div className="grid gap-4 self-start">
          <div className="grid grid-cols-2 gap-4">
            <StatTile label={t('vocabulary.views')} value={item.view_count} />
            <StatTile label={t('vocabulary.correct')} value={item.correct_count} />
            <StatTile label={t('vocabulary.wrong')} value={item.wrong_count} />
            <StatTile
              label={t('vocabulary.nextReview')}
              value={
                item.next_review_at
                  ? new Date(item.next_review_at).toLocaleDateString()
                  : t('vocabulary.unscheduled')
              }
            />
          </div>

          <Card>
            <CardTitle className="text-base font-black">{t('vocabulary.addRelationship')}</CardTitle>
            <div className="mt-4 grid gap-3">
              <div>
                <Label className="text-xs font-bold">{t('vocabulary.relationshipType')}</Label>
                <Select
                  value={relationType}
                  onChange={(event) => setRelationType(event.target.value as RelationType)}
                  disabled={!shouldUseRemoteData}
                  className="mt-1"
                >
                  {relationshipDisplayOrder.map((type) => (
                    <option key={type} value={type}>
                      {t(relationshipLabelKeys[type])}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label className="text-xs font-bold">{t('vocabulary.relationshipTarget')}</Label>
                <Select
                  value={targetId}
                  onChange={(event) => setTargetId(event.target.value)}
                  disabled={!shouldUseRemoteData || vocabularyListQuery.isLoading}
                  className="mt-1"
                >
                  <option value="">{t('vocabulary.relationshipTarget')}</option>
                  {targetOptions.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.source_text}
                      {entry.translation ? ` - ${entry.translation}` : ''}
                    </option>
                  ))}
                </Select>
              </div>
              <Button
                type="button"
                className="mt-2"
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
            onRemove={(targetTermId, selectedRelationType) =>
              removeRelationshipMutation.mutate({ targetTermId, selectedRelationType })
            }
          />
        </div>
      </div>

      <ConfirmModal
        open={isDeleting}
        title={t('vocabulary.deleteConfirmSingle', { word: item.source_text })}
        confirmLabel={t('vocabulary.delete')}
        cancelLabel={t('actions.cancel')}
        variant="danger"
        confirmDisabled={deleteVocabulary.isPending}
        onConfirm={() => deleteVocabulary.mutate()}
        onCancel={() => setIsDeleting(false)}
      />
    </>
  )
}
