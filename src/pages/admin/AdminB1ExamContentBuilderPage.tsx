import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, Edit3, Eye, FileAudio, GripVertical, Layers, Plus, Save, ShieldAlert, ShieldCheck, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChoiceListEditor, type EditableChoiceQuestion } from '@/components/admin/exam-presentations/ChoiceListEditor'
import { ReadingRichTextEditor } from '@/components/reading/ReadingRichTextEditor'
import { InlineGapEditor } from '@/components/admin/exam-presentations/InlineGapEditor'
import { LongFormPromptEditor, type LongFormPromptValue } from '@/components/admin/exam-presentations/LongFormPromptEditor'
import { MatchingEditor, type MatchingEditorValue } from '@/components/admin/exam-presentations/MatchingEditor'
import { OrderingEditor, type OrderingEditorValue } from '@/components/admin/exam-presentations/OrderingEditor'
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
import { getRichPassageHtml } from '@/features/exam-content/richPassage'
import { adminExamContentService, type AdminExamContentQuestion } from '@/services/supabase/adminExamContent.service'
import { showToast } from '@/components/ui/toast'
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

const skillBadges: Record<ExamSkill, { label: string; color: string }> = {
  grammar: { label: 'Grammar', color: 'bg-blue-100 text-blue-900 border-blue-400' },
  signs: { label: 'Signs', color: 'bg-amber-100 text-amber-900 border-amber-400' },
  reading: { label: 'Reading', color: 'bg-emerald-100 text-emerald-900 border-emerald-400' },
  cloze: { label: 'Cloze', color: 'bg-teal-100 text-teal-900 border-teal-400' },
  transformation: { label: 'Rewrite', color: 'bg-purple-100 text-purple-900 border-purple-400' },
  listening: { label: 'Listening', color: 'bg-indigo-100 text-indigo-900 border-indigo-400' },
  writing: { label: 'Writing', color: 'bg-rose-100 text-rose-900 border-rose-400' },
  speaking: { label: 'Speaking', color: 'bg-orange-100 text-orange-900 border-orange-400' },
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
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'readiness'>('editor')
  const [selectedSectionKey, setSelectedSectionKey] = useState<string | null>(null)
  const [presentationType, setPresentationType] = useState<ExamPresentationType>('choice_list')
  const [gradingMode, setGradingMode] = useState<ExamGradingMode>('single_choice')
  const [editedQuestions, setEditedQuestions] = useState<EditableChoiceQuestion[]>([])
  const [inlineGapDraft, setInlineGapDraft] = useState<InlineGapDraft | null>(null)
  const [transformationQuestions, setTransformationQuestions] = useState<EditableTransformationQuestion[]>([])
  const [longFormValue, setLongFormValue] = useState<LongFormPromptValue>({ prompt: '', instructions: '' })
  const [passageHtml, setPassageHtml] = useState('')
  const [pendingDeleteSampleId, setPendingDeleteSampleId] = useState<string | null>(null)
  const [pendingDeleteSectionId, setPendingDeleteSectionId] = useState<string | null>(null)
  const [pendingDeleteQuestionId, setPendingDeleteQuestionId] = useState<string | null>(null)
  const [isCreateSectionOpen, setIsCreateSectionOpen] = useState(false)
  const [newSectionTitle, setNewSectionTitle] = useState('')
  const [newSectionSkill, setNewSectionSkill] = useState<ExamSkill>('grammar')
  const [newSectionPresentationType, setNewSectionPresentationType] = useState<ExamPresentationType>('choice_list')
  const [matchingValue, setMatchingValue] = useState<MatchingEditorValue>({ leftItems: [], rightItems: [], pairs: [] })
  const [orderingValue, setOrderingValue] = useState<OrderingEditorValue>({ items: [] })

  // Drag and Drop real-time optimistic state & refs
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const draggedIndexRef = useRef<number | null>(null)

  const closeCreateSectionModal = useCallback(() => setIsCreateSectionOpen(false), [])

  const examQuery = useQuery({
    queryKey: ['admin-exam-content', id],
    queryFn: () => adminExamContentService.getExamContent(id),
    enabled: Boolean(id),
  })

  const sectionsList = useMemo(() => examQuery.data?.sections ?? [], [examQuery.data?.sections])

  // Compute real-time live preview of sections while dragging over items
  const displaySections = useMemo(() => {
    if (draggedIndex === null || dragOverIndex === null || draggedIndex === dragOverIndex) {
      return sectionsList
    }
    if (draggedIndex < 0 || draggedIndex >= sectionsList.length || dragOverIndex < 0 || dragOverIndex >= sectionsList.length) {
      return sectionsList
    }
    const temp = [...sectionsList]
    const [moved] = temp.splice(draggedIndex, 1)
    temp.splice(dragOverIndex, 0, moved)
    return temp
  }, [sectionsList, draggedIndex, dragOverIndex])

  const selectedSection = useMemo(() => {
    return sectionsList.find((section) => section.source_key === selectedSectionKey) ?? sectionsList[0] ?? null
  }, [sectionsList, selectedSectionKey])

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
      image_url: question.image_url,
      metadata: question.metadata,
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
    setPassageHtml(getRichPassageHtml(selectedResource.content_blocks) ?? selectedResource.passage ?? selectedResource.content ?? '')
    const matching = selectedResource.presentation_config?.matching
    if (matching && typeof matching === 'object' && Array.isArray((matching as MatchingEditorValue).leftItems) && Array.isArray((matching as MatchingEditorValue).pairs)) {
      setMatchingValue(matching as MatchingEditorValue)
    } else setMatchingValue({ leftItems: [], rightItems: [], pairs: [] })
    const ordering = selectedResource.presentation_config?.ordering
    if (ordering && typeof ordering === 'object' && Array.isArray((ordering as OrderingEditorValue).items)) {
      setOrderingValue(ordering as OrderingEditorValue)
    } else setOrderingValue({ items: [] })
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
        image_url?: string | null
        metadata?: Record<string, unknown>
      }> = presentationType === 'sentence_transformation'
        ? transformationQuestions.map((question) => ({
          id: question.id, prompt: question.prompt, options: undefined, translation: question.translation ?? null,
          explanation: question.explanation ?? null, accepted_answers: question.acceptedAnswers,
        }))
        : editedQuestions.map((question) => ({
          id: question.id, prompt: question.prompt, options: question.options, translation: question.translation ?? null,
          explanation: question.explanation ?? null,
          image_url: question.image_url ?? null,
          metadata: question.metadata ?? {},
        }))
      await Promise.all(questionsToSave.map((question) => adminExamContentService.updateQuestion(question.id, {
        prompt: question.prompt,
        ...(question.options ? { options: question.options } : {}),
        translation: question.translation ?? null,
        explanation: question.explanation ?? null,
        ...(question.accepted_answers ? { accepted_answers: question.accepted_answers } : {}),
        ...(question.image_url !== undefined ? { image_url: question.image_url } : {}),
        ...(question.metadata ? { metadata: question.metadata } : {}),
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
      if (presentationType === 'passage_questions') {
        await adminExamContentService.updateResourceContent({
          resourceKind: selectedResource.kind,
          resourceId: selectedResource.id,
          contentBlocks: [{ type: 'rich_text', value: passageHtml }],
        })
      }
      if (presentationType === 'matching') {
        await adminExamContentService.updateResourcePresentationConfig({ resourceKind: selectedResource.kind, resourceId: selectedResource.id, presentationConfig: { matching: matchingValue } })
      }
      if (presentationType === 'ordering') {
        await adminExamContentService.updateResourcePresentationConfig({ resourceKind: selectedResource.kind, resourceId: selectedResource.id, presentationConfig: { ordering: orderingValue } })
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-exam-content', id] })
      showToast({ type: 'success', title: 'Đã lưu cách trình bày và nội dung section!' })
    },
  })

  const uploadQuestionImage = async (question: EditableChoiceQuestion, file: File) => {
    try {
      const imageUrl = await adminExamContentService.uploadQuestionImage(file, question.source_key)
      setEditedQuestions((current) => current.map((item) => item.id === question.id ? { ...item, image_url: imageUrl } : item))
      showToast({ type: 'success', title: 'Đã tải ảnh, hãy lưu cách trình bày để áp dụng.' })
    } catch { showToast({ type: 'error', title: 'Không thể tải ảnh minh họa' }) }
  }

  const reorderSections = useMutation({
    mutationFn: (sectionIds: string[]) => adminExamContentService.reorderSections(sectionIds),
    onMutate: async (newOrderIds) => {
      await queryClient.cancelQueries({ queryKey: ['admin-exam-content', id] })
      const previousExamData = queryClient.getQueryData(['admin-exam-content', id])
      queryClient.setQueryData(['admin-exam-content', id], (old: unknown) => {
        if (!old || typeof old !== 'object' || !Array.isArray((old as Record<string, unknown>).sections)) return old
        const examRecord = old as { sections: Array<{ id: string }> }
        const sectionMap = new Map(examRecord.sections.map((s) => [s.id, s]))
        const reordered = newOrderIds.map((secId) => sectionMap.get(secId)).filter(Boolean)
        return { ...examRecord, sections: reordered }
      })
      return { previousExamData }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousExamData) {
        queryClient.setQueryData(['admin-exam-content', id], context.previousExamData)
      }
      showToast({ type: 'error', title: 'Không thể lưu thứ tự section' })
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-exam-content', id] })
    },
  })

  // Drag and Drop handlers with instant optimistic UI update
  const handleDragStart = (e: React.DragEvent, index: number) => {
    draggedIndexRef.current = index
    setDraggedIndex(index)
    e.dataTransfer?.setData?.('text/plain', String(index))
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move'
    }
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndexRef.current !== null && draggedIndexRef.current !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDragEnd = () => {
    draggedIndexRef.current = null
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    const dataIndex = e.dataTransfer?.getData?.('text/plain') ?? ''
    const sourceIndex = draggedIndexRef.current ?? (dataIndex !== '' ? Number(dataIndex) : null)

    // Reset drag indicators immediately for responsive UX
    draggedIndexRef.current = null
    setDraggedIndex(null)
    setDragOverIndex(null)

    if (sourceIndex === null || sourceIndex === dropIndex || Number.isNaN(sourceIndex)) return
    if (sourceIndex < 0 || sourceIndex >= sectionsList.length || dropIndex < 0 || dropIndex >= sectionsList.length) return

    const reordered = [...sectionsList]
    const [removed] = reordered.splice(sourceIndex, 1)
    reordered.splice(dropIndex, 0, removed)

    // Instantly update React Query Cache at 0ms delay!
    queryClient.setQueryData(['admin-exam-content', id], (old: unknown) => {
      if (!old || typeof old !== 'object') return old
      return { ...old, sections: reordered }
    })

    // Trigger server mutation asynchronously in background
    reorderSections.mutate(reordered.map((section) => section.id))
    showToast({ type: 'success', title: 'Đã cập nhật thứ tự các section!' })
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
      showToast({ type: 'success', title: 'Đã lưu bài mẫu thành công!' })
    },
  })

  const deletePromptSample = useMutation({
    mutationFn: (sampleId: string) => adminExamContentService.deletePromptSample(sampleId),
    onSuccess: async () => {
      setPendingDeleteSampleId(null)
      await queryClient.invalidateQueries({ queryKey: ['admin-b1-prompt-samples', selectedResource?.id] })
    },
  })

  const deleteSection = useMutation({
    mutationFn: (sectionId: string) => adminExamContentService.deleteSection(sectionId),
    onSuccess: async () => {
      setPendingDeleteSectionId(null)
      setSelectedSectionKey(null)
      await queryClient.invalidateQueries({ queryKey: ['admin-exam-content', id] })
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
      await queryClient.invalidateQueries({ queryKey: ['admin-exam-content', id] })
      showToast({ type: 'success', title: 'Đã tạo section mới!' })
    },
  })

  const createQuestion = useMutation({
    mutationFn: async () => {
      if (!selectedResource || selectedResource.kind !== 'activity') throw new Error('Chỉ section có câu hỏi mới thêm được câu mới.')
      const nextNumber = String(Math.max(0, ...selectedResource.questions.map((question) => Number(question.source_number) || 0)) + 1)
      const unique = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const question = await adminExamContentService.createQuestion({
        activityId: selectedResource.id,
        sourceKey: `${selectedResource.source_key}-q${nextNumber}-${unique}`,
        sourceNumber: nextNumber,
        presentationType,
        orderIndex: selectedResource.questions.length,
      })
      return question
    },
    onSuccess: async (question) => {
      const editable = toEditableChoiceQuestions([question])[0]
      setEditedQuestions((current) => [...current, editable])
      setTransformationQuestions((current) => [...current, {
        id: question.id, prompt: question.prompt, acceptedAnswers: question.accepted_answers ?? [],
        translation: question.translation ?? null, explanation: question.explanation ?? null,
      }])
      if (presentationType === 'passage_text_inline' || presentationType === 'passage_choice_inline') {
        setInlineGapDraft((current) => current ? {
          segments: [...current.segments, { type: 'text', value: ' ' }, { type: 'gap', gapId: question.id, label: question.source_number ?? String(current.gaps.length + 1) }, { type: 'text', value: ' '}],
          gaps: [...current.gaps, { id: question.id, label: question.source_number ?? String(current.gaps.length + 1), acceptedAnswers: question.accepted_answers ?? [] }],
        } : current)
      }
      await queryClient.invalidateQueries({ queryKey: ['admin-exam-content', id] })
      showToast({ type: 'success', title: 'Đã thêm câu hỏi mới!' })
    },
  })

  const deleteQuestion = useMutation({
    mutationFn: (questionId: string) => adminExamContentService.deleteQuestion(questionId),
    onSuccess: async (_result, questionId) => {
      setEditedQuestions((current) => current.filter((question) => question.id !== questionId))
      setTransformationQuestions((current) => current.filter((question) => question.id !== questionId))
      setInlineGapDraft((current) => current ? {
        segments: current.segments.filter((segment) => segment.type !== 'gap' || segment.gapId !== questionId),
        gaps: current.gaps.filter((gap) => gap.id !== questionId),
      } : current)
      setPendingDeleteQuestionId(null)
      await queryClient.invalidateQueries({ queryKey: ['admin-exam-content', id] })
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
    <div className="w-full space-y-6 pb-16">
      {/* Top Banner / Header */}
      <header className="neo-card bg-card p-5 border-3 border-border shadow-[4px_4px_0_var(--border)] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" className="min-h-9 px-3 text-xs font-black">
            <Link to="/app/admin/exams"><ArrowLeft size={16} /> Danh sách đề</Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase text-primary tracking-wider bg-primary/10 px-2 py-0.5 border border-primary/30">Quản trị đề</span>
              <span className={`border border-border px-2 py-0.5 text-[11px] font-black ${examQuery.data.is_published ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-foreground'}`}>
                {examQuery.data.is_published ? 'Đã xuất bản' : 'Bản nháp'}
              </span>
            </div>
            <h1 className="text-2xl font-black text-foreground mt-0.5">Trình xây dựng nội dung đề</h1>
            <p className="text-xs font-bold text-muted-foreground mt-0.5">{examQuery.data.title}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="secondary" className="min-h-9 px-3.5 text-xs font-black">
            <Link to={`/app/admin/exams/${id}/media`}><FileAudio size={15} /> Quản lý media và TTS</Link>
          </Button>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 border-2 border-border text-xs font-black ${publishReadiness.canPublish ? 'bg-emerald-100 text-emerald-950' : 'bg-rose-100 text-rose-950'}`}>
            {publishReadiness.canPublish ? <ShieldCheck size={16} className="text-emerald-700" /> : <ShieldAlert size={16} className="text-rose-700" />}
            <span>{publishReadiness.canPublish ? 'Đã sẵn sàng xuất bản' : `${publishReadiness.issues.length} việc cần bổ sung`}</span>
          </div>
        </div>
      </header>

      {/* Main Grid: Left Sidebar (Section List) + Right Workspace */}
      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* Left Sidebar: Section List with Real-time Optimistic Drag & Drop */}
        <aside className="neo-card h-fit space-y-4 bg-card p-4 shadow-[3px_3px_0_var(--border)] border-3 border-border">
          <div className="flex items-center justify-between gap-2 border-b-3 border-border pb-3">
            <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
              <Layers size={16} className="text-primary" /> Cấu trúc đề ({displaySections.length})
            </h2>
            <Button type="button" variant="primary" onClick={() => setIsCreateSectionOpen(true)} className="min-h-8 px-2.5 text-xs font-black">
              <Plus size={14} /> Thêm section
            </Button>
          </div>

          <p className="text-[11px] font-bold text-muted-foreground italic">
            Kéo thả biểu tượng ⠿ để thay đổi thứ tự các section.
          </p>

          <div className="space-y-2">
            {displaySections.map((section, index) => {
              const isSelected = selectedSection?.id === section.id
              const badge = skillBadges[section.skill] ?? { label: section.skill, color: 'bg-muted text-foreground' }

              return (
                <div
                  key={section.id}
                  data-testid={`section-item-${index}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={() => setDragOverIndex(null)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`group flex items-center justify-between gap-2 p-2.5 border-2 transition-all duration-200 ease-in-out cursor-grab active:cursor-grabbing ${
                    draggedIndex === index ? 'opacity-40 border-dashed border-primary bg-muted' : ''
                  } ${
                    dragOverIndex === index ? 'border-primary bg-primary/20 scale-[1.02] shadow-md' : ''
                  } ${
                    isSelected && draggedIndex !== index
                      ? 'border-primary bg-primary/10 shadow-[2px_2px_0_var(--border)]'
                      : 'border-border bg-card hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-muted-foreground hover:text-foreground shrink-0 cursor-grab active:cursor-grabbing" title="Kéo thả để sắp xếp thứ tự">
                      <GripVertical size={16} />
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedSectionKey(section.source_key)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs font-black opacity-60">#{index + 1}</span>
                        <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 border ${badge.color}`}>
                          {badge.label}
                        </span>
                      </div>
                      <p className={`text-xs font-black truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                        {section.title}
                      </p>
                    </button>
                  </div>

                  <Button
                    type="button"
                    variant="danger"
                    aria-label={`Gỡ ${section.title} khỏi đề`}
                    disabled={deleteSection.isPending}
                    onClick={() => setPendingDeleteSectionId(section.id)}
                    className="h-7 w-7 min-h-0 p-0 text-white shrink-0"
                  ><Trash2 size={13} /></Button>
                </div>
              )
            })}
          </div>
        </aside>

        {/* Right Main Workspace: Workspace Header + Tab Navigation + Tab Panels */}
        {selectedSection && selectedResource ? (
          <main className="space-y-6 min-w-0">
            {/* Workspace Header & Tab Bar */}
            <div className="neo-card bg-card p-4 shadow-[3px_3px_0_var(--border)] border-3 border-border space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-border pb-3">
                <div>
                  <p className="text-[11px] font-black uppercase text-secondary tracking-wider">Section đang chỉnh</p>
                  <h2 className="text-xl font-black text-foreground">{selectedSection.title}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="border-2 border-border bg-muted px-2.5 py-1 text-xs font-black">
                    {selectedResource.kind === 'prompt' ? 'Tự luận' : `${selectedResource.questions.length} câu hỏi`}
                  </span>
                </div>
              </div>

              {/* Workspace Tab Switcher */}
              <div className="flex flex-wrap gap-2 border-b-2 border-border pb-2">
                <Button
                  type="button"
                  variant={activeTab === 'editor' ? 'primary' : 'ghost'}
                  onClick={() => setActiveTab('editor')}
                  className="min-h-9 px-4 text-xs font-black"
                >
                  <Edit3 size={15} /> Biên soạn nội dung
                </Button>
                <Button
                  type="button"
                  variant={activeTab === 'preview' ? 'primary' : 'ghost'}
                  onClick={() => setActiveTab('preview')}
                  className="min-h-9 px-4 text-xs font-black"
                >
                  <Eye size={15} /> Xem trước góc nhìn học viên
                </Button>
                <Button
                  type="button"
                  variant={activeTab === 'readiness' ? 'primary' : 'ghost'}
                  onClick={() => setActiveTab('readiness')}
                  className={`min-h-9 px-4 text-xs font-black ${
                    publishReadiness.issues.length > 0 ? 'text-rose-700' : ''
                  }`}
                >
                  <ShieldCheck size={15} /> Kiểm tra xuất bản
                  {publishReadiness.issues.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-rose-600 text-white font-black">
                      {publishReadiness.issues.length}
                    </span>
                  )}
                </Button>
              </div>
            </div>

            {/* TAB 1: BIÊN SOẠN (EDITOR) */}
            <div className={activeTab === 'editor' ? 'space-y-6' : 'hidden'}>
              {/* Presentation Picker Card */}
              <section className="neo-card bg-card p-5 shadow-[3px_3px_0_var(--border)] border-3 border-border">
                <PresentationPicker
                  resourceKind={selectedResource.kind}
                  value={presentationType}
                  onChange={(type) => {
                    setPresentationType(type)
                    setGradingMode(getPresentationDefinition(type).compatibleGradingModes[0])
                  }}
                />
              </section>

              {/* Form Editor Card */}
              <section className="neo-card space-y-5 bg-card p-5 shadow-[3px_3px_0_var(--border)] border-3 border-border">
                <div className="border-b-2 border-border pb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black">Cách chấm và trình soạn nội dung</h2>
                    <p className="mt-0.5 text-xs font-semibold text-muted-foreground">{getEditorGuidance(presentationType)}</p>
                  </div>
                  {selectedResource.kind === 'activity' && !['matching', 'ordering'].includes(presentationType) && (
                    <Button type="button" variant="secondary" disabled={createQuestion.isPending} onClick={() => createQuestion.mutate()} className="min-h-9 text-xs font-black">
                      <Plus size={15} /> {createQuestion.isPending ? 'Đang thêm...' : 'Thêm câu hỏi'}
                    </Button>
                  )}
                </div>

                {/* Grading Mode Selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase font-black opacity-70">Chọn cách chấm điểm:</Label>
                  <div className="flex flex-wrap gap-2" aria-label="Chọn cách chấm điểm">
                    {definition.compatibleGradingModes.map((mode) => (
                      <Button
                        key={mode}
                        type="button"
                        variant={gradingMode === mode ? 'secondary' : 'ghost'}
                        onClick={() => setGradingMode(mode)}
                        className="min-h-8 px-3 text-xs font-bold"
                      >
                        {gradingMode === mode && <CheckCircle2 size={14} />}{gradingModeLabels[mode]}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Form Editors based on Presentation Type */}
                {['choice_list', 'boolean_list', 'image_choice_list', 'passage_choice_inline'].includes(presentationType) && (
                  <ChoiceListEditor questions={editedQuestions} onChange={setEditedQuestions} onRequestDeleteQuestion={(question) => setPendingDeleteQuestionId(question.id)} imageChoice={presentationType === 'image_choice_list'} onUploadImage={(question, file) => void uploadQuestionImage(question, file)} disabled={savePresentation.isPending || createQuestion.isPending || deleteQuestion.isPending} />
                )}
                {presentationType === 'passage_questions' && (
                  <div className="space-y-6">
                    <section className="space-y-3" aria-label="Trình soạn bài đọc">
                      <div><h3 className="text-base font-black">Đoạn văn bài đọc</h3><p className="mt-0.5 text-xs font-semibold text-muted-foreground">Soạn trực quan nội dung học viên sẽ đọc trước khi trả lời câu hỏi.</p></div>
                      <ReadingRichTextEditor value={passageHtml} onChange={setPassageHtml} />
                    </section>
                    <ChoiceListEditor questions={editedQuestions} onChange={setEditedQuestions} onRequestDeleteQuestion={(question) => setPendingDeleteQuestionId(question.id)} disabled={savePresentation.isPending || createQuestion.isPending || deleteQuestion.isPending} />
                  </div>
                )}
                {(presentationType === 'passage_text_inline' || presentationType === 'passage_choice_inline') && inlineGapDraft && (
                  <InlineGapEditor draft={inlineGapDraft} onChange={setInlineGapDraft} onRequestDeleteGap={setPendingDeleteQuestionId} disabled={savePresentation.isPending || createQuestion.isPending || deleteQuestion.isPending} />
                )}
                {presentationType === 'sentence_transformation' && (
                  <TransformationEditor questions={transformationQuestions} onChange={setTransformationQuestions} onRequestDeleteQuestion={(question) => setPendingDeleteQuestionId(question.id)} disabled={savePresentation.isPending || createQuestion.isPending || deleteQuestion.isPending} />
                )}
                {presentationType === 'matching' && (
                  <MatchingEditor value={matchingValue} onChange={setMatchingValue} disabled={savePresentation.isPending} />
                )}
                {presentationType === 'ordering' && (
                  <OrderingEditor value={orderingValue} onChange={setOrderingValue} disabled={savePresentation.isPending} />
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

                {/* Section Live Preview Container */}
                <div className="border-t-2 border-border pt-4">
                  <PresentationPreview
                    presentationType={presentationType}
                    title={selectedSection.title}
                    instructions={longFormValue.instructions || selectedResource.instructions}
                    passage={presentationType === 'passage_questions' ? passageHtml : selectedResource.passage ?? selectedResource.content}
                    prompt={longFormValue.prompt || selectedResource.prompt}
                    questions={previewQuestions}
                  />
                </div>

                {savePresentation.isError && <p className="text-sm font-bold text-danger">Không thể lưu: {savePresentation.error.message}</p>}

                <div className="pt-2">
                  <Button
                    variant="primary"
                    disabled={savePresentation.isPending}
                    onClick={() => savePresentation.mutate()}
                    className="font-black px-6 py-2.5"
                  >
                    <Save size={18} /> {savePresentation.isPending ? 'Đang lưu...' : 'Lưu cách trình bày'}
                  </Button>
                </div>
              </section>
            </div>

            {/* TAB 2: XEM TRƯỚC (LIVE PREVIEW FULL) */}
            <div className={activeTab === 'preview' ? 'space-y-6' : 'hidden'}>
              <section className="neo-card space-y-4 bg-card p-6 shadow-[3px_3px_0_var(--border)] border-3 border-border">
                <div className="border-b-2 border-border pb-3">
                  <h2 className="text-lg font-black flex items-center gap-2">
                    <Eye size={20} className="text-primary" /> Xem trước độc lập góc nhìn học viên
                  </h2>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                    Kiểm tra cách học viên làm bài và xem lại đáp án sau khi nộp của section này.
                  </p>
                </div>

                <div className="p-4 border-2 border-primary/20 bg-primary/5 font-semibold text-xs text-muted-foreground">
                  Xem trước góc nhìn học viên được tích hợp trực tiếp tại cuối tab Biên soạn nội dung.
                </div>
              </section>
            </div>

            {/* TAB 3: KIỂM TRA XUẤT BẢN (RELEASE GATE) */}
            <div className={activeTab === 'readiness' ? 'space-y-6' : 'hidden'}>
              <section className={`neo-card space-y-4 p-6 shadow-[3px_3px_0_var(--border)] border-3 ${publishReadiness.canPublish ? 'border-emerald-500 bg-emerald-50/20' : 'border-rose-500 bg-card'}`}>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-border pb-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Release Gate Server Audit</p>
                    <h2 className="text-xl font-black">Kiểm tra trước khi xuất bản</h2>
                  </div>
                  <span className={`border-2 border-border px-3 py-1 text-xs font-black ${publishReadiness.canPublish ? 'bg-emerald-500 text-white' : 'bg-rose-600 text-white'}`}>
                    {publishReadiness.canPublish ? 'Sẵn sàng xuất bản' : `${publishReadiness.issues.length} việc cần hoàn thiện`}
                  </span>
                </div>

                {publishReadiness.canPublish ? (
                  <div className="p-4 bg-emerald-100 border-2 border-emerald-400 text-emerald-950 font-bold text-sm flex items-center gap-3">
                    <CheckCircle2 size={22} className="text-emerald-700 shrink-0" />
                    <span>Tất cả section bắt buộc đã có đầy đủ nội dung, đáp án, bản dịch, lời giải, audio và bài mẫu cần thiết. Đề thi đã sẵn sàng phát hành!</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-muted-foreground">Danh sách các vấn đề cần hoàn thiện trước khi mở xuất bản:</p>
                    <ul className="space-y-2 text-xs font-semibold">
                      {publishReadiness.issues.map((issue, index) => (
                        <li key={`${issue.sectionId}-${index}`} className="border-2 border-rose-300 bg-rose-50 text-rose-950 p-3 flex items-start gap-2">
                          <ShieldAlert size={16} className="text-rose-600 shrink-0 mt-0.5" />
                          <span>{issue.message}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            </div>
          </main>
        ) : (
          <main className="neo-card p-8 text-center font-bold text-muted-foreground border-3 border-border">
            Section này chưa có resource để chỉnh sửa.
          </main>
        )}
      </div>

      {/* Bottom Summary Pill */}
      <section className={`neo-card p-4 shadow-[3px_3px_0_var(--border)] border-3 flex items-center justify-between gap-4 ${publishReadiness.canPublish ? 'border-emerald-500 bg-emerald-50/10' : 'border-rose-400 bg-card'}`}>
        <div className="flex items-center gap-3">
          {publishReadiness.canPublish ? <ShieldCheck size={20} className="text-emerald-600" /> : <ShieldAlert size={20} className="text-rose-600" />}
          <div>
            <h2 className="text-sm font-black">Tổng quan tình trạng xuất bản</h2>
            <p className="text-xs font-semibold text-muted-foreground">
              {publishReadiness.canPublish ? 'Đề thi đủ điều kiện phát hành.' : `Đề thi có ${publishReadiness.issues.length} vấn đề cần hoàn thiện trước khi phát hành.`}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant={publishReadiness.canPublish ? 'secondary' : 'primary'}
          onClick={() => setActiveTab('readiness')}
          className="min-h-8 text-xs font-black shrink-0"
        >
          {publishReadiness.canPublish ? 'Đã sẵn sàng' : 'Xem danh sách việc cần làm'}
        </Button>
      </section>

      {/* Confirm Modals */}
      <ConfirmModal
        open={Boolean(pendingDeleteSectionId)}
        title="Gỡ section này khỏi đề?"
        description="Chỉ liên kết section với đề bị gỡ. Nội dung gốc và các attempt đã có vẫn được giữ nguyên."
        confirmLabel={deleteSection.isPending ? 'Đang gỡ...' : 'Gỡ khỏi đề'}
        cancelLabel="Giữ lại"
        variant="danger"
        confirmDisabled={deleteSection.isPending}
        onConfirm={() => {
          if (pendingDeleteSectionId) deleteSection.mutate(pendingDeleteSectionId)
        }}
        onCancel={() => setPendingDeleteSectionId(null)}
      />
      <ConfirmModal
        open={Boolean(pendingDeleteQuestionId)}
        title="Xóa câu hỏi này?"
        description="Câu hỏi sẽ bị xóa khỏi section nguồn. Attempt học viên đã bắt đầu vẫn giữ snapshot riêng."
        confirmLabel={deleteQuestion.isPending ? 'Đang xóa...' : 'Xóa câu hỏi'}
        cancelLabel="Giữ lại"
        variant="danger"
        confirmDisabled={deleteQuestion.isPending}
        onConfirm={() => {
          if (pendingDeleteQuestionId) deleteQuestion.mutate(pendingDeleteQuestionId)
        }}
        onCancel={() => setPendingDeleteQuestionId(null)}
      />
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
