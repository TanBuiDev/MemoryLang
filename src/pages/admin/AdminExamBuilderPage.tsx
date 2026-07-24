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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Select } from '@/components/ui/select'
import { showToast } from '@/components/ui/toast'
import { adminExamService } from '@/services/supabase/adminExam.service'
import type {
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

  // Delete modal state
  const [pendingDeleteSetId, setPendingDeleteSetId] = useState<string | null>(null)

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

  const initNewSet = (partNum: number = 7) => {
    setSelectedSetId(null)
    setPartNumber(partNum)
    setPassageType(partNum === 5 ? 'none' : 'single')
    setSetTitle(partNum === 5 ? 'Questions 101-130' : 'Questions 147-148 refer to the following email.')
    setInstructionText('')

    if (partNum === 5) {
      setPassages([])
    } else {
      setPassages([{ id: 'p1', type: 'email', title: 'Email 1', content_html: '' }])
    }

    setQuestions([
      {
        question_number: partNum === 5 ? 101 : 147,
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

  const part5Sets = (exam.passage_sets || []).filter((s) => s.part_number === 5)
  const part6Sets = (exam.passage_sets || []).filter((s) => s.part_number === 6)
  const part7Sets = (exam.passage_sets || []).filter((s) => s.part_number === 7)

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
                CẤU TRÚC ĐỀ THI ({exam.passage_sets.length} CỤM)
              </h2>
            </div>

            {/* PART 5 */}
            <div className="flex flex-col gap-2 p-2.5 bg-muted/30 border-2 border-border rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-foreground">PART 5: Incomplete Sentences</span>
                <button
                  type="button"
                  onClick={() => initNewSet(5)}
                  className="text-[11px] font-black text-primary hover:underline flex items-center gap-0.5"
                >
                  <Plus size={12} /> Thêm Cụm
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                {part5Sets.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => selectPassageSet(s)}
                    className={`p-2 rounded-lg border-2 border-border text-xs font-bold flex items-center justify-between cursor-pointer transition ${
                      selectedSetId === s.id
                        ? 'bg-primary/20 border-primary shadow-[2px_2px_0_var(--border)]'
                        : 'bg-card hover:bg-muted/50'
                    }`}
                  >
                    <span className="truncate">{s.title || 'Part 5 Questions'}</span>
                    <span className="text-[10px] font-mono font-black text-muted-foreground shrink-0 pl-2">
                      {(s.questions || []).length} câu
                    </span>
                  </div>
                ))}
                {part5Sets.length === 0 && (
                  <span className="text-[11px] text-muted-foreground italic py-1">Chưa có câu hỏi Part 5.</span>
                )}
              </div>
            </div>

            {/* PART 6 */}
            <div className="flex flex-col gap-2 p-2.5 bg-muted/30 border-2 border-border rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-foreground">PART 6: Text Completion</span>
                <button
                  type="button"
                  onClick={() => initNewSet(6)}
                  className="text-[11px] font-black text-primary hover:underline flex items-center gap-0.5"
                >
                  <Plus size={12} /> Thêm Cụm
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                {part6Sets.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => selectPassageSet(s)}
                    className={`p-2 rounded-lg border-2 border-border text-xs font-bold flex items-center justify-between cursor-pointer transition ${
                      selectedSetId === s.id
                        ? 'bg-primary/20 border-primary shadow-[2px_2px_0_var(--border)]'
                        : 'bg-card hover:bg-muted/50'
                    }`}
                  >
                    <span className="truncate">{s.title || 'Part 6 Passage'}</span>
                    <span className="text-[10px] font-mono font-black text-muted-foreground shrink-0 pl-2">
                      {(s.questions || []).length} câu
                    </span>
                  </div>
                ))}
                {part6Sets.length === 0 && (
                  <span className="text-[11px] text-muted-foreground italic py-1">Chưa có cụm Part 6.</span>
                )}
              </div>
            </div>

            {/* PART 7 */}
            <div className="flex flex-col gap-2 p-2.5 bg-muted/30 border-2 border-border rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-foreground">PART 7: Reading Comprehension</span>
                <button
                  type="button"
                  onClick={() => initNewSet(7)}
                  className="text-[11px] font-black text-primary hover:underline flex items-center gap-0.5"
                >
                  <Plus size={12} /> Thêm Cụm
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                {part7Sets.map((s) => (
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
                      <span className="truncate">{s.title || 'Part 7 Passage Set'}</span>
                    </div>
                    <span className="text-[10px] font-mono font-black text-muted-foreground shrink-0 pl-2">
                      {(s.questions || []).length} câu
                    </span>
                  </div>
                ))}
                {part7Sets.length === 0 && (
                  <span className="text-[11px] text-muted-foreground italic py-1">Chưa có cụm Part 7.</span>
                )}
              </div>
            </div>
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
                    { value: '5', label: 'Part 5 (30 câu ngắn)' },
                    { value: '6', label: 'Part 6 (Điền từ đoạn)' },
                    { value: '7', label: 'Part 7 (Đọc hiểu)' },
                  ]}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-black text-foreground">Loại đoạn văn (Passage Type)</label>
                <Select
                  value={passageType}
                  onChange={(val) => handlePassageTypeChange(val as PassageType)}
                  options={[
                    { value: 'none', label: 'Không đoạn văn (Part 5)' },
                    { value: 'single', label: 'Đoạn văn đơn (Single)' },
                    { value: 'double', label: 'Đoạn văn kép (Double)' },
                    { value: 'triple', label: 'Đoạn văn ba (Triple)' },
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
