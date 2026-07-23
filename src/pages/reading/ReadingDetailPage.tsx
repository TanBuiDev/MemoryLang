import { useEffect, useState, useRef } from 'react'
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { readingService } from '@/services/supabase/reading.service'
import { useAuthStore } from '@/stores/useAuthStore'
import type {
  QuizAnswer,
  ReadingArticleDetail,
  ReadingAttempt,
} from '@/types/reading.types'
import { VocabularyPopup } from '@/components/reading/VocabularyPopup'
import { ReadingProModal } from '@/components/reading/ReadingProModal'
import { showToast } from '@/components/ui/toast'
import { generateAudio } from '@/services/api/generateAudio.api'

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
  const isPro = Boolean(profile?.is_admin)

  const [article, setArticle] = useState<ReadingArticleDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState<ReadingAttempt | null>(null)
  
  // Vocabulary popup state
  const [selectedWord, setSelectedWord] = useState<string | null>(null)
  const [clickedWordsCount, setClickedWordsCount] = useState(0)

  // Pro Modal state
  const [proModalOpen, setProModalOpen] = useState(false)
  const [proModalReason, setProModalReason] = useState('')

  // Audio Player State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [audioSpeed, setAudioSpeed] = useState<number>(1.0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

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

  // Audio play/pause handler
  const handleToggleAudio = async () => {
    if (article?.access_tier === 'pro' && !isPro) {
      setProModalReason('Audio TTS cho bài đọc này dành riêng cho thành viên Pro.')
      setProModalOpen(true)
      return
    }

    if (!audioUrl && article?.plain_text) {
      try {
        showToast({ type: 'info', title: 'Đang tạo âm thanh TTS...' })
        const res = await generateAudio(article.plain_text.slice(0, 300), 'en-US')
        if (res.audioUrl) {
          setAudioUrl(res.audioUrl)
          const newAudio = new Audio(res.audioUrl)
          audioRef.current = newAudio
          newAudio.play()
          setIsPlayingAudio(true)
        }
      } catch (err) {
        console.error(err)
      }
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

  // Handle word click inside reading content
  const handleContentClick = () => {
    const selection = window.getSelection()
    const text = selection?.toString().trim()

    if (text && text.split(/\s+/).length === 1) {
      // Free user limit check (max 5 word lookups per article)
      if (!isPro && clickedWordsCount >= 5) {
        setProModalReason('Bạn đã đạt giới hạn 5 lần tra từ trên bài đọc Free. Nâng cấp Pro để tra từ không giới hạn!')
        setProModalOpen(true)
        return
      }

      setSelectedWord(text)
      setClickedWordsCount((prev) => prev + 1)

      // Update attempt clicked words
      if (attempt) {
        void readingService.updateAttempt(attempt.id, {
          words_clicked: Array.from(new Set([...(attempt.words_clicked || []), text])),
        })
      }
    }
  }

  // Handle Quiz answer select
  const handleSelectOption = (questionId: string, optionText: string) => {
    if (quizSubmitted) return
    setQuizAnswers((prev) => ({ ...prev, [questionId]: optionText }))
  }

  // Submit Quiz
  const handleSubmitQuiz = async () => {
    if (!article || !attempt || quizSubmitted) return

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

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Button
          asChild
          variant="ghost"
          className="neo-button px-3 py-1.5 h-9 bg-white text-slate-900 font-black text-xs border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-xl"
        >
          <Link to="/app/reading" className="flex items-center gap-1.5">
            <ArrowLeft size={16} />
            <span>Thư viện bài đọc</span>
          </Link>
        </Button>
      </div>

      {/* Article Header Card */}
      <div className="neo-card p-6 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_#000] rounded-2xl space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-lg bg-[#fdc800] text-slate-900 border border-slate-900 shadow-[1px_1px_0px_0px_#000]">
            Level {article.cefr_level}
          </span>
          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-slate-900">
            {article.purpose}
          </span>
          {article.access_tier === 'pro' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-slate-900 text-[10px] font-black uppercase shadow-[1px_1px_0px_0px_#000]">
              <Lock size={11} />
              Pro
            </span>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{article.title}</h1>
        {article.subtitle && <p className="text-sm font-bold text-slate-600">{article.subtitle}</p>}

        <div className="pt-2 flex items-center gap-4 text-xs font-bold text-slate-500 border-t border-slate-200">
          <span className="flex items-center gap-1">
            <FileText size={14} />
            {article.word_count} từ
          </span>
          <span className="flex items-center gap-1">
            <Clock size={14} />
            ~{article.estimated_reading_time} phút
          </span>
        </div>
      </div>

      {/* Sticky Audio Player */}
      <div className="sticky top-20 z-30 neo-card p-4 bg-amber-100 border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            type="button"
            onClick={handleToggleAudio}
            className="neo-button p-2.5 h-10 w-10 min-h-0 bg-[#fdc800] text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-xl flex items-center justify-center cursor-pointer shrink-0"
          >
            {isPlayingAudio ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
          </Button>
          <div>
            <p className="text-xs font-black text-slate-900">Âm thanh phát bài đọc (TTS)</p>
            <p className="text-[10px] font-bold text-slate-700">Nghe kết hợp highlight câu đang đọc</p>
          </div>
        </div>

        {/* Speed select */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
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
      </div>

      {/* Main Article Content Reader */}
      <div className="neo-card p-6 sm:p-8 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_#000] rounded-2xl space-y-6">
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2">
          <span className="text-xs font-black uppercase text-slate-500 flex items-center gap-1.5">
            <BookOpen size={16} />
            Bấm vào từ bất kỳ để tra nghĩa nhanh
          </span>
        </div>

        {/* HTML Reader */}
        <div
          onClick={handleContentClick}
          className="prose max-w-none text-slate-900 leading-relaxed font-serif text-base sm:text-lg select-text space-y-4"
          dangerouslySetInnerHTML={{ __html: article.content_html }}
        />
      </div>

      {/* Comprehension Quiz Section */}
      {article.questions && article.questions.length > 0 && (
        <div className="neo-card p-6 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_#000] rounded-2xl space-y-6">
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <HelpCircle size={20} className="text-purple-700" />
              <span>BÀI TẬP ĐỌC HIỂU ({article.questions.length} câu)</span>
            </h2>
            {quizScore && (
              <span className="text-xs font-black px-3 py-1 bg-emerald-100 text-emerald-900 border border-slate-900 rounded-lg shadow-[1px_1px_0px_0px_#000]">
                Điểm: {quizScore.score}/{quizScore.total} ({quizScore.percentage}%)
              </span>
            )}
          </div>

          <div className="space-y-6">
            {article.questions.map((q, idx) => (
              <div key={q.id} className="p-4 bg-slate-50 border-2 border-slate-900 rounded-xl space-y-3 shadow-[2px_2px_0px_0px_#000]">
                <h3 className="font-black text-sm text-slate-900">
                  Câu {idx + 1}: {q.question_text}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {q.options?.map((opt) => {
                    const isSelected = quizAnswers[q.id] === opt.text
                    const isCorrect = opt.is_correct

                    let btnStyle = 'bg-white text-slate-900 border-slate-900'
                    if (quizSubmitted) {
                      if (isCorrect) btnStyle = 'bg-emerald-200 text-emerald-950 border-slate-900 font-black'
                      else if (isSelected && !isCorrect) btnStyle = 'bg-rose-200 text-rose-950 border-slate-900'
                    } else if (isSelected) {
                      btnStyle = 'bg-[#fdc800] text-slate-900 border-slate-900 font-black'
                    }

                    return (
                      <button
                        key={opt.text}
                        type="button"
                        onClick={() => handleSelectOption(q.id, opt.text)}
                        className={`neo-button p-3 text-left text-xs font-bold border-2 rounded-xl transition-all shadow-[1.5px_1.5px_0px_0px_#000] cursor-pointer ${btnStyle}`}
                      >
                        <span>{opt.text}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {!quizSubmitted && (
            <Button
              type="button"
              onClick={handleSubmitQuiz}
              disabled={Object.keys(quizAnswers).length < article.questions.length}
              className="neo-button w-full py-3 h-11 bg-[#fdc800] hover:bg-amber-300 text-slate-900 font-black text-sm border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 size={18} />
              <span>Nộp Bài Đọc Hiểu</span>
            </Button>
          )}
        </div>
      )}

      {/* Vocabulary Popup */}
      {selectedWord && (
        <VocabularyPopup
          word={selectedWord}
          onClose={() => setSelectedWord(null)}
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
