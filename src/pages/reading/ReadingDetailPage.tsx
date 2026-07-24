import { useEffect, useMemo, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Play,
  Pause,
  CheckCircle2,
  Lock,
  BookOpen,
  HelpCircle,
  Clock,
  FileText,
  Sparkles,
  AArrowUp,
  AArrowDown,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { readingService } from '@/services/supabase/reading.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'
import type {
  QuizAnswer,
  ReadingArticleDetail,
  ReadingArticleTerm,
  ReadingAttempt,
} from '@/types/reading.types'
import { ReadingVocabularyPopover } from '@/components/reading/ReadingVocabularyPopover'
import { ReadingProModal } from '@/components/reading/ReadingProModal'
import { showToast } from '@/components/ui/toast'
import { isRestrictedReadingTier } from '@/utils/readingContent'
import { annotateReadingHtml } from '@/utils/readingVocabulary'
import { fillReadingQuizBlanks } from '@/utils/readingQuizContent'

const speedOptions = [
  { value: '0.5', label: '0.5x' },
  { value: '0.75', label: '0.75x' },
  { value: '1', label: '1.0x (Chuẩn)' },
  { value: '1.25', label: '1.25x' },
  { value: '1.5', label: '1.5x' },
  { value: '2', label: '2.0x' },
]

export function ReadingDetailPage() {
  const { articleId } = useParams<{ articleId: string }>()
  const profile = useAuthStore((s) => s.profile)
  const hasProSubscription = useSubscriptionStore((s) => s.isPro)
  const isPro = Boolean(profile?.is_admin) || hasProSubscription

  const [article, setArticle] = useState<ReadingArticleDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState<ReadingAttempt | null>(null)
  const [articleTerms, setArticleTerms] = useState<ReadingArticleTerm[]>([])
  const [selectedTerm, setSelectedTerm] = useState<ReadingArticleTerm | null>(null)
  const [termPopoverPosition, setTermPopoverPosition] = useState({ x: 0, y: 0 })

  // Pro Modal state
  const [proModalOpen, setProModalOpen] = useState(false)
  const [proModalReason, setProModalReason] = useState('')

  // Audio Player State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [audioSpeed, setAudioSpeed] = useState<number>(1.0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0)
  const [audioDuration, setAudioDuration] = useState<number>(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Reader Customization State
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base')

  // Quiz State
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizScore, setQuizScore] = useState<{ score: number; total: number; percentage: number } | null>(null)

  useEffect(() => {
    async function loadArticleData() {
      if (!articleId) return
      try {
        setLoading(true)
        const detail = await readingService.getArticleDetail(articleId)

        if (detail) {
          setArticle(detail)
          setAudioUrl(detail.audio_url || null)
          try {
            setArticleTerms(await readingService.getArticleTerms(articleId))
          } catch (termError) {
            console.error('Error loading reading vocabulary:', termError)
            setArticleTerms([])
          }
          // Start attempt
          try {
            const newAttempt = await readingService.startAttempt(articleId)
            setAttempt(newAttempt)
          } catch (err) {
            console.error('Start attempt error:', err)
          }
        }
      } catch (err) {
        console.error('Error loading article detail:', err)
      } finally {
        setLoading(false)
      }
    }

    void loadArticleData()
  }, [articleId])

  // Attach audio progress listeners
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      setAudioCurrentTime(audio.currentTime)
      if (audio.duration) setAudioDuration(audio.duration)
    }

    const handleLoadedMetadata = () => {
      setAudioDuration(audio.duration)
    }

    const handleEnded = () => {
      setIsPlayingAudio(false)
      setAudioCurrentTime(0)
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [audioUrl])

  // Audio play/pause handler
  const handleToggleAudio = async () => {
    if (article && isRestrictedReadingTier(article.access_tier) && !isPro) {
      setProModalReason('Audio TTS cho bài đọc này dành riêng cho thành viên Pro.')
      setProModalOpen(true)
      return
    }

    if (!audioUrl) {
      showToast({
        type: 'warning',
        title: 'Bài đọc chưa có audio',
        message: 'Vui lòng quay lại sau khi quản trị viên tạo audio cho bài đọc này.',
      })
      return
    }

    if (audioRef.current) {
      if (isPlayingAudio) {
        audioRef.current.pause()
        setIsPlayingAudio(false)
      } else {
        audioRef.current.playbackRate = audioSpeed
        audioRef.current.play()
        setIsPlayingAudio(true)
      }
    } else if (audioUrl) {
      const newAudio = new Audio(audioUrl)
      audioRef.current = newAudio
      newAudio.playbackRate = audioSpeed
      newAudio.play()
      setIsPlayingAudio(true)
    }
  }

  const annotatedContentHtml = useMemo(() => {
    const sourceHtml = quizSubmitted && article
      ? fillReadingQuizBlanks(article.content_html, article.questions)
      : article?.content_html || ''
    return annotateReadingHtml(sourceHtml, articleTerms)
  }, [article, articleTerms, quizSubmitted])

  const openTermPopover = (marker: HTMLElement) => {
    const termId = marker.dataset.readingTermId
    const term = articleTerms.find((item) => item.global_term_id === termId)
    if (!term) return

    const rect = marker.getBoundingClientRect()
    setSelectedTerm(term)
    setTermPopoverPosition({ x: rect.left, y: rect.bottom })
  }

  const handleContentClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const marker = (event.target as HTMLElement).closest<HTMLElement>('[data-reading-term-id]')
    if (marker) openTermPopover(marker)
  }

  const handleContentKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    const marker = (event.target as HTMLElement).closest<HTMLElement>('[data-reading-term-id]')
    if (!marker) return
    event.preventDefault()
    openTermPopover(marker)
  }

  // Handle Quiz answer select
  const handleSelectOption = (questionId: string, optionText: string) => {
    if (quizSubmitted) return
    setQuizAnswers((prev) => ({ ...prev, [questionId]: optionText }))
  }

  // Submit Quiz
  const handleSubmitQuiz = async () => {
    if (!article || !attempt || quizSubmitted) return

    const unansweredCount = article.questions.filter(
      (question) => !quizAnswers[question.id]
    ).length
    if (unansweredCount > 0) {
      showToast({
        type: 'warning',
        title: 'Bạn chưa chọn hết đáp án',
        message: `Vui lòng trả lời đầy đủ ${unansweredCount} câu hỏi trước khi nộp bài.`,
      })
      return
    }

    const answersArray: QuizAnswer[] = Object.entries(quizAnswers).map(([question_id, selected_option]) => ({
      question_id,
      selected_option,
    }))

    try {
      const result = await readingService.submitQuiz(attempt.id, answersArray, article.questions)
      setQuizScore(result)
      setQuizSubmitted(true)
      showToast({ type: 'success', title: 'Đã nộp bài đọc hiểu!', message: `Bạn đạt ${result.score}/${result.total} điểm (${result.percentage}%).` })
    } catch (err: any) {
      console.error(err)
      showToast({ type: 'error', title: 'Lỗi nộp bài', message: err.message || 'Không thể nộp bài đọc hiểu.' })
    }
  }

  // Format time mm:ss
  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return '00:00'
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const fontSizeClasses = {
    sm: 'text-sm sm:text-base leading-relaxed',
    base: 'text-base sm:text-lg leading-relaxed',
    lg: 'text-lg sm:text-xl leading-relaxed',
    xl: 'text-xl sm:text-2xl leading-relaxed',
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-3">
        <div className="w-8 h-8 border-4 border-slate-900 border-t-[#fdc800] rounded-full animate-spin mx-auto" />
        <p className="font-black text-slate-700 text-sm">Đang tải nội dung bài đọc...</p>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-black text-slate-900">Bài đọc không tồn tại hoặc đã bị ẩn.</h2>
        <Button asChild className="neo-button px-4 py-2 bg-[#fdc800] text-slate-900 font-black text-xs border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-xl">
          <Link to="/app/reading">Quay lại Thư viện</Link>
        </Button>
      </div>
    )
  }

  const hasQuestions = Boolean(article.questions && article.questions.length > 0)
  const answeredCount = Object.keys(quizAnswers).length

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Responsive Grid Layout: Stacked on mobile (< lg), 3 Columns on Desktop (>= lg) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ================= COLUMN 1 (LEFT): Nav, Article Title Card, Audio Card, Vocab Chips ================= */}
        <div className="lg:col-span-3 xl:col-span-3 space-y-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:pr-1">
          
          {/* Back Navigation */}
          <div>
            <Button
              asChild
              variant="ghost"
              className="neo-button px-3.5 py-2 h-10 w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-900 font-black text-xs border-2 sm:border-3 border-slate-900 shadow-[3px_3px_0px_0px_#000] active:shadow-none rounded-xl transition-all"
            >
              <Link to="/app/reading" className="flex items-center justify-center sm:justify-start gap-2">
                <ArrowLeft size={16} />
                <span>Thư viện bài đọc</span>
              </Link>
            </Button>
          </div>

          {/* Article Header Card */}
          <div className="neo-card p-5 bg-white border-3 sm:border-4 border-slate-900 shadow-[5px_5px_0px_0px_#000] rounded-2xl space-y-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-lg bg-[#fdc800] text-slate-900 border border-slate-900 shadow-[1px_1px_0px_0px_#000]">
                Level {article.cefr_level}
              </span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-slate-900">
                {article.purpose}
              </span>
              {isRestrictedReadingTier(article.access_tier) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-slate-900 text-[10px] font-black uppercase shadow-[1px_1px_0px_0px_#000]">
                  <Lock size={11} />
                  {article.access_tier}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
              {article.title}
            </h1>
            {article.subtitle && <p className="text-xs font-bold text-slate-600">{article.subtitle}</p>}

            <div className="pt-2 flex items-center justify-between text-xs font-bold text-slate-500 border-t border-slate-200">
              <span className="flex items-center gap-1">
                <FileText size={14} className="text-slate-700" />
                {article.word_count} từ
              </span>
              <span className="flex items-center gap-1">
                <Clock size={14} className="text-slate-700" />
                ~{article.estimated_reading_time} phút
              </span>
            </div>
          </div>

          {/* Sticky Audio Player */}
          <div className="neo-card p-4 bg-amber-50 border-3 sm:border-4 border-slate-900 shadow-[5px_5px_0px_0px_#000] rounded-2xl space-y-3">
            <div className="flex items-center gap-3 w-full">
              <Button
                type="button"
                onClick={handleToggleAudio}
                className="neo-button p-2.5 h-11 w-11 min-h-0 bg-[#fdc800] hover:bg-amber-300 active:translate-y-0.5 text-slate-900 border-2 sm:border-3 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-xl flex items-center justify-center cursor-pointer shrink-0 transition-transform"
              >
                {isPlayingAudio ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
              </Button>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-slate-900">Âm thanh phát bài đọc (TTS)</p>
                <p className="text-[10px] font-bold text-slate-600 truncate">Nghe kết hợp highlight câu đang đọc</p>
              </div>
            </div>

            {/* Speed & Time Row */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-amber-200/80">
              <div className="text-[10px] font-mono font-bold text-slate-700">
                {audioDuration > 0 ? (
                  <span>{formatTime(audioCurrentTime)} / {formatTime(audioDuration)}</span>
                ) : (
                  <span>0.5x - 2.0x</span>
                )}
              </div>
              <Select
                value={String(audioSpeed)}
                onChange={(val) => {
                  const speed = Number(val)
                  setAudioSpeed(speed)
                  if (audioRef.current) audioRef.current.playbackRate = speed
                }}
                options={speedOptions}
              />
            </div>

            {/* Audio Visual Progress Bar */}
            {audioDuration > 0 && (
              <div className="w-full bg-amber-200/80 rounded-full h-2 border border-slate-900 overflow-hidden">
                <div
                  className="bg-[#fdc800] h-full transition-all duration-200"
                  style={{ width: `${(audioCurrentTime / audioDuration) * 100}%` }}
                />
              </div>
            )}
          </div>

          {/* Key Vocabulary Chips Card */}
          {articleTerms.length > 0 && (
            <div className="neo-card p-4 bg-purple-50 border-3 sm:border-4 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-2xl space-y-2.5 hidden sm:block">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Sparkles size={15} className="text-purple-700" />
                  Từ vựng bài đọc ({articleTerms.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                {articleTerms.map((term) => (
                  <button
                    key={term.global_term_id}
                    type="button"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      setSelectedTerm(term)
                      setTermPopoverPosition({ x: rect.left, y: rect.bottom })
                    }}
                    className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-900 text-slate-800 hover:bg-purple-100 hover:text-purple-900 transition-colors shadow-[1px_1px_0px_0px_#000] cursor-pointer"
                  >
                    {term.source_text}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ================= COLUMN 2 (CENTER): Reading Passage Content ================= */}
        <div className={`${hasQuestions ? 'lg:col-span-5 xl:col-span-6' : 'lg:col-span-9 xl:col-span-9'} space-y-4`}>
          <div className="neo-card p-5 sm:p-8 bg-white border-3 sm:border-4 border-slate-900 shadow-[6px_6px_0px_0px_#000] rounded-2xl space-y-5">
            
            {/* Content Header Toolbar */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3 gap-2 flex-wrap">
              <span className="text-xs font-black uppercase text-slate-600 flex items-center gap-1.5">
                <BookOpen size={16} className="text-purple-700 shrink-0" />
                <span>Bấm vào từ được gạch chân để tra nghĩa</span>
              </span>

              {/* Font size adjustment controls */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 border border-slate-900 rounded-lg shadow-[1px_1px_0px_0px_#000]">
                <button
                  type="button"
                  title="Giảm cỡ chữ"
                  onClick={() => {
                    if (fontSize === 'xl') setFontSize('lg')
                    else if (fontSize === 'lg') setFontSize('base')
                    else if (fontSize === 'base') setFontSize('sm')
                  }}
                  className={`p-1 rounded text-slate-800 hover:bg-slate-200 transition-colors ${fontSize === 'sm' ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <AArrowDown size={14} />
                </button>
                <span className="text-[10px] font-black uppercase px-1 text-slate-700 min-w-8 text-center">
                  {fontSize}
                </span>
                <button
                  type="button"
                  title="Tăng cỡ chữ"
                  onClick={() => {
                    if (fontSize === 'sm') setFontSize('base')
                    else if (fontSize === 'base') setFontSize('lg')
                    else if (fontSize === 'lg') setFontSize('xl')
                  }}
                  className={`p-1 rounded text-slate-800 hover:bg-slate-200 transition-colors ${fontSize === 'xl' ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <AArrowUp size={14} />
                </button>
              </div>
            </div>

            {/* HTML Reader Passage */}
            <div
              onClick={handleContentClick}
              onKeyDown={handleContentKeyDown}
              className={`prose max-w-none text-slate-900 font-serif select-text space-y-4 ${fontSizeClasses[fontSize]}`}
              dangerouslySetInnerHTML={{ __html: annotatedContentHtml }}
            />
          </div>
        </div>

        {/* ================= COLUMN 3 (RIGHT): Comprehension Quiz Section ================= */}
        {hasQuestions && (
          <div className="lg:col-span-4 xl:col-span-3 space-y-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:pl-1">
            <div className="neo-card p-5 bg-white border-3 sm:border-4 border-slate-900 shadow-[6px_6px_0px_0px_#000] rounded-2xl space-y-5">
              
              {/* Quiz Header & Score Info */}
              <div className="space-y-2 border-b-2 border-slate-900 pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                    <HelpCircle size={20} className="text-purple-700 shrink-0" />
                    <span>BÀI TẬP ĐỌC HIỂU</span>
                  </h2>
                  <span className="text-xs font-black px-2 py-0.5 bg-purple-100 text-purple-900 border border-slate-900 rounded-md">
                    {article.questions.length} câu
                  </span>
                </div>

                {/* Progress or Final Result */}
                {quizScore ? (
                  <div className="flex items-center justify-between bg-emerald-100 p-2.5 border border-slate-900 rounded-xl shadow-[1.5px_1.5px_0px_0px_#000]">
                    <span className="text-xs font-black text-emerald-950 flex items-center gap-1">
                      <Check size={16} /> Đã nộp bài
                    </span>
                    <span className="text-xs font-black px-2 py-0.5 bg-emerald-200 text-emerald-950 border border-slate-900 rounded-md">
                      {quizScore.score}/{quizScore.total} ({quizScore.percentage}%)
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600 bg-slate-50 p-2 border border-slate-300 rounded-lg">
                    <span>Tiến độ chọn đáp án:</span>
                    <span className="font-black text-slate-900">{answeredCount}/{article.questions.length}</span>
                  </div>
                )}
              </div>

              {/* Questions List */}
              <div className="space-y-5">
                {article.questions.map((q, idx) => (
                  <div key={q.id} className="p-3.5 bg-slate-50 border-2 border-slate-900 rounded-xl space-y-3 shadow-[2px_2px_0px_0px_#000]">
                    <h3 className="font-black text-xs sm:text-sm text-slate-900 leading-snug">
                      Câu {idx + 1}: {q.question_text}
                    </h3>

                    <div className="space-y-2">
                      {q.options?.map((opt, optionIndex) => {
                        const isSelected = quizAnswers[q.id] === opt.text
                        const isCorrect = opt.is_correct

                        let btnStyle = 'bg-white text-slate-900 border-slate-900 hover:bg-slate-100'
                        if (quizSubmitted) {
                          if (isCorrect) btnStyle = 'bg-emerald-200 text-emerald-950 border-slate-900 font-black'
                          else if (isSelected && !isCorrect) btnStyle = 'bg-rose-200 text-rose-950 border-slate-900'
                        } else if (isSelected) {
                          btnStyle = 'bg-[#fdc800] text-slate-900 border-slate-900 font-black'
                        }

                        return (
                          <Button
                            key={opt.text}
                            type="button"
                            variant="ghost"
                            onClick={() => handleSelectOption(q.id, opt.text)}
                            className={`w-full h-auto min-h-10 justify-start whitespace-normal p-2.5 text-left text-xs font-bold border-2 rounded-xl transition-all shadow-[1.5px_1.5px_0px_0px_#000] cursor-pointer ${btnStyle}`}
                          >
                            <span className="mr-1.5 shrink-0 font-black">
                              {String.fromCharCode(65 + optionIndex)}.
                            </span>
                            <span className="min-w-0 break-words">{opt.text}</span>
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Submit Quiz Action Button */}
              {!quizSubmitted && (
                <Button
                  type="button"
                  onClick={handleSubmitQuiz}
                  className="neo-button w-full py-3 h-11 bg-[#fdc800] hover:bg-amber-300 active:translate-y-0.5 text-slate-900 font-black text-xs sm:text-sm border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-transform"
                >
                  <CheckCircle2 size={18} />
                  <span>Nộp Bài Đọc Hiểu</span>
                </Button>
              )}
            </div>
          </div>
        )}

      </div>

      {selectedTerm && (
        <ReadingVocabularyPopover
          term={selectedTerm}
          position={termPopoverPosition}
          onClose={() => setSelectedTerm(null)}
        />
      )}

      {/* Pro Modal */}
      <ReadingProModal
        open={proModalOpen}
        onClose={() => setProModalOpen(false)}
        reason={proModalReason}
      />
    </div>
  )
}

export default ReadingDetailPage

