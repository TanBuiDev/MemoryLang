import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Label, Select } from '@/components/ui/input'
import { demoDecks } from '@/features/demo/demoData'
import { useI18n } from '@/i18n'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { deckService } from '@/services/supabase/deck.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { useQuizStore } from '@/stores/useQuizStore'

export function QuizSetupPage() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const user = useAuthStore((state) => state.user)
  const { questionCount, setQuestionCount } = useQuizStore()
  const shouldUseRemoteData = isSupabaseConfigured && Boolean(user)
  const decksQuery = useQuery({
    queryKey: ['decks', user?.id],
    queryFn: () => deckService.list(user!.id),
    enabled: shouldUseRemoteData,
  })
  const decks = shouldUseRemoteData ? decksQuery.data ?? [] : demoDecks

  return (
    <>
      <PageHeader title={t('quiz.setupTitle')} description={t('quiz.setupDescription')} />
      <Card className="max-w-2xl">
        <CardTitle>{t('quiz.options')}</CardTitle>
        <CardDescription className="mt-2">{t('quiz.optionsDescription')}</CardDescription>
        <div className="mt-6 grid gap-4">
          {decksQuery.isLoading ? <Card className="font-black">{t('decks.loading')}</Card> : null}
          {decksQuery.error ? <Card className="font-black text-danger">{decksQuery.error.message}</Card> : null}
          <div><Label>{t('quiz.deck')}</Label><Select>{decks.length === 0 ? <option>{t('decks.emptyTitle')}</option> : decks.map((deck) => <option key={deck.id}>{deck.name}</option>)}</Select></div>
          <div><Label>{t('quiz.type')}</Label><Select defaultValue="true_false"><option value="true_false">{t('quiz.trueFalse')}</option></Select></div>
          <div><Label>{t('quiz.questionCount')}</Label><Select value={questionCount} onChange={(event) => setQuestionCount(Number(event.target.value))}><option value={5}>{t('quiz.questions', { count: 5 })}</option><option value={10}>{t('quiz.questions', { count: 10 })}</option></Select></div>
          <Button disabled={shouldUseRemoteData && decksQuery.isLoading} onClick={() => navigate('/app/quiz/session/demo-quiz')}>{t('quiz.start')}</Button>
        </div>
      </Card>
    </>
  )
}
