import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Input, Label, Select, Textarea } from '@/components/ui/input'
import { TranslationChips, cleanTranslationValue } from '@/components/ui/translation-chips'
import { vocabularyFormSchema, type VocabularyFormValues } from '@/features/vocabulary/vocabulary.schema'
import { useI18n } from '@/i18n'
import { studyLocalDb } from '@/services/local/studyLocalDb'
import { enrichVocabulary } from '@/services/api/enrichVocabulary.api'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import { useAuthStore } from '@/stores/useAuthStore'
import type { EnrichedVocabulary, VocabularyItemType, ExampleSentence } from '@/types/vocabulary.types'
import { inferItemType } from '@/utils/normalizeText'

interface AddVocabularyFormProps {
  onSuccess: () => void
}

export function AddVocabularyForm({ onSuccess }: AddVocabularyFormProps) {
  const queryClient = useQueryClient()
  const { t } = useI18n()
  const user = useAuthStore((state) => state.user)
  const profile = useAuthStore((state) => state.profile)
  const [text, setText] = useState('')
  const [itemType, setItemType] = useState<VocabularyItemType>('word')
  const [ipa, setIpa] = useState('')
  const [partOfSpeech, setPartOfSpeech] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [meaning, setMeaning] = useState('')
  const [examples, setExamples] = useState<ExampleSentence[]>([{ sentence: '', translation: '' }])
  const [translation, setTranslation] = useState('')
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')
  const [source, setSource] = useState<EnrichedVocabulary['source'] | null>(null)
  const [duplicateId, setDuplicateId] = useState<string | null>(null)
  const [isEnriching, setIsEnriching] = useState(false)

  const createVocabulary = useMutation({
    mutationFn: (values: VocabularyFormValues) => vocabularyService.create(user!.id, values),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['vocabulary', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['statistics', user?.id] }),
      ])
      onSuccess()
    },
    onError: async (error, values) => {
      setMessage(error instanceof Error ? error.message : 'Could not save vocabulary.')
      if (user) {
        await studyLocalDb.enqueueMutation({
          id: `create-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          userId: user.id,
          type: 'create',
          payload: {
            id: `pending-${Date.now()}`,
            user_id: user.id,
            global_term_id: null,
            source_text: values.source_text,
            normalized_text: values.source_text.toLowerCase(),
            source_language: values.source_language,
            native_language: values.native_language,
            item_type: values.item_type,
            part_of_speech: values.part_of_speech ?? null,
            ipa: values.ipa ?? null,
            audio_url: values.audio_url ?? null,
            image_url: values.image_url ?? null,
            note: values.note ?? null,
            meanings: values.meanings,
            translation: values.translation ?? null,
            examples: values.examples?.map(ex => ({ sentence: ex.sentence, translation: ex.translation ?? undefined })) || [],
            tags: values.tags,
            status: 'new' as import('@/types/vocabulary.types').VocabularyStatus,
            view_count: 0,
            correct_count: 0,
            wrong_count: 0,
            audio_play_count: 0,
            srs_repetition: 0,
            srs_interval_days: 0,
            srs_ease_factor: 2.5,
            last_reviewed_at: null,
            next_review_at: null,
            flagged: false,
            deleted_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          createdAt: new Date().toISOString(),
        })
      }
    },
  })

  async function runEnrichment() {
    const trimmed = text.trim()
    if (!trimmed) return

    setIsEnriching(true)
    setMessage('')
    setDuplicateId(null)

    if (isSupabaseConfigured && user) {
      try {
        const existing = await vocabularyService.findDuplicate(user.id, trimmed)
        if (existing) {
          setDuplicateId(existing.id)
          setMessage(t('vocabulary.duplicateError', { word: trimmed }))
          setIsEnriching(false)
          return
        }
      } catch (err) {
        console.error('[AddVocabulary] Duplicate check failed:', err)
      }
    }

    try {
      const enriched = await enrichVocabulary(trimmed, 'en', 'vi')
      setItemType(enriched.itemType)
      setIpa(enriched.ipa ?? '')
      setPartOfSpeech(enriched.partOfSpeech ?? '')
      setAudioUrl(enriched.audioUrl ?? '')
      setImageUrl(enriched.imageUrl ?? '')
      setMeaning(enriched.meanings[0]?.text ?? '')
      const enrichedExamples = enriched.examples?.map(ex => ({
        sentence: ex.sentence ?? '',
        translation: ex.translation ?? ''
      })) ?? []
      setExamples(enrichedExamples.length > 0 ? enrichedExamples : [{ sentence: '', translation: '' }])
      setTranslation(enriched.translationText ?? enriched.examples[0]?.translation ?? '')
      setSource(enriched.source)
    } catch (err) {
      console.error('[AddVocabulary] Enrichment failed:', err)
      setMessage('Enrichment failed. You can fill in the fields manually.')
    }

    setIsEnriching(false)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    setMessage('')

    if (isSupabaseConfigured && !user) {
      setMessage('You need to sign in before saving vocabulary.')
      return
    }

    if (duplicateId) return

    const nativeLanguage = profile?.native_language ?? 'vi'
    const sourceLanguage = profile?.current_target_language ?? 'en'
    const parsed = vocabularyFormSchema.safeParse({
      source_text: text.trim(),
      source_language: sourceLanguage,
      native_language: nativeLanguage,
      item_type: itemType,
      part_of_speech: partOfSpeech,
      ipa,
      audio_url: audioUrl,
      image_url: imageUrl,
      note,
      meanings: [{ text: meaning.trim(), language: nativeLanguage }],
      translation: cleanTranslationValue(translation) || undefined,
      examples: examples
        .map(ex => ({ sentence: ex.sentence.trim(), translation: ex.translation?.trim() || undefined }))
        .filter(ex => ex.sentence.length > 0),
      tags: [],
      deck_ids: [],
    })

    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? 'Please check the vocabulary details.')
      return
    }

    if (!isSupabaseConfigured) {
      onSuccess()
      return
    }

    createVocabulary.mutate(parsed.data)
  }

  const isDuplicate = duplicateId !== null
  const isEnrichDisabled = !text.trim() || isEnriching || isDuplicate

  return (
    <form className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]" onSubmit={submit}>
      <Card>
        <CardTitle>{t('vocabulary.input')}</CardTitle>
        <div className="mt-4 grid gap-4">
          <div>
            <Label>{t('vocabulary.sourceTextPrompt')}</Label>
            <Input
              value={text}
              onChange={(event) => {
                setText(event.target.value)
                setItemType(inferItemType(event.target.value) as VocabularyItemType)
                if (duplicateId) { setDuplicateId(null); setMessage('') }
              }}
              className={isDuplicate ? 'border-danger' : ''}
            />
            {isDuplicate ? (
              <div className="mt-2">
                <p className="text-sm font-bold text-danger">{message}</p>
                <Button asChild variant="secondary" className="mt-1">
                  <Link to={`/app/vocabulary/${duplicateId}`}>{t('vocabulary.editExisting')}</Link>
                </Button>
              </div>
            ) : null}
          </div>
          <div><Label>{t('vocabulary.itemType')}</Label><Select value={itemType} onChange={(event) => setItemType(event.target.value as VocabularyItemType)}><option value="word">{t('vocabulary.word')}</option><option value="phrase">{t('vocabulary.phrase')}</option><option value="idiom">{t('vocabulary.idiom')}</option><option value="sentence">{t('vocabulary.sentence')}</option></Select></div>
          <Button type="button" variant="secondary" disabled={isEnrichDisabled} onClick={() => void runEnrichment()}>
            {isEnriching ? '...' : t('vocabulary.enrich')}
          </Button>
        </div>
      </Card>
      <Card>
        <CardTitle>{t('vocabulary.editableSuggestion')}</CardTitle>
        <CardDescription className="mt-2">{t('vocabulary.source')}: {source ?? t('vocabulary.manual')}</CardDescription>
        <div className="mt-4 grid gap-4">
          <div><Label>{t('vocabulary.ipa')}</Label><Input value={ipa} onChange={(event) => setIpa(event.target.value)} /></div>
          <div><Label>{t('vocabulary.meaning')}</Label><Textarea value={meaning} onChange={(event) => setMeaning(event.target.value)} /></div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('vocabulary.examples')}</Label>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setExamples(prev => [...prev, { sentence: '', translation: '' }])}
                className="h-8 px-2 py-1 text-xs"
              >
                + {t('vocabulary.addExample')}
              </Button>
            </div>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {examples.map((ex, index) => (
                <div key={index} className="relative rounded-md border border-border p-3 space-y-2 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground">Ví dụ {index + 1}</span>
                    {examples.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setExamples(prev => prev.filter((_, i) => i !== index))}
                        className="h-6 w-6 p-0 text-danger hover:text-danger/80"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div>
                    <Input
                      placeholder="Câu ví dụ (English)"
                      value={ex.sentence}
                      onChange={(e) => {
                        const val = e.target.value
                        setExamples(prev => prev.map((item, i) => i === index ? { ...item, sentence: val } : item))
                      }}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Dịch nghĩa câu ví dụ (Vietnamese)"
                      value={ex.translation || ''}
                      onChange={(e) => {
                        const val = e.target.value
                        setExamples(prev => prev.map((item, i) => i === index ? { ...item, translation: val } : item))
                      }}
                      className="text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div><Label>{t('vocabulary.translation')}</Label><TranslationChips value={translation} onChange={setTranslation} /></div>
          <div><Label>{t('vocabulary.note')}</Label><Textarea value={note} onChange={(event) => setNote(event.target.value)} /></div>
          <Button type="submit" disabled={createVocabulary.isPending || isDuplicate}>{createVocabulary.isPending ? '...' : t('vocabulary.save')}</Button>
          {!isDuplicate && message ? <p className="text-sm font-bold text-danger">{message}</p> : null}
        </div>
      </Card>
    </form>
  )
}
