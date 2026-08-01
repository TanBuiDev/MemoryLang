import { useEffect, useReducer, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Input, Label } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { B1SourceExamPicker } from '@/components/admin/exams/B1SourceExamPicker'
import { adminExamService } from '@/services/supabase/adminExam.service'
import type { B1InitializationMode, ExamAccessTier, ExamCategory, ExamFormat } from '@/types/exam.types'

export type WizardStep = 'format' | 'details' | 'initialization' | 'source' | 'summary'
export type WizardFormat = 'legacy' | 'b1_practice'

interface WizardState {
  step: WizardStep
  format: WizardFormat | null
  legacy: { title: string; category: ExamCategory }
  b1: {
    title: string
    description: string
    accessTier: ExamAccessTier
    duration: string
    initializationMode: B1InitializationMode
    sourceExamId: string | null
  }
  errors: string[]
}

type WizardAction =
  | { type: 'reset' }
  | { type: 'select-format'; format: WizardFormat }
  | { type: 'update-legacy'; field: 'title' | 'category'; value: string }
  | { type: 'update-b1'; field: 'title' | 'description' | 'accessTier' | 'duration'; value: string }
  | { type: 'choose-initialization'; mode: B1InitializationMode }
  | { type: 'select-source'; sourceExamId: string }
  | { type: 'go-to'; step: WizardStep; errors?: string[] }

const initialState: WizardState = {
  step: 'format',
  format: null,
  legacy: { title: '', category: 'TOEIC' },
  b1: {
    title: '',
    description: '',
    accessTier: 'free',
    duration: '120',
    initializationMode: 'blank',
    sourceExamId: null,
  },
  errors: [],
}

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'reset':
      return initialState
    case 'select-format':
      return { ...state, format: action.format, step: 'details', errors: [] }
    case 'update-legacy':
      return { ...state, legacy: { ...state.legacy, [action.field]: action.value }, errors: [] }
    case 'update-b1':
      return { ...state, b1: { ...state.b1, [action.field]: action.value }, errors: [] }
    case 'choose-initialization':
      return { ...state, b1: { ...state.b1, initializationMode: action.mode, sourceExamId: action.mode === 'blank' ? null : state.b1.sourceExamId }, errors: [] }
    case 'select-source':
      return { ...state, b1: { ...state.b1, sourceExamId: action.sourceExamId }, errors: [] }
    case 'go-to':
      return { ...state, step: action.step, errors: action.errors ?? [] }
  }
}

function generateRequestId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function getDetailsErrors(state: WizardState) {
  if (state.format === 'legacy') return state.legacy.title.trim() ? [] : ['Vui lòng nhập tên đề thi.']

  const errors: string[] = []
  if (!state.b1.title.trim()) errors.push('Vui lòng nhập tiêu đề đề B1.')
  const duration = Number(state.b1.duration)
  if (!Number.isInteger(duration) || duration < 1 || duration > 480) errors.push('Thời lượng phải từ 1 đến 480 phút.')
  return errors
}

function initializationSummary(mode: B1InitializationMode) {
  if (mode === 'structure_only') return 'Đề mới chỉ sao chép bố cục các phần. Nội dung sẽ được tạo riêng.'
  if (mode === 'full_content') return 'Đề mới có nội dung riêng độc lập; các tệp media được dùng chung để tiết kiệm dung lượng.'
  return 'Bắt đầu với một đề B1 trống để tự xây dựng từ đầu.'
}

export interface CreateExamWizardProps {
  open: boolean
  onClose: () => void
  onCreated: (examId: string, examFormat: ExamFormat) => void
}

