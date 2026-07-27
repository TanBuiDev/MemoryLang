import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowLeft, ArrowUp, CheckCircle2, FileAudio, Layers, Plus, Save } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChoiceListEditor, type EditableChoiceQuestion } from '@/components/admin/exam-presentations/ChoiceListEditor'
import { InlineGapEditor } from '@/components/admin/exam-presentations/InlineGapEditor'
import { LongFormPromptEditor, type LongFormPromptValue } from '@/components/admin/exam-presentations/LongFormPromptEditor'
import { PresentationPicker } from '@/components/admin/exam-presentations/PresentationPicker'
import { PresentationPreview } from '@/components/admin/exam-presentations/PresentationPreview'
import { PromptSampleEditor, type PromptSampleDraft } from '@/components/admin/exam-presentations/PromptSampleEditor'
import { TransformationEditor, type EditableTransformationQuestion } from '@/components/admin/exam-presentations/TransformationEditor'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Input, Label } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { getPresentationDefinition, isPresentationReadyForPublication, PRESENTATION_REGISTRY } from '@/features/exam-content/presentationRegistry'
import { getExamPublishReadiness } from '@/features/exam-content/publishReadiness'
import { createInlineGapDraft, serializeInlineGapDraft, type InlineGapDraft, type InlineGapSegment } from '@/features/exam-content/inlineGapDraft'
import { adminExamContentService, type AdminExamContentQuestion } from '@/services/supabase/adminExamContent.service'
import type { ExamGradingMode, ExamPresentationType, ExamSkill } from '@/types/exam.types'

const gradingModeLabels: Record<ExamGradingMode, string> = {
  single_choice: 'Chọn một đáp án',
  exact_text: 'Khớp chính xác',
  normalized_text: 'So khớp đã chuẩn hóa',
  manual: 'Chấm thủ công',
  sample_compare: 'So sánh bài mẫu',
  matching: 'Chấm cặp ghép',
  ordered_list: 'Chấm thứ tự',
}

const sectionSkillOptions: Array<{ value: ExamSkill; label: string }> = [
  { value: 'grammar', label: 'Grammar & Use of English' }, { value: 'signs', label: 'Signs' },
  { value: 'reading', label: 'Reading' }, { value: 'cloze', label: 'Cloze' },
  { value: 'transformation', label: 'Sentence Transformation' }, { value: 'listening', label: 'Listening' },
  { value: 'writing', label: 'Writing' }, { value: 'speaking', label: 'Speaking' },
]

function getDefaultPresentationForSkill(skill: ExamSkill): ExamPresentationType {
  if (skill === 'speaking') return 'speaking_script_prompt'
  if (skill === 'writing') return 'long_form_prompt'
  return 'choice_list'
}

function createSectionSourceKey() {
  const unique = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `b1-section-${unique}`
}

function toEditableChoiceQuestions(questions: AdminExamContentQuestion[]): EditableChoiceQuestion[] {
  return questions.map((question) => ({
    ...question,
    id: question.id,
    activity_id: question.activity_id,
    source_key: question.source_key,
    prompt: question.prompt,
    order_index: question.order_index,
    options: Array.isArray(question.options)
      ? question.options.flatMap((option) => {
        if (!option || typeof option !== 'object') return []
        const record = option as Record<string, unknown>
        if (typeof record.key !== 'string' || typeof record.text !== 'string') return []
        return [{ key: record.key, text: record.text, is_correct: Boolean(record.is_correct) }]
      })
      : [],
    translation: typeof question.translation === 'string' ? question.translation : null,
    explanation: typeof question.explanation === 'string' ? question.explanation : null,
  }))
}

