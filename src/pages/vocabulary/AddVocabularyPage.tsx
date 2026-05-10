import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Input, Label, Select, Textarea } from '@/components/ui/input'
import { useI18n } from '@/i18n'
import { enrichVocabulary } from '@/services/api/enrichVocabulary.api'
import type { EnrichedVocabulary, VocabularyItemType } from '@/types/vocabulary.types'
import { inferItemType } from '@/utils/normalizeText'

export function AddVocabularyPage() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const [text, setText] = useState('')
  const [itemType, setItemType] = useState<VocabularyItemType>('word')
  const [ipa, setIpa] = useState('')
  const [meaning, setMeaning] = useState('')
  const [example, setExample] = useState('')
  const [translation, setTranslation] = useState('')
  const [note, setNote] = useState('')
  const [source, setSource] = useState<EnrichedVocabulary['source'] | null>(null)

  async function runEnrichment() {
    const enriched = await enrichVocabulary(text, 'en', 'vi')
    setItemType(enriched.itemType)
    setIpa(enriched.ipa ?? '')
    setMeaning(enriched.meanings[0]?.text ?? '')
    setExample(enriched.examples[0]?.sentence ?? '')
    setTranslation(enriched.examples[0]?.translation ?? '')
    setSource(enriched.source)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    navigate('/app/vocabulary')
  }

  return (
    <>
      <PageHeader title={t('vocabulary.addTitle')} description={t('vocabulary.addDescription')} />
      <form className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]" onSubmit={submit}>
        <Card>
          <CardTitle>{t('vocabulary.input')}</CardTitle>
          <div className="mt-4 grid gap-4">
            <div><Label>{t('vocabulary.sourceTextPrompt')}</Label><Input value={text} onChange={(event) => { setText(event.target.value); setItemType(inferItemType(event.target.value) as VocabularyItemType) }} /></div>
            <div><Label>{t('vocabulary.itemType')}</Label><Select value={itemType} onChange={(event) => setItemType(event.target.value as VocabularyItemType)}><option value="word">{t('vocabulary.word')}</option><option value="phrase">{t('vocabulary.phrase')}</option><option value="idiom">{t('vocabulary.idiom')}</option><option value="sentence">{t('vocabulary.sentence')}</option></Select></div>
            <Button type="button" variant="secondary" onClick={() => void runEnrichment()}>{t('vocabulary.enrich')}</Button>
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
            <Button type="submit">{t('vocabulary.save')}</Button>
          </div>
        </Card>
      </form>
    </>
  )
}
