import { useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AudioPlayer } from '@/components/listening/AudioPlayer'
import { TestModeRenderer } from '@/components/listening/TestModeRenderer'
import { DictationRenderer } from '@/components/listening/DictationRenderer'
import { ProgressBar } from '@/components/listening/ProgressBar'
import { useI18n } from '@/i18n'
import { useQuery } from '@tanstack/react-query'
import { getDemoPartById, getDemoQuestionsByPartId } from '@/features/listening/demoData'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'
import { listeningService } from '@/services/supabase/listening.service'
import { ContentLockState } from '@/components/subscription/ContentLockState'
import { canAccessContent } from '@/utils/contentAccess'

export function ListeningSessionPage() {
  const { partId, mode } = useParams<{ partId: string; mode: 'test' | 'dictation' }>()
  const { t } = useI18n()
  const navigate = useNavigate()
  const isTest = mode === 'test'
  const isDictation = mode === 'dictation'
  const user = useAuthStore((s) => s.user)
  const isPro = useSubscriptionStore((s) => s.isPro)
  const shouldUseRemoteData = isSupabaseConfigured && Boolean(user)
  const isDemoPart = Boolean(partId?.startsWith('ets2026') || !partId?.includes('-'))

  const { data: topicAccess, isLoading: isTopicLoading } = useQuery({
    queryKey: ['listening-part-topic-access', partId, user?.id],
    queryFn: () => listeningService.getTopicByPartId(partId!),
    enabled: shouldUseRemoteData && Boolean(partId) && !isDemoPart,
  })

  const hasAccess = !shouldUseRemoteData || isDemoPart || canAccessContent(topicAccess?.access_tier, isPro)

  const { data, isLoading: isPartLoading } = useQuery({
    queryKey: ['listening-part', partId, user?.id],
    queryFn: async () => {
      if (!partId) return null
      if (!shouldUseRemoteData || isDemoPart) {
        const demoP = getDemoPartById(partId)
        const demoQ = getDemoQuestionsByPartId(partId)
        return demoP ? { part: demoP, questions: demoQ } : null
      }

      try {
        const res = await listeningService.getPartWithQuestions(partId)
        if (res) return res
        const demoP = getDemoPartById(partId)
        const demoQ = getDemoQuestionsByPartId(partId)
        return demoP ? { part: demoP, questions: demoQ } : null
      } catch (err) {
        console.error('Error fetching listening part details:', err)
        const demoP = getDemoPartById(partId)
        const demoQ = getDemoQuestionsByPartId(partId)
        return demoP ? { part: demoP, questions: demoQ } : null
      }
    },
    enabled: Boolean(partId) && (!shouldUseRemoteData || isDemoPart || Boolean(topicAccess && hasAccess))
  })

  const part = data?.part
  const allQuestions = data?.questions ?? []

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [dictAnswers, setDictAnswers] = useState<Record<number, string>>({})
  const [showResult, setShowResult] = useState(false)

  const handleAnswer = useCallback((questionOrder: number, answerIndex: number) => {
    if (showResult) return
    setAnswers((prev) => ({ ...prev, [questionOrder]: answerIndex }))
  }, [showResult])

  const handleDictAnswer = useCallback((blankIndex: number, value: string) => {
    if (showResult) return
    setDictAnswers((prev) => ({ ...prev, [blankIndex]: value }))
  }, [showResult])

  const goTo = (idx: number) => {
    if (idx >= 0 && idx < allQuestions.length) setCurrentIndex(idx)
  }

  const handleSubmit = () => {
    setShowResult(true)
  }

  const handleRetry = () => {
    setCurrentIndex(0)
    setAnswers({})
    setDictAnswers({})
    setShowResult(false)
  }

  const handleBack = () => {
    navigate(-1)
  }

  if (isTopicLoading || isPartLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-black">{t('common.loading') || 'Loading...'}</p>
      </div>
    )
  }

  if (shouldUseRemoteData && !isDemoPart && !topicAccess) {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-black">Không tìm thấy nội dung</p>
        <Button onClick={handleBack} className="mt-4">{t('listening.backToList')}</Button>
      </div>
    )
  }

  if (!hasAccess && topicAccess) {
    return (
      <ContentLockState
        title={topicAccess.title}
        contentType="listening"
        teaserConfig={topicAccess.teaser_config}
        backTo="/app/listening"
      />
    )
  }

  if (!part) {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-black">Part not found</p>
        <Button onClick={handleBack} className="mt-4">{t('listening.backToList')}</Button>
      </div>
    )
  }

  const scored = allQuestions.length > 0
    ? allQuestions.filter((q) => answers[q.order] === q.correctIndex).length
    : 0

  const partKey = part.partNumber === 1 ? 'listening.part1' : part.partNumber === 2 ? 'listening.part2' : part.partNumber === 3 ? 'listening.part3' : 'listening.part4'

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button onClick={handleBack} className="neo-button min-h-0 p-2 rounded-md border-2 border-border bg-card active:neo-button-active transition shadow-[2px_2px_0_var(--border)]">
          <ChevronLeft size={16} />
        </button>
        <h1 className="text-lg font-black">{t(partKey)}</h1>
        {isTest && <ProgressBar current={currentIndex + 1} total={allQuestions.length} />}
      </div>

      <AudioPlayer
        src={part.audioSrc}
        autoPlay={isTest}
        allowSeek={isDictation}
        allowSpeed={isDictation}
      />

      <div className="mt-4">
        {isDictation && part.transcript ? (
          <DictationRenderer
            transcript={part.transcript}
            dictAnswers={dictAnswers}
            showResult={showResult}
            correctAnswers={part.transcript.split('\n').filter(Boolean)}
            onDictAnswer={handleDictAnswer}
          />
        ) : (
          <TestModeRenderer
            part={part}
            questions={allQuestions}
            currentIndex={currentIndex}
            answers={answers}
            showResult={showResult}
            onAnswer={handleAnswer}
            onNavigate={setCurrentIndex}
          />
        )}
      </div>

      <div className="flex items-center justify-between mt-6">
        <Button variant="ghost" onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0}>
          <ChevronLeft size={16} />
        </Button>
        <span className="text-sm font-bold">{currentIndex + 1} / {allQuestions.length}</span>
        <Button variant="ghost" onClick={() => goTo(currentIndex + 1)} disabled={currentIndex >= allQuestions.length - 1}>
          <ChevronRight size={16} />
        </Button>
      </div>

      <div className="flex justify-center gap-3 mt-6">
        {!showResult ? (
          <Button onClick={handleSubmit}>{t('listening.submit')}</Button>
        ) : (
          <>
            <div className="neo-card px-4 py-2 text-center">
              <p className="text-xs font-black uppercase text-muted-foreground">{t('listening.score')}</p>
              <p className="text-xl font-black">{scored}/{allQuestions.length}</p>
            </div>
            <Button onClick={handleRetry} variant="secondary">{t('listening.retry')}</Button>
          </>
        )}
      </div>
    </div>
  )
}
