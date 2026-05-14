import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Label, Select } from '@/components/ui/input'
import { demoDecks } from '@/features/demo/demoData'
import { buildStudySessionStorageKey, clearStoredStudySession, readActiveStudySessionStorageKey, readStoredStudySession, writeActiveStudySessionStorageKey } from '@/features/study/sessionPersistence'
import { mvpStudyModes } from '@/features/study/studyLabels'
import { useI18n } from '@/i18n'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { deckService } from '@/services/supabase/deck.service'
import { studyService } from '@/services/supabase/study.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { useStudyStore } from '@/stores/useStudyStore'

export function StudySetupPage() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const user = useAuthStore((state) => state.user)
  const { mode, setMode, cardLimit, setCardLimit, shuffle, setShuffle, selectedDeckId, setSelectedDeckId } = useStudyStore()
  const shouldUseRemoteData = isSupabaseConfigured && Boolean(user)
  const decksQuery = useQuery({
    queryKey: ['decks', user?.id],
    queryFn: () => deckService.list(user!.id),
    enabled: shouldUseRemoteData,
  })
  const decks = useMemo(
    () => shouldUseRemoteData ? decksQuery.data ?? [] : demoDecks,
    [decksQuery.data, shouldUseRemoteData],
  )

  async function flushActiveSessionViews() {
    if (!shouldUseRemoteData) return
    const activeSessionKey = readActiveStudySessionStorageKey({
      userId: user?.id,
      sessionId: 'deck-session',
      remote: shouldUseRemoteData,
    })
    if (!activeSessionKey) return

    const storedSession = readStoredStudySession(activeSessionKey)
    if (!storedSession) return

    const pendingIds = storedSession.viewedTermIds.filter((id) => !storedSession.flushedViewTermIds.includes(id))
    if (pendingIds.length > 0) await studyService.flushTermViews(pendingIds)
  }

  async function startSession() {
    const sessionStorageKey = buildStudySessionStorageKey({
      userId: user?.id,
      sessionId: 'deck-session',
      selectedDeckId,
      mode,
      cardLimit,
      shuffle,
      remote: shouldUseRemoteData,
    })
    try {
      await flushActiveSessionViews()
    } finally {
      clearStoredStudySession(sessionStorageKey)
      writeActiveStudySessionStorageKey({
        userId: user?.id,
        sessionId: 'deck-session',
        remote: shouldUseRemoteData,
      }, sessionStorageKey)
      navigate('/app/study/session/deck-session')
    }
  }

  return (
    <>
      <PageHeader title={t('study.setupTitle')} description={t('study.setupDescription')} />
      <Card className="max-w-2xl">
        <CardTitle>{t('study.sessionOptions')}</CardTitle>
        <CardDescription className="mt-2">{t('study.sessionOptionsDescription')}</CardDescription>
        <div className="mt-6 grid gap-4">
          {decksQuery.isLoading ? <Card className="font-black">{t('decks.loading')}</Card> : null}
          {decksQuery.error ? <Card className="font-black text-danger">{decksQuery.error.message}</Card> : null}
          <div>
            <Label>{t('study.deck')}</Label>
            <Select value={selectedDeckId ?? ''} onChange={(event) => setSelectedDeckId(event.target.value || null)}>
              <option value="">{t('study.allVocabulary')}</option>
              {decks.map((deck) => <option key={deck.id} value={deck.id}>{deck.name}</option>)}
            </Select>
          </div>
          <div><Label>{t('study.mode')}</Label><Select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}>{mvpStudyModes.map((item) => <option key={item} value={item}>{t(item === 'two_side' ? 'study.twoSide' : 'study.oneSide')}</option>)}</Select></div>
          <div><Label>{t('study.cards')}</Label><Select value={cardLimit} onChange={(event) => setCardLimit(event.target.value === 'all' ? 'all' : Number(event.target.value))}><option value={10}>{t('study.cardCount', { count: 10 })}</option><option value={20}>{t('study.cardCount', { count: 20 })}</option><option value={50}>{t('study.cardCount', { count: 50 })}</option><option value="all">{t('study.allCards')}</option></Select></div>
          <label className="flex items-center gap-3 text-sm font-black"><input checked={shuffle} onChange={(event) => setShuffle(event.target.checked)} type="checkbox" /> {t('study.shuffleCards')}</label>
          <Button disabled={shouldUseRemoteData && decksQuery.isLoading} onClick={startSession}>{t('study.startSession')}</Button>
        </div>
      </Card>
    </>
  )
}
