import { useEffect, useState } from 'react'
import { FileDown, FileSpreadsheet, RefreshCw, Trash2 } from 'lucide-react'
import { adminService } from '@/services/supabase/admin.service'
import { DataTable } from '@/components/admin/DataTable'

export default function AdminVocabularyPage() {
  const [terms, setTerms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

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
    if (!window.confirm('Bạn có chắc chắn muốn xóa từ vựng này khỏi thư viện hệ thống?')) return
    try {
      setError(null)
      await adminService.deleteGlobalTerm(id)
      setTerms(prev => prev.filter(t => t.id !== id))
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Lỗi khi xóa từ vựng')
    }
  }

  // Chức năng Import giả lập (Đọc file JSON)
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

        // Validate cơ bản và chuẩn hóa
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
        alert(`Đã import thành công ${count} từ vựng mới vào hệ thống!`)
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

  // Export danh sách từ vựng hiện tại thành JSON
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
          <span className="font-black text-sm text-foreground">{row.source_text}</span>
          {row.ipa && <span className="ml-2 text-xs text-muted-foreground font-mono">/{row.ipa}/</span>}
        </div>
      ),
    },
    {
      header: 'Loại / Từ loại',
      className: 'w-[15%]',
      accessor: (row: any) => (
        <div className="flex gap-1.5 items-center text-[10px] font-black uppercase">
          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
            {row.item_type}
          </span>
          {row.part_of_speech && (
            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-300">
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
        return <span className="text-xs truncate max-w-xs block font-bold text-muted-foreground">{text || 'Chưa có định nghĩa'}</span>
      },
    },
    {
      header: 'Đa phương tiện',
      className: 'w-[15%]',
      accessor: (row: any) => (
        <div className="flex gap-2 text-[10px] font-black">
          {row.audio_url ? (
            <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-800 border border-green-300">AUDIO</span>
          ) : (
            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-300">NO AUDIO</span>
          )}
          {row.image_url ? (
            <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-800 border border-green-300">IMAGE</span>
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
        <button
          onClick={() => handleDelete(row.id)}
          className="neo-button min-h-0 p-1.5 rounded bg-rose-100 text-rose-800 border border-border hover:bg-rose-200 active:neo-button-active transition-all"
          title="Xóa khỏi hệ thống"
        >
          <Trash2 size={14} />
        </button>
      ),
    },
  ]

  const searchFilter = (row: any, query: string) => {
    return row.source_text.toLowerCase().includes(query.toLowerCase())
  }

  const toolbarActions = (
    <div className="flex flex-wrap items-center gap-2">
      {/* Import File Input */}
      <label className="neo-button min-h-0 px-3 py-2 rounded-md border-2 border-border bg-[#fdc800] text-foreground text-xs font-black flex items-center gap-1.5 cursor-pointer hover:bg-[#e0b000] active:neo-button-active transition-all">
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
      <button
        onClick={handleExportJson}
        disabled={terms.length === 0}
        className="neo-button min-h-0 px-3 py-2 rounded-md border-2 border-border bg-card text-foreground text-xs font-black flex items-center gap-1.5 hover:bg-muted active:neo-button-active transition-all disabled:opacity-50"
      >
        <FileSpreadsheet size={14} />
        Export Thư viện
      </button>

      {/* Reload Button */}
      <button
        onClick={loadTerms}
        className="neo-button min-h-0 p-2 rounded-md border-2 border-border bg-card hover:bg-muted active:neo-button-active transition-all"
        title="Làm mới"
      >
        <RefreshCw size={14} />
      </button>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">THƯ VIỆN TỪ VỰNG HỆ THỐNG</h1>
        <p className="text-muted-foreground font-bold">
          Quản lý cơ sở dữ liệu từ vựng dùng chung (`global_terms`), import/export dữ liệu từ vựng.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-100 border-2 border-rose-400 text-rose-900 rounded-md font-bold text-sm">
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
    </div>
  )
}
