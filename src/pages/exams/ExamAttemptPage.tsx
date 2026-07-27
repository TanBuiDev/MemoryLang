import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CornerDownRight,
  Edit3,
  FileEdit,
  FileText,
  Headphones,
  HelpCircle,
  Layers,
  ListChecks,
  PenTool,
  Save,
  Send,
  Sparkles,
} from 'lucide-react'
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { showToast } from '@/components/ui/toast'
import { formatExamDuration, getAttemptTimerState } from '@/features/exam-practice/examTimer'
import { examPracticeService } from '@/services/supabase/examPractice.service'
import type { PracticeDraftVersion, PracticeQuestionType } from '@/types/exam.types'

interface SnapshotQuestion {
  source_key: string
  source_number?: string
  question_type?: PracticeQuestionType
  prompt: string
  image_url?: string | null
  options?: Array<{ key: string; text: string }>
}

interface SnapshotResource {
  id: string
  activity_type?: string
  prompt?: string
  instructions?: string | null
  content?: string | null
  passage?: string | null
  audio_url?: string | null
  questions?: SnapshotQuestion[]
}

interface SnapshotSection {
  source_key: string
  skill: string
  title: string
  resource_type: 'activity' | 'prompt'
  resource: SnapshotResource
}

function getSections(snapshot: Record<string, unknown>): SnapshotSection[] {
  const sections = snapshot.sections
  return Array.isArray(sections)
    ? sections.filter(
        (section): section is SnapshotSection =>
          Boolean(section) &&
          typeof section === 'object' &&
          typeof (section as SnapshotSection).source_key === 'string' &&
          typeof (section as SnapshotSection).resource === 'object',
      )
    : []
}

function getExamTitle(snapshot: Record<string, unknown>) {
  const exam = snapshot.exam
  return exam && typeof exam === 'object' && typeof (exam as { title?: unknown }).title === 'string'
    ? (exam as { title: string }).title
    : 'Đề thi thử B1'
}

function answerPlaceholder(question: SnapshotQuestion) {
  return question.question_type === 'fill_blank' ? 'Điền đáp án của bạn...' : 'Nhập câu trả lời...'
}

function getSkillBadgeLabel(skill: string) {
  switch (skill.toLowerCase()) {
    case 'grammar':
    case 'grammar-use-of-english':
      return { label: 'Grammar & Vocabulary', icon: FileText }
    case 'reading':
    case 'signs':
    case 'cloze':
      return { label: 'Reading', icon: BookOpen }
    case 'listening':
      return { label: 'Listening', icon: Headphones }
    case 'writing':
    case 'speaking':
    case 'transformation':
      return { label: 'Writing & Speaking', icon: PenTool }
    default:
      return { label: skill, icon: FileText }
  }
}

