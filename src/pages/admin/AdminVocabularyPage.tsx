import { useEffect, useState } from 'react'
import { BookOpen, FileDown, FileSpreadsheet, RefreshCw, Trash2 } from 'lucide-react'
import { adminService } from '@/services/supabase/admin.service'
import { DataTable } from '@/components/admin/DataTable'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { showToast } from '@/components/ui/toast'

export default function AdminVocabularyPage() {
  const [terms, setTerms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const loadTerms = async () => {
    try {
      setLoading(true)
      const data = await adminService.listGlobalTerms()
      setTerms(data)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Không thể tải danh sách từ vựng hệ thống')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadTerms()
  }, [])

  const handleDelete = async (id: string) => {
    try {
      setError(null)
      await adminService.deleteGlobalTerm(id)
      setTerms(prev => prev.filter(t => t.id !== id))
      showToast({
        type: 'success',
        title: 'Đã xóa từ vựng',
        message: 'Từ vựng đã được xóa khỏi thư viện hệ thống.',
      })
    } catch (err: any) {
      console.error(err)
      const message = err.message || 'Lỗi khi xóa từ vựng'
      setError(message)
      showToast({ type: 'error', title: 'Không thể xóa từ vựng', message })
    } finally {
      setPendingDeleteId(null)
    }
  }

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setError(null)
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string
        const parsed = JSON.parse(text)
        if (!Array.isArray(parsed)) {
          throw new Error('Định dạng tệp JSON phải là một mảng các đối tượng từ vựng')
        }

        const formatted = parsed.map(item => ({
          source_text: item.source_text,
          normalized_text: (item.source_text || '').toLowerCase().trim(),
          source_language: item.source_language || 'en',
          native_language: item.native_language || 'vi',
          item_type: item.item_type || 'word',
          part_of_speech: item.part_of_speech || null,
          ipa: item.ipa || null,
          audio_url: item.audio_url || null,
          image_url: item.image_url || null,
          meanings: Array.isArray(item.meanings) ? item.meanings : [],
          examples: Array.isArray(item.examples) ? item.examples : [],
          source: 'admin_import'
        }))

        const count = await adminService.bulkImportVocabulary(formatted)
        showToast({
          type: 'success',
          title: 'Import thành công',
          message: `Đã import ${count} từ vựng mới vào hệ thống.`,
        })
        void loadTerms()
      } catch (err: any) {
        console.error(err)
        setError(err.message || 'Lỗi khi phân tích tệp JSON')
      } finally {
        setImporting(false)
        e.target.value = ''
      }
    }
    reader.readAsText(file)
  }

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(terms, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute("href", dataStr)
    downloadAnchor.setAttribute("download", `memorylang_global_vocabulary_${new Date().toISOString().split('T')[0]}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  const columns = [
    {
      header: 'Từ vựng (English)',
      className: 'w-[25%]',
      accessor: (row: any) => (
        <div>
          <span className="font-black text-sm text-slate-900">{row.source_text}</span>
          {row.ipa && <span className="ml-2 text-xs text-slate-500 font-mono">/{row.ipa}/</span>}
        </div>
      ),
    },
    {
      header: 'Loại / Từ loại',
      className: 'w-[15%]',
      accessor: (row: any) => (
        <div className="flex gap-1.5 items-center text-[10px] font-black uppercase">
          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-slate-900">
            {row.item_type}
          </span>
          {row.part_of_speech && (
            <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 border border-slate-900">
              {row.part_of_speech}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Nghĩa (Meanings)',
      className: 'w-[35%]',
      accessor: (row: any) => {
        const text = Array.isArray(row.meanings) && row.meanings.length > 0
          ? (typeof row.meanings[0] === 'object' ? row.meanings[0]?.text || row.meanings[0]?.definition : row.meanings[0])
          : 'Chưa có định nghĩa'
        return <span className="text-xs truncate max-w-full block font-bold text-slate-600">{text || 'Chưa có định nghĩa'}</span>
      },
    },
    {
      header: 'Đa phương tiện',
      className: 'w-[15%]',
      accessor: (row: any) => (
        <div className="flex gap-1.5 text-[10px] font-black">
          {row.audio_url ? (
            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-slate-900">AUDIO</span>
          ) : (
            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-300">NO AUDIO</span>
          )}
          {row.image_url ? (
            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-slate-900">IMAGE</span>
          ) : (
            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-300">NO IMAGE</span>
          )}
        </div>
      ),
    },
    {
      header: 'Hành động',
      className: 'text-center w-[10%]',
      accessor: (row: any) => (
        <Button
          type="button"
          variant="danger"
          onClick={() => setPendingDeleteId(row.id)}
          className="neo-button p-1.5 h-8 w-8 min-h-0 rounded-lg border-2 border-slate-900 bg-rose-500 text-white shadow-[1.5px_1.5px_0px_0px_#000] hover:bg-rose-600 cursor-pointer"
          title="Xóa khỏi hệ thống"
        >
          <Trash2 size={15} />
        </Button>
      ),
    },
  ]

  const searchFilter = (row: any, query: string) => {
    return row.source_text.toLowerCase().includes(query.toLowerCase())
  }

  const toolbarActions = (
    <div className="flex flex-wrap items-center gap-2">
      {/* Import File Input */}
      <label className="neo-button min-h-0 px-3 py-2 h-9 rounded-xl border-2 border-slate-900 bg-[#fdc800] text-slate-900 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_0px_#000] hover:bg-amber-300 transition-all">
        <FileDown size={14} />
        <span>{importing ? 'Đang Import...' : 'Import JSON'}</span>
        <input
          type="file"
          accept=".json"
          onChange={handleImportJson}
          className="hidden"
          disabled={importing}
        />
      </label>

      {/* Export Button */}
      <Button
        type="button"
        variant="ghost"
        onClick={handleExportJson}
        disabled={terms.length === 0}
        className="neo-button min-h-0 px-3 py-2 h-9 rounded-xl border-2 border-slate-900 bg-white text-slate-900 text-xs font-black flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#000] hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
      >
        <FileSpreadsheet size={14} />
        <span>Export JSON</span>
      </Button>

      {/* Reload Button */}
      <Button
        type="button"
        variant="ghost"
        onClick={loadTerms}
        className="neo-button p-2 h-9 w-9 min-h-0 rounded-xl border-2 border-slate-900 bg-white text-slate-900 shadow-[2px_2px_0px_0px_#000] hover:bg-slate-100 cursor-pointer"
        title="Làm mới"
      >
        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
      </Button>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-amber-200 rounded-xl border-2 border-slate-900 flex items-center justify-center text-slate-900 shrink-0 shadow-[2px_2px_0px_0px_#000]">
          <BookOpen className="w-5 h-5 text-slate-900" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">THƯ VIỆN TỪ VỰNG HỆ THỐNG</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-bold">
            Quản lý cơ sở dữ liệu từ vựng dùng chung (`global_terms`), import/export dữ liệu từ vựng.
          </p>
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
        data={terms}
        searchPlaceholder="Tìm kiếm theo từ vựng..."
        searchFilter={searchFilter}
        isLoading={loading}
        actions={toolbarActions}
      />

      <ConfirmModal
        open={pendingDeleteId !== null}
        title="Xóa từ vựng hệ thống?"
        description="Từ vựng này sẽ bị xóa khỏi thư viện dùng chung."
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        variant="danger"
        onConfirm={() => {
          if (!pendingDeleteId) return
          void handleDelete(pendingDeleteId)
        }}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  )
}
