import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Label, Select } from '@/components/ui/input'
import { demoDecks } from '@/features/demo/demoData'
import { mvpStudyModes } from '@/features/study/studyLabels'
import { useI18n } from '@/i18n'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { deckService } from '@/services/supabase/deck.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { useStudyStore } from '@/stores/useStudyStore'

export function StudySetupPage() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const user = useAuthStore((state) => state.user)
  const { mode, setMode, cardLimit, setCardLimit, shuffle, setShuffle } = useStudyStore()
  const shouldUseRemoteData = isSupabaseConfigured && Boolean(user)
  const decksQuery = useQuery({
    queryKey: ['decks', user?.id],
    queryFn: () => deckService.list(user!.id),
    enabled: shouldUseRemoteData,
  })
  const decks = shouldUseRemoteData ? decksQuery.data ?? [] : demoDecks

  return (
    <>
      <PageHeader title={t('study.setupTitle')} description={t('study.setupDescription')} />
      <Card className="max-w-2xl">
        <CardTitle>{t('study.sessionOptions')}</CardTitle>
        <CardDescription className="mt-2">{t('study.sessionOptionsDescription')}</CardDescription>
        <div className="mt-6 grid gap-4">
          {decksQuery.isLoading ? <Card className="font-black">{t('decks.loading')}</Card> : null}
          {decksQuery.error ? <Card className="font-black text-danger">{decksQuery.error.message}</Card> : null}
          <div><Label>{t('study.deck')}</Label><Select>{decks.length === 0 ? <option>{t('decks.emptyTitle')}</option> : decks.map((deck) => <option key={deck.id} value={deck.id}>{deck.name}</option>)}</Select></div>
          <div><Label>{t('study.mode')}</Label><Select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}>{mvpStudyModes.map((item) => <option key={item} value={item}>{t(item === 'two_side' ? 'study.twoSide' : 'study.oneSide')}</option>)}</Select></div>
          <div><Label>{t('study.cards')}</Label><Select value={cardLimit} onChange={(event) => setCardLimit(Number(event.target.value))}><option value={10}>{t('study.cardCount', { count: 10 })}</option><option value={20}>{t('study.cardCount', { count: 20 })}</option><option value={50}>{t('study.cardCount', { count: 50 })}</option></Select></div>
          <label className="flex items-center gap-3 text-sm font-black"><input checked={shuffle} onChange={(event) => setShuffle(event.target.checked)} type="checkbox" /> {t('study.shuffleCards')}</label>
          <Button disabled={shouldUseRemoteData && decksQuery.isLoading} onClick={() => navigate('/app/study/session/demo-session')}>{t('study.startSession')}</Button>
        </div>
      </Card>
    </>
  )
}
