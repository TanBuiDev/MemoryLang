import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Label, Select } from '@/components/ui/input'
import { demoDecks } from '@/features/demo/demoData'
import { mvpStudyModes } from '@/features/study/studyLabels'
import { useI18n } from '@/i18n'
import { useStudyStore } from '@/stores/useStudyStore'

export function StudySetupPage() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const { mode, setMode, cardLimit, setCardLimit, shuffle, setShuffle } = useStudyStore()

  return (
    <>
      <PageHeader title={t('study.setupTitle')} description={t('study.setupDescription')} />
      <Card className="max-w-2xl">
        <CardTitle>{t('study.sessionOptions')}</CardTitle>
        <CardDescription className="mt-2">{t('study.sessionOptionsDescription')}</CardDescription>
        <div className="mt-6 grid gap-4">
          <div><Label>{t('study.deck')}</Label><Select>{demoDecks.map((deck) => <option key={deck.id} value={deck.id}>{deck.name}</option>)}</Select></div>
          <div><Label>{t('study.mode')}</Label><Select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}>{mvpStudyModes.map((item) => <option key={item} value={item}>{t(item === 'two_side' ? 'study.twoSide' : 'study.oneSide')}</option>)}</Select></div>
          <div><Label>{t('study.cards')}</Label><Select value={cardLimit} onChange={(event) => setCardLimit(Number(event.target.value))}><option value={10}>{t('study.cardCount', { count: 10 })}</option><option value={20}>{t('study.cardCount', { count: 20 })}</option><option value={50}>{t('study.cardCount', { count: 50 })}</option></Select></div>
          <label className="flex items-center gap-3 text-sm font-black"><input checked={shuffle} onChange={(event) => setShuffle(event.target.checked)} type="checkbox" /> {t('study.shuffleCards')}</label>
          <Button onClick={() => navigate('/app/study/session/demo-session')}>{t('study.startSession')}</Button>
        </div>
      </Card>
    </>
  )
}
