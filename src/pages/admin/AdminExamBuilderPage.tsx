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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Select } from '@/components/ui/select'
import { showToast } from '@/components/ui/toast'
import { adminExamService } from '@/services/supabase/adminExam.service'
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

  // Edit Exam Metadata Modal State
  const [showEditExamModal, setShowEditExamModal] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editCategory, setEditCategory] = useState<ExamCategory>('TOEIC')
  const [editTimeLimit, setEditTimeLimit] = useState(75)
  const [editTotalQuestions, setEditTotalQuestions] = useState(100)
  const [updatingExam, setUpdatingExam] = useState(false)

  // Delete modal state
  const [pendingDeleteSetId, setPendingDeleteSetId] = useState<string | null>(null)

  const openEditExamModal = () => {
    if (!exam) return
    setEditTitle(exam.title)
    setEditCategory(exam.category)
    setEditTimeLimit(exam.time_limit_minutes)
    setEditTotalQuestions(exam.total_questions)
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
        time_limit_minutes: editTimeLimit,
        total_questions: editTotalQuestions,
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

  const loadExam = async () => {
    if (!id) return
    try {
      setLoading(true)
      setError(null)
      const data = await adminExamService.getExamDetail(id)
      if (!data) {
        setError('Không tìm thấy đề thi')
        return
      }
      setExam(data)

      // Select first set if available
      if (data.passage_sets.length > 0) {
        selectPassageSet(data.passage_sets[0])
      } else {
        // Init empty set for Part 5
        initNewSet(5)
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Không thể tải đề thi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadExam()
  }, [id])

  const selectPassageSet = (set: ExamPassageSet) => {
    setSelectedSetId(set.id)
    setPartNumber(set.part_number)
    setPassageType(set.passage_type)
    setSetTitle(set.title || '')
    setInstructionText(set.instruction_text || '')
    setPassages(set.passages || [])
    setQuestions(set.questions || [])
  }

  const initNewSet = (partNum: number = 1, type: PassageType = 'single') => {
    setSelectedSetId(null)
    setPartNumber(partNum)
    setPassageType(type)
    setSetTitle(`Phần ${partNum} - Cụm câu hỏi`)
    setInstructionText('')

    if (type === 'none') {
      setPassages([])
    } else {
      setPassages([{ id: 'p1', type: 'article', title: 'Đoạn văn 1', content_html: '' }])
    }

    setQuestions([
      {
        question_number: 1,
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

  const handlePassageTypeChange = (type: PassageType) => {
    setPassageType(type)
    if (type === 'none') {
      setPassages([])
    } else if (type === 'single') {
      setPassages([{ id: 'p1', type: 'email', title: 'Đoạn văn 1', content_html: '' }])
    } else if (type === 'double') {
      setPassages([
        { id: 'p1', type: 'email', title: 'Đoạn 1 (Email)', content_html: '' },
        { id: 'p2', type: 'invoice', title: 'Đoạn 2 (Hóa đơn/Phản hồi)', content_html: '' },
      ])
    } else if (type === 'triple') {
      setPassages([
        { id: 'p1', type: 'email', title: 'Đoạn 1 (Email)', content_html: '' },
        { id: 'p2', type: 'article', title: 'Đoạn 2 (Bài báo/Thông báo)', content_html: '' },
        { id: 'p3', type: 'chat', title: 'Đoạn 3 (Phản hồi)', content_html: '' },
      ])
    }
  }

  const handleAddQuestion = () => {
    const nextQNum = questions.length > 0 ? (questions[questions.length - 1].question_number || 100) + 1 : 101
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

  const handleSavePassageSet = async () => {
    if (!id || !exam) return
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
      await loadExam()
      setSelectedSetId(savedSet.id)
    } catch (err: any) {
      console.error(err)
      showToast({ type: 'error', title: 'Lỗi', message: err.message || 'Không thể lưu cụm bài đọc' })
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
                title="Sửa tên / thời gian / số câu của đề thi"
              >
                <Pencil size={14} />
              </button>
            </div>
            <span className="text-xs font-bold text-muted-foreground">
              Thời gian: {exam.time_limit_minutes}p · Tổng câu: {exam.total_questions} câu
            </span>
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
                CẤU TRÚC BÀI THI ({exam.passage_sets.length} CỤM)
              </h2>
            </div>

            {/* Quick Create New Set Button */}
            <div className="flex items-center justify-between p-2 bg-primary/10 border-2 border-primary/30 rounded-xl">
              <span className="text-xs font-black text-primary">Tạo Cụm bài đọc / Câu hỏi mới:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5, 6, 7].map((pNum) => (
                  <button
                    key={pNum}
                    type="button"
                    onClick={() => initNewSet(pNum)}
                    className="px-2 py-0.5 rounded text-[11px] font-black border border-primary bg-card hover:bg-primary hover:text-white transition"
                    title={`Tạo cụm mới cho Part ${pNum}`}
                  >
                    P{pNum}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Part Groups */}
            {(() => {
              const setsByPart = (exam.passage_sets || []).reduce((acc, set) => {
                const p = set.part_number || 1
                if (!acc[p]) acc[p] = []
                acc[p].push(set)
                return acc
              }, {} as Record<number, typeof exam.passage_sets>)

              const sortedPartNumbers = Array.from(
                new Set([1, 2, 3, ...Object.keys(setsByPart).map(Number)])
              ).sort((a, b) => a - b)

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
                          onClick={() => selectPassageSet(s)}
                          className={`p-2 rounded-lg border-2 border-border text-xs font-bold flex items-center justify-between cursor-pointer transition ${
                            selectedSetId === s.id
                              ? 'bg-primary/20 border-primary shadow-[2px_2px_0_var(--border)]'
                              : 'bg-card hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-[9px] font-black uppercase px-1 py-0.2 rounded border bg-secondary/15 text-secondary">
                              {s.passage_type}
                            </span>
                            <span className="truncate">{s.title || `Part ${partNum} Set`}</span>
                          </div>
                          <span className="text-[10px] font-mono font-black text-muted-foreground shrink-0 pl-2">
                            {(s.questions || []).length} câu
                          </span>
                        </div>
                      ))}
                      {partSets.length === 0 && (
                        <span className="text-[11px] text-muted-foreground italic py-0.5">Chưa có cụm bài Phần {partNum}.</span>
                      )}
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        </div>

        {/* Right Column: Visual Passage & Questions Editor (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="neo-card p-6 bg-card border-3 border-border shadow-[4px_4px_0_var(--border)] flex flex-col gap-5 rounded-2xl">
            <div className="flex items-center justify-between border-b-2 border-border pb-3">
              <h2 className="text-base font-black text-foreground flex items-center gap-2">
                <Sparkles size={18} className="text-primary" />
                SOẠN THẢO CỤM BÀI ĐỌC ({selectedSetId ? 'Đang sửa' : 'Tạo mới'})
              </h2>
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
                  onChange={(val) => setPartNumber(Number(val))}
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
                  onChange={(val) => handlePassageTypeChange(val as PassageType)}
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
                  onChange={(e) => setSetTitle(e.target.value)}
                  className="px-3 py-1.5 border-2 border-border rounded-lg text-xs font-bold bg-background focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Passages Editor (Single/Double/Triple) */}
            {passageType !== 'none' && (
              <div className="flex flex-col gap-4 pt-3 border-t-2 border-dashed border-border">
                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-wider">
                  Nội dung đoạn văn ({passages.length} đoạn)
                </h3>

                {passages.map((p, pIdx) => (
                  <div key={p.id || pIdx} className="flex flex-col gap-2 p-3.5 border-2 border-border rounded-xl bg-muted/20">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-foreground">Đoạn {pIdx + 1}: {p.title}</span>
                    </div>

                    <textarea
                      rows={6}
                      value={p.content_html}
                      onChange={(e) => {
                        const updated = [...passages]
                        updated[pIdx].content_html = e.target.value
                        setPassages(updated)
                      }}
                      placeholder="Nhập nội dung HTML/Văn bản đoạn văn (Email, Notice, Article...)"
                      className="w-full px-3 py-2 border-2 border-border rounded-lg bg-card text-xs font-bold focus:outline-none focus:border-primary font-mono"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Questions List Editor */}
            <div className="flex flex-col gap-4 pt-3 border-t-2 border-dashed border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-wider">
                  Danh sách câu hỏi ({questions.length} câu)
                </h3>
                <Button variant="ghost" type="button" onClick={handleAddQuestion} className="min-h-8 px-3 text-xs">
                  <Plus size={14} /> Thêm câu hỏi
                </Button>
              </div>

              {questions.map((q, qIdx) => (
                <div key={qIdx} className="flex flex-col gap-3 p-4 border-2 border-border rounded-xl bg-card shadow-[2px_2px_0_var(--border)]">
                  <div className="flex items-center justify-between gap-2 border-b-2 border-border/40 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-primary">Câu {qIdx + 1}</span>
                      <span className="text-xs font-bold text-muted-foreground">(Số thứ tự trong đề:</span>
                      <input
                        type="number"
                        value={q.question_number || 101}
                        onChange={(e) => {
                          const updated = [...questions]
                          updated[qIdx].question_number = Number(e.target.value)
                          setQuestions(updated)
                        }}
                        className="w-16 px-2 py-0.5 border border-border rounded text-xs font-black text-center"
                      />
                      <span className="text-xs font-bold text-muted-foreground">)</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(qIdx)}
                      className="text-xs text-rose-600 font-bold hover:underline"
                    >
                      Xóa câu này
                    </button>
                  </div>

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
                      }}
                      className="px-3 py-1.5 border-2 border-border rounded-lg text-xs font-bold bg-background focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* Options A, B, C, D */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {(q.options || []).map((opt) => (
                      <div
                        key={opt.key}
                        className={`flex items-center gap-2 p-2 border-2 rounded-lg ${
                          opt.is_correct ? 'border-emerald-500 bg-emerald-50/50' : 'border-border bg-background'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`correct_opt_${qIdx}`}
                          checked={opt.is_correct}
                          onChange={() => handleOptionChange(qIdx, opt.key, 'is_correct', true)}
                          className="accent-emerald-600 cursor-pointer"
                        />
                        <span className="text-xs font-black w-4">{opt.key}.</span>
                        <input
                          type="text"
                          placeholder={`Đáp án ${opt.key}`}
                          value={opt.text}
                          onChange={(e) => handleOptionChange(qIdx, opt.key, 'text', e.target.value)}
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
                      }}
                      className="px-3 py-1.5 border border-border rounded-lg text-xs font-semibold bg-background focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t-2 border-border">
              <Button variant="primary" onClick={handleSavePassageSet} disabled={saving} className="px-6 text-xs font-black">
                <Save size={14} />
                {saving ? 'Đang lưu...' : 'Lưu Cụm bài đọc này'}
              </Button>
            </div>
          </div>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-foreground">Loại chứng chỉ</label>
                  <Select
                    value={editCategory}
                    onChange={(val) => setEditCategory(val as ExamCategory)}
                    options={[
                      { value: 'TOEIC', label: 'TOEIC Reading' },
                      { value: 'IELTS', label: 'IELTS Reading' },
                      { value: 'TOEFL', label: 'TOEFL' },
                    ]}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-foreground">Thời gian (phút)</label>
                  <input
                    type="number"
                    min={10}
                    max={200}
                    value={editTimeLimit}
                    onChange={(e) => setEditTimeLimit(Number(e.target.value))}
                    className="px-3.5 py-2 border-2 border-border rounded-xl bg-background text-xs font-bold focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-foreground">Tổng số câu hỏi</label>
                <input
                  type="number"
                  min={1}
                  max={300}
                  value={editTotalQuestions}
                  onChange={(e) => setEditTotalQuestions(Number(e.target.value))}
                  className="px-3.5 py-2 border-2 border-border rounded-xl bg-background text-xs font-bold focus:outline-none focus:border-primary"
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

      {/* Confirmation Modal */}
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