function toInlineGapDraft(resource: { passage?: string | null; content?: string | null; content_blocks?: unknown; questions: AdminExamContentQuestion[] }): InlineGapDraft {
  if (Array.isArray(resource.content_blocks)) {
    const block = resource.content_blocks.find((item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === 'object' && (item as Record<string, unknown>).type === 'inline_gap_passage',
    )
    if (block && Array.isArray(block.segments)) {
      const segments: InlineGapSegment[] = []
      block.segments.forEach((item) => {
        if (!item || typeof item !== 'object') return
        const segment = item as Record<string, unknown>
        if (segment.type === 'text' && typeof segment.value === 'string') {
          segments.push({ type: 'text', value: segment.value })
          return
        }
        if (segment.type === 'gap' && typeof segment.gapId === 'string' && typeof segment.label === 'string') {
          segments.push({ type: 'gap', gapId: segment.gapId, label: segment.label })
        }
      })
      const gaps = segments.filter((segment): segment is Extract<InlineGapSegment, { type: 'gap' }> => segment.type === 'gap').map((segment) => {
        const question = resource.questions.find((item) => item.id === segment.gapId)
        return { id: segment.gapId, label: segment.label, acceptedAnswers: question?.accepted_answers ?? [] }
      })
      if (segments.length > 0) return { segments, gaps }
    }
  }
  return createInlineGapDraft(resource.passage ?? resource.content ?? '', resource.questions)
}

function getEditorGuidance(type: ExamPresentationType) {
  switch (type) {
    case 'passage_text_inline':
    case 'passage_choice_inline':
      return 'Trình soạn đoạn văn có ô trống sẽ giúp bạn tạo từng blank, đáp án và nhãn hiển thị trực quan.'
    case 'sentence_transformation':
      return 'Trình soạn viết lại câu sẽ tách câu gốc, từ khóa, phần trước ô trống và phần sau ô trống.'
    case 'long_form_prompt':
    case 'speaking_script_prompt':
      return 'Trình soạn đề tự luận sẽ cho phép nhập prompt, hướng dẫn, audio/TTS và bài mẫu để học viên so sánh.'
    case 'image_choice_list':
      return 'Trình soạn câu hỏi ảnh sẽ cho phép gắn ảnh/sign, alt text và các lựa chọn đáp án.'
    case 'passage_questions':
      return 'Trình soạn bài đọc sẽ đặt passage ở trên, sau đó quản lý câu hỏi trắc nghiệm riêng bên dưới.'
    default:
      return 'Trình soạn câu hỏi sẽ hiển thị câu hỏi, các lựa chọn, đáp án đúng, bản dịch và lời giải chi tiết.'
  }
}

export function AdminB1ExamContentBuilderPage() {
  const { id = '' } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [selectedSectionKey, setSelectedSectionKey] = useState<string | null>(null)
  const [presentationType, setPresentationType] = useState<ExamPresentationType>('choice_list')
  const [gradingMode, setGradingMode] = useState<ExamGradingMode>('single_choice')
  const [editedQuestions, setEditedQuestions] = useState<EditableChoiceQuestion[]>([])
  const [inlineGapDraft, setInlineGapDraft] = useState<InlineGapDraft | null>(null)
  const [transformationQuestions, setTransformationQuestions] = useState<EditableTransformationQuestion[]>([])
  const [longFormValue, setLongFormValue] = useState<LongFormPromptValue>({ prompt: '', instructions: '' })
  const [pendingDeleteSampleId, setPendingDeleteSampleId] = useState<string | null>(null)
  const [isCreateSectionOpen, setIsCreateSectionOpen] = useState(false)
  const [newSectionTitle, setNewSectionTitle] = useState('')
  const [newSectionSkill, setNewSectionSkill] = useState<ExamSkill>('grammar')
  const [newSectionPresentationType, setNewSectionPresentationType] = useState<ExamPresentationType>('choice_list')
  const closeCreateSectionModal = useCallback(() => setIsCreateSectionOpen(false), [])

  const examQuery = useQuery({
    queryKey: ['admin-b1-exam-content', id],
    queryFn: () => adminExamContentService.getExamContent(id),
    enabled: Boolean(id),
  })
  const selectedSection = useMemo(() => {
    const sections = examQuery.data?.sections ?? []
    return sections.find((section) => section.source_key === selectedSectionKey) ?? sections[0] ?? null
  }, [examQuery.data?.sections, selectedSectionKey])
  const selectedResource = selectedSection?.resource ?? null
  const definition = getPresentationDefinition(presentationType)
  const publishReadiness = useMemo(
    () => examQuery.data ? getExamPublishReadiness(examQuery.data) : { canPublish: false, issues: [] },
    [examQuery.data],
  )
  const promptSamplesQuery = useQuery({
    queryKey: ['admin-b1-prompt-samples', selectedResource?.id],
    queryFn: () => adminExamContentService.listPromptSamples(selectedResource!.id),
    enabled: selectedResource?.kind === 'prompt',
  })
  const previewQuestions = useMemo(() => {
    if (presentationType === 'sentence_transformation') {
      return transformationQuestions.map((question) => ({
        id: question.id,
        prompt: question.prompt,
        acceptedAnswers: question.acceptedAnswers,
      }))
    }
    const inlineAnswers = new Map(inlineGapDraft?.gaps.map((gap) => [gap.id, gap.acceptedAnswers]) ?? [])
    return editedQuestions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      options: question.options,
      acceptedAnswers: inlineAnswers.get(question.id) ?? [],
    }))
  }, [editedQuestions, inlineGapDraft?.gaps, presentationType, transformationQuestions])

  useEffect(() => {
    if (!selectedResource) return
    const nextType = selectedResource.presentation_type
      ?? (selectedResource.kind === 'prompt' ? 'long_form_prompt' : 'choice_list')
    const nextDefinition = getPresentationDefinition(nextType)
    setPresentationType(nextType)
    setGradingMode(selectedResource.grading_mode ?? nextDefinition.compatibleGradingModes[0])
    setEditedQuestions(toEditableChoiceQuestions(selectedResource.questions))
    setInlineGapDraft(toInlineGapDraft(selectedResource))
    setTransformationQuestions(selectedResource.questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      acceptedAnswers: question.accepted_answers ?? [],
      translation: question.translation ?? null,
      explanation: question.explanation ?? null,
    })))
    setLongFormValue({ prompt: selectedResource.prompt ?? '', instructions: selectedResource.instructions ?? '' })
  }, [selectedResource?.id, selectedResource?.presentation_type, selectedResource?.grading_mode, selectedResource?.kind])

  const savePresentation = useMutation({
    mutationFn: async () => {
      if (!selectedResource) throw new Error('Chọn một section có nội dung trước khi lưu.')
      await adminExamContentService.updateResourcePresentation({
        resourceKind: selectedResource.kind,
        resourceId: selectedResource.id,
        presentationType,
        gradingMode,
      })
      const questionsToSave: Array<{
        id: string
        prompt: string
        options?: EditableChoiceQuestion['options']
        translation: string | null
        explanation: string | null
        accepted_answers?: string[]
      }> = presentationType === 'sentence_transformation'
        ? transformationQuestions.map((question) => ({
          id: question.id, prompt: question.prompt, options: undefined, translation: question.translation ?? null,
          explanation: question.explanation ?? null, accepted_answers: question.acceptedAnswers,
        }))
        : editedQuestions.map((question) => ({
          id: question.id, prompt: question.prompt, options: question.options, translation: question.translation ?? null,
          explanation: question.explanation ?? null,
        }))
      await Promise.all(questionsToSave.map((question) => adminExamContentService.updateQuestion(question.id, {
        prompt: question.prompt,
        ...(question.options ? { options: question.options } : {}),
        translation: question.translation ?? null,
        explanation: question.explanation ?? null,
        ...(question.accepted_answers ? { accepted_answers: question.accepted_answers } : {}),
      })))
      if (selectedResource.kind === 'prompt') {
        await adminExamContentService.updatePromptText(selectedResource.id, longFormValue)
      }
      if ((presentationType === 'passage_text_inline' || presentationType === 'passage_choice_inline') && inlineGapDraft) {
        await Promise.all(inlineGapDraft.gaps
          .filter((gap) => selectedResource.questions.some((question) => question.id === gap.id))
          .map((gap) => adminExamContentService.updateQuestion(gap.id, { accepted_answers: gap.acceptedAnswers })))
        await adminExamContentService.updateResourceContent({
          resourceKind: selectedResource.kind,
          resourceId: selectedResource.id,
          contentBlocks: serializeInlineGapDraft(inlineGapDraft).blocks,
        })
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-b1-exam-content', id] })
    },
  })

  const reorderSections = useMutation({
    mutationFn: (sectionIds: string[]) => adminExamContentService.reorderSections(sectionIds),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-b1-exam-content', id] })
    },
  })

  function moveSection(sectionId: string, direction: 'up' | 'down') {
    const sections = examQuery.data?.sections ?? []
    const currentIndex = sections.findIndex((section) => section.id === sectionId)
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= sections.length) return
    const reordered = [...sections]
    ;[reordered[currentIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[currentIndex]]
    reorderSections.mutate(reordered.map((section) => section.id))
  }

  const savePromptSample = useMutation({
    mutationFn: async (sample: PromptSampleDraft) => {
      if (!selectedResource || selectedResource.kind !== 'prompt') throw new Error('Chỉ Writing hoặc Speaking mới có bài mẫu.')
      return adminExamContentService.savePromptSample({
        id: sample.id,
        promptId: selectedResource.id,
        title: sample.title.trim(),
        content: sample.content,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-b1-prompt-samples', selectedResource?.id] })
    },
  })

  const deletePromptSample = useMutation({
    mutationFn: (sampleId: string) => adminExamContentService.deletePromptSample(sampleId),
    onSuccess: async () => {
      setPendingDeleteSampleId(null)
      await queryClient.invalidateQueries({ queryKey: ['admin-b1-prompt-samples', selectedResource?.id] })
    },
  })

  const createSection = useMutation({
    mutationFn: () => {
      const title = newSectionTitle.trim()
      if (!title) throw new Error('Nhập tên section trước khi tạo.')
      const nextOrder = Math.max(0, ...(examQuery.data?.sections.map((section) => section.order_index) ?? [])) + 1
      return adminExamContentService.createSection({
        examId: id,
        sourceKey: createSectionSourceKey(),
        title,
        skill: newSectionSkill,
        presentationType: newSectionPresentationType,
        orderIndex: nextOrder,
      })
    },
    onSuccess: async (section) => {
      setSelectedSectionKey(section.source_key)
      setNewSectionTitle('')
      setIsCreateSectionOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['admin-b1-exam-content', id] })
    },
  })

  const newSectionPresentationOptions = Object.values(PRESENTATION_REGISTRY)
    .filter((definition) => isPresentationReadyForPublication(definition.type)
      && (newSectionSkill === 'writing' || newSectionSkill === 'speaking'
        ? definition.resourceKind === 'prompt'
        : definition.resourceKind === 'activity'))
    .map((definition) => ({ value: definition.type, label: definition.label }))

  if (examQuery.isLoading) {
    return <div className="neo-card mx-auto max-w-7xl p-10 text-center font-black">Đang tải cấu trúc đề B1...</div>
  }
  if (examQuery.isError || !examQuery.data) {
    return <div className="neo-card mx-auto max-w-7xl p-10 text-center font-black text-danger">Không thể tải nội dung đề thi.</div>
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-12">
      <header className="neo-card flex flex-wrap items-start justify-between gap-4 bg-primary p-6 shadow-[4px_4px_0_var(--border)]">
        <div className="space-y-2">
          <Button asChild variant="ghost" className="min-h-8 px-2 text-xs">
            <Link to="/app/admin/exams"><ArrowLeft size={14} /> Danh sách đề</Link>
          </Button>
          <div>
            <p className="text-xs font-black uppercase text-primary-foreground/80">Quản trị đề B1</p>
            <h1 className="text-3xl font-black text-primary-foreground">Trình xây dựng nội dung đề B1</h1>
            <p className="mt-1 text-sm font-semibold text-primary-foreground/90">{examQuery.data.title}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="ghost" className="min-h-9 px-3 text-xs">
            <Link to="/app/admin/exam-media"><FileAudio size={15} /> Quản lý media và TTS</Link>
          </Button>
          <span className={`border-2 border-border px-3 py-1 text-xs font-black ${examQuery.data.is_published ? 'bg-secondary text-secondary-foreground' : 'bg-background text-foreground'}`}>
            {examQuery.data.is_published ? 'Đã xuất bản' : 'Bản nháp'}
          </span>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="neo-card h-fit space-y-3 bg-card p-4 shadow-[3px_3px_0_var(--border)]">
          <div className="flex items-center justify-between gap-2 border-b-2 border-border pb-3">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase"><Layers size={16} /> Cấu trúc đề</h2>
            <Button type="button" variant="primary" onClick={() => setIsCreateSectionOpen(true)} className="min-h-8 px-2 text-xs"><Plus size={14} /> Thêm section</Button>
          </div>
          <div className="space-y-2">
            {examQuery.data.sections.map((section, index) => {
              const isSelected = selectedSection?.id === section.id
              return (
                <div key={section.id} className="flex items-stretch gap-1">
                  <Button
                    type="button"
                    variant={isSelected ? 'secondary' : 'ghost'}
                    onClick={() => setSelectedSectionKey(section.source_key)}
                    className="h-auto min-w-0 flex-1 justify-start whitespace-normal px-3 py-3 text-left"
                  >
                    <span className="mr-2 text-xs opacity-70">{index + 1}.</span>
                    <span className="min-w-0"><span className="block truncate text-sm">{section.title}</span><span className="block text-[11px] opacity-75">{section.skill}</span></span>
                  </Button>
                  <div className="flex flex-col gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label={`Di chuyển ${section.title} lên`}
                      disabled={index === 0 || reorderSections.isPending}
                      onClick={() => moveSection(section.id, 'up')}
                      className="min-h-0 px-2 py-1"
                    ><ArrowUp size={14} /></Button>
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label={`Di chuyển ${section.title} xuống`}
                      disabled={index === examQuery.data.sections.length - 1 || reorderSections.isPending}
                      onClick={() => moveSection(section.id, 'down')}
                      className="min-h-0 px-2 py-1"
                    ><ArrowDown size={14} /></Button>
                  </div>
                </div>
              )
            })}
          </div>
        </aside>

        {selectedSection && selectedResource ? (
          <main className="space-y-6">
            <section className="neo-card space-y-3 bg-card p-5 shadow-[3px_3px_0_var(--border)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-border pb-3">
                <div>
                  <p className="text-xs font-black uppercase text-secondary">Section đang chỉnh</p>
                  <h2 className="text-xl font-black">{selectedSection.title}</h2>
                </div>
                <span className="border-2 border-border bg-muted px-2 py-1 text-xs font-black">{selectedResource.kind === 'prompt' ? 'Tự luận' : `${selectedResource.questions.length} câu hỏi`}</span>
              </div>
              <PresentationPicker
                resourceKind={selectedResource.kind}
                value={presentationType}
                onChange={(type) => {
                  setPresentationType(type)
                  setGradingMode(getPresentationDefinition(type).compatibleGradingModes[0])
                }}
              />
            </section>

            <section className="neo-card space-y-4 bg-card p-5 shadow-[3px_3px_0_var(--border)]">
              <div className="border-b-2 border-border pb-3">
                <h2 className="text-lg font-black">Cách chấm và trình soạn nội dung</h2>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">{getEditorGuidance(presentationType)}</p>
              </div>
              <div className="flex flex-wrap gap-2" aria-label="Chọn cách chấm điểm">
                {definition.compatibleGradingModes.map((mode) => (
                  <Button
                    key={mode}
                    type="button"
                    variant={gradingMode === mode ? 'secondary' : 'ghost'}
                    onClick={() => setGradingMode(mode)}
                    className="min-h-9 px-3 text-xs"
                  >
                    {gradingMode === mode && <CheckCircle2 size={14} />}{gradingModeLabels[mode]}
                  </Button>
                ))}
              </div>
              {['choice_list', 'boolean_list', 'image_choice_list', 'passage_questions', 'passage_choice_inline'].includes(presentationType) && (
                <ChoiceListEditor questions={editedQuestions} onChange={setEditedQuestions} disabled={savePresentation.isPending} />
              )}
              {(presentationType === 'passage_text_inline' || presentationType === 'passage_choice_inline') && inlineGapDraft && (
                <InlineGapEditor draft={inlineGapDraft} onChange={setInlineGapDraft} disabled={savePresentation.isPending} />
              )}
              {presentationType === 'sentence_transformation' && (
                <TransformationEditor questions={transformationQuestions} onChange={setTransformationQuestions} disabled={savePresentation.isPending} />
              )}
              {(presentationType === 'long_form_prompt' || presentationType === 'speaking_script_prompt') && (
                <>
                  <LongFormPromptEditor value={longFormValue} onChange={setLongFormValue} speaking={presentationType === 'speaking_script_prompt'} disabled={savePresentation.isPending} />
                  <PromptSampleEditor
                    samples={promptSamplesQuery.data ?? []}
                    onSave={(sample) => savePromptSample.mutate(sample)}
                    onRequestDelete={(sample) => setPendingDeleteSampleId(sample.id)}
                    disabled={savePresentation.isPending || savePromptSample.isPending || deletePromptSample.isPending}
                  />
                </>
              )}
              <PresentationPreview
                presentationType={presentationType}
                title={selectedSection.title}
                instructions={longFormValue.instructions || selectedResource.instructions}
                passage={selectedResource.passage ?? selectedResource.content}
                prompt={longFormValue.prompt || selectedResource.prompt}
                questions={previewQuestions}
              />
              {savePresentation.isError && <p className="text-sm font-bold text-danger">Không thể lưu: {savePresentation.error.message}</p>}
              <Button
                variant="primary"
                disabled={savePresentation.isPending}
                onClick={() => savePresentation.mutate()}
                className="font-black"
              >
                <Save size={16} /> {savePresentation.isPending ? 'Đang lưu...' : 'Lưu cách trình bày'}
              </Button>
            </section>
          </main>
        ) : (
          <main className="neo-card p-8 text-center font-bold text-muted-foreground">Section này chưa có resource để chỉnh sửa.</main>
        )}
      </div>
      <section className={`neo-card space-y-3 p-5 shadow-[3px_3px_0_var(--border)] ${publishReadiness.canPublish ? 'border-secondary bg-secondary/10' : 'border-danger bg-card'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-border pb-3">
          <div><p className="text-xs font-black uppercase text-secondary">Release gate</p><h2 className="text-lg font-black">Kiểm tra trước khi xuất bản</h2></div>
          <span className={`border-2 border-border px-3 py-1 text-xs font-black ${publishReadiness.canPublish ? 'bg-secondary text-secondary-foreground' : 'bg-danger text-white'}`}>
            {publishReadiness.canPublish ? 'Sẵn sàng xuất bản' : `${publishReadiness.issues.length} việc cần hoàn thiện`}
          </span>
        </div>
        {publishReadiness.canPublish ? (
          <p className="font-semibold">Tất cả section bắt buộc đã có nội dung, đáp án, review, media và bài mẫu cần thiết.</p>
        ) : (
          <ul className="space-y-2 text-sm font-semibold">
            {publishReadiness.issues.map((issue, index) => <li key={`${issue.sectionId}-${index}`} className="border-2 border-danger/40 bg-danger/10 px-3 py-2">{issue.message}</li>)}
          </ul>
        )}
      </section>
      <ConfirmModal
        open={isCreateSectionOpen}
        title="Tạo section mới"
        description="Section mới luôn ở trạng thái bản nháp và có một nội dung khởi đầu để bạn chỉnh sửa."
        confirmLabel={createSection.isPending ? 'Đang tạo...' : 'Tạo section'}
        cancelLabel="Hủy"
        variant="primary"
        confirmDisabled={!newSectionTitle.trim() || createSection.isPending}
        onConfirm={() => createSection.mutate()}
        onCancel={closeCreateSectionModal}
      >
        <div className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="new-section-title">Tên section</Label><Input id="new-section-title" value={newSectionTitle} onChange={(event) => setNewSectionTitle(event.target.value)} placeholder="Ví dụ: Listening Part 2" /></div>
          <div className="space-y-1.5"><Label htmlFor="new-section-skill">Kỹ năng</Label><Select id="new-section-skill" value={newSectionSkill} options={sectionSkillOptions} onChange={(value) => {
            const skill = value as ExamSkill
            setNewSectionSkill(skill)
            setNewSectionPresentationType(getDefaultPresentationForSkill(skill))
          }} /></div>
          <div className="space-y-1.5"><Label htmlFor="new-section-presentation">Cách học viên làm bài</Label><Select id="new-section-presentation" value={newSectionPresentationType} options={newSectionPresentationOptions} onChange={(value) => setNewSectionPresentationType(value as ExamPresentationType)} /></div>
          {createSection.isError && <p className="text-sm font-bold text-danger">Không thể tạo section: {createSection.error.message}</p>}
        </div>
      </ConfirmModal>
      <ConfirmModal
        open={Boolean(pendingDeleteSampleId)}
        title="Xóa bài mẫu này?"
        description="Bài mẫu sẽ không còn xuất hiện để học viên so sánh. Bài Writing/Speaking người học đã nộp không bị xóa."
        confirmLabel={deletePromptSample.isPending ? 'Đang xóa...' : 'Xóa bài mẫu'}
        cancelLabel="Giữ lại"
        variant="danger"
        confirmDisabled={deletePromptSample.isPending}
        onConfirm={() => {
          if (pendingDeleteSampleId) deletePromptSample.mutate(pendingDeleteSampleId)
        }}
        onCancel={() => setPendingDeleteSampleId(null)}
      />
    </div>
  )
}

export default AdminB1ExamContentBuilderPage
