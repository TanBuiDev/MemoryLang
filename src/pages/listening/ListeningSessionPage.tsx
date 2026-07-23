import { useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, RotateCcw, Award, CheckCircle2, Headphones } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ListeningAudioPlayer } from '@/components/listening/ListeningAudioPlayer'
import { TestModeRenderer } from '@/components/listening/TestModeRenderer'
import { DictationRenderer } from '@/components/listening/DictationRenderer'
import { TranscriptViewer } from '@/components/listening/TranscriptViewer'
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
import { soundEffects } from '@/utils/soundEffects'

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
  const [currentTime, setCurrentTime] = useState(0)
  const [seekTime, setSeekTime] = useState<number | null>(null)

  const handleAnswer = useCallback((questionOrder: number, answerIndex: number) => {
    if (showResult) return
    soundEffects.play('cardClick')
    setAnswers((prev) => ({ ...prev, [questionOrder]: answerIndex }))
  }, [showResult])

  const handleDictAnswer = useCallback((blankIndex: number, value: string) => {
    if (showResult) return
    setDictAnswers((prev) => ({ ...prev, [blankIndex]: value }))
  }, [showResult])

  const goTo = (idx: number) => {
    if (idx >= 0 && idx < allQuestions.length) {
      soundEffects.play('cardClick')
      setCurrentIndex(idx)
    }
  }

  const handleSubmit = () => {
    soundEffects.play('matchSuccess')
    setShowResult(true)
  }

  const handleRetry = () => {
    soundEffects.play('cardClick')
    setCurrentIndex(0)
    setAnswers({})
    setDictAnswers({})
    setShowResult(false)
  }

  const handleBack = () => {
    soundEffects.play('cardClick')
    navigate(-1)
  }

  const handleSeekFromTranscript = (seconds: number) => {
    setSeekTime(seconds)
    // reset seekTime after trigger
    setTimeout(() => setSeekTime(null), 300)
  }

  if (isTopicLoading || isPartLoading) {
    return (
      <div className="text-center py-16 font-black text-lg text-slate-900">
        <Headphones className="w-8 h-8 mx-auto mb-2 animate-bounce text-purple-700" />
        <span>Đang nạp bài nghe TOEIC...</span>
      </div>
    )
  }

  if (shouldUseRemoteData && !isDemoPart && !topicAccess) {
    return (
      <div className="max-w-xl mx-auto text-center py-12 neo-card p-6 bg-white border-3 border-slate-900 rounded-2xl">
        <p className="text-lg font-black text-slate-900">Không tìm thấy nội dung bài nghe</p>
        <Button onClick={handleBack} className="mt-4 neo-button bg-[#fdc800] text-slate-900 border-2 border-slate-900">
          {t('listening.backToList')}
        </Button>
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
      <div className="max-w-xl mx-auto text-center py-12 neo-card p-6 bg-white border-3 border-slate-900 rounded-2xl">
        <p className="text-lg font-black text-slate-900">Part not found</p>
        <Button onClick={handleBack} className="mt-4 neo-button bg-[#fdc800] text-slate-900 border-2 border-slate-900">
          {t('listening.backToList')}
        </Button>
      </div>
    )
  }

  const scored = allQuestions.length > 0
    ? allQuestions.filter((q) => answers[q.order] === q.correctIndex).length
    : 0

  const partKey = part.partNumber === 1 ? 'listening.part1' : part.partNumber === 2 ? 'listening.part2' : part.partNumber === 3 ? 'listening.part3' : 'listening.part4'

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Top Header Controls */}
      <div className="neo-card p-4 bg-white border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-2xl flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="neo-button p-2.5 rounded-xl border-2 border-slate-900 bg-slate-100 hover:bg-amber-100 active:neo-button-active transition"
        >
          <ChevronLeft className="w-5 h-5 text-slate-900" />
        </button>

        <div className="flex items-center gap-2">
          <Badge className="bg-purple-600 text-white font-black text-xs px-3 py-1 border border-slate-900">
            TOEIC ETS Listening
          </Badge>
          <h1 className="text-base sm:text-lg font-black text-slate-900">{t(partKey)}</h1>
        </div>

        {isTest && (
          <div className="w-32 sm:w-48">
            <ProgressBar current={currentIndex + 1} total={allQuestions.length} />
          </div>
        )}
      </div>

      {/* Neobrutalism Audio Player */}
      <ListeningAudioPlayer
        src={part.audioSrc}
        onTimeUpdate={setCurrentTime}
        seekToTime={seekTime}
      />

      {/* Main Content Renderers */}
      <div className="space-y-6">
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

        {/* Transcript Viewer (shown in Review mode or Practice mode) */}
        {(showResult || !isTest) && (
          <TranscriptViewer
            segments={part.transcriptSegments}
            rawTranscript={part.transcript}
            currentTime={currentTime}
            onSeek={handleSeekFromTranscript}
          />
        )}
      </div>

      {/* Navigation Footer */}
      <div className="neo-card p-4 bg-white border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-2xl flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => goTo(currentIndex - 1)}
          disabled={currentIndex === 0}
          className="neo-button h-10 px-4 rounded-xl border-2 border-slate-900 bg-slate-100 hover:bg-amber-100 disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          <span>Câu trước</span>
        </Button>

        <span className="text-sm font-black text-slate-900 bg-amber-100 border-2 border-slate-900 px-3 py-1 rounded-xl">
          {currentIndex + 1} / {allQuestions.length}
        </span>

        <Button
          type="button"
          variant="ghost"
          onClick={() => goTo(currentIndex + 1)}
          disabled={currentIndex >= allQuestions.length - 1}
          className="neo-button h-10 px-4 rounded-xl border-2 border-slate-900 bg-slate-100 hover:bg-amber-100 disabled:opacity-40"
        >
          <span>Câu tiếp</span>
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Action Footer: Submit / Score / Retry */}
      <div className="flex justify-center gap-4 pt-2">
        {!showResult ? (
          <Button
            type="button"
            onClick={handleSubmit}
            className="neo-button h-12 px-8 bg-[#fdc800] hover:bg-amber-300 text-slate-900 font-black text-base border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-xl active:neo-button-active"
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            <span>Nộp Bài Nghe</span>
          </Button>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-4">
            <div className="neo-card px-6 py-3 bg-[#fdc800] border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-2xl text-center flex items-center gap-3">
              <Award className="w-8 h-8 text-slate-900" />
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-900">Kết Quả Điểm Số</p>
                <p className="text-2xl font-black text-slate-900">{scored} / {allQuestions.length} câu đúng</p>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleRetry}
              className="neo-button h-12 px-6 bg-white hover:bg-slate-100 text-slate-900 font-black text-base border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-xl active:neo-button-active flex items-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Làm Lại Bài Nghe</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
