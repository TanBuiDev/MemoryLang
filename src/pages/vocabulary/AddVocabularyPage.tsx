import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Input, Label, Select, Textarea } from '@/components/ui/input'
import { vocabularyFormSchema, type VocabularyFormValues } from '@/features/vocabulary/vocabulary.schema'
import { useI18n } from '@/i18n'
import { enrichVocabulary } from '@/services/api/enrichVocabulary.api'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import { useAuthStore } from '@/stores/useAuthStore'
import type { EnrichedVocabulary, VocabularyItemType } from '@/types/vocabulary.types'
import { inferItemType } from '@/utils/normalizeText'

export function AddVocabularyPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useI18n()
  const user = useAuthStore((state) => state.user)
  const profile = useAuthStore((state) => state.profile)
  const [text, setText] = useState('')
  const [itemType, setItemType] = useState<VocabularyItemType>('word')
  const [ipa, setIpa] = useState('')
  const [partOfSpeech, setPartOfSpeech] = useState('')
  const [pronunciationText, setPronunciationText] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [meaning, setMeaning] = useState('')
  const [example, setExample] = useState('')
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
      navigate('/app/vocabulary')
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Could not save vocabulary.')
    },
  })

  async function runEnrichment() {
    const trimmed = text.trim()
    if (!trimmed) return

    setIsEnriching(true)
    setMessage('')
    setDuplicateId(null)

    // Step 1: Check duplicate first
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

    // Step 2: No duplicate — proceed with enrichment API
    try {
      const enriched = await enrichVocabulary(trimmed, 'en', 'vi')
      setItemType(enriched.itemType)
      setIpa(enriched.ipa ?? '')
      setPartOfSpeech(enriched.partOfSpeech ?? '')
      setPronunciationText(enriched.pronunciationText ?? '')
      setAudioUrl(enriched.audioUrl ?? '')
      setImageUrl(enriched.imageUrl ?? '')
      setMeaning(enriched.meanings[0]?.text ?? '')
      setExample(enriched.examples[0]?.sentence ?? '')
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
      pronunciation_text: pronunciationText,
      audio_url: audioUrl,
      image_url: imageUrl,
      note,
      meanings: [{ text: meaning.trim(), language: nativeLanguage }],
      translation: translation.trim() || undefined,
      examples: example.trim() ? [{ sentence: example.trim(), translation: '' }] : [],
      tags: [],
      deck_ids: [],
    })

    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? 'Please check the vocabulary details.')
      return
    }

    if (!isSupabaseConfigured) {
      navigate('/app/vocabulary')
      return
    }

    createVocabulary.mutate(parsed.data)
  }

  const isDuplicate = duplicateId !== null
  const isEnrichDisabled = !text.trim() || isEnriching || isDuplicate

  return (
    <>
      <PageHeader title={t('vocabulary.addTitle')} description={t('vocabulary.addDescription')} />
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
                    <Link to={`/app/vocabulary/${duplicateId}/edit`}>{t('vocabulary.editExisting')}</Link>
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
            <div><Label>{t('vocabulary.example')}</Label><Textarea value={example} onChange={(event) => setExample(event.target.value)} /></div>
            <div><Label>{t('vocabulary.translation')}</Label><Textarea value={translation} onChange={(event) => setTranslation(event.target.value)} /></div>
            <div><Label>{t('vocabulary.note')}</Label><Textarea value={note} onChange={(event) => setNote(event.target.value)} /></div>
            <Button type="submit" disabled={createVocabulary.isPending || isDuplicate}>{createVocabulary.isPending ? '...' : t('vocabulary.save')}</Button>
            {!isDuplicate && message ? <p className="text-sm font-bold text-danger">{message}</p> : null}
          </div>
        </Card>
      </form>
    </>
  )
}