export function ExamAttemptPage() {
  const { attemptId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const mainRef = useRef<HTMLElement>(null)
  const questionRefs = useRef<Record<string, HTMLElement | null>>({})
  const overtimeWarningShown = useRef(false)
  const progressHydrated = useRef(false)

  const [now, setNow] = useState(() => new Date())
  const [activeSectionIndex, setActiveSectionIndex] = useState(0)
  const [draftContent, setDraftContent] = useState('')
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({})
  const [compareLeft, setCompareLeft] = useState('')
  const [compareRight, setCompareRight] = useState('')
  const [submitConfirmationOpen, setSubmitConfirmationOpen] = useState(false)
  const attemptQuery = useQuery({
    queryKey: ['b1-exam-attempt', attemptId],
    queryFn: () => examPracticeService.getAttempt(attemptId),
    enabled: Boolean(attemptId),
  })

  const attemptDetail = attemptQuery.data
  const sections = useMemo(
    () => (attemptDetail ? getSections(attemptDetail.attempt.exam_snapshot) : []),
    [attemptDetail],
  )
  const activeSection = sections[activeSectionIndex]
  const activeResource = activeSection?.resource
  const activeProgress = attemptDetail?.sections.find(
    (section) => section.exam_section_source_key === activeSection?.source_key,
  )
  const isPrompt = activeSection?.resource_type === 'prompt'
  const isFillBlankActivity =
    activeResource?.activity_type === 'fill_blank' ||
    (activeResource?.questions ?? []).every((q) => !q.options || q.options.length === 0)
  const isInlineGapActivity =
    isFillBlankActivity &&
    Boolean(
      (activeResource?.passage && /(\(\d+\)\s*_{2,})/.test(activeResource.passage)) ||
      (activeResource?.content && /(\(\d+\)\s*_{2,})/.test(activeResource.content))
    )
  const timer = attemptDetail
    ? getAttemptTimerState(
        attemptDetail.attempt.started_at,
        attemptDetail.attempt.target_duration_seconds,
        now,
      )
    : null

  // Calculate overall answered questions
  const totalStats = useMemo(() => {
    let totalQuestions = 0
    let answeredQuestions = 0

    sections.forEach((sec) => {
      if (sec.resource_type === 'activity' && sec.resource.questions) {
        sec.resource.questions.forEach((q) => {
          totalQuestions++
          if (selectedAnswers[q.source_key] && selectedAnswers[q.source_key].trim() !== '') {
            answeredQuestions++
          }
        })
      }
    })

    return { totalQuestions, answeredQuestions }
  }, [sections, selectedAnswers])

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    if (timer?.isOvertime && !overtimeWarningShown.current) {
      overtimeWarningShown.current = true
      showToast({
        type: 'warning',
        title: 'Bạn đang làm quá giờ',
        message: 'Đây là đề luyện tập; bạn có thể tiếp tục làm bài.',
        duration: 7000,
      })
    }
  }, [timer?.isOvertime])

  useEffect(() => {
    if (!attemptDetail || progressHydrated.current) return
    const restoredAnswers = attemptDetail.sections.reduce<Record<string, string>>((answers, section) => {
      const savedAnswers = section.progress.answers
      if (savedAnswers && typeof savedAnswers === 'object' && !Array.isArray(savedAnswers)) {
        Object.entries(savedAnswers).forEach(([key, value]) => {
          if (typeof value === 'string') answers[key] = value
        })
      }
      return answers
    }, {})
    setSelectedAnswers(restoredAnswers)
    progressHydrated.current = true
  }, [attemptDetail])

  useEffect(() => {
    setCompareLeft('')
    setCompareRight('')
    const content = activeProgress?.progress.content
    setDraftContent(typeof content === 'string' ? content : '')
  }, [activeSection?.source_key, activeProgress?.progress.content])

  const draftsQuery = useQuery({
    queryKey: ['practice-draft-versions', activeResource?.id],
    queryFn: () => examPracticeService.listDraftVersions(activeResource!.id),
    enabled: Boolean(isPrompt && activeResource?.id),
  })
  const drafts = draftsQuery.data ?? []

  const autosaveProgress = useMutation({
    mutationFn: (input: { sectionSourceKey: string; progress: Record<string, unknown> }) =>
      examPracticeService.saveSectionProgress({
        attemptId,
        sectionSourceKey: input.sectionSourceKey,
        progress: input.progress,
        status: 'in_progress',
      }),
    onError: () =>
      showToast({
        type: 'error',
        title: 'Không thể tự lưu tiến độ',
        message: 'Vui lòng kiểm tra kết nối rồi tiếp tục làm bài.',
      }),
  })

  useEffect(() => {
    if (
      !progressHydrated.current ||
      !activeSection ||
      !activeResource ||
      attemptDetail?.attempt.status !== 'in_progress'
    )
      return
    const questions = activeResource.questions ?? []
    const progress = isPrompt
      ? { content: draftContent }
      : {
          answers: Object.fromEntries(
            questions.flatMap((question) =>
              selectedAnswers[question.source_key]
                ? [[question.source_key, selectedAnswers[question.source_key]]]
                : [],
            ),
          ),
        }
    const timeoutId = window.setTimeout(
      () => autosaveProgress.mutate({ sectionSourceKey: activeSection.source_key, progress }),
      700,
    )
    return () => window.clearTimeout(timeoutId)
  }, [
    activeResource,
    activeSection,
    attemptDetail?.attempt.status,
    autosaveProgress,
    draftContent,
    isPrompt,
    selectedAnswers,
  ])

  const saveDraft = useMutation({
    mutationFn: () => examPracticeService.createDraftVersion(activeResource!.id, draftContent),
    onSuccess: async (version) => {
      await examPracticeService.saveSectionProgress({
        attemptId,
        sectionSourceKey: activeSection!.source_key,
        progress: { content: version.content, draft_version_number: version.version_number },
        status: 'in_progress',
        draftVersionId: version.id,
      })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['practice-draft-versions', activeResource?.id] }),
        queryClient.invalidateQueries({ queryKey: ['b1-exam-attempt', attemptId] }),
      ])
      showToast({ type: 'success', title: `Đã lưu phiên bản ${version.version_number}` })
    },
    onError: (error) =>
      showToast({
        type: 'error',
        title: 'Không thể lưu phiên bản',
        message: error instanceof Error ? error.message : 'Vui lòng thử lại.',
      }),
  })

  const submitAttempt = useMutation({
    mutationFn: () => examPracticeService.submitAttempt(attemptId),
    onSuccess: async (result) => {
      setSubmitConfirmationOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['b1-exam-attempt', attemptId] })
      showToast({
        type: 'success',
        title: 'Đã nộp bài thành công',
        message: `Bạn làm đúng ${result.score}/${result.max_score} câu khách quan.`,
      })
      navigate(`/app/exams/attempt/${attemptId}/result`, { replace: true })
    },
    onError: () =>
      showToast({ type: 'error', title: 'Chưa thể nộp bài', message: 'Vui lòng kiểm tra lại kết nối.' }),
  })

  interface ParsedTransformation {
    originalSentence: string
    keyword: string | null
    prefixText: string
    suffixText: string
  }

  const parseTransformationPrompt = (promptText: string): ParsedTransformation | null => {
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

    return {
      originalSentence,
      keyword,
      prefixText,
      suffixText,
    }
  }

  const cleanResourceText = (text: string | null | undefined): string => {
    if (!text) return ''
    return text
      .replace(/Source numbers \d+(?:-\d+)? are included because their answers are highlighted in the PDF\.?/gi, '')
      .replace(/Source numbers \d+(?:-\d+)? are excluded because the PDF provides no answer annotation\.?/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
  }

  const renderContentWithInlineGaps = (
    text: string,
    questions: SnapshotQuestion[],
  ) => {
    const numberToKey: Record<string, string> = {}
    questions.forEach((q, index) => {
      const num = q.source_number ?? String(index + 1)
      numberToKey[num] = q.source_key
    })

    const regex = /(\(\d+\)\s*_{2,})/g
    const parts = text.split(regex)

    return (
      <div className="border-2 border-border bg-card p-5 sm:p-6 font-semibold text-base leading-loose whitespace-pre-wrap shadow-[3px_3px_0_var(--border)]">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-secondary mb-3 border-b-2 border-border pb-2">
          <Edit3 size={15} />
          <span>Điền đáp án trực tiếp vào văn bản:</span>
        </div>
        <div>
          {parts.map((part, i) => {
            const match = /^(\((\d+)\)\s*_{2,})$/.exec(part)
            if (match) {
              const num = match[2]
              const questionKey = numberToKey[num] ?? questions[parseInt(num, 10) - 1]?.source_key

              if (!questionKey) return <span key={i}>{part}</span>

              const val = selectedAnswers[questionKey] ?? ''
              return (
                <span key={i} className="inline-flex items-center gap-1 mx-1 align-baseline">
                  <span className="font-mono font-black text-secondary text-sm">({num})</span>
                  <input
                    type="text"
                    ref={(element) => {
                      questionRefs.current[questionKey] = element
                    }}
                    value={val}
                    disabled={isSubmitted}
                    onChange={(e) => {
                      const nextVal = e.target.value
                      setSelectedAnswers((prev) => ({
                        ...prev,
                        [questionKey]: nextVal,
                      }))
                    }}
                    onKeyDown={(event) => focusNextAnswer(event, questions, questionKey)}
                    placeholder="gõ đáp án..."
                    className={`w-28 sm:w-36 px-2 py-0.5 text-center font-bold text-sm border-b-2 outline-none transition-all ${
                      val.trim()
                        ? 'border-secondary bg-primary/20 text-foreground font-black'
                        : 'border-border bg-muted/60 focus:border-secondary'
                    }`}
                  />
                </span>
              )
            }
            return <span key={i}>{part}</span>
          })}
        </div>
      </div>
    )
  }

  const selectSection = (index: number) => {
    setActiveSectionIndex(index)
    if (window.scrollY > 200) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const scrollToQuestion = (sourceKey: string) => {
    const el = questionRefs.current[sourceKey]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const focusNextAnswer = (
    event: KeyboardEvent<HTMLInputElement>,
    questions: SnapshotQuestion[],
    sourceKey: string,
  ) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    const currentIndex = questions.findIndex((question) => question.source_key === sourceKey)
    const nextKey = questions[currentIndex + 1]?.source_key
    if (nextKey) window.setTimeout(() => questionRefs.current[nextKey]?.focus(), 0)
  }

  if (attemptQuery.isLoading)
    return (
      <div className="mx-auto max-w-6xl py-12">
        <div className="neo-card animate-pulse p-10 text-center font-black space-y-3">
          <Sparkles className="mx-auto text-secondary" size={32} />
          <p className="text-xl">Đang tải dữ liệu bài thi B1...</p>
        </div>
      </div>
    )

  if (attemptQuery.isError || !attemptDetail)
    return (
      <div className="mx-auto max-w-6xl py-12">
        <div className="neo-card p-10 text-center font-black space-y-4">
          <HelpCircle className="mx-auto text-danger" size={40} />
          <h2 className="text-2xl">Không tìm thấy lần làm bài thi này</h2>
          <Button variant="primary" onClick={() => navigate('/app/exams')}>
            Quay lại danh sách đề thi
          </Button>
        </div>
      </div>
    )

  if (!activeSection || !activeResource || !timer)
    return (
      <div className="mx-auto max-w-6xl py-12">
        <div className="neo-card p-10 text-center font-black space-y-4">
          <AlertTriangle className="mx-auto text-warning" size={40} />
          <h2 className="text-2xl">Đề thi chưa có dữ liệu phần làm bài</h2>
          <Button variant="primary" onClick={() => navigate('/app/exams')}>
            Quay lại danh sách đề thi
          </Button>
        </div>
      </div>
    )

  const versionOptions = drafts.map((draft) => ({
    value: draft.id,
    label: `Phiên bản ${draft.version_number} · ${draft.word_count} từ`,
  }))
  const findVersion = (id: string): PracticeDraftVersion | undefined =>
    drafts.find((draft) => draft.id === id)
  const isSubmitted = attemptDetail.attempt.status === 'submitted'

  const skillBadge = getSkillBadgeLabel(activeSection.skill)
  const SkillIcon = skillBadge.icon

  return (
    <div className="mx-auto max-w-[1600px] w-full space-y-5 pb-12">
      {/* Sticky Navigation Header & Timer Bar */}
      <header className="neo-card sticky top-16 z-20 bg-card p-4 sm:p-5 shadow-[4px_4px_0_var(--border)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => navigate('/app/exams')}
                className="h-7 px-2 text-xs font-black"
              >
                <ArrowLeft size={14} className="mr-1" /> Danh sách đề
              </Button>
              <span className="text-muted-foreground font-bold">/</span>
              <span className="text-xs font-black uppercase text-secondary">
                {activeSectionIndex + 1}/{sections.length} · {activeSection.title}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
              {getExamTitle(attemptDetail.attempt.exam_snapshot)}
            </h1>
          </div>

          {/* Right Header Controls: Autosave Status, Questions Progress, & Timer */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Live Autosave Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 border border-border bg-muted/60 px-2.5 py-1 text-xs font-black rounded-sm shadow-[1px_1px_0_var(--border)]">
              <CheckCircle2 size={14} className="text-secondary" />
              <span>Đã tự động lưu</span>
            </div>

            {/* Total Questions Counter */}
            {totalStats.totalQuestions > 0 && (
              <div className="border-2 border-border bg-card px-3 py-1 text-xs font-black shadow-[2px_2px_0_var(--border)] flex items-center gap-1.5">
                <ListChecks size={14} className="text-secondary" />
                <span>
                  Đã làm: {totalStats.answeredQuestions}/{totalStats.totalQuestions}
                </span>
              </div>
            )}

            {/* Neobrutalist Timer Badge */}
            <div
              className={`border-2 border-border px-3 py-1.5 font-mono text-lg font-black shadow-[3px_3px_0_var(--border)] flex items-center gap-2 ${
                timer.isOvertime
                  ? 'bg-danger text-white animate-pulse'
                  : 'bg-primary text-primary-foreground'
              }`}
            >
              <Clock3 size={18} />
              <span>
                {timer.isOvertime
                  ? `+${formatExamDuration(timer.overtimeSeconds)}`
                  : formatExamDuration(timer.remainingSeconds)}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Overtime Friendly Alert Banner */}
      {timer.isOvertime && (
        <div className="neo-card flex items-start gap-3 border-danger bg-red-50 p-4 shadow-[3px_3px_0_var(--border)]">
          <AlertTriangle className="shrink-0 text-danger mt-0.5" size={20} />
          <div>
            <p className="font-black text-danger">Bạn đang làm quá giờ</p>
            <p className="text-sm font-semibold text-foreground/80">
              Đây là bài thi luyện tập; bạn vẫn có thể thoải mái tiếp tục hoàn thành và nộp bài bình thường.
            </p>
          </div>
        </div>
      )}

      {/* Main 2-Column Split Workspace Layout */}
      <div className="grid gap-5 lg:grid-cols-12 items-start">
        {/* Left Column: Section Navigation & Question Jumper (3 cols) */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="neo-card p-4 bg-card space-y-3 shadow-[3px_3px_0_var(--border)]">
            <div className="flex items-center justify-between border-b-2 border-border pb-2">
              <span className="text-xs font-black uppercase text-muted-foreground flex items-center gap-1.5">
                <Layers size={14} /> Các phần thi ({sections.length})
              </span>
            </div>

            {/* Section List Buttons with Status Indicators */}
            <div className="space-y-2">
              {sections.map((section, index) => {
                const isActive = index === activeSectionIndex
                const questions = section.resource.questions ?? []
                const answered = questions.filter(
                  (q) => selectedAnswers[q.source_key] && selectedAnswers[q.source_key].trim() !== '',
                ).length
                const isSectionComplete =
                  section.resource_type === 'prompt'
                    ? Boolean(activeProgress?.progress.content)
                    : questions.length > 0 && answered === questions.length

                return (
                  <button
                    key={section.source_key}
                    type="button"
                    onClick={() => selectSection(index)}
                    className={`w-full p-2.5 text-left border-2 border-border font-black text-sm flex items-center justify-between transition-all cursor-pointer ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-[3px_3px_0_var(--border)]'
                        : 'bg-background hover:bg-muted/50 text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-1">
                      <span className="shrink-0 text-xs font-black">{index + 1}.</span>
                      <span className="truncate">{section.title}</span>
                    </div>

                    <div className="shrink-0">
                      {isSectionComplete ? (
                        <span className="bg-secondary text-secondary-foreground text-[10px] font-black px-1.5 py-0.5 rounded-xs flex items-center gap-1">
                          <Check size={10} /> Đủ
                        </span>
                      ) : (
                        section.resource_type === 'activity' &&
                        questions.length > 0 && (
                          <span className="text-[10px] font-black text-muted-foreground bg-muted px-1.5 py-0.5 border border-border">
                            {answered}/{questions.length}
                          </span>
                        )
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Question Quick-Jumper Grid for Active Activity Section */}
          {!isPrompt && (activeResource.questions?.length ?? 0) > 0 && (
            <div className="neo-card p-4 bg-card space-y-3 shadow-[3px_3px_0_var(--border)] hidden lg:block">
              <span className="text-xs font-black uppercase text-muted-foreground flex items-center gap-1.5 border-b-2 border-border pb-2">
                <ListChecks size={14} /> Ô nhảy nhanh câu hỏi
              </span>

              <div className="grid grid-cols-4 gap-2 pt-1">
                {(activeResource.questions ?? []).map((q, idx) => {
                  const isAnswered = Boolean(
                    selectedAnswers[q.source_key] && selectedAnswers[q.source_key].trim() !== '',
                  )
                  return (
                    <button
                      key={q.source_key}
                      type="button"
                      onClick={() => scrollToQuestion(q.source_key)}
                      className={`p-2 text-xs font-black border-2 border-border text-center transition-all cursor-pointer ${
                        isAnswered
                          ? 'bg-secondary text-secondary-foreground shadow-[2px_2px_0_var(--border)]'
                          : 'bg-background hover:bg-muted text-foreground'
                      }`}
                    >
                      {q.source_number ?? idx + 1}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </aside>

        {/* Main Column: Passage, Audio, Prompt & Questions List (9 cols on desktop) */}
        <main ref={mainRef} className="lg:col-span-9 space-y-6">
          <div className="neo-card p-5 sm:p-7 bg-card space-y-6 shadow-[4px_4px_0_var(--border)]">
            {/* Section Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-border pb-4">
              <div>
                <span className="text-xs font-black uppercase text-secondary flex items-center gap-1.5">
                  <SkillIcon size={14} /> {skillBadge.label}
                </span>
                <h2 className="text-2xl font-black mt-0.5">{activeSection.title}</h2>
              </div>
            </div>

            {/* Styled Audio Player when present */}
            {activeResource.audio_url && (
              <div className="border-2 border-border bg-muted p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-black text-secondary">
                  <Headphones size={15} />
                  <span>File nghe của phần này:</span>
                </div>
                <audio controls src={activeResource.audio_url} className="w-full h-10" aria-label="Phát audio đề bài" />
              </div>
            )}

            {/* Instructions */}
            {cleanResourceText(activeResource.instructions) && (
              <div className="border-2 border-border bg-muted/40 p-4 font-semibold text-sm leading-relaxed whitespace-pre-wrap">
                <p className="font-bold text-foreground">{cleanResourceText(activeResource.instructions)}</p>
              </div>
            )}

            {/* Reading Passage (Full-width inside main column at top of questions) */}
            {activeResource.passage && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-black uppercase text-secondary">
                  <BookOpen size={14} />
                  <span>Bài đọc (Passage)</span>
                </div>
                {isFillBlankActivity && /(\(\d+\)\s*_{2,})/.test(activeResource.passage) ? (
                  renderContentWithInlineGaps(
                    activeResource.passage,
                    activeResource.questions ?? [],
                  )
                ) : (
                  <div className="border-2 border-border bg-muted/60 p-5 sm:p-6 font-semibold text-base leading-relaxed whitespace-pre-wrap shadow-[2px_2px_0_var(--border)]">
                    {activeResource.passage}
                  </div>
                )}
              </div>
            )}

            {/* Activity or Prompt Content */}
            {!isPrompt && activeResource.content && (
              <div>
                {isFillBlankActivity && /(\(\d+\)\s*_{2,})/.test(activeResource.content) ? (
                  renderContentWithInlineGaps(
                    activeResource.content,
                    activeResource.questions ?? [],
                  )
                ) : (
                  <div className="border-2 border-border bg-muted/40 p-4 font-semibold text-sm leading-relaxed whitespace-pre-wrap">
                    {activeResource.content}
                  </div>
                )}
              </div>
            )}

            {/* Prompt Text & GUIDELINES for Writing / Speaking */}
            {isPrompt && activeResource.prompt && (
              <div className="space-y-4">
                {activeSection.skill === 'speaking' ? (
                  /* Speaking Test Guidelines & Scoring Rubric Card */
                  <div className="border-2 border-border bg-card shadow-[3px_3px_0_var(--border)] overflow-hidden">
                    <div className="bg-muted p-3 border-b-2 border-border font-black text-xs uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-secondary">
                        <Headphones size={15} /> SPEAKING TEST INSTRUCTIONS – CEFR B1
                      </span>
                    </div>

                    <div className="p-4 space-y-4 text-xs font-semibold leading-relaxed">
                      {/* Scoring Rubric Grid */}
                      <div className="border-2 border-border bg-muted/40 p-3 space-y-2">
                        <p className="font-black text-xs uppercase text-foreground">Thang điểm đánh giá (Tổng 20 điểm)</p>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center font-bold text-xs">
                          <div className="border border-border bg-background p-2">
                            <span className="text-secondary block font-black">Content</span>
                            <span className="text-muted-foreground text-[11px]">6 điểm</span>
                          </div>
                          <div className="border border-border bg-background p-2">
                            <span className="text-secondary block font-black">Grammar</span>
                            <span className="text-muted-foreground text-[11px]">4 điểm</span>
                          </div>
                          <div className="border border-border bg-background p-2">
                            <span className="text-secondary block font-black">Pronunciation</span>
                            <span className="text-muted-foreground text-[11px]">5 điểm</span>
                          </div>
                          <div className="border border-border bg-background p-2">
                            <span className="text-secondary block font-black">Fluency</span>
                            <span className="text-muted-foreground text-[11px]">5 điểm</span>
                          </div>
                          <div className="border border-border bg-secondary text-secondary-foreground p-2 col-span-2 sm:col-span-1">
                            <span className="block font-black">Tổng điểm</span>
                            <span className="text-[11px]">20 điểm</span>
                          </div>
                        </div>
                      </div>

                      {/* Test Phases Overview */}
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="border border-border bg-muted/20 p-2.5 space-y-1">
                          <p className="font-black text-xs text-secondary">Phase 1: Topic Selection</p>
                          <p className="text-[11px] text-muted-foreground">
                            Chuẩn bị ý tưởng và ghi chú (khoảng 5 phút).
                          </p>
                        </div>
                        <div className="border border-border bg-muted/20 p-2.5 space-y-1">
                          <p className="font-black text-xs text-secondary">Phase 2: Interview (4 phút)</p>
                          <p className="text-[11px] text-muted-foreground">
                            Warm-up (1m) &bull; Topic discussion (2m) &bull; Further discussion (1m).
                          </p>
                        </div>
                        <div className="border border-border bg-muted/20 p-2.5 space-y-1">
                          <p className="font-black text-xs text-secondary">Phase 3: Closure</p>
                          <p className="text-[11px] text-muted-foreground">
                            Kết thúc phần thi nói và tổng kết điểm số.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Writing Guidelines / Subscale Scoring Rubric Card */
                  <div className="border-2 border-border bg-card shadow-[3px_3px_0_var(--border)] overflow-hidden">
                    <div className="bg-muted p-3 border-b-2 border-border font-black text-xs uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-secondary">
                        <FileText size={15} /> GUIDELINES / TIÊU CHÍ CHẤM ĐIỂM (SUBSCALE)
                      </span>
                    </div>

                    <div className="p-4 space-y-3 text-xs font-semibold leading-relaxed">
                      {/* Task Response */}
                      <div className="border-2 border-border bg-muted/40 p-3 space-y-2">
                        <p className="font-black text-xs uppercase text-foreground">1. Task Response (Yêu cầu bài viết)</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1 bg-background p-2.5 border border-border">
                            <p className="font-bold text-secondary text-xs">Thư / Email (Letter/Email):</p>
                            <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11px]">
                              <li>Format of the letter/email is appropriate.</li>
                              <li>Purpose of the letter/email is presented.</li>
                              <li>Bullet points are presented, highlighted and extended.</li>
                            </ul>
                          </div>
                          <div className="space-y-1 bg-background p-2.5 border border-border">
                            <p className="font-bold text-secondary text-xs">Bài luận (Essay):</p>
                            <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11px]">
                              <li>Format: 3 main parts (Introduction, Body, Conclusion).</li>
                              <li>Ideas are developed, extended and well supported.</li>
                              <li>All issues in the question are answered well.</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Cohesion & Lexical */}
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="border-2 border-border bg-muted/30 p-2.5 space-y-1">
                          <p className="font-black text-xs text-foreground">2. Cohesion & Coherence</p>
                          <p className="text-[11px] text-muted-foreground">
                            The use of Conjunctions and Transitions to link ideas, sentences and phrases.
                          </p>
                        </div>
                        <div className="border-2 border-border bg-muted/30 p-2.5 space-y-1">
                          <p className="font-black text-xs text-foreground">3. Lexical Resource & Grammar</p>
                          <p className="text-[11px] text-muted-foreground">
                            Academic words with correct spelling, different kinds of complex structures.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Prompt Text Box */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-secondary">
                    <PenTool size={14} />
                    <span>Đề bài tự luận</span>
                  </div>
                  <div className="border-2 border-border bg-primary/10 p-5 font-semibold text-base leading-relaxed whitespace-pre-wrap shadow-[2px_2px_0_var(--border)]">
                    {activeResource.prompt}
                  </div>
                </div>
              </div>
            )}

            {/* Prompt Mode: Writing / Speaking Workspace */}
            {isPrompt ? (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="practice-draft" className="font-black text-sm">
                      Bản nháp bài làm của bạn
                    </Label>
                    <span className="text-xs font-black text-secondary bg-muted px-2 py-0.5 border border-border">
                      {draftContent.trim() ? draftContent.trim().split(/\s+/u).length : 0} từ
                    </span>
                  </div>

                  <Textarea
                    id="practice-draft"
                    value={draftContent}
                    disabled={isSubmitted}
                    onChange={(e) => setDraftContent(e.target.value)}
                    placeholder="Nhập nội dung bài viết của bạn ở đây..."
                    className="mt-1 min-h-72 font-semibold text-base leading-relaxed p-4 border-2 border-border focus:ring-2 focus:ring-secondary"
                  />

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Tự động lưu sau khi dừng thao tác gõ.
                    </span>

                    <Button
                      onClick={() => saveDraft.mutate()}
                      disabled={isSubmitted || !draftContent.trim() || saveDraft.isPending}
                      variant="primary"
                      className="font-black flex items-center gap-2"
                    >
                      <Save size={16} />
                      <span>Lưu thành phiên bản</span>
                    </Button>
                  </div>
                </div>

                {/* Draft Versions Comparison Section */}
                <section className="border-t-2 border-border pt-5 space-y-4">
                  <div>
                    <h3 className="text-lg font-black flex items-center gap-2">
                      <FileEdit size={18} className="text-secondary" />
                      <span>So sánh các phiên bản bản nháp</span>
                    </h3>
                    <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                      Chọn hai phiên bản bạn đã lưu để đối chiếu song song.
                    </p>
                  </div>

                  {draftsQuery.isLoading ? (
                    <p className="text-sm font-bold text-muted-foreground animate-pulse">
                      Đang tải phiên bản...
                    </p>
                  ) : drafts.length === 0 ? (
                    <p className="text-xs font-bold text-muted-foreground bg-muted p-3 border border-border">
                      Chưa có phiên bản nào được lưu. Hãy bấm &quot;Lưu thành phiên bản&quot; ở trên.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Select
                          value={compareLeft}
                          onChange={setCompareLeft}
                          options={versionOptions}
                          placeholder="Chọn bản bên trái"
                        />
                        <Select
                          value={compareRight}
                          onChange={setCompareRight}
                          options={versionOptions}
                          placeholder="Chọn bản bên phải"
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        {[findVersion(compareLeft), findVersion(compareRight)].map((version, index) => (
                          <article key={index} className="min-h-40 border-2 border-border bg-muted/60 p-4 space-y-2">
                            <p className="text-xs font-black uppercase text-secondary border-b border-border pb-1">
                              {version ? `Phiên bản ${version.version_number} (${version.word_count} từ)` : 'Chưa chọn phiên bản'}
                            </p>
                            <p className="whitespace-pre-wrap text-xs font-semibold leading-relaxed text-foreground">
                              {version?.content ?? '—'}
                            </p>
                          </article>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              </div>
            ) : !isInlineGapActivity ? (
                /* Activity Mode: Questions List with Neobrutalist Option Cards */
                <div className="space-y-6">
                  {(activeResource.questions ?? []).map((question, index) => {
                    const qNumber = question.source_number ?? String(index + 1)
                    const hasSelected = Boolean(selectedAnswers[question.source_key])
                    const parsedTransformation = parseTransformationPrompt(question.prompt)

                    return (
                      <section
                        key={question.source_key}
                        id={`q-${question.source_key}`}
                        className={`neo-card p-5 bg-card space-y-4 border-2 transition-all shadow-[3px_3px_0_var(--border)] ${
                          hasSelected ? 'border-secondary' : 'border-border'
                        }`}
                      >
                        {parsedTransformation ? (
                          /* Sentence Transformation Custom 2-Line Layout matching exact exam format */
                          <div className="space-y-3">
                            {/* Line 1: Question Badge + Original Sentence + Keyword Badge */}
                            <div className="flex flex-wrap items-center gap-2 text-base font-bold leading-relaxed text-foreground">
                              <span className="inline-flex items-center gap-1 shrink-0 text-xs font-black uppercase tracking-wider text-secondary bg-muted px-2 py-0.5 border border-border shadow-[1.5px_1.5px_0_var(--border)]">
                                <HelpCircle size={13} className="text-secondary" />
                                <span>Câu {qNumber}</span>
                              </span>
                              <span>{parsedTransformation.originalSentence}</span>
                              {parsedTransformation.keyword && (
                                <span className="inline-flex items-center font-black text-xs text-secondary bg-secondary/15 px-2 py-0.5 border border-border">
                                  ({parsedTransformation.keyword})
                                </span>
                              )}
                            </div>

                            {/* Line 2: Continuous Rewrite Line starting with ↳ */}
                            <div className="flex flex-wrap items-baseline gap-2 pt-2 border-t-2 border-border/40 font-semibold text-base">
                              <span className="font-mono font-black text-secondary text-xl leading-none shrink-0 select-none">↳</span>
                              {parsedTransformation.prefixText && (
                                <span className="font-bold text-foreground italic">{parsedTransformation.prefixText}</span>
                              )}

                              <Input
                                id={`answer-${question.source_key}`}
                                ref={(element) => {
                                  questionRefs.current[question.source_key] = element
                                }}
                                value={selectedAnswers[question.source_key] ?? ''}
                                disabled={isSubmitted}
                                onChange={(e) =>
                                  setSelectedAnswers((prev) => ({
                                    ...prev,
                                    [question.source_key]: e.target.value,
                                  }))
                                }
                                onKeyDown={(event) =>
                                  focusNextAnswer(event, activeResource.questions ?? [], question.source_key)
                                }
                                placeholder="..................................."
                                className="inline-block flex-1 min-w-[200px] max-w-md h-10 px-3 font-bold text-base text-destructive bg-background border-2 border-border focus:border-secondary focus:ring-0 shadow-[2px_2px_0_var(--border)]"
                              />

                              {parsedTransformation.suffixText && (
                                <span className="font-bold text-foreground italic">{parsedTransformation.suffixText}</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          /* Standard Question Layout */
                          <>
                            {/* Inline Question Number Badge & Prompt on the Same Line */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex flex-wrap items-baseline gap-2.5 flex-1 min-w-0">
                                <span className="inline-flex items-center gap-1 shrink-0 text-xs font-black uppercase tracking-wider text-secondary bg-muted px-2 py-0.5 border border-border shadow-[1.5px_1.5px_0_var(--border)]">
                                  <HelpCircle size={13} className="text-secondary" />
                                  <span>Câu {qNumber}</span>
                                </span>
                                <span className="text-base font-black leading-snug text-foreground whitespace-pre-wrap">
                                  {question.prompt}
                                </span>
                              </div>
                            </div>

                            {/* Question Image */}
                            {question.image_url && (
                              <img
                                src={question.image_url}
                                alt={`Hình minh họa câu ${qNumber}`}
                                className="my-3 max-h-64 max-w-full border-2 border-border object-contain"
                              />
                            )}

                            {/* Options List (Multiple Choice) */}
                            {(question.options?.length ?? 0) > 0 ? (
                              <div
                                className={`grid gap-2.5 pt-1 ${
                                  (question.options ?? []).every((opt) => (opt.text ?? '').trim().length <= 35)
                                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                                    : 'grid-cols-1 sm:grid-cols-2'
                                }`}
                              >
                                {question.options?.map((option) => {
                                  const isOptionSelected = selectedAnswers[question.source_key] === option.key
                                  return (
                                    <button
                                      key={option.key}
                                      type="button"
                                      disabled={isSubmitted}
                                      onClick={() =>
                                        setSelectedAnswers((prev) => ({
                                          ...prev,
                                          [question.source_key]: option.key,
                                        }))
                                      }
                                      className={`w-full p-2.5 text-left border-2 border-border font-black text-sm flex items-center gap-2.5 transition-all cursor-pointer ${
                                        isOptionSelected
                                          ? 'bg-primary text-primary-foreground shadow-[3px_3px_0_var(--border)]'
                                          : 'bg-background hover:bg-muted/60 text-foreground shadow-[2px_2px_0_var(--border)]'
                                      }`}
                                    >
                                      <span
                                        className={`shrink-0 w-6 h-6 border-2 border-border flex items-center justify-center text-xs font-black rounded-xs ${
                                          isOptionSelected
                                            ? 'bg-secondary text-secondary-foreground'
                                            : 'bg-muted text-foreground'
                                        }`}
                                      >
                                        {option.key}
                                      </span>
                                      <span className="leading-snug truncate">{option.text}</span>
                                    </button>
                                  )
                                })}
                              </div>
                            ) : (
                              /* Fill Blank / Text Input Question */
                              <div className="border-2 border-border bg-muted/30 p-3.5 space-y-2 shadow-[2px_2px_0_var(--border)] mt-2">
                                <div className="flex items-center gap-2 text-xs font-black text-secondary">
                                  <CornerDownRight size={15} />
                                  <span>Gõ câu viết lại / đáp án điền từ vào đây:</span>
                                </div>
                                <div className="relative flex items-center gap-2">
                                  <span className="font-mono font-black text-secondary text-lg shrink-0 select-none">↳</span>
                                  <Input
                                    id={`answer-${question.source_key}`}
                                    ref={(element) => {
                                      questionRefs.current[question.source_key] = element
                                    }}
                                    value={selectedAnswers[question.source_key] ?? ''}
                                    disabled={isSubmitted}
                                    onChange={(e) =>
                                      setSelectedAnswers((prev) => ({
                                        ...prev,
                                        [question.source_key]: e.target.value,
                                      }))
                                    }
                                    onKeyDown={(event) =>
                                      focusNextAnswer(event, activeResource.questions ?? [], question.source_key)
                                    }
                                    placeholder={answerPlaceholder(question)}
                                    className="font-bold text-base bg-background border-2 border-border focus:border-secondary focus:ring-0 shadow-[2px_2px_0_var(--border)]"
                                  />
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </section>
                    )
                })}
              </div>
            ) : null}

            {/* Bottom Footer Navigation Bar */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t-2 border-border pt-5">
              <Button
                variant="ghost"
                disabled={activeSectionIndex === 0}
                onClick={() => selectSection(activeSectionIndex - 1)}
                className="font-black flex items-center gap-1"
              >
                <ChevronLeft size={17} />
                <span>Phần trước</span>
              </Button>

              <div className="flex items-center gap-3">
                <Button
                  variant="danger"
                  disabled={isSubmitted || submitAttempt.isPending}
                  onClick={() => setSubmitConfirmationOpen(true)}
                  className="font-black flex items-center gap-2"
                >
                  <Send size={17} />
                  <span>Nộp bài & xem đáp án</span>
                </Button>

                <Button
                  variant="secondary"
                  disabled={activeSectionIndex === sections.length - 1}
                  onClick={() => selectSection(activeSectionIndex + 1)}
                  className="font-black flex items-center gap-1"
                >
                  <span>Phần tiếp</span>
                  <ChevronRight size={17} />
                </Button>
              </div>
            </div>

            {!isSubmitted && (
              <p className="text-center text-xs font-semibold text-muted-foreground">
                Tiến độ câu trả lời được tự động lưu sau khi bạn dừng thao tác.
              </p>
            )}
          </div>
        </main>
      </div>

      {/* Submission Confirmation Dialog */}
      <ConfirmModal
        open={submitConfirmationOpen}
        onCancel={() => setSubmitConfirmationOpen(false)}
        onConfirm={() => submitAttempt.mutate()}
        title="Xác nhận nộp bài thi thử B1?"
        description={`Bạn đã làm ${totalStats.answeredQuestions}/${totalStats.totalQuestions} câu hỏi. Hệ thống sẽ tự động chấm điểm các câu khách quan và mở phần lời giải chi tiết.`}
        confirmLabel="Nộp bài ngay"
        cancelLabel="Tiếp tục làm"
        confirmDisabled={submitAttempt.isPending}
      />
    </div>
  )
}
