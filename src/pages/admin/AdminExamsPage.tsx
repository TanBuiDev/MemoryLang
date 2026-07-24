import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Trash2,
  Layers,
  Sparkles,
  ChevronRight,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Select } from '@/components/ui/select'
import { showToast } from '@/components/ui/toast'
import { adminExamService } from '@/services/supabase/adminExam.service'
import type { Exam, ExamCategory } from '@/types/exam.types'

export default function AdminExamsPage() {
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Create Modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState<ExamCategory>('TOEIC')
  const [newTimeLimit, setNewTimeLimit] = useState<number>(75)
  const [newTotalQuestions, setNewTotalQuestions] = useState<number>(100)
  const [creating, setCreating] = useState(false)

  // Edit Modal state
  const [editingExam, setEditingExam] = useState<Exam | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editCategory, setEditCategory] = useState<ExamCategory>('TOEIC')
  const [editTimeLimit, setEditTimeLimit] = useState<number>(75)
  const [editTotalQuestions, setEditTotalQuestions] = useState<number>(100)
  const [updating, setUpdating] = useState(false)

  // Delete state
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const loadExams = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await adminExamService.listExams()
      setExams(data)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Không thể tải danh sách đề thi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadExams()
  }, [])

  const openEditModal = (exam: Exam) => {
    setEditingExam(exam)
    setEditTitle(exam.title)
    setEditCategory(exam.category)
    setEditTimeLimit(exam.time_limit_minutes)
    setEditTotalQuestions(exam.total_questions)
  }

  const handleUpdateExam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingExam || !editTitle.trim()) return
    try {
      setUpdating(true)
      const updated = await adminExamService.updateExam(editingExam.id, {
        title: editTitle.trim(),
        category: editCategory,
        time_limit_minutes: editTimeLimit,
        total_questions: editTotalQuestions,
      })
      setExams((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      setEditingExam(null)
      showToast({
        type: 'success',
        title: 'Đã cập nhật',
        message: `Đã lưu thông tin mới cho đề "${updated.title}".`,
      })
    } catch (err: any) {
      console.error(err)
      showToast({ type: 'error', title: 'Lỗi', message: err.message || 'Không thể cập nhật đề thi' })
    } finally {
      setUpdating(false)
    }
  }

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) {
      showToast({ type: 'error', title: 'Lỗi', message: 'Vui lòng nhập tên đề thi.' })
      return
    }

    try {
      setCreating(true)
      const created = await adminExamService.createExam({
        title: newTitle.trim(),
        category: newCategory,
        time_limit_minutes: newTimeLimit,
        total_questions: newTotalQuestions,
        is_published: false,
      })

      setExams((prev) => [created, ...prev])
      setShowCreateModal(false)
      setNewTitle('')
      showToast({
        type: 'success',
        title: 'Đã tạo đề thi',
        message: `Đã tạo đề "${created.title}". Hãy vào Trình xây dựng để thêm Part và câu hỏi!`,
      })
    } catch (err: any) {
      console.error(err)
      showToast({ type: 'error', title: 'Lỗi', message: err.message || 'Không thể tạo đề thi' })
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteExam = async () => {
    if (!pendingDeleteId) return
    try {
      await adminExamService.deleteExam(pendingDeleteId)
      setExams((prev) => prev.filter((e) => e.id !== pendingDeleteId))
      showToast({ type: 'success', title: 'Đã xóa', message: 'Đã xóa đề thi thành công.' })
    } catch (err: any) {
      console.error(err)
      showToast({ type: 'error', title: 'Lỗi', message: err.message || 'Không thể xóa đề thi' })
    } finally {
      setPendingDeleteId(null)
    }
  }

  const filteredExams = exams.filter((exam) => {
    const matchesCat = selectedCategory === 'all' || exam.category === selectedCategory
    const matchesSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCat && matchesSearch
  })

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto">
      {/* Header Banner */}
      <div className="neo-card p-6 bg-card border-3 border-border shadow-[4px_4px_0_var(--border)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl border-3 border-border bg-primary flex items-center justify-center shadow-[2px_2px_0_var(--border)] text-primary-foreground">
            <FileText size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              QUẢN LÝ THƯ VIỆN ĐỀ THI & BỘ ĐỀ
            </h1>
            <p className="text-sm font-bold text-muted-foreground mt-0.5">
              Tạo và quản lý linh hoạt mọi loại đề thi (TOEIC, IELTS, TOEFL, THPTQG, Cambridge, General...) với cấu trúc phân cấp Phần thi (Parts) & Đoạn văn linh hoạt.
            </p>
          </div>
        </div>

        <Button variant="primary" onClick={() => setShowCreateModal(true)} className="px-5 py-2.5 text-xs font-black shrink-0">
          <Plus size={16} />
          Tạo Đề thi mới
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-rose-100 border-3 border-rose-400 text-rose-950 rounded-xl font-bold text-sm flex items-center gap-2">
          <AlertCircle size={18} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-2 border-b-3 border-border">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {[
            { id: 'all', label: 'Tất cả đề' },
            { id: 'TOEIC', label: 'TOEIC' },
            { id: 'IELTS', label: 'IELTS' },
            { id: 'TOEFL', label: 'TOEFL' },
            { id: 'THPTQG', label: 'THPTQG' },
            { id: 'CAMBRIDGE', label: 'Cambridge' },
            { id: 'GENERAL', label: 'Tổng hợp / Khác' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black border-2 border-border transition-all shadow-[2px_2px_0_var(--border)] active:translate-y-[1px] active:shadow-none ${
                selectedCategory === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-foreground hover:bg-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm kiếm đề thi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs font-bold border-2 border-border rounded-xl bg-card focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Exam List Grid */}
      {loading ? (
        <div className="text-center font-black text-muted-foreground py-16 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Đang tải danh sách đề thi...</span>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="neo-card p-12 text-center bg-card border-3 border-border shadow-[4px_4px_0_var(--border)] flex flex-col items-center gap-3 rounded-2xl">
          <FileText size={40} className="text-muted-foreground opacity-50" />
          <h3 className="text-base font-black text-foreground">Chưa có đề thi nào</h3>
          <p className="text-xs text-muted-foreground font-bold max-w-md">
            Hãy bấm nút "Tạo Đề thi mới" phía trên để tạo bộ đề ETS TOEIC hoặc IELTS đầu tiên!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map((exam) => (
            <div
              key={exam.id}
              className="neo-card p-5 bg-card border-3 border-border shadow-[4px_4px_0_var(--border)] flex flex-col justify-between gap-4 rounded-xl hover:-translate-y-0.5 transition-transform"
            >
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black border-2 border-border bg-secondary/15 text-secondary">
                    {exam.category}
                  </span>
                  {exam.is_published ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md">
                      <CheckCircle2 size={12} />
                      ĐÃ XUẤT BẢN
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-slate-600 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-md">
                      BẢN NHÁP
                    </span>
                  )}
                </div>

                <h2 className="text-base font-black text-foreground tracking-tight leading-snug line-clamp-2">
                  {exam.title}
                </h2>

                <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground pt-1 border-t border-border/60">
                  <span className="flex items-center gap-1">
                    <Clock size={14} className="text-primary" />
                    {exam.time_limit_minutes} phút
                  </span>
                  <span className="flex items-center gap-1">
                    <HelpCircle size={14} className="text-secondary" />
                    {exam.total_questions} câu hỏi
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-2 border-t-2 border-dashed border-border">
                <Button variant="primary" asChild className="flex-1 min-h-9 text-xs">
                  <Link to={`/app/admin/exams/${exam.id}/builder`}>
                    <Layers size={14} />
                    Xây dựng Đề
                    <ChevronRight size={14} />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => openEditModal(exam)}
                  className="min-h-9 px-3 text-xs"
                  title="Chỉnh sửa thông tin đề thi"
                >
                  <Pencil size={14} />
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setPendingDeleteId(exam.id)}
                  className="min-h-9 px-3 text-xs text-rose-600 hover:text-white hover:bg-rose-600"
                  title="Xóa đề thi này"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Create Exam */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="neo-card p-6 bg-card border-3 border-border shadow-[6px_6px_0_var(--border)] rounded-2xl w-full max-w-lg flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b-2 border-border pb-3">
              <h2 className="text-lg font-black text-foreground flex items-center gap-2">
                <Sparkles size={20} className="text-primary" />
                TẠO ĐỀ THI MỚI
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                ✕ Đóng
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-foreground">Tên đề thi *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: ETS TOEIC Reading 2026 - Test 1"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="px-3.5 py-2.5 border-2 border-border rounded-xl bg-background text-xs font-bold focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-foreground">Loại bài thi / Thể loại</label>
                  <Select
                    value={newCategory}
                    onChange={(val) => setNewCategory(val as ExamCategory)}
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

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-foreground">Thời gian (phút)</label>
                  <input
                    type="number"
                    min={10}
                    max={200}
                    value={newTimeLimit}
                    onChange={(e) => setNewTimeLimit(Number(e.target.value))}
                    className="px-3.5 py-2 border-2 border-border rounded-xl bg-background text-xs font-bold focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-foreground">Tổng số câu hỏi mặc định</label>
                <input
                  type="number"
                  min={1}
                  max={300}
                  value={newTotalQuestions}
                  onChange={(e) => setNewTotalQuestions(Number(e.target.value))}
                  className="px-3.5 py-2 border-2 border-border rounded-xl bg-background text-xs font-bold focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t-2 border-border">
                <Button variant="ghost" type="button" onClick={() => setShowCreateModal(false)}>
                  Hủy
                </Button>
                <Button variant="primary" type="submit" disabled={creating}>
                  {creating ? 'Đang tạo...' : 'Tạo Đề & Vào Builder'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Exam */}
      {editingExam && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="neo-card p-6 bg-card border-3 border-border shadow-[6px_6px_0_var(--border)] rounded-2xl w-full max-w-lg flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b-2 border-border pb-3">
              <h2 className="text-lg font-black text-foreground flex items-center gap-2">
                <Pencil size={20} className="text-primary" />
                CHỈNH SỬA THÔNG TIN ĐỀ THI
              </h2>
              <button
                type="button"
                onClick={() => setEditingExam(null)}
                className="text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                ✕ Đóng
              </button>
            </div>

            <form onSubmit={handleUpdateExam} className="flex flex-col gap-4">
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
                  <label className="text-xs font-black text-foreground">Loại bài thi / Thể loại</label>
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
                <Button variant="ghost" type="button" onClick={() => setEditingExam(null)}>
                  Hủy
                </Button>
                <Button variant="primary" type="submit" disabled={updating}>
                  {updating ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        open={!!pendingDeleteId}
        title="Xác nhận xóa đề thi?"
        description="Hành động này sẽ xóa đề thi cùng toàn bộ các Cụm bài đọc và câu hỏi bên trong. Bạn không thể khôi phục sau khi xóa."
        onConfirm={handleDeleteExam}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  )
}