export function CreateExamWizard({ open, onClose, onCreated }: CreateExamWizardProps) {
  const [state, dispatch] = useReducer(wizardReducer, initialState)
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const requestIdRef = useRef<string | null>(null)
  const b1SessionActiveRef = useRef(false)

  useEffect(() => {
    if (!open) return
    if (state.format === 'b1_practice' && !b1SessionActiveRef.current) {
      requestIdRef.current = generateRequestId()
      b1SessionActiveRef.current = true
    }
  }, [open, state.format])

  if (!open) return null

  const resetSession = () => {
    requestIdRef.current = null
    b1SessionActiveRef.current = false
    dispatch({ type: 'reset' })
    setConfirming(false)
    setSubmitError(null)
  }

  const close = () => {
    if (submitting) return
    resetSession()
    onClose()
  }

  const nextFromDetails = () => {
    const errors = getDetailsErrors(state)
    if (errors.length > 0) {
      dispatch({ type: 'go-to', step: 'details', errors })
      return
    }
    dispatch({ type: 'go-to', step: state.format === 'legacy' ? 'summary' : 'initialization' })
  }

  const submitLegacy = () => {
    const errors = getDetailsErrors(state)
    if (errors.length > 0) {
      dispatch({ type: 'go-to', step: 'details', errors })
      return
    }
    void submit()
  }

  const nextFromInitialization = () => {
    dispatch({ type: 'go-to', step: state.b1.initializationMode === 'blank' ? 'summary' : 'source' })
  }

  const nextFromSource = () => {
    if (!state.b1.sourceExamId) {
      dispatch({ type: 'go-to', step: 'source', errors: ['Vui lòng chọn đề B1 nguồn.'] })
      return
    }
    dispatch({ type: 'go-to', step: 'summary' })
  }

  const submit = async () => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      if (state.format === 'legacy') {
        const created = await adminExamService.createExam({
          title: state.legacy.title.trim(),
          category: state.legacy.category,
          is_published: false,
        })
        resetSession()
        onCreated(created.id, 'legacy')
        onClose()
        return
      }

      const requestId = requestIdRef.current ?? generateRequestId()
      requestIdRef.current = requestId
      const examId = await adminExamService.createB1Exam({
        requestId,
        title: state.b1.title,
        description: state.b1.description,
        accessTier: state.b1.accessTier,
        defaultTimeMinutes: Number(state.b1.duration),
        initializationMode: state.b1.initializationMode,
        sourceExamId: state.b1.sourceExamId,
      })
      resetSession()
      onCreated(examId, 'b1_practice')
      onClose()
    } catch (reason: unknown) {
      setSubmitError(reason instanceof Error ? reason.message : 'Không thể tạo đề. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  const back = () => {
    const previous: Record<WizardStep, WizardStep> = {
      format: 'format',
      details: 'format',
      initialization: 'details',
      source: 'initialization',
      summary: state.format === 'b1_practice' && state.b1.initializationMode !== 'blank' ? 'source' : state.format === 'b1_practice' ? 'initialization' : 'details',
    }
    dispatch({ type: 'go-to', step: previous[state.step] })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="create-exam-wizard-title" className="neo-card max-h-[90vh] w-full max-w-2xl overflow-y-auto bg-card p-6">
        <div className="flex items-start justify-between gap-4 border-b-2 border-border pb-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-secondary">Tạo đề thi</p>
            <h2 id="create-exam-wizard-title" className="text-xl font-black">Trình tạo đề trực quan</h2>
          </div>
          <Button type="button" variant="ghost" onClick={close} disabled={submitting}>Đóng</Button>
        </div>

        <p className="mt-3 text-sm font-bold text-muted-foreground">Bước {['format', 'details', 'initialization', 'source', 'summary'].indexOf(state.step) + 1}/5</p>
        {state.errors.length > 0 ? <div role="alert" className="mt-4 border-2 border-danger bg-red-50 p-3 text-sm font-bold text-danger">{state.errors.map((error) => <p key={error}>{error}</p>)}</div> : null}
        {submitError ? <p role="alert" className="mt-4 border-2 border-danger bg-red-50 p-3 text-sm font-bold text-danger">{submitError}</p> : null}

        <div className="mt-5">
          {state.step === 'format' ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Button type="button" variant="ghost" onClick={() => dispatch({ type: 'select-format', format: 'legacy' })} className="h-auto items-start justify-start p-5 text-left">
                <span className="flex flex-col gap-2"><span className="text-base">Đề thi truyền thống</span><span className="text-sm font-semibold text-muted-foreground">TOEIC, IELTS, TOEFL hoặc đề tự do theo luồng hiện có.</span></span>
              </Button>
              <Button type="button" variant="secondary" onClick={() => dispatch({ type: 'select-format', format: 'b1_practice' })} className="h-auto items-start justify-start p-5 text-left">
                <span className="flex flex-col gap-2"><span className="text-base">B1 Practice</span><span className="text-sm font-semibold text-muted-foreground">Tạo bộ luyện B1 với cấu trúc Reading, Listening, Writing và Speaking.</span></span>
              </Button>
            </div>
          ) : null}

          {state.step === 'details' && state.format === 'legacy' ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5"><Label htmlFor="legacy-title">Tên đề thi</Label><Input id="legacy-title" value={state.legacy.title} onChange={(event) => dispatch({ type: 'update-legacy', field: 'title', value: event.target.value })} placeholder="Ví dụ: TOEIC Reading Test 1" /></div>
              <div className="flex flex-col gap-1.5"><Label htmlFor="legacy-category">Danh mục</Label><Select id="legacy-category" value={state.legacy.category} onChange={(value) => dispatch({ type: 'update-legacy', field: 'category', value })} options={[{ value: 'TOEIC', label: 'TOEIC' }, { value: 'IELTS', label: 'IELTS' }, { value: 'TOEFL', label: 'TOEFL' }, { value: 'GENERAL', label: 'Tổng hợp' }]} /></div>
            </div>
          ) : null}

          {state.step === 'details' && state.format === 'b1_practice' ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5"><Label htmlFor="b1-title">Tiêu đề đề B1</Label><Input id="b1-title" value={state.b1.title} onChange={(event) => dispatch({ type: 'update-b1', field: 'title', value: event.target.value })} placeholder="Ví dụ: B1 PET Practice Set 1" /></div>
              <div className="flex flex-col gap-1.5"><Label htmlFor="b1-duration">Thời lượng (phút)</Label><Input id="b1-duration" type="number" min="1" max="480" value={state.b1.duration} onChange={(event) => dispatch({ type: 'update-b1', field: 'duration', value: event.target.value })} /></div>
              <div className="flex flex-col gap-1.5"><Label htmlFor="b1-cefr">Khung năng lực</Label><Input id="b1-cefr" value="B1" readOnly /></div>
              <div className="flex flex-col gap-1.5"><Label htmlFor="b1-category">Danh mục</Label><Input id="b1-category" value="Tổng hợp (GENERAL)" readOnly /></div>
              <div className="flex flex-col gap-1.5"><Label htmlFor="b1-access">Quyền truy cập</Label><Select id="b1-access" value={state.b1.accessTier} onChange={(value) => dispatch({ type: 'update-b1', field: 'accessTier', value })} options={[{ value: 'free', label: 'Miễn phí' }, { value: 'pro', label: 'Pro' }]} /></div>
              <div className="flex flex-col gap-1.5"><Label htmlFor="b1-description">Mô tả ngắn (không bắt buộc)</Label><Input id="b1-description" value={state.b1.description} onChange={(event) => dispatch({ type: 'update-b1', field: 'description', value: event.target.value })} placeholder="Giới thiệu ngắn cho người học" /></div>
            </div>
          ) : null}

          {state.step === 'initialization' ? (
            <div className="grid gap-3">
              {([
                ['blank', 'Tạo đề trống', 'Tự tạo từng phần và nội dung từ đầu.'],
                ['structure_only', 'Sao chép cấu trúc', 'Giữ bố cục các phần, không sao chép nội dung.'],
                ['full_content', 'Sao chép toàn bộ nội dung', 'Tạo bản nội dung riêng; media nguồn vẫn được dùng chung.'],
              ] as const).map(([mode, label, description]) => (
                <Button key={mode} type="button" variant={state.b1.initializationMode === mode ? 'secondary' : 'ghost'} onClick={() => dispatch({ type: 'choose-initialization', mode })} className="h-auto justify-start whitespace-normal p-4 text-left"><span className="flex flex-col gap-1"><span>{label}</span><span className="text-sm font-semibold text-muted-foreground">{description}</span></span></Button>
              ))}
            </div>
          ) : null}

          {state.step === 'source' ? <B1SourceExamPicker selectedSourceId={state.b1.sourceExamId} onSelect={(sourceExamId) => dispatch({ type: 'select-source', sourceExamId })} /> : null}

          {state.step === 'summary' ? (
            <div className="flex flex-col gap-3">
              <h3 className="text-lg font-black">Kiểm tra trước khi tạo</h3>
              <div className="border-2 border-border bg-muted/20 p-4 text-sm font-bold">
                <p>{state.format === 'legacy' ? state.legacy.title : state.b1.title}</p>
                {state.format === 'b1_practice' ? <><p className="mt-2">B1 · GENERAL · {state.b1.accessTier === 'free' ? 'Miễn phí' : 'Pro'} · {state.b1.duration} phút</p><p className="mt-2 text-muted-foreground">{initializationSummary(state.b1.initializationMode)}</p></> : <p className="mt-2 text-muted-foreground">{state.legacy.category}</p>}
              </div>
            </div>
          ) : null}
        </div>

        {state.step !== 'format' ? <div className="mt-6 flex justify-between gap-3 border-t-2 border-border pt-4"><Button type="button" variant="ghost" onClick={back} disabled={submitting}>Quay lại</Button>{state.step === 'details' ? <Button type="button" onClick={state.format === 'legacy' ? submitLegacy : nextFromDetails} disabled={submitting}>{state.format === 'legacy' && submitting ? 'Đang tạo...' : state.format === 'legacy' ? 'Tạo đề thi' : 'Tiếp tục'}</Button> : null}{state.step === 'initialization' ? <Button type="button" onClick={nextFromInitialization}>Tiếp tục</Button> : null}{state.step === 'source' ? <Button type="button" onClick={nextFromSource}>Tiếp tục</Button> : null}{state.step === 'summary' ? <Button type="button" onClick={() => setConfirming(true)}>Tạo đề B1</Button> : null}</div> : null}
      </section>

      <ConfirmModal open={confirming} title={state.format === 'legacy' ? 'Tạo đề thi?' : 'Tạo đề B1?'} description="Bạn có thể tiếp tục chỉnh sửa nội dung ngay sau khi tạo." confirmLabel={submitting ? 'Đang tạo...' : 'Xác nhận tạo đề'} cancelLabel="Quay lại kiểm tra" variant="primary" confirmDisabled={submitting} onConfirm={() => void submit()} onCancel={() => !submitting && setConfirming(false)} />
    </div>
  )
}
