import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Edit,
  Eye,
  Trash2,
  Crown,
  FileText,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { adminReadingService } from '@/services/supabase/adminReading.service'
import { DataTable } from '@/components/admin/DataTable'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { showToast } from '@/components/ui/toast'
import type { ReadingArticle } from '@/types/reading.types'

export default function AdminReadingListPage() {
  const navigate = useNavigate()
  const [articles, setArticles] = useState<ReadingArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const loadArticles = async () => {
    try {
      setLoading(true)
      const data = await adminReadingService.listArticles()
      setArticles(data)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Không thể tải danh sách bài đọc')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadArticles()
  }, [])

  const handleDelete = async (id: string) => {
    try {
      setError(null)
      await adminReadingService.deleteArticle(id)
      setArticles((prev) => prev.filter((a) => a.id !== id))
      showToast({ type: 'success', title: 'Đã xóa bài đọc', message: 'Bài đọc đã được xóa.' })
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Không thể xóa bài đọc')
    } finally {
      setPendingDeleteId(null)
    }
  }

  const columns = [
    {
      header: 'Tiêu đề bài đọc',
      className: 'w-[30%]',
      accessor: (row: ReadingArticle) => (
        <div>
          <div className="font-black text-slate-900 text-xs sm:text-sm line-clamp-1">{row.title}</div>
          {row.subtitle && <div className="text-[11px] text-slate-500 font-bold line-clamp-1">{row.subtitle}</div>}
        </div>
      ),
    },
    {
      header: 'Level / Mục đích',
      className: 'w-[15%]',
      accessor: (row: ReadingArticle) => (
        <div className="flex flex-col gap-1">
          <span className="inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-slate-900 shadow-[1px_1px_0px_0px_#000] w-max">
            Level {row.cefr_level}
          </span>
          <span className="text-[10px] font-bold text-slate-600">{row.purpose}</span>
        </div>
      ),
    },
    {
      header: 'Số từ / Thời gian',
      className: 'w-[15%]',
      accessor: (row: ReadingArticle) => (
        <div className="text-xs font-bold text-slate-700 space-y-0.5">
          <div>{row.word_count} từ</div>
          <div className="text-[11px] text-slate-500">~{row.estimated_reading_time} phút</div>
        </div>
      ),
    },
    {
      header: 'Gói & Trạng thái',
      className: 'w-[20%]',
      accessor: (row: ReadingArticle) => (
        <div className="flex flex-col gap-1 items-start">
          {row.is_published ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-slate-900 shadow-[1px_1px_0px_0px_#000]">
              <CheckCircle2 size={11} />
              Published
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-900">
              <Clock size={11} />
              Draft
            </span>
          )}

          {row.access_tier === 'pro' ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-slate-900">
              <Crown size={11} className="text-amber-600" />
              Pro Tier
            </span>
          ) : (
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-900">
              Free Tier
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Thao tác',
      className: 'text-center w-[20%]',
      accessor: (row: ReadingArticle) => (
        <div className="flex justify-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate(`/app/reading/${row.id}`)}
            className="neo-button p-1.5 h-8 w-8 min-h-0 rounded-lg border-2 border-slate-900 bg-white text-slate-900 shadow-[1.5px_1.5px_0px_0px_#000] hover:bg-slate-100 cursor-pointer"
            title="Xem bài đọc"
          >
            <Eye size={15} />
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate(`/app/admin/reading/${row.id}/edit`)}
            className="neo-button p-1.5 h-8 w-8 min-h-0 rounded-lg border-2 border-slate-900 bg-[#fdc800] text-slate-900 shadow-[1.5px_1.5px_0px_0px_#000] hover:bg-amber-300 cursor-pointer"
            title="Chỉnh sửa bài đọc"
          >
            <Edit size={15} />
          </Button>

          <Button
            type="button"
            variant="danger"
            onClick={() => setPendingDeleteId(row.id)}
            className="neo-button p-1.5 h-8 w-8 min-h-0 rounded-lg border-2 border-slate-900 bg-rose-500 text-white shadow-[1.5px_1.5px_0px_0px_#000] hover:bg-rose-600 cursor-pointer"
            title="Xóa bài đọc"
          >
            <Trash2 size={15} />
          </Button>
        </div>
      ),
    },
  ]

  const searchFilter = (row: ReadingArticle, query: string) => {
    const term = query.toLowerCase()
    return (
      row.title.toLowerCase().includes(term) ||
      (row.subtitle || '').toLowerCase().includes(term) ||
      row.cefr_level.toLowerCase().includes(term)
    )
  }

  const publishedCount = articles.filter((a) => a.is_published).length
  const draftCount = articles.filter((a) => !a.is_published).length

  return (
    <div className="flex flex-col gap-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-200 rounded-xl border-2 border-slate-900 flex items-center justify-center text-slate-900 shrink-0 shadow-[2px_2px_0px_0px_#000]">
            <FileText className="w-5 h-5 text-slate-900" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">QUẢN LÝ BÀI ĐỌC HIỂU</h1>
            <p className="text-xs sm:text-sm text-slate-500 font-bold">
              Soạn thảo bài đọc, tạo audio TTS và thiết lập bộ câu hỏi kiểm tra đọc hiểu.
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => navigate('/app/admin/reading/new')}
          className="neo-button px-4 py-2 h-10 bg-[#fdc800] hover:bg-amber-300 text-slate-900 font-black text-xs sm:text-sm border-2 border-slate-900 shadow-[3px_3px_0px_0px_#000] rounded-xl flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus size={18} />
          <span>Tạo Bài Đọc Mới</span>
        </Button>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-white border-2 border-slate-900 rounded-xl shadow-[2px_2px_0px_0px_#000] text-center">
          <span className="text-xl font-black text-slate-900">{articles.length}</span>
          <p className="text-[10px] font-black uppercase text-slate-500">Tổng số bài đọc</p>
        </div>
        <div className="p-3 bg-emerald-50 border-2 border-slate-900 rounded-xl shadow-[2px_2px_0px_0px_#000] text-center">
          <span className="text-xl font-black text-emerald-900">{publishedCount}</span>
          <p className="text-[10px] font-black uppercase text-emerald-800">Đã xuất bản</p>
        </div>
        <div className="p-3 bg-slate-100 border-2 border-slate-900 rounded-xl shadow-[2px_2px_0px_0px_#000] text-center">
          <span className="text-xl font-black text-slate-800">{draftCount}</span>
          <p className="text-[10px] font-black uppercase text-slate-600">Bản nháp</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-100 border-2 border-slate-900 text-rose-900 rounded-xl font-bold text-xs sm:text-sm shadow-[2px_2px_0px_0px_#000]">
          {error}
        </div>
      )}

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={articles}
        searchPlaceholder="Tìm kiếm tên bài đọc, level..."
        searchFilter={searchFilter}
        isLoading={loading}
      />

      <ConfirmModal
        open={!!pendingDeleteId}
        onConfirm={() => pendingDeleteId && handleDelete(pendingDeleteId)}
        onCancel={() => setPendingDeleteId(null)}
        title="Xóa bài đọc?"
        description="Xóa bài đọc này khỏi hệ thống? Hành động này không thể hoàn tác."
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        variant="danger"
      />
    </div>
  )
}
