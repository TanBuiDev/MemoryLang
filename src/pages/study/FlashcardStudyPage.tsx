import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { demoVocabulary } from '@/features/demo/demoData'
import { useI18n } from '@/i18n'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { useStudyStore } from '@/stores/useStudyStore'
import { speak } from '@/utils/audio'

export function FlashcardStudyPage() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const user = useAuthStore((state) => state.user)
  const mode = useStudyStore((state) => state.mode)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(mode === 'one_side')
  const shouldUseRemoteData = isSupabaseConfigured && Boolean(user)
  const vocabularyQuery = useQuery({
    queryKey: ['vocabulary', user?.id],
    queryFn: () => vocabularyService.list(user!.id),
    enabled: shouldUseRemoteData,
  })
  const vocabulary = shouldUseRemoteData ? vocabularyQuery.data ?? [] : demoVocabulary
  const item = vocabulary[index]

  function next() {
    if (index >= vocabulary.length - 1) {
      navigate('/app/study/result/demo-session')
      return
    }
    setIndex(index + 1)
    setFlipped(mode === 'one_side')
  }

  if (vocabularyQuery.isLoading) {
    return <Card className="font-black">{t('vocabulary.loading')}</Card>
  }

  if (vocabularyQuery.error) {
    return <Card className="font-black text-danger">{vocabularyQuery.error.message}</Card>
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
        <p className="mt-8 text-5xl font-black">{item.source_text}</p>
        <p className="mt-4 font-mono text-2xl">{item.ipa}</p>
        {flipped ? (
          <div className="mt-8 rounded-md border-2 border-border bg-muted p-4">
            <p className="text-2xl font-black">{item.meanings[0]?.text}</p>
            <p className="mt-3 font-semibold text-muted-foreground">{item.examples[0]?.sentence}</p>
            <p className="font-semibold text-muted-foreground">{item.examples[0]?.translation}</p>
          </div>
        ) : null}
      </Card>
      <div className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-2">
        <Button variant="ghost" onClick={() => speak(item.source_text)}>{t('actions.playAudio')}</Button>
        {mode === 'two_side' ? <Button variant="secondary" onClick={() => setFlipped(!flipped)}>{t('study.flip')}</Button> : null}
        <Button onClick={next}>{t('study.know')}</Button>
        <Button variant="ghost" onClick={next}>{t('study.dontKnow')}</Button>
        <Button variant="secondary" onClick={next}>{t('study.difficult')}</Button>
        <Button variant="primary" onClick={next}>{t('study.memorized')}</Button>
      </div>
    </>
  )
}
