import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ChevronLeft, ChevronRight, Clock3, Send, Save } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
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
  return Array.isArray(sections) ? sections.filter((section): section is SnapshotSection =>
    Boolean(section)
    && typeof section === 'object'
    && typeof (section as SnapshotSection).source_key === 'string'
    && typeof (section as SnapshotSection).resource === 'object',
  ) : []
}

function getExamTitle(snapshot: Record<string, unknown>) {
  const exam = snapshot.exam
  return exam && typeof exam === 'object' && typeof (exam as { title?: unknown }).title === 'string'
    ? (exam as { title: string }).title
    : 'Đề thi thử B1'
}

function answerPlaceholder(question: SnapshotQuestion) {
  return question.question_type === 'fill_blank' ? 'Điền đáp án của bạn' : 'Nhập câu trả lời của bạn'
}

export function ExamAttemptPage() {
  const { attemptId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const mainRef = useRef<HTMLElement>(null)
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
  const sections = useMemo(() => attemptDetail ? getSections(attemptDetail.attempt.exam_snapshot) : [], [attemptDetail])
  const activeSection = sections[activeSectionIndex]
  const activeResource = activeSection?.resource
  const activeProgress = attemptDetail?.sections.find((section) => section.exam_section_source_key === activeSection?.source_key)
  const isPrompt = activeSection?.resource_type === 'prompt'
  const timer = attemptDetail
    ? getAttemptTimerState(attemptDetail.attempt.started_at, attemptDetail.attempt.target_duration_seconds, now)
    : null

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    if (timer?.isOvertime && !overtimeWarningShown.current) {
      overtimeWarningShown.current = true
      showToast({ type: 'warning', title: 'Bạn đang làm quá giờ', message: 'Đây là đề luyện tập; bạn có thể tiếp tục làm bài.', duration: 7000 })
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
    mutationFn: (input: { sectionSourceKey: string; progress: Record<string, unknown> }) => examPracticeService.saveSectionProgress({
      attemptId,
      sectionSourceKey: input.sectionSourceKey,
      progress: input.progress,
      status: 'in_progress',
    }),
    onError: () => showToast({ type: 'error', title: 'Không thể tự lưu tiến độ', message: 'Vui lòng kiểm tra kết nối rồi tiếp tục làm bài.' }),
  })

  useEffect(() => {
    if (!progressHydrated.current || !activeSection || !activeResource || attemptDetail?.attempt.status !== 'in_progress') return
    const questions = activeResource.questions ?? []
    const progress = isPrompt
      ? { content: draftContent }
      : { answers: Object.fromEntries(questions.flatMap((question) => selectedAnswers[question.source_key] ? [[question.source_key, selectedAnswers[question.source_key]]] : [])) }
    const timeoutId = window.setTimeout(() => autosaveProgress.mutate({ sectionSourceKey: activeSection.source_key, progress }), 700)
    return () => window.clearTimeout(timeoutId)
  }, [activeResource, activeSection, attemptDetail?.attempt.status, autosaveProgress, draftContent, isPrompt, selectedAnswers])

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
    onError: (error) => showToast({ type: 'error', title: 'Không thể lưu phiên bản', message: error instanceof Error ? error.message : 'Vui lòng thử lại.' }),
  })

  const submitAttempt = useMutation({
    mutationFn: () => examPracticeService.submitAttempt(attemptId),
    onSuccess: async (result) => {
      setSubmitConfirmationOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['b1-exam-attempt', attemptId] })
      showToast({ type: 'success', title: 'Đã nộp bài', message: `Bạn đúng ${result.score}/${result.max_score} câu khách quan.` })
      navigate(`/app/exams/attempt/${attemptId}/result`, { replace: true })
    },
    onError: () => showToast({ type: 'error', title: 'Chưa thể nộp bài', message: 'Vui lòng thử lại.' }),
  })

  const selectSection = (index: number) => {
    setActiveSectionIndex(index)
    window.setTimeout(() => mainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }

  if (attemptQuery.isLoading) return <div className="neo-card animate-pulse p-8 text-center font-black">Đang mở đề…</div>
  if (attemptQuery.isError || !attemptDetail) return <div className="neo-card p-8 text-center font-black">Không tìm thấy lần làm đề này.</div>
  if (!activeSection || !activeResource || !timer) return <div className="neo-card p-8 text-center font-black">Đề chưa có phần làm bài.</div>

  const versionOptions = drafts.map((draft) => ({ value: draft.id, label: `Phiên bản ${draft.version_number} · ${draft.word_count} từ` }))
  const findVersion = (id: string): PracticeDraftVersion | undefined => drafts.find((draft) => draft.id === id)
  const isSubmitted = attemptDetail.attempt.status === 'submitted'

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="neo-card sticky top-20 z-20 flex flex-col gap-4 bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-xs font-black uppercase tracking-wide text-secondary">Đề thi thử B1</p><h1 className="text-2xl font-black">{getExamTitle(attemptDetail.attempt.exam_snapshot)}</h1><p className="text-sm font-semibold text-muted-foreground">Phần {activeSectionIndex + 1}/{sections.length}: {activeSection.title}</p></div>
        <div className={`border-2 border-border px-4 py-2 font-mono text-xl font-black shadow-[3px_3px_0_var(--border)] ${timer.isOvertime ? 'bg-danger text-white' : 'bg-primary'}`}><Clock3 className="mr-2 inline-block" size={18} />{timer.isOvertime ? `+${formatExamDuration(timer.overtimeSeconds)}` : formatExamDuration(timer.remainingSeconds)}</div>
      </header>

      {timer.isOvertime && <div className="neo-card flex items-start gap-3 border-danger bg-red-50 p-4"><AlertTriangle className="shrink-0 text-danger" /><div><p className="font-black">Bạn đang làm quá giờ</p><p className="text-sm font-semibold">Bạn vẫn có thể tiếp tục làm và nộp bài như bình thường.</p></div></div>}

      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <aside className="neo-card h-fit p-3"><p className="px-2 pb-2 text-xs font-black uppercase">Các phần</p><div className="space-y-2">{sections.map((section, index) => <Button key={section.source_key} variant={index === activeSectionIndex ? 'primary' : 'ghost'} className="w-full justify-start text-left" onClick={() => selectSection(index)}>{index + 1}. {section.title}</Button>)}</div></aside>

        <main ref={mainRef} className="neo-card p-5 sm:p-7">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase text-secondary">{activeSection.skill}</p><h2 className="text-2xl font-black">{activeSection.title}</h2></div>{activeResource.audio_url && <audio controls src={activeResource.audio_url} aria-label="Phát audio đề bài" />}</div>
          {activeResource.instructions && <p className="mb-4 whitespace-pre-wrap font-semibold">{activeResource.instructions}</p>}
          {activeResource.passage && <div className="mb-5 whitespace-pre-wrap border-2 border-border bg-muted p-4 font-semibold">{activeResource.passage}</div>}
          {!isPrompt && activeResource.content && <div className="mb-5 whitespace-pre-wrap font-semibold">{activeResource.content}</div>}

          {isPrompt ? <div className="space-y-5"><div className="border-2 border-border bg-primary/15 p-4 font-semibold whitespace-pre-wrap">{activeResource.prompt}</div><div><Label htmlFor="practice-draft">Bản nháp hiện tại</Label><Textarea id="practice-draft" value={draftContent} disabled={isSubmitted} onChange={(event) => setDraftContent(event.target.value)} placeholder="Viết bài của bạn ở đây…" className="mt-2 min-h-64" /><div className="mt-2 flex items-center justify-between gap-3"><span className="text-sm font-bold text-muted-foreground">{draftContent.trim() ? draftContent.trim().split(/\s+/u).length : 0} từ · Tự lưu khi bạn dừng gõ</span><Button onClick={() => saveDraft.mutate()} disabled={isSubmitted || !draftContent.trim() || saveDraft.isPending}><Save size={17} />Lưu thành phiên bản</Button></div></div><section className="border-t-2 border-border pt-5"><h3 className="text-lg font-black">So sánh phiên bản</h3><p className="mt-1 text-sm font-semibold text-muted-foreground">Chọn hai bản đã lưu để xem song song.</p>{draftsQuery.isLoading ? <p className="mt-3 text-sm font-bold">Đang tải phiên bản…</p> : drafts.length === 0 ? <p className="mt-3 text-sm font-bold">Chưa có phiên bản nào được lưu.</p> : <div className="mt-4 space-y-4"><div className="grid gap-3 sm:grid-cols-2"><Select value={compareLeft} onChange={setCompareLeft} options={versionOptions} placeholder="Chọn bản bên trái" /><Select value={compareRight} onChange={setCompareRight} options={versionOptions} placeholder="Chọn bản bên phải" /></div><div className="grid gap-4 md:grid-cols-2">{[findVersion(compareLeft), findVersion(compareRight)].map((version, index) => <article key={index} className="min-h-40 border-2 border-border bg-muted p-4"><p className="mb-2 text-sm font-black">{version ? `Phiên bản ${version.version_number}` : 'Chưa chọn phiên bản'}</p><p className="whitespace-pre-wrap text-sm font-semibold">{version?.content ?? '—'}</p></article>)}</div></div>}</section></div> : <div className="space-y-5">{(activeResource.questions ?? []).map((question, index) => <section key={question.source_key} className="border-2 border-border p-4"><p className="text-sm font-black text-secondary">Câu {question.source_number ?? index + 1}</p>{question.image_url && <img src={question.image_url} alt={`Hình minh họa câu ${question.source_number ?? index + 1}`} className="my-3 max-h-64 max-w-full border-2 border-border object-contain" />}<p className="mt-1 whitespace-pre-wrap font-black">{question.prompt}</p>{(question.options?.length ?? 0) > 0 ? <div className="mt-3 grid gap-2">{question.options?.map((option) => <Button key={option.key} variant={selectedAnswers[question.source_key] === option.key ? 'secondary' : 'ghost'} disabled={isSubmitted} className="justify-start text-left" onClick={() => setSelectedAnswers((answers) => ({ ...answers, [question.source_key]: option.key }))}>{option.key}. {option.text}</Button>)}</div> : <div className="mt-3"><Label htmlFor={`answer-${question.source_key}`}>Câu trả lời</Label><Input id={`answer-${question.source_key}`} value={selectedAnswers[question.source_key] ?? ''} disabled={isSubmitted} onChange={(event) => setSelectedAnswers((answers) => ({ ...answers, [question.source_key]: event.target.value }))} placeholder={answerPlaceholder(question)} className="mt-2 min-w-52" /></div>}</section>)}</div>}

          <div className="mt-8 flex flex-wrap justify-between gap-3 border-t-2 border-border pt-5"><Button variant="ghost" disabled={activeSectionIndex === 0} onClick={() => selectSection(activeSectionIndex - 1)}><ChevronLeft size={17} />Phần trước</Button><div className="flex gap-3"><Button variant="danger" disabled={isSubmitted || submitAttempt.isPending} onClick={() => setSubmitConfirmationOpen(true)}><Send size={17} />Nộp bài & xem đáp án</Button><Button variant="secondary" disabled={activeSectionIndex === sections.length - 1} onClick={() => selectSection(activeSectionIndex + 1)}>Phần tiếp<ChevronRight size={17} /></Button></div></div>
          {!isSubmitted && <p className="mt-3 text-sm font-bold text-muted-foreground">Tiến độ được tự lưu sau khi bạn dừng thao tác.</p>}
        </main>
      </div>
      <ConfirmModal open={submitConfirmationOpen} onCancel={() => setSubmitConfirmationOpen(false)} onConfirm={() => submitAttempt.mutate()} title="Nộp bài thi thử?" description="Bài sẽ được chấm các câu khách quan và mở phần đáp án, dịch, giải thích hiện có." confirmLabel="Nộp bài" cancelLabel="Tiếp tục làm" confirmDisabled={submitAttempt.isPending} />
    </div>
  )
}
