import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  Pencil,
  ClipboardPaste,
  Copy,
  ChevronDown,
  ChevronUp,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Select } from '@/components/ui/select'
import { showToast } from '@/components/ui/toast'
import { adminExamService } from '@/services/supabase/adminExam.service'
import { BulkExamQuestionImportModal } from '@/components/exam/BulkExamQuestionImportModal'
import { parseSingleQuestionText } from '@/utils/examQuestionImport'
import type {
  ExamCategory,
  ExamDetail,
  ExamPassage,
  ExamPassageSet,
  ExamQuestion,
  PassageType,
} from '@/types/exam.types'

export default function AdminExamBuilderPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [exam, setExam] = useState<ExamDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Active Passage Set in builder
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null)

  // Form states for active Passage Set
  const [partNumber, setPartNumber] = useState<number>(7)
  const [passageType, setPassageType] = useState<PassageType>('single')
  const [setTitle, setSetTitle] = useState<string>('')
  const [instructionText, setInstructionText] = useState<string>('')
  const [passages, setPassages] = useState<ExamPassage[]>([])
  const [questions, setQuestions] = useState<Partial<ExamQuestion>[]>([])

  // UI UX enhancement states
  const [isDirty, setIsDirty] = useState<boolean>(false)
  const [activePassageTab, setActivePassageTab] = useState<number>(0)
  const [collapsedQuestions, setCollapsedQuestions] = useState<Record<number, boolean>>({})
  const [allCollapsed, setAllCollapsed] = useState<boolean>(false)


  // Edit Exam Metadata Modal State
  const [showEditExamModal, setShowEditExamModal] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editCategory, setEditCategory] = useState<ExamCategory>('TOEIC')
  const [updatingExam, setUpdatingExam] = useState(false)

  // Bulk Question Import State
  const [showBulkImportModal, setShowBulkImportModal] = useState(false)

  // Delete modal state
  const [pendingDeleteSetId, setPendingDeleteSetId] = useState<string | null>(null)

  const handleBulkImport = (imported: any[]) => {
    if (!imported || imported.length === 0) return

    const formatted: Partial<ExamQuestion>[] = imported.map((q, idx) => ({
      question_number: Number(q.questionNumber || q.question_number) || (idx + 101),
      question_text: q.questionText || q.question_text || '',
      question_type: 'multiple_choice',
      options: (q.options || []).map((opt: any) => ({
        key: opt.key,
        text: opt.text || '',
        is_correct: Boolean(opt.is_correct),
      })),
      explanation_html: q.explanationHtml || q.explanation_html || '',
    }))

    let addedCount = 0
    let updatedCount = 0

    setQuestions((prev) => {
      const isSingleEmpty =
        prev.length === 1 &&
        !prev[0].question_text &&
        (!prev[0].options || prev[0].options.every((o) => !o.text))

      if (isSingleEmpty) {
        addedCount = formatted.length
        return formatted
      }

      // Smart Merge logic: Update existing question if question_number matches; else append new question
      const resultList = [...prev]

      formatted.forEach((newQ) => {
        const existingIdx = resultList.findIndex(
          (q) => q.question_number === newQ.question_number
        )

        if (existingIdx !== -1) {
          // Update existing question in place
          resultList[existingIdx] = {
            ...resultList[existingIdx],
            ...newQ,
          }
          updatedCount++
        } else {
          // Append new question
          resultList.push(newQ)
          addedCount++
        }
      })

      return resultList
    })

    const msg = updatedCount > 0
      ? `Đã cập nhật ${updatedCount} câu có sẵn & Thêm mới ${addedCount} câu vào cụm.`
      : `Đã nhập thành công ${formatted.length} câu hỏi vào cụm hiện tại.`

    showToast({
      type: 'success',
      title: 'Đã nhập câu hỏi',
      message: msg,
    })
  }

  const handleSmartPasteSingleQuestion = async (qIdx: number) => {
    try {
      const text = await navigator.clipboard.readText()
      if (!text || !text.trim()) {
        showToast({ type: 'error', title: 'Lỗi', message: 'Bộ nhớ tạm (Clipboard) đang trống.' })
        return
      }

      const parsed = parseSingleQuestionText(text)
      if (!parsed) {
        showToast({ type: 'error', title: 'Lỗi', message: 'Không thể tách câu hỏi từ văn bản trong Clipboard.' })
        return
      }

      setQuestions((prev) =>
        prev.map((q, idx) => {
          if (idx !== qIdx) return q
          return {
            ...q,
            question_number: parsed.questionNumber || q.question_number || qIdx + 101,
            question_text: parsed.questionText,
            options: parsed.options,
          }
        })
      )

      showToast({
        type: 'success',
        title: 'Đã tách xong',
        message: 'Đã tự động điền Câu hỏi và 4 Lựa chọn A, B, C, D từ Clipboard!',
      })
    } catch (err: any) {
      console.error(err)
      showToast({
        type: 'error',
        title: 'Lỗi',
        message: 'Không thể đọc Clipboard. Vui lòng bấm nút "Nhập hàng loạt từ Copy / Paste".',
      })
    }
  }

  const openEditExamModal = () => {
    if (!exam) return
    setEditTitle(exam.title)
    setEditCategory(exam.category)
    setShowEditExamModal(true)
  }

  const handleUpdateExamInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!exam || !editTitle.trim()) return
    try {
      setUpdatingExam(true)
      const updated = await adminExamService.updateExam(exam.id, {
        title: editTitle.trim(),
        category: editCategory,
      })
      setExam((prev) => (prev ? { ...prev, ...updated } : null))
      setShowEditExamModal(false)
      showToast({ type: 'success', title: 'Đã lưu', message: 'Cập nhật thông tin đề thi thành công.' })
    } catch (err: any) {
      console.error(err)
      showToast({ type: 'error', title: 'Lỗi', message: err.message || 'Không thể cập nhật đề thi' })
    } finally {
      setUpdatingExam(false)
    }
  }

  const loadExam = async (targetSetId?: string | null, silent: boolean = false) => {
    if (!id) return
    try {
      if (!silent) setLoading(true)
      setError(null)
      const data = await adminExamService.getExamDetail(id)
      if (!data) {
        setError('Không tìm thấy đề thi')
        return
      }
      setExam(data)

      if (targetSetId) {
        const found = data.passage_sets.find((s) => s.id === targetSetId)
        if (found) {
          selectPassageSet(found)
        } else if (data.passage_sets.length > 0) {
          selectPassageSet(data.passage_sets[0])
        }
      } else if (targetSetId === null) {
        // Do nothing to keep current form
      } else {
        if (data.passage_sets.length > 0) {
          selectPassageSet(data.passage_sets[0])
        } else {
          initNewSet(5)
        }
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Không thể tải đề thi')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    void loadExam()
  }, [id])

  // Ctrl + S Keyboard Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        void handleSavePassageSet()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedSetId, partNumber, passageType, setTitle, instructionText, passages, questions, id, exam])

  const selectPassageSet = (set: ExamPassageSet) => {
    setSelectedSetId(set.id)
    setPartNumber(set.part_number)
    setPassageType(set.passage_type)
    setSetTitle(set.title || '')
    setInstructionText(set.instruction_text || '')
    setPassages(set.passages || [])
    setQuestions(set.questions || [])
    setActivePassageTab(0)
    setCollapsedQuestions({})
    setAllCollapsed(false)
    setIsDirty(false)
  }

  const handleAttemptSelectSet = async (set: ExamPassageSet) => {
    if (selectedSetId === set.id) return
    if (isDirty) {
      const success = await handleSavePassageSet()
      if (!success) return
    }
    selectPassageSet(set)
  }

  const initNewSet = (partNum: number = 1, type: PassageType = 'single') => {
    setSelectedSetId(null)
    setPartNumber(partNum)
    setPassageType(type)
    setSetTitle(`Phần ${partNum} - Cụm câu hỏi mới`)
    setInstructionText('')
    setActivePassageTab(0)
    setCollapsedQuestions({})
    setAllCollapsed(false)
    setIsDirty(false)

    if (type === 'none') {
      setPassages([])
    } else {
      setPassages([{ id: 'p1', type: 'article', title: 'Đoạn văn 1', content_html: '' }])
    }

    setQuestions([
      {
        question_number: 101,
        question_text: '',
        question_type: 'multiple_choice',
        options: [
          { key: 'A', text: '', is_correct: true },
          { key: 'B', text: '', is_correct: false },
          { key: 'C', text: '', is_correct: false },
          { key: 'D', text: '', is_correct: false },
        ],
        explanation_html: '',
      },
    ])
  }

  const handleDuplicatePassageSet = async (setId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    try {
      setSaving(true)
      const dup = await adminExamService.duplicatePassageSet(setId)
      showToast({
        type: 'success',
        title: 'Đã nhân bản',
        message: 'Đã nhân bản thành công cụm bài thi mới.',
      })
      await loadExam(dup.id, true)
    } catch (err: any) {
      console.error(err)
      showToast({ type: 'error', title: 'Lỗi', message: err.message || 'Không thể nhân bản cụm bài' })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleQuestionCollapse = (index: number) => {
    setCollapsedQuestions((prev) => ({
      ...prev,
      [index]: !prev[index],
    }))
  }

  const handleToggleAllCollapse = () => {
    const nextState = !allCollapsed
    setAllCollapsed(nextState)
    const updated: Record<number, boolean> = {}
    questions.forEach((_, idx) => {
      updated[idx] = nextState
    })
    setCollapsedQuestions(updated)
  }

  const handleAttemptCreateNewSet = async (newPartNum: number) => {
    if (isDirty) {
      const success = await handleSavePassageSet()
      if (!success) return
    }
    let defaultType: PassageType = 'none'
    if ([3, 4, 6, 7].includes(newPartNum)) {
      defaultType = 'single'
    }
    initNewSet(newPartNum, defaultType)
  }

  const handlePartNumberChange = async (newPartNum: number) => {
    await handleAttemptCreateNewSet(newPartNum)
  }

  const handlePassageTypeChange = (type: PassageType) => {
    setPassageType(type)
    if (type === 'none') {
      setPassages([])
    } else if (type === 'single') {
      setPassages([{ id: 'p1', type: 'article', title: 'Đoạn văn 1', content_html: passages[0]?.content_html || '' }])
    } else if (type === 'double') {
      setPassages([
        { id: 'p1', type: 'article', title: 'Đoạn văn 1 (Bài đọc 1)', content_html: passages[0]?.content_html || '' },
        { id: 'p2', type: 'article', title: 'Đoạn văn 2 (Bài đọc 2)', content_html: passages[1]?.content_html || '' },
      ])
    } else if (type === 'triple') {
      setPassages([
        { id: 'p1', type: 'article', title: 'Đoạn văn 1 (Bài đọc 1)', content_html: passages[0]?.content_html || '' },
        { id: 'p2', type: 'article', title: 'Đoạn văn 2 (Bài đọc 2)', content_html: passages[1]?.content_html || '' },
        { id: 'p3', type: 'article', title: 'Đoạn văn 3 (Bài đọc 3)', content_html: passages[2]?.content_html || '' },
      ])
    }
  }

  const handleAddQuestion = () => {
    const nextQNum = (questions.length > 0 ? (questions[questions.length - 1].question_number || 100) : 100) + 1
    setQuestions((prev) => [
      ...prev,
      {
        question_number: nextQNum,
        question_text: '',
        question_type: 'multiple_choice',
        options: [
          { key: 'A', text: '', is_correct: true },
          { key: 'B', text: '', is_correct: false },
          { key: 'C', text: '', is_correct: false },
          { key: 'D', text: '', is_correct: false },
        ],
        explanation_html: '',
      },
    ])
  }

  const handleRemoveQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index))
  }

  const handleOptionChange = (qIndex: number, optKey: string, field: 'text' | 'is_correct', val: any) => {
    setQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== qIndex) return q
        const newOpts = (q.options || []).map((opt) => {
          if (field === 'is_correct') {
            return { ...opt, is_correct: opt.key === optKey }
          }
          if (opt.key === optKey) {
            return { ...opt, text: val }
          }
          return opt
        })
        return { ...q, options: newOpts }
      })
    )
  }

  const handleSavePassageSet = async (): Promise<boolean> => {
    if (!id || !exam) return false
    try {
      setSaving(true)
      const savedSet = await adminExamService.savePassageSet(
        id,
        selectedSetId,
        {
          part_number: partNumber,
          passage_type: passageType,
          title: setTitle,
          instruction_text: instructionText,
          passages,
          order_index: (exam.passage_sets || []).length,
        },
        questions
      )

      showToast({ type: 'success', title: 'Đã lưu Cụm bài đọc', message: 'Dữ liệu cụm bài đọc và câu hỏi đã lưu thành công.' })
      setIsDirty(false)
      await loadExam(savedSet.id, true)
      return true
    } catch (err: any) {
      console.error(err)
      showToast({ type: 'error', title: 'Lỗi', message: err.message || 'Không thể lưu cụm bài đọc' })
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePassageSet = async () => {
    if (!pendingDeleteSetId) return
    try {
      await adminExamService.deletePassageSet(pendingDeleteSetId)
      showToast({ type: 'success', title: 'Đã xóa', message: 'Đã xóa cụm bài đọc.' })
      await loadExam()
    } catch (err: any) {
      console.error(err)
      showToast({ type: 'error', title: 'Lỗi', message: err.message || 'Không thể xóa cụm bài đọc' })
    } finally {
      setPendingDeleteSetId(null)
    }
  }

  const handleTogglePublish = async () => {
    if (!exam) return
    try {
      const updated = await adminExamService.updateExam(exam.id, { is_published: !exam.is_published })
      setExam((prev) => (prev ? { ...prev, is_published: updated.is_published } : null))
      showToast({
        type: 'success',
        title: 'Đã cập nhật xuất bản',
        message: updated.is_published ? 'Đề thi đã được công khai cho học viên!' : 'Đề thi đã chuyển thành Bản nháp.',
      })
    } catch (err: any) {
      console.error(err)
      showToast({ type: 'error', title: 'Lỗi', message: err.message || 'Không thể thay đổi trạng thái xuất bản' })
    }
  }

  if (loading) {
    return (
      <div className="text-center font-black text-muted-foreground py-20 flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <span>Đang tải Trình xây dựng đề thi...</span>
      </div>
    )
  }

  if (error || !exam) {
    return (
      <div className="neo-card p-8 text-center bg-card border-3 border-border shadow-[4px_4px_0_var(--border)] flex flex-col items-center gap-4 rounded-xl">
        <AlertTriangle size={36} className="text-rose-600" />
        <h2 className="text-lg font-black text-foreground">{error || 'Không tìm thấy đề thi'}</h2>
        <Button variant="ghost" onClick={() => navigate('/app/admin/exams')}>
          Quay lại danh sách đề thi
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-[1700px] mx-auto pb-10">
      {/* Top Action Bar */}
      <div className="neo-card p-4 bg-card border-3 border-border shadow-[4px_4px_0_var(--border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild className="min-h-9 px-3 text-xs">
            <Link to="/app/admin/exams">
              <ArrowLeft size={16} />
              Trở về
            </Link>
          </Button>
          <div className="h-6 w-0.5 bg-border hidden sm:block" />
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black border border-border bg-secondary/15 text-secondary">
                {exam.category}
              </span>
              <h1 className="text-base font-black text-foreground tracking-tight line-clamp-1">{exam.title}</h1>
              <button
                type="button"
                onClick={openEditExamModal}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition"
                title="Sửa tên hoặc thể loại của đề thi"
              >
                <Pencil size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <Button
            variant={exam.is_published ? 'ghost' : 'secondary'}
            onClick={handleTogglePublish}
            className="min-h-9 text-xs"
          >
            <CheckCircle2 size={14} className={exam.is_published ? 'text-emerald-600' : ''} />
            {exam.is_published ? 'Công khai (Published)' : 'Xuất bản Đề'}
          </Button>

          <Button variant="primary" onClick={handleSavePassageSet} disabled={saving} className="min-h-9 text-xs">
            <Save size={14} />
            {saving ? 'Đang lưu...' : 'Lưu Cụm bài đang chọn'}
          </Button>
        </div>
      </div>

      {/* Main Grid: Left Part Tree (4 Cols) + Right Visual Builder (8 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Cấu trúc Part & Passage Sets (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="neo-card p-4 bg-card border-3 border-border shadow-[4px_4px_0_var(--border)] flex flex-col gap-3 rounded-xl">
            <div className="flex items-center justify-between border-b-2 border-border pb-2">
              <h2 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={16} className="text-primary" />
                CẤU TRÚC BÀI THI ({(exam.passage_sets || []).length} CỤM)
              </h2>
            </div>

            {/* Quick Create New Set Button */}
            <div className="flex items-center justify-between p-2 bg-primary/10 border-2 border-primary/30 rounded-xl">
              <span className="text-xs font-black text-primary">Tạo Cụm mới:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5, 6, 7].map((pNum) => (
                  <button
                    key={pNum}
                    type="button"
                    onClick={() => void handleAttemptCreateNewSet(pNum)}
                    className="px-2 py-0.5 rounded text-[11px] font-black border border-primary bg-card hover:bg-primary hover:text-white transition"
                    title={`Tạo cụm mới cho Part ${pNum}`}
                  >
                    P{pNum}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Part Groups */}
            {(!exam.passage_sets || exam.passage_sets.length === 0) ? (
              <div className="p-4 text-center bg-muted/20 border-2 border-dashed border-border rounded-xl flex flex-col items-center gap-2 my-1">
                <Layers size={28} className="text-muted-foreground opacity-60" />
                <span className="text-xs font-black text-foreground">Chưa có cụm bài thi nào</span>
                <p className="text-[11px] font-bold text-muted-foreground leading-relaxed">
                  Cấu trúc hiện đang trống. Hãy soạn thảo bên <strong>"SOẠN THẢO CỤM BÀI ĐỌC"</strong> và bấm <strong>"Lưu Cụm bài đang chọn"</strong> để hiển thị cụm bài tại đây!
                </p>
              </div>
            ) : (
              (() => {
                const setsByPart = (exam.passage_sets || []).reduce((acc, set) => {
                  const p = set.part_number || 1
                  if (!acc[p]) acc[p] = []
                  acc[p].push(set)
                  return acc
                }, {} as Record<number, typeof exam.passage_sets>)

                const sortedPartNumbers = Object.keys(setsByPart).map(Number).sort((a, b) => a - b)

                return sortedPartNumbers.map((partNum) => {
                  const partSets = setsByPart[partNum] || []
                  return (
                    <div key={partNum} className="flex flex-col gap-2 p-2.5 bg-muted/30 border-2 border-border rounded-xl">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-foreground">PHẦN {partNum} (PART {partNum})</span>
                        <button
                          type="button"
                          onClick={() => initNewSet(partNum)}
                          className="text-[11px] font-black text-primary hover:underline flex items-center gap-0.5"
                        >
                          <Plus size={12} /> Thêm Cụm P{partNum}
                        </button>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        {partSets.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => handleAttemptSelectSet(s)}
                            className={`group relative p-2.5 rounded-lg border-2 border-border text-xs font-bold flex items-center justify-between cursor-pointer transition ${
                              selectedSetId === s.id
                                ? 'bg-primary/20 border-primary shadow-[2px_2px_0_var(--border)] font-black'
                                : 'bg-card hover:bg-muted/50'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 truncate pr-14">
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded border bg-secondary/15 text-secondary shrink-0">
                                {s.passage_type}
                              </span>
                              <span className="truncate">{s.title || `Part ${partNum} Set`}</span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[10px] font-mono font-black text-muted-foreground group-hover:hidden pr-1">
                                {(s.questions || []).length} câu
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleDuplicatePassageSet(s.id, e)}
                                className="hidden group-hover:flex items-center p-1 rounded hover:bg-card border border-border text-foreground transition"
                                title="Nhân bản cụm này"
                              >
                                <Copy size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setPendingDeleteSetId(s.id)
                                }}
                                className="hidden group-hover:flex items-center p-1 rounded hover:bg-rose-100 text-rose-600 border border-rose-200 transition"
                                title="Xóa cụm này"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })
              })()
            )}
          </div>
        </div>

        {/* Right Column: Visual Passage & Questions Editor (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="neo-card p-6 bg-card border-3 border-border shadow-[4px_4px_0_var(--border)] flex flex-col gap-5 rounded-2xl">
            {/* Status Header Banner */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-border pb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-primary" />
                <h2 className="text-base font-black text-foreground">
                  SOẠN THẢO CỤM BÀI ĐỌC
                </h2>
                {selectedSetId ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black border border-emerald-400 bg-emerald-100 text-emerald-900 flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-emerald-600" />
                    Đang sửa Cụm (Đã lưu DB)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black border border-amber-400 bg-amber-100 text-amber-900">
                    + Tạo Cụm mới (Chưa lưu)
                  </span>
                )}
                {isDirty && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 border border-rose-300 text-rose-700 animate-pulse">
                    ● Có thay đổi chưa lưu
                  </span>
                )}
              </div>

              {selectedSetId && (
                <button
                  type="button"
                  onClick={() => setPendingDeleteSetId(selectedSetId)}
                  className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1"
                >
                  <Trash2 size={14} /> Xóa Cụm này
                </button>
              )}
            </div>

            {/* General Set Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-black text-foreground">Thuộc Phần thi (Part)</label>
                <Select
                  value={String(partNumber)}
                  onChange={(val) => handlePartNumberChange(Number(val))}
                  options={[
                    { value: '1', label: 'Phần 1 (Part 1)' },
                    { value: '2', label: 'Phần 2 (Part 2)' },
                    { value: '3', label: 'Phần 3 (Part 3)' },
                    { value: '4', label: 'Phần 4 (Part 4)' },
                    { value: '5', label: 'Phần 5 (Part 5)' },
                    { value: '6', label: 'Phần 6 (Part 6)' },
                    { value: '7', label: 'Phần 7 (Part 7)' },
                    { value: '8', label: 'Phần 8 (Part 8)' },
                    { value: '9', label: 'Phần 9 (Part 9)' },
                    { value: '10', label: 'Phần 10 (Part 10)' },
                  ]}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-black text-foreground">Loại đoạn văn (Passage Type)</label>
                <Select
                  value={passageType}
                  onChange={(val) => {
                    handlePassageTypeChange(val as PassageType)
                    setIsDirty(true)
                  }}
                  options={[
                    { value: 'none', label: 'Không có đoạn văn (Chỉ có câu hỏi)' },
                    { value: 'single', label: '1 Đoạn văn (Single Passage)' },
                    { value: 'double', label: '2 Đoạn văn (Double Passages)' },
                    { value: 'triple', label: '3 Đoạn văn (Triple Passages)' },
                  ]}
                />
              </div>

              <div className="flex flex-col gap-1 md:col-span-1">
                <label className="text-xs font-black text-foreground">Tiêu đề cụm</label>
                <input
                  type="text"
                  placeholder="VD: Questions 147-148 refer to..."
                  value={setTitle}
                  onChange={(e) => {
                    setSetTitle(e.target.value)
                    setIsDirty(true)
                  }}
                  className="px-3 py-1.5 border-2 border-border rounded-lg text-xs font-bold bg-background focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Passages Tab Editor (Single/Double/Triple) */}
            {passageType !== 'none' && (
              <div className="flex flex-col gap-3 pt-3 border-t-2 border-dashed border-border">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <FileText size={14} className="text-primary" />
                    NỘI DUNG ĐOẠN VĂN ({passages.length} ĐOẠN)
                  </h3>

                  {passages.length > 1 && (
                    <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border">
                      {passages.map((p, idx) => (
                        <button
                          key={p.id || idx}
                          type="button"
                          onClick={() => setActivePassageTab(idx)}
                          className={`px-3 py-1 rounded text-xs font-black transition ${
                            activePassageTab === idx
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Đoạn {idx + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {passages.map((p, pIdx) => {
                  if (passages.length > 1 && activePassageTab !== pIdx) return null
                  return (
                    <div key={p.id || pIdx} className="flex flex-col gap-2 p-3.5 border-2 border-border rounded-xl bg-muted/20">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-foreground">
                          Đoạn {pIdx + 1}: {p.title || `Văn bản ${pIdx + 1}`}
                        </span>
                        <input
                          type="text"
                          value={p.title || ''}
                          onChange={(e) => {
                            const updated = [...passages]
                            updated[pIdx].title = e.target.value
                            setPassages(updated)
                            setIsDirty(true)
                          }}
                          placeholder="Tiêu đề đoạn (VD: Email, Notice...)"
                          className="w-48 px-2 py-0.5 text-xs font-bold border border-border rounded bg-background"
                        />
                      </div>

                      <textarea
                        rows={7}
                        value={p.content_html}
                        onChange={(e) => {
                          const updated = [...passages]
                          updated[pIdx].content_html = e.target.value
                          setPassages(updated)
                          setIsDirty(true)
                        }}
                        placeholder="Nhập nội dung HTML/Văn bản đoạn văn (Email, Notice, Article...)"
                        className="w-full px-3 py-2 border-2 border-border rounded-lg bg-card text-xs font-bold focus:outline-none focus:border-primary font-mono leading-relaxed"
                      />
                    </div>
                  )
                })}
              </div>
            )}

            {/* Questions List Editor */}
            <div className="flex flex-col gap-4 pt-3 border-t-2 border-dashed border-border">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={14} className="text-primary" />
                  DANH SÁCH CÂU HỎI ({questions.length} CÂU)
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleAllCollapse}
                    className="text-xs font-bold text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border bg-card flex items-center gap-1"
                  >
                    {allCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    {allCollapsed ? 'Mở rộng tất cả' : 'Thu gọn tất cả'}
                  </button>
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => setShowBulkImportModal(true)}
                    className="min-h-8 px-3 text-xs font-black bg-amber-300 text-slate-950 border-2 border-border shadow-[2px_2px_0_var(--border)] hover:bg-amber-400"
                  >
                    <ClipboardPaste size={14} />
                    ⚡ Nhập hàng loạt Copy / Paste
                  </Button>
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => {
                      handleAddQuestion()
                      setIsDirty(true)
                    }}
                    className="min-h-8 px-3 text-xs"
                  >
                    <Plus size={14} /> Thêm câu hỏi
                  </Button>
                </div>
              </div>

              {questions.map((q, qIdx) => {
                const isCollapsed = Boolean(collapsedQuestions[qIdx])

                return (
                  <div
                    key={qIdx}
                    className="flex flex-col gap-3 p-4 border-2 border-border rounded-xl bg-card shadow-[2px_2px_0_var(--border)] transition-all"
                  >
                    <div className="flex items-center justify-between gap-2 border-b-2 border-border/40 pb-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleQuestionCollapse(qIdx)}
                          className="p-1 rounded hover:bg-muted text-muted-foreground transition"
                        >
                          {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </button>
                        <span className="text-xs font-black text-primary">Câu {qIdx + 1}</span>
                        <span className="text-xs font-bold text-muted-foreground">(STT:</span>
                        <input
                          type="number"
                          value={q.question_number || 101}
                          onChange={(e) => {
                            const updated = [...questions]
                            updated[qIdx].question_number = Number(e.target.value)
                            setQuestions(updated)
                            setIsDirty(true)
                          }}
                          className="w-16 px-1.5 py-0.5 border border-border rounded text-xs font-black text-center"
                        />
                        <span className="text-xs font-bold text-muted-foreground">)</span>

                        {isCollapsed && (
                          <span className="text-xs font-bold text-foreground truncate max-w-xs pl-2">
                            {q.question_text || 'Chưa nhập nội dung câu hỏi'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSmartPasteSingleQuestion(qIdx)}
                          className="text-xs text-primary font-black hover:underline flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded border border-primary/20"
                          title="Tự động đọc Clipboard và tách nội dung + 4 đáp án A, B, C, D"
                        >
                          <ClipboardPaste size={12} /> Smart Dán
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleRemoveQuestion(qIdx)
                            setIsDirty(true)
                          }}
                          className="text-xs text-rose-600 font-bold hover:underline"
                        >
                          Xóa câu
                        </button>
                      </div>
                    </div>

                    {!isCollapsed && (
                      <>
                        {/* Question Text */}
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-black text-foreground">Nội dung câu hỏi</label>
                          <input
                            type="text"
                            placeholder="VD: What is the main purpose of the email?"
                            value={q.question_text || ''}
                            onChange={(e) => {
                              const updated = [...questions]
                              updated[qIdx].question_text = e.target.value
                              setQuestions(updated)
                              setIsDirty(true)
                            }}
                            className="px-3 py-1.5 border-2 border-border rounded-lg text-xs font-bold bg-background focus:outline-none focus:border-primary"
                          />
                        </div>

                        {/* Options A, B, C, D */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                          {(q.options || []).map((opt) => (
                            <div
                              key={opt.key}
                              className={`flex items-center gap-2 p-2 border-2 rounded-lg cursor-pointer transition ${
                                opt.is_correct
                                  ? 'border-emerald-500 bg-emerald-50/70 font-black'
                                  : 'border-border bg-background hover:bg-muted/30'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`correct_opt_${qIdx}`}
                                checked={opt.is_correct}
                                onChange={() => {
                                  handleOptionChange(qIdx, opt.key, 'is_correct', true)
                                  setIsDirty(true)
                                }}
                                className="accent-emerald-600 cursor-pointer"
                              />
                              <span className="text-xs font-black w-4">{opt.key}.</span>
                              <input
                                type="text"
                                placeholder={`Đáp án ${opt.key}`}
                                value={opt.text}
                                onChange={(e) => {
                                  handleOptionChange(qIdx, opt.key, 'text', e.target.value)
                                  setIsDirty(true)
                                }}
                                className="flex-1 px-2 py-1 text-xs font-bold bg-transparent border-b border-border/50 focus:outline-none focus:border-primary"
                              />
                            </div>
                          ))}
                        </div>

                        {/* Explanation */}
                        <div className="flex flex-col gap-1 pt-1">
                          <label className="text-[11px] font-black text-muted-foreground">Lời giải chi tiết (Explanation)</label>
                          <textarea
                            rows={2}
                            placeholder="Giải thích lý do chọn đáp án đúng..."
                            value={q.explanation_html || ''}
                            onChange={(e) => {
                              const updated = [...questions]
                              updated[qIdx].explanation_html = e.target.value
                              setQuestions(updated)
                              setIsDirty(true)
                            }}
                            className="px-3 py-1.5 border border-border rounded-lg text-xs font-semibold bg-background focus:outline-none focus:border-primary"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Save Bar */}
      <div className="sticky bottom-4 z-40 neo-card p-3 bg-card border-3 border-border shadow-[6px_6px_0_var(--border)] rounded-2xl flex items-center justify-between gap-4 max-w-[1700px] mx-auto">
        <div className="flex items-center gap-3">
          <span className="text-xs font-black text-foreground flex items-center gap-1.5">
            <Sparkles size={16} className="text-primary" />
            {setTitle || 'Cụm bài đọc'}
          </span>
          {isDirty ? (
            <span className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
              Có thay đổi chưa lưu (Ctrl + S)
            </span>
          ) : (
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              Đã đồng bộ với DB
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isDirty && (
            <Button
              variant="ghost"
              onClick={() => {
                if (selectedSetId && exam) {
                  const set = exam.passage_sets.find((s) => s.id === selectedSetId)
                  if (set) selectPassageSet(set)
                }
              }}
              className="min-h-9 text-xs"
            >
              Hủy thay đổi
            </Button>
          )}
          <Button variant="primary" onClick={handleSavePassageSet} disabled={saving} className="min-h-9 text-xs font-black px-6">
            <Save size={14} />
            {saving ? 'Đang lưu...' : 'LƯU CỤM BÀI ĐỌC (Ctrl + S)'}
          </Button>
        </div>
      </div>

      {/* Edit Exam Metadata Modal */}
      {showEditExamModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="neo-card p-6 bg-card border-3 border-border shadow-[6px_6px_0_var(--border)] rounded-2xl w-full max-w-lg flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b-2 border-border pb-3">
              <h2 className="text-lg font-black text-foreground flex items-center gap-2">
                <Pencil size={20} className="text-primary" />
                CHỈNH SỬA THÔNG TIN ĐỀ THI
              </h2>
              <button
                type="button"
                onClick={() => setShowEditExamModal(false)}
                className="text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                ✕ Đóng
              </button>
            </div>

            <form onSubmit={handleUpdateExamInfo} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-foreground">Tên đề thi *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: ETS TOEIC Reading 2026 - Test 1"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="px-3.5 py-2.5 border-2 border-border rounded-xl bg-background text-xs font-bold focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-foreground">Loại chứng chỉ / Thể loại</label>
                <Select
                  value={editCategory}
                  onChange={(val) => setEditCategory(val as ExamCategory)}
                  options={[
                    { value: 'TOEIC', label: 'TOEIC' },
                    { value: 'IELTS', label: 'IELTS' },
                    { value: 'TOEFL', label: 'TOEFL' },
                    { value: 'THPTQG', label: 'THPT Quốc Gia' },
                    { value: 'CAMBRIDGE', label: 'Cambridge' },
                    { value: 'GENERAL', label: 'Tổng hợp / Khác' },
                  ]}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t-2 border-border">
                <Button variant="ghost" type="button" onClick={() => setShowEditExamModal(false)}>
                  Hủy
                </Button>
                <Button variant="primary" type="submit" disabled={updatingExam}>
                  {updatingExam ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Question Import Modal */}
      <BulkExamQuestionImportModal
        open={showBulkImportModal}
        onClose={() => setShowBulkImportModal(false)}
        onImport={(imported) => {
          handleBulkImport(imported)
          setIsDirty(true)
        }}
      />

    

      {/* Delete Passage Set Confirmation Modal */}
      <ConfirmModal
        open={!!pendingDeleteSetId}
        title="Xóa Cụm bài đọc này?"
        description="Hành động này sẽ xóa cụm đoạn văn cùng các câu hỏi thuộc cụm này."
        onConfirm={handleDeletePassageSet}
        onCancel={() => setPendingDeleteSetId(null)}
      />
    </div>
  )
}
