import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { demoVocabulary } from '@/features/demo/demoData'
import { useI18n } from '@/i18n'
import { useStudyStore } from '@/stores/useStudyStore'
import { speak } from '@/utils/audio'

export function FlashcardStudyPage() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const mode = useStudyStore((state) => state.mode)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(mode === 'one_side')
  const item = demoVocabulary[index]

  function next() {
    if (index >= demoVocabulary.length - 1) {
      navigate('/app/study/result/demo-session')
      return
    }
    setIndex(index + 1)
    setFlipped(mode === 'one_side')
  }

  return (
    <>
      <PageHeader title={t('study.sessionTitle')} description={t('study.sessionDescription')} />
      <Progress value={((index + 1) / demoVocabulary.length) * 100} />
      <Card className="mx-auto mt-6 min-h-96 max-w-3xl p-8 text-center">
        <p className="text-sm font-black uppercase text-muted-foreground">{t('study.cardProgress', { current: index + 1, total: demoVocabulary.length })}</p>
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
