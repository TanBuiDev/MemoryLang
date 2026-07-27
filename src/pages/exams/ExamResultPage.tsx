import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Filter,
  Headphones,
  HelpCircle,
  Languages,
  Lightbulb,
  PenTool,
  RotateCcw,
  Sparkles,
  Target,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { examPracticeService } from '@/services/supabase/examPractice.service'
import type { B1AttemptQuestionReview } from '@/types/exam.types'

function getReviews(sections: Array<{ progress: Record<string, unknown> }>): B1AttemptQuestionReview[] {
  return sections
    .flatMap((section) => (Array.isArray(section.progress.review) ? section.progress.review : []))
    .filter(
      (review): review is B1AttemptQuestionReview =>
        Boolean(review) &&
        typeof review === 'object' &&
        typeof (review as B1AttemptQuestionReview).question_source_key === 'string',
    )
}

function getSectionTitle(sourceKey: string) {
  const cleanKey = sourceKey.replace(/^section-\d+-/i, '')

  if (cleanKey === 'grammar-use-of-english' || cleanKey === 'grammar') return 'Grammar'
  if (cleanKey === 'signs') return 'Signs'
  if (cleanKey === 'sentence-transformation') return 'Sentence Transformation'
  if (cleanKey.startsWith('listening-text-')) {
    const textNum = cleanKey.replace('listening-text-', '').replace(/-/g, ' ')
    return `Listening Text ${textNum}`
  }
  if (cleanKey.startsWith('reading-text-')) {
    const textNum = cleanKey.replace('reading-text-', '').replace(/-/g, ' ')
    return `Reading Text ${textNum}`
  }
  if (cleanKey.startsWith('cloze-text-')) {
    const textNum = cleanKey.replace('cloze-text-', '').replace(/-/g, ' ')
    return `Cloze Text ${textNum}`
  }
  return cleanKey
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function getSkillIcon(sourceKey: string) {
  const cleanKey = sourceKey.replace(/^section-\d+-/i, '')
  if (cleanKey.startsWith('listening')) return Headphones
  if (cleanKey.startsWith('reading') || cleanKey.startsWith('cloze')) return BookOpen
  if (cleanKey === 'sentence-transformation') return Sparkles
  if (cleanKey.startsWith('writing')) return PenTool
  return BookOpen
}

function formatTime(totalSeconds: number) {
  if (!totalSeconds || totalSeconds <= 0) return '00:00'
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

interface ParsedTransformation {
  originalSentence: string
  keyword: string | null
  prefixText: string
  suffixText: string
}

function parseTransformationPrompt(promptText: string): ParsedTransformation | null {
  if (!promptText) return null
  const lines = promptText.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return null

  const line1 = lines[0]
  const line2 = lines[1]

  let keyword: string | null = null
  let originalSentence = line1
  const keywordMatch = line1.match(/\(([^)]+)\)\s*$/)
  if (keywordMatch) {
    keyword = keywordMatch[1]
    originalSentence = line1.replace(/\(([^)]+)\)\s*$/, '').trim()
  }

  const gapSplitter = /[\u2026]|\.{3,}|_{3,}/
  const parts = line2.split(gapSplitter)
  const prefixText = parts[0]?.trim() ?? ''
  const suffixText = parts.slice(1).join(' ').trim()

  return { originalSentence, keyword, prefixText, suffixText }
}

