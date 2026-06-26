import { useState } from 'react'
import { Download, Search } from 'lucide-react'

interface TranslationKey {
  key: string
  vi: string
  en: string
  section: string
}

export default function AdminI18nPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterSection, setFilterSection] = useState('all')

  const [translations, setTranslations] = useState<TranslationKey[]>([
    { key: 'nav.dashboard', vi: 'Tổng quan', en: 'Dashboard', section: 'navigation' },
    { key: 'nav.vocabulary', vi: 'Từ vựng', en: 'Vocabulary', section: 'navigation' },
    { key: 'nav.decks', vi: 'Bộ thẻ', en: 'Decks', section: 'navigation' },
    { key: 'nav.study', vi: 'Học thẻ', en: 'Study', section: 'navigation' },
    { key: 'nav.quiz', vi: 'Kiểm tra', en: 'Quiz', section: 'navigation' },
    { key: 'actions.save', vi: 'Lưu lại', en: 'Save', section: 'actions' },
    { key: 'actions.cancel', vi: 'Hủy bỏ', en: 'Cancel', section: 'actions' },
    { key: 'actions.delete', vi: 'Xóa bỏ', en: 'Delete', section: 'actions' },
    { key: 'study.remember', vi: 'Đã nhớ', en: 'Remembered', section: 'study' },
    { key: 'study.forgot', vi: 'Quên', en: 'Forgot', section: 'study' },
    { key: 'quiz.score', vi: 'Điểm số', en: 'Score', section: 'quiz' },
    { key: 'settings.title', vi: 'Cài đặt tài khoản', en: 'Account Settings', section: 'settings' },
  ])

  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ vi: string; en: string }>({ vi: '', en: '' })

  const handleEdit = (item: TranslationKey) => {
    setEditingKey(item.key)
    setEditForm({ vi: item.vi, en: item.en })
  }

  const handleCancel = () => {
    setEditingKey(null)
  }

  const handleSave = (key: string) => {
    setTranslations(prev =>
      prev.map(t => (t.key === key ? { ...t, vi: editForm.vi, en: editForm.en } : t))
    )
    setEditingKey(null)
  }

  const handleExportJson = () => {
    // Chuyển mảng phẳng thành cấu trúc lồng nhau vi/en json
    const viLang: Record<string, string> = {}
    const enLang: Record<string, string> = {}
    translations.forEach(t => {
      viLang[t.key] = t.vi
      enLang[t.key] = t.en
    })

    const payload = { vi: viLang, en: enLang }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute("href", dataStr)
    downloadAnchor.setAttribute("download", `memorylang_translations_${new Date().toISOString().split('T')[0]}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  const filteredTranslations = translations.filter(item => {
    const matchQuery =
      item.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.vi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.en.toLowerCase().includes(searchQuery.toLowerCase())
    const matchSection = filterSection === 'all' || item.section === filterSection
    return matchQuery && matchSection
  })

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">QUẢN LÝ NGÔN NGỮ (I18N)</h1>
          <p className="text-muted-foreground font-bold">Biên tập trực quan các từ khóa dịch thuật, hỗ trợ xuất bản tệp i18n JSON.</p>
        </div>
        <button
          onClick={handleExportJson}
          className="neo-button min-h-0 px-4 py-2 rounded-md border-2 border-border bg-[#fdc800] text-foreground text-xs font-black flex items-center gap-1.5 hover:bg-[#e0b000] active:neo-button-active transition-all"
        >
          <Download size={16} />
          Xuất bản Tệp Dịch JSON
        </button>
      </div>

      {/* Toolbar Filter & Search */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Tìm kiếm từ khóa, nghĩa..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border-2 border-border rounded-md bg-card text-sm font-bold placeholder:text-muted-foreground focus:outline-none focus:border-primary shadow-[2px_2px_0_var(--border)] focus:shadow-[4px_4px_0_var(--border)] transition-all"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        </div>
        
        <select
          value={filterSection}
          onChange={e => setFilterSection(e.target.value)}
          className="px-3 py-2 border-2 border-border rounded-md bg-card text-xs font-black focus:outline-none focus:border-primary shadow-[2px_2px_0_var(--border)] transition-all"
        >
          <option value="all">Tất cả phân mục</option>
          <option value="navigation">Navigation (Điều hướng)</option>
          <option value="actions">Actions (Hành động)</option>
          <option value="study">Study (Học thẻ)</option>
          <option value="quiz">Quiz (Kiểm tra)</option>
          <option value="settings">Settings (Cài đặt)</option>
        </select>
      </div>

      {/* Translations Table */}
      <div className="neo-card bg-card border-2 border-border shadow-[4px_4px_0_var(--border)] overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b-2 border-border bg-muted">
              <th className="px-4 py-3 font-black text-foreground uppercase border-r border-border/30">Mã Key i18n</th>
              <th className="px-4 py-3 font-black text-foreground uppercase border-r border-border/30">Tiếng Việt (VI)</th>
              <th className="px-4 py-3 font-black text-foreground uppercase border-r border-border/30">Tiếng Anh (EN)</th>
              <th className="px-4 py-3 font-black text-foreground uppercase text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredTranslations.map((item) => (
              <tr
                key={item.key}
                className="border-b border-border/30 last:border-b-0 hover:bg-muted/40 odd:bg-card even:bg-muted/10 transition-colors"
              >
                <td className="px-4 py-3 font-black font-mono text-xs border-r border-border/30 text-rose-800">{item.key}</td>
                
                {/* Tiếng Việt */}
                <td className="px-4 py-3 border-r border-border/30">
                  {editingKey === item.key ? (
                    <input
                      type="text"
                      value={editForm.vi}
                      onChange={e => setEditForm(prev => ({ ...prev, vi: e.target.value }))}
                      className="w-full px-2 py-1 border border-border rounded text-xs font-bold focus:outline-none"
                    />
                  ) : (
                    <span className="font-bold text-foreground text-xs">{item.vi}</span>
                  )}
                </td>

                {/* Tiếng Anh */}
                <td className="px-4 py-3 border-r border-border/30">
                  {editingKey === item.key ? (
                    <input
                      type="text"
                      value={editForm.en}
                      onChange={e => setEditForm(prev => ({ ...prev, en: e.target.value }))}
                      className="w-full px-2 py-1 border border-border rounded text-xs font-bold focus:outline-none"
                    />
                  ) : (
                    <span className="font-bold text-foreground text-xs">{item.en}</span>
                  )}
                </td>

                <td className="px-4 py-3 text-center">
                  {editingKey === item.key ? (
                    <div className="flex justify-center gap-1">
                      <button
                        onClick={() => handleSave(item.key)}
                        className="p-1.5 rounded bg-green-100 text-green-800 border border-green-300 text-[10px] font-black uppercase"
                      >
                        Lưu
                      </button>
                      <button
                        onClick={handleCancel}
                        className="p-1.5 rounded bg-slate-100 text-slate-600 border border-slate-300 text-[10px] font-black uppercase"
                      >
                        Hủy
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEdit(item)}
                      className="neo-button min-h-0 px-2 py-1 rounded bg-secondary text-secondary-foreground text-xs font-black border-2 border-border shadow-[2px_2px_0_var(--border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none hover:bg-[#321fb0] transition-all"
                    >
                      Sửa
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
