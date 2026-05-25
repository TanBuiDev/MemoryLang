import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  isSplittable,
  type SplitInput,
  splitMultiTermEntry,
  adaptSplitResultsForCreate,
} from '@/features/vocabulary/multiTermSplit'
import { useI18n } from '@/i18n'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { filterActiveVocabulary } from '@/utils/vocabulary'

type SplitState = Record<string, { applied: boolean; createdCount: number; error?: string }>

export function VocabularySplitPage() {
  const { t } = useI18n()
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const [splitState, setSplitState] = useState<SplitState>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const vocabularyQuery = useQuery({
    queryKey: ['vocabulary', user?.id],
    queryFn: () => vocabularyService.list(user!.id),
    enabled: isSupabaseConfigured && Boolean(user),
  })

  if (!isSupabaseConfigured || !user) {
    return <Card className="font-black">{t('vocabulary.splitTitle')} requires authentication.</Card>
  }

  if (vocabularyQuery.isLoading) {
    return <Card className="font-black">{t('vocabulary.loading')}</Card>
  }

  if (vocabularyQuery.isError) {
    return <Card className="font-black text-danger">{t('quiz.loadError')}</Card>
  }

  const activeEntries = filterActiveVocabulary(vocabularyQuery.data ?? [])
  const splittableEntries = activeEntries.filter((entry) => {
    const alreadySplit = splitState[entry.id]?.applied
    return !alreadySplit && isSplittable(entry)
  })

  if (splittableEntries.length === 0) {
    return (
      <>
        <PageHeader title={t('vocabulary.splitTitle')} description={t('vocabulary.splitDescription')} />
        <Card className="font-black">{t('vocabulary.splitNone')}</Card>
      </>
    )
  }

  async function handleSplit(entry: SplitInput) {
    const parts = splitMultiTermEntry(entry)
    if (parts.length === 0) return

    try {
      const created = await vocabularyService.splitAndCreateTerms(entry.id, entry.deck_ids, adaptSplitResultsForCreate(parts))
      const state = splitState[entry.id]
      const previousCount = state?.createdCount ?? 0
      setSplitState((prev) => ({
        ...prev,
        [entry.id]: { applied: true, createdCount: previousCount + created.length },
      }))
      setExpandedId(null)
      queryClient.invalidateQueries({ queryKey: ['vocabulary', user?.id] })
    } catch (err) {
      setSplitState((prev) => ({
        ...prev,
        [entry.id]: { ...prev[entry.id], error: t('vocabulary.splitError', { error: err instanceof Error ? err.message : 'Unknown error' }) },
      }))
    }
  }

  return (
    <>
      <PageHeader title={t('vocabulary.splitTitle')} description={t('vocabulary.splitDescription')} />
      <p className="mb-4 text-sm font-black text-muted-foreground">
        {t('vocabulary.splitCount', { count: splittableEntries.length })}
      </p>
      <div className="space-y-4">
        {splittableEntries.map((entry) => {
          const state = splitState[entry.id]
          const applied = state?.applied
          const parts = splitMultiTermEntry({
            id: entry.id,
            user_id: entry.user_id,
            source_text: entry.source_text,
            translation: entry.translation,
            source_language: entry.source_language,
            native_language: entry.native_language,
            item_type: entry.item_type,
            part_of_speech: entry.part_of_speech,
            ipa: entry.ipa,
            note: entry.note,
            meanings: entry.meanings.map((m) => ({ text: m.text, language: m.language })),
            examples: entry.examples.map((e) => ({ sentence: e.sentence, translation: e.translation })),
            tags: entry.tags,
            status: entry.status,
            deck_ids: [],
            relationship_ids: [],
          })

          return (
            <Card key={entry.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-black text-foreground">{entry.source_text}</p>
                  <p className="mt-1 text-sm font-semibold text-muted-foreground">{entry.translation}</p>
                </div>
                {applied ? (
                  <p className="shrink-0 text-sm font-black text-success">
                    {t('vocabulary.splitApplied', { count: state!.createdCount, term: entry.source_text })}
                  </p>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  >
                    {t('vocabulary.splitPreview')}
                  </Button>
                )}
              </div>
              {state?.error ? (
                <p className="mt-2 text-sm font-black text-destructive">{state.error}</p>
              ) : null}
              {expandedId === entry.id && !applied && parts.length > 0 ? (
                <div className="mt-4 border-t-2 border-border pt-4">
                  <p className="mb-2 text-xs font-black uppercase text-muted-foreground">
                    {t('vocabulary.splitOriginalTerm')}: {entry.source_text} → {entry.translation}
                  </p>
                  <ul className="space-y-2">
                    {parts.map((part, i) => (
                      <li key={i} className="rounded-md border-2 border-border bg-secondary/20 p-2 text-sm font-semibold">
                        <span className="font-black">{part.source_text}</span>
                        <span className="mx-2 text-muted-foreground">→</span>
                        <span>{part.translation}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    type="button"
                    className="mt-3"
                    onClick={() => {
                      const input: SplitInput = {
                        id: entry.id,
                        user_id: entry.user_id,
                        source_text: entry.source_text,
                        translation: entry.translation,
                        source_language: entry.source_language,
                        native_language: entry.native_language,
                        item_type: entry.item_type,
                        part_of_speech: entry.part_of_speech,
                        ipa: entry.ipa,
                        note: entry.note,
                        meanings: entry.meanings.map((m) => ({ text: m.text, language: m.language })),
                        examples: entry.examples.map((e) => ({ sentence: e.sentence, translation: e.translation })),
                        tags: entry.tags,
                        status: entry.status,
                        deck_ids: [],
                        relationship_ids: [],
                      }
                      void handleSplit(input)
                    }}
                  >
                    {t('vocabulary.splitApply')}
                  </Button>
                </div>
              ) : null}
            </Card>
          )
        })}
      </div>
    </>
  )
}