export function ExamResultPage() {
  const { attemptId = '' } = useParams()
  const navigate = useNavigate()
  const [activeFilter, setActiveFilter] = useState<'all' | 'correct' | 'incorrect'>('all')
  const [selectedSectionKey, setSelectedSectionKey] = useState<string | null>(null)

  const attemptQuery = useQuery({
    queryKey: ['b1-exam-attempt', attemptId],
    queryFn: () => examPracticeService.getAttempt(attemptId),
    enabled: Boolean(attemptId),
  })

  if (attemptQuery.isLoading) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <div className="neo-card animate-pulse p-10 text-center font-black text-lg">
          Đang tải kết quả bài thi...
        </div>
      </div>
    )
  }

  if (attemptQuery.isError || !attemptQuery.data) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <div className="neo-card p-10 text-center space-y-4">
          <p className="font-black text-lg text-danger">Không tìm thấy kết quả bài làm.</p>
          <Button asChild variant="secondary">
            <Link to="/app/exams">
              <ArrowLeft size={16} /> Quay lại danh sách đề
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  if (attemptQuery.data.attempt.status !== 'submitted') {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <div className="neo-card p-10 text-center space-y-4">
          <p className="font-black text-lg">Bài thi này chưa được nộp.</p>
          <Button onClick={() => navigate(`/app/exams/attempt/${attemptId}`)} variant="primary">
            Quay lại tiếp tục làm bài
          </Button>
        </div>
      </div>
    )
  }

  const { attempt, sections } = attemptQuery.data
  const reviews = getReviews(sections)
  const score = sections.reduce((total, s) => total + Number(s.score ?? 0), 0)
  const maxScore = sections.reduce((total, s) => total + Number(s.max_score ?? 0), 0)
  const accuracyPct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
  const correctCount = reviews.filter((r) => r.is_correct).length
  const incorrectCount = reviews.filter((r) => !r.is_correct && r.user_answer?.trim()).length
  const unansweredCount = reviews.filter((r) => !r.user_answer?.trim()).length

  // Build a map of question options from exam_snapshot if available
  const questionOptionsMap: Record<string, Array<{ key: string; text: string }>> = {}
  if (attempt?.exam_snapshot && typeof attempt.exam_snapshot === 'object') {
    const snapshot = attempt.exam_snapshot as Record<string, unknown>
    if (Array.isArray(snapshot.resources)) {
      snapshot.resources.forEach((res: Record<string, unknown>) => {
        if (Array.isArray(res.questions)) {
          res.questions.forEach((q: Record<string, unknown>) => {
            if (typeof q.source_key === 'string' && Array.isArray(q.options)) {
              questionOptionsMap[q.source_key] = q.options as Array<{ key: string; text: string }>
            }
          })
        }
      })
    }
  }

  const reviewGroups = sections
    .map((section) => {
      const sectionReviews = reviews.filter((r) => r.section_source_key === section.exam_section_source_key)
      return {
        sourceKey: section.exam_section_source_key,
        score: Number(section.score ?? 0),
        maxScore: Number(section.max_score ?? 0),
        reviews: sectionReviews,
        draftContent: typeof section.progress?.draft_content === 'string' ? section.progress.draft_content : null,
      }
    })
    .filter((group) => group.reviews.length > 0 || Boolean(group.draftContent))

  // Requirement #2: Default selectedSectionKey to the FIRST section if not set explicitly
  const effectiveSectionKey = selectedSectionKey ?? (reviewGroups[0]?.sourceKey ?? null)
  const activeSectionFilter = effectiveSectionKey === 'ALL_SECTIONS' ? null : effectiveSectionKey

  const filteredGroups = reviewGroups
    .filter((group) => !activeSectionFilter || group.sourceKey === activeSectionFilter)
    .map((group) => ({
      ...group,
      reviews: group.reviews.filter((r) => {
        if (activeFilter === 'correct') return r.is_correct
        if (activeFilter === 'incorrect') return !r.is_correct
        return true
      }),
    }))
    .filter((group) => group.reviews.length > 0 || Boolean(group.draftContent))

  const scrollToQuestion = (sourceKey: string) => {
    const el = document.getElementById(`review-q-${sourceKey}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-12">
      {/* Top Header Hero Banner */}
      <header className="neo-card bg-primary p-6 sm:p-8 space-y-4 shadow-[5px_5px_0_var(--border)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-background text-foreground font-black text-xs uppercase tracking-wider border-2 border-border shadow-[2px_2px_0_var(--border)]">
              <Award size={14} className="text-secondary" /> ĐỀ THI THỬ B1 CEFR
            </span>
            <h1 className="mt-2 text-3xl sm:text-4xl font-black text-primary-foreground leading-tight">
              Kết quả bài thi thử
            </h1>
            <p className="mt-1 text-xs sm:text-sm font-bold text-primary-foreground/90">
              Đã hoàn thành lúc:{' '}
              {attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleString('vi-VN') : 'Vừa xong'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button asChild variant="secondary" className="font-black shadow-[3px_3px_0_var(--border)]">
              <Link to="/app/exams">
                <ArrowLeft size={16} /> Quay lại danh sách đề
              </Link>
            </Button>
            <Button
              onClick={() => navigate(`/app/exams/attempt/${attemptId}`)}
              variant="primary"
              className="font-black shadow-[3px_3px_0_var(--border)]"
            >
              <RotateCcw size={16} /> Làm lại bài thi
            </Button>
          </div>
        </div>
      </header>

      {/* Performance Summary Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Score */}
        <div className="neo-card p-5 bg-card space-y-2 shadow-[3px_3px_0_var(--border)]">
          <span className="text-xs font-black uppercase text-muted-foreground flex items-center gap-1.5">
            <Target size={15} className="text-secondary" /> Điểm khách quan
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-foreground">{score}</span>
            <span className="text-lg font-bold text-muted-foreground">/ {maxScore} điểm</span>
          </div>
          <div className="w-full bg-muted border border-border h-2.5 overflow-hidden">
            <div
              className="bg-secondary h-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, accuracyPct))}%` }}
            />
          </div>
        </div>

        {/* Card 2: Accuracy Percentage */}
        <div className="neo-card p-5 bg-card space-y-2 shadow-[3px_3px_0_var(--border)]">
          <span className="text-xs font-black uppercase text-muted-foreground flex items-center gap-1.5">
            <Award size={15} className="text-secondary" /> Tỷ lệ chính xác
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-secondary">{accuracyPct}%</span>
          </div>
          <span
            className={`inline-block text-[11px] font-black uppercase px-2 py-0.5 border border-border ${
              accuracyPct >= 80
                ? 'bg-secondary text-secondary-foreground'
                : accuracyPct >= 60
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-danger text-white'
            }`}
          >
            {accuracyPct >= 80 ? 'Xuất sắc' : accuracyPct >= 60 ? 'Đạt chuẩn B1' : 'Cần luyện thêm'}
          </span>
        </div>

        {/* Card 3: Questions Breakdown */}
        <div className="neo-card p-5 bg-card space-y-2 shadow-[3px_3px_0_var(--border)]">
          <span className="text-xs font-black uppercase text-muted-foreground flex items-center gap-1.5">
            <HelpCircle size={15} className="text-secondary" /> Chi tiết kết quả
          </span>
          <div className="grid grid-cols-3 gap-1.5 text-center text-xs font-black pt-1">
            <div className="border border-border bg-secondary/15 p-1.5">
              <span className="text-secondary block text-lg">{correctCount}</span>
              <span className="text-[10px] text-muted-foreground uppercase">Đúng</span>
            </div>
            <div className="border border-border bg-danger/15 p-1.5">
              <span className="text-danger block text-lg">{incorrectCount}</span>
              <span className="text-[10px] text-muted-foreground uppercase">Sai</span>
            </div>
            <div className="border border-border bg-muted p-1.5">
              <span className="text-foreground block text-lg">{unansweredCount}</span>
              <span className="text-[10px] text-muted-foreground uppercase">Trống</span>
            </div>
          </div>
        </div>

        {/* Card 4: Elapsed Time */}
        <div className="neo-card p-5 bg-card space-y-2 shadow-[3px_3px_0_var(--border)]">
          <span className="text-xs font-black uppercase text-muted-foreground flex items-center gap-1.5">
            <Clock size={15} className="text-secondary" /> Thời gian làm bài
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-foreground">{formatTime(attempt.elapsed_seconds)}</span>
          </div>
          {attempt.overtime_seconds > 0 ? (
            <span className="text-[11px] font-bold text-danger">
              (Quá giờ {formatTime(attempt.overtime_seconds)})
            </span>
          ) : (
            <span className="text-[11px] font-bold text-secondary">Hoàn thành đúng giờ</span>
          )}
        </div>
      </div>

      {/* Main Content Layout: Left Sidebar Jumper + Right Review List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sticky Sidebar (3 cols on desktop) */}
        <aside className="lg:col-span-3 space-y-5 lg:sticky lg:top-4">
          {/* Quick Filter Control */}
          <div className="neo-card p-4 space-y-3 bg-card shadow-[3px_3px_0_var(--border)]">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase text-secondary border-b-2 border-border pb-2">
              <Filter size={14} /> Lọc kết quả
            </div>
            <div className="grid grid-cols-3 gap-1 text-xs font-black">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`py-1.5 border border-border transition-all cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-secondary text-secondary-foreground shadow-[2px_2px_0_var(--border)]'
                    : 'bg-background hover:bg-muted text-foreground'
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('incorrect')}
                className={`py-1.5 border border-border transition-all cursor-pointer ${
                  activeFilter === 'incorrect'
                    ? 'bg-danger text-white shadow-[2px_2px_0_var(--border)]'
                    : 'bg-background hover:bg-muted text-foreground'
                }`}
              >
                Sai ({incorrectCount + unansweredCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('correct')}
                className={`py-1.5 border border-border transition-all cursor-pointer ${
                  activeFilter === 'correct'
                    ? 'bg-secondary text-secondary-foreground shadow-[2px_2px_0_var(--border)]'
                    : 'bg-background hover:bg-muted text-foreground'
                }`}
              >
                Đúng ({correctCount})
              </button>
            </div>
          </div>

          {/* Section Selector */}
          <div className="neo-card p-4 space-y-3 bg-card shadow-[3px_3px_0_var(--border)]">
            <div className="flex items-center justify-between border-b-2 border-border pb-2">
              <span className="text-xs font-black uppercase text-secondary flex items-center gap-1.5">
                <BookOpen size={14} /> Các phần thi ({reviewGroups.length})
              </span>
              {effectiveSectionKey !== 'ALL_SECTIONS' && (
                <button
                  type="button"
                  onClick={() => setSelectedSectionKey('ALL_SECTIONS')}
                  className="text-[11px] font-black text-secondary underline hover:no-underline"
                >
                  Xem tất cả
                </button>
              )}
            </div>

            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {reviewGroups.map((group) => {
                const Icon = getSkillIcon(group.sourceKey)
                const isSelected = effectiveSectionKey === group.sourceKey
                return (
                  <button
                    key={group.sourceKey}
                    type="button"
                    onClick={() => setSelectedSectionKey(group.sourceKey)}
                    className={`w-full p-2 text-left border-2 border-border font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-secondary text-secondary-foreground shadow-[2px_2px_0_var(--border)]'
                        : 'bg-background hover:bg-muted/60 text-foreground'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <Icon size={13} className="shrink-0" />
                      <span className="truncate">{getSectionTitle(group.sourceKey)}</span>
                    </span>
                    <span className="shrink-0 font-black text-[11px]">
                      {group.score}/{group.maxScore}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Question Jumper Grid */}
          <div className="neo-card p-4 space-y-3 bg-card shadow-[3px_3px_0_var(--border)]">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase text-secondary border-b-2 border-border pb-2">
              <HelpCircle size={14} /> Bảng câu hỏi ({reviews.length})
            </div>
            <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5 max-h-64 overflow-y-auto p-0.5">
              {reviews.map((review, idx) => {
                const isMatchFilter =
                  activeFilter === 'all' ||
                  (activeFilter === 'correct' && review.is_correct) ||
                  (activeFilter === 'incorrect' && !review.is_correct)

                return (
                  <button
                    key={review.question_source_key}
                    type="button"
                    disabled={!isMatchFilter}
                    onClick={() => scrollToQuestion(review.question_source_key)}
                    className={`h-9 border-2 border-border font-black text-xs flex items-center justify-center transition-all cursor-pointer ${
                      !isMatchFilter
                        ? 'opacity-30 cursor-not-allowed bg-muted text-muted-foreground'
                        : review.is_correct
                          ? 'bg-secondary text-secondary-foreground hover:brightness-110 shadow-[1.5px_1.5px_0_var(--border)]'
                          : review.user_answer?.trim()
                            ? 'bg-danger text-white hover:brightness-110 shadow-[1.5px_1.5px_0_var(--border)]'
                            : 'bg-muted text-foreground hover:bg-muted/80 shadow-[1.5px_1.5px_0_var(--border)]'
                    }`}
                  >
                    {idx + 1}
                  </button>
                )
              })}
            </div>
          </div>
        </aside>

        {/* Right Main Review Feed (9 cols on desktop) */}
        <main className="lg:col-span-9 space-y-8">
          {filteredGroups.length === 0 ? (
            <div className="neo-card p-8 text-center font-bold text-muted-foreground space-y-2">
              <p className="text-base">Không có câu hỏi nào khớp với bộ lọc hiện tại.</p>
              <Button onClick={() => setActiveFilter('all')} variant="ghost" className="font-black">
                Bỏ bộ lọc
              </Button>
            </div>
          ) : (
            filteredGroups.map((group) => {
              const Icon = getSkillIcon(group.sourceKey)
              return (
                <section key={group.sourceKey} className="space-y-4">
                  {/* Section Header */}
                  <header className="neo-card flex flex-wrap items-center justify-between gap-3 bg-muted p-4 border-2 border-border shadow-[3px_3px_0_var(--border)]">
                    <div className="flex items-center gap-2">
                      <Icon size={20} className="text-secondary" />
                      <h2 className="text-xl font-black text-foreground">{getSectionTitle(group.sourceKey)}</h2>
                    </div>
                    <span className="text-sm font-black bg-background text-secondary px-3 py-1 border-2 border-border shadow-[2px_2px_0_var(--border)]">
                      Điểm phần này: {group.score}/{group.maxScore}
                    </span>
                  </header>

                  {/* Submitted Prompt Response (Writing / Speaking Draft) */}
                  {group.draftContent && (
                    <article className="neo-card p-5 bg-card space-y-3 border-2 border-border shadow-[3px_3px_0_var(--border)]">
                      <div className="flex items-center gap-2 text-xs font-black uppercase text-secondary border-b-2 border-border pb-2">
                        <PenTool size={14} /> Bài tự luận đã nộp của bạn
                      </div>
                      <div className="border-2 border-border bg-muted/40 p-4 font-semibold text-sm leading-relaxed whitespace-pre-wrap">
                        {group.draftContent}
                      </div>
                    </article>
                  )}

                  {/* Question Review List */}
                  {group.reviews.map((review, index) => {
                    const parsedTransformation = parseTransformationPrompt(review.question)
                    const questionOptions = questionOptionsMap[review.question_source_key] ?? []

                    return (
                      <article
                        key={review.question_source_key}
                        id={`review-q-${review.question_source_key}`}
                        className={`neo-card p-5 sm:p-6 bg-card space-y-4 border-2 transition-all shadow-[3px_3px_0_var(--border)] ${
                          review.is_correct ? 'border-secondary' : 'border-danger'
                        }`}
                      >
                        {/* Question Top Info Bar */}
                        <div className="flex items-start justify-between gap-3 border-b-2 border-border/40 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider text-secondary bg-muted px-2.5 py-0.5 border border-border">
                              <HelpCircle size={13} /> Câu {index + 1}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 text-xs font-black px-2.5 py-0.5 border border-border ${
                                review.is_correct
                                  ? 'bg-secondary/15 text-secondary'
                                  : 'bg-danger/15 text-danger'
                              }`}
                            >
                              {review.is_correct ? (
                                <>
                                  <CheckCircle2 size={13} /> Đúng (+1.0đ)
                                </>
                              ) : (
                                <>
                                  <XCircle size={13} /> Chưa đúng (0.0đ)
                                </>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Question Content */}
                        {parsedTransformation ? (
                          /* Sentence Transformation 2-Line Format */
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2 text-base font-bold text-foreground">
                              <span>{parsedTransformation.originalSentence}</span>
                              {parsedTransformation.keyword && (
                                <span className="inline-flex items-center font-black text-xs text-secondary bg-secondary/15 px-2 py-0.5 border border-border">
                                  ({parsedTransformation.keyword})
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-baseline gap-2 pt-1 font-semibold text-base italic">
                              <span className="font-mono font-black text-secondary text-xl not-italic select-none">↳</span>
                              {parsedTransformation.prefixText && <span>{parsedTransformation.prefixText}</span>}
                              <span
                                className={`font-black underline px-2 py-0.5 border border-border not-italic ${
                                  review.is_correct
                                    ? 'bg-secondary/15 text-secondary'
                                    : 'bg-danger/15 text-danger'
                                }`}
                              >
                                {review.user_answer || '(Chưa trả lời)'}
                              </span>
                              {parsedTransformation.suffixText && <span>{parsedTransformation.suffixText}</span>}

                              {!review.is_correct && (
                                <span className="ml-2 font-black text-xs bg-yellow-300 text-black border-2 border-black px-2 py-0.5 not-italic shadow-[1.5px_1.5px_0_#000]">
                                  Đáp án chuẩn: {[...review.correct_option_keys, ...review.accepted_answers].join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          /* Standard Question Prompt */
                          <h3 className="text-base font-black leading-snug text-foreground whitespace-pre-wrap">
                            {review.question}
                          </h3>
                        )}

                        {/* Requirement #1: Options List with Yellow Highlight on Correct Answer (Matching PDF!) */}
                        {questionOptions.length > 0 ? (
                          <div
                            className={`grid gap-2.5 pt-2 ${
                              questionOptions.every((opt) => (opt.text ?? '').trim().length <= 35)
                                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                                : 'grid-cols-1 sm:grid-cols-2'
                            }`}
                          >
                            {questionOptions.map((option) => {
                              const isCorrectOption = review.correct_option_keys.includes(option.key)
                              const isUserChoice = review.user_answer === option.key
                              const isUserChoiceWrong = isUserChoice && !review.is_correct

                              return (
                                <div
                                  key={option.key}
                                  className={`p-2.5 text-left border-2 font-black text-sm flex items-center gap-2.5 transition-all select-none ${
                                    isCorrectOption
                                      ? 'bg-yellow-300 text-black border-black shadow-[2.5px_2.5px_0_#000]'
                                      : isUserChoiceWrong
                                        ? 'bg-danger/15 text-danger border-danger line-through opacity-80'
                                        : 'bg-background text-foreground border-border opacity-70'
                                  }`}
                                >
                                  <span
                                    className={`shrink-0 w-6 h-6 border-2 flex items-center justify-center text-xs font-black rounded-xs ${
                                      isCorrectOption
                                        ? 'bg-black text-yellow-300 border-black'
                                        : isUserChoiceWrong
                                          ? 'bg-danger text-white border-danger'
                                          : 'bg-muted text-foreground border-border'
                                    }`}
                                  >
                                    {option.key}
                                  </span>
                                  <span className="leading-snug truncate">{option.text}</span>
                                  {isCorrectOption && (
                                    <span className="ml-auto text-[11px] bg-black text-yellow-300 font-black px-1.5 py-0.5 rounded-xs shrink-0">
                                      Đáp án đúng
                                    </span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        ) : !parsedTransformation ? (
                          /* Fallback for Fill Blank without options array */
                          <div className="grid gap-3 sm:grid-cols-2 pt-1 text-xs font-semibold">
                            <div
                              className={`border-2 p-3 space-y-1 ${
                                review.is_correct
                                  ? 'border-secondary/40 bg-secondary/5'
                                  : 'border-danger/40 bg-danger/5'
                              }`}
                            >
                              <span className="font-black text-muted-foreground uppercase text-[11px] block">
                                Bạn đã trả lời:
                              </span>
                              <span
                                className={`text-sm font-black ${
                                  review.is_correct ? 'text-secondary' : 'text-danger'
                                }`}
                              >
                                {review.user_answer || 'Chưa trả lời'}
                              </span>
                            </div>

                            <div className="border-2 border-yellow-400 bg-yellow-300 text-black p-3 space-y-1 shadow-[2px_2px_0_#000]">
                              <span className="font-black uppercase text-[11px] block">
                                Đáp án chính xác:
                              </span>
                              <span className="text-sm font-black">
                                {[...review.correct_option_keys, ...review.accepted_answers].join(', ') || 'Chưa có'}
                              </span>
                            </div>
                          </div>
                        ) : null}

                        {/* Translation Section */}
                        {review.translation && (
                          <div className="border-2 border-border bg-muted/40 p-3.5 space-y-1 text-xs">
                            <div className="flex items-center gap-1.5 font-black text-secondary uppercase tracking-wider text-[11px]">
                              <Languages size={14} /> Dịch nghĩa
                            </div>
                            <p className="font-semibold text-foreground leading-relaxed whitespace-pre-wrap">
                              {review.translation}
                            </p>
                          </div>
                        )}

                        {/* Explanation Section */}
                        {review.explanation && (
                          <div className="border-2 border-border bg-primary/10 p-3.5 space-y-1 text-xs">
                            <div className="flex items-center gap-1.5 font-black text-foreground uppercase tracking-wider text-[11px]">
                              <Lightbulb size={14} className="text-secondary" /> Lời giải chi tiết
                            </div>
                            <p className="font-semibold text-foreground leading-relaxed whitespace-pre-wrap">
                              {review.explanation}
                            </p>
                          </div>
                        )}
                      </article>
                    )
                  })}
                </section>
              )
            })
          )}
        </main>
      </div>
    </div>
  )
}
