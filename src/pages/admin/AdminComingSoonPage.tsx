import { useLocation } from 'react-router-dom'
import { Construction } from 'lucide-react'

export default function AdminComingSoonPage() {
  const location = useLocation()
  
  // Xác định tên chức năng từ đường dẫn
  const getModuleName = (path: string) => {
    if (path.includes('vocabulary')) return 'Thư viện từ vựng (Phase 3)'
    if (path.includes('grammar')) return 'Quản lý Ngữ pháp (Phase 3)'
    if (path.includes('listening')) return 'Quản lý Luyện nghe (Phase 3)'
    if (path.includes('storage')) return 'Quản lý Storage (Phase 3)'
    if (path.includes('functions')) return 'Edge Functions Deployment (Phase 4)'
    if (path.includes('i18n')) return 'Quản lý Ngôn ngữ i18n (Phase 4)'
    if (path.includes('audit')) return 'Lịch sử thao tác Audit (Phase 4)'
    if (path.includes('analytics')) return 'Thống kê nâng cao (Phase 4)'
    return 'Chức năng hệ thống'
  }

  const moduleName = getModuleName(location.pathname)

  return (
    <div className="neo-card p-12 bg-card border-2 border-border shadow-[4px_4px_0_var(--border)] flex flex-col items-center justify-center text-center min-h-[400px]">
      <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 border-2 border-amber-400 flex items-center justify-center mb-4 animate-bounce">
        <Construction size={32} />
      </div>
      <h1 className="text-2xl font-black mb-2 text-foreground">{moduleName}</h1>
      <p className="text-muted-foreground font-bold max-w-md">
        Tính năng này đang được phát triển theo lộ trình của hệ thống quản trị MemoryLang. Hãy quay lại ở các Phase sau!
      </p>
      <div className="mt-6 px-4 py-2 bg-muted border-2 border-border text-xs font-black uppercase tracking-wider rounded-md">
        Coming Soon — Under Construction
      </div>
    </div>
  )
}
