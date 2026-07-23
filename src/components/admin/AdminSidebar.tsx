import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  Bell,
  BookOpen,
  CreditCard,
  Database,
  FileText,
  Gamepad2,
  Headphones,
  History,
  KeyRound,
  Languages,
  LayoutDashboard,
  ScrollText,
  Terminal,
  ToggleLeft,
  Users,
  Volume2,
  Shield,
  Layers,
  Sliders,
  Wrench,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'

interface SidebarItem {
  name: string
  to: string
  icon: LucideIcon
  phase: number
  isReady: boolean
}

interface SidebarCategory {
  title: string
  icon: LucideIcon
  badgeColor: string
  items: SidebarItem[]
}

const sidebarCategories: SidebarCategory[] = [
  {
    title: 'HỆ THỐNG & NGƯỜI DÙNG',
    icon: Shield,
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    items: [
      { name: 'Dashboard', to: '/app/admin', icon: LayoutDashboard, phase: 1, isReady: true },
      { name: 'Người dùng', to: '/app/admin/users', icon: Users, phase: 1, isReady: true },
      { name: 'Gói đăng ký', to: '/app/admin/subscriptions', icon: CreditCard, phase: 5, isReady: true },
      { name: 'Phân tích học tập', to: '/app/admin/analytics', icon: BarChart3, phase: 4, isReady: true },
    ],
  },
  {
    title: 'QUẢN LÝ NỘI DUNG',
    icon: Layers,
    badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
    items: [
      { name: 'Thư viện từ vựng', to: '/app/admin/vocabulary', icon: BookOpen, phase: 3, isReady: true },
      { name: 'Quản lý Ngữ pháp', to: '/app/admin/grammar', icon: ScrollText, phase: 3, isReady: true },
      { name: 'Quản lý Luyện nghe', to: '/app/admin/listening', icon: Headphones, phase: 3, isReady: true },
      { name: 'Quản lý Bài đọc', to: '/app/admin/reading', icon: FileText, phase: 3, isReady: true },
      { name: 'Quản lý Trò chơi', to: '/app/admin/games', icon: Gamepad2, phase: 3, isReady: true },
    ],
  },
  {
    title: 'CẤU HÌNH & TÍNH NĂNG',
    icon: Sliders,
    badgeColor: 'bg-blue-100 text-blue-900 border-blue-300',
    items: [
      { name: 'Thông báo', to: '/app/admin/notifications', icon: Bell, phase: 1, isReady: true },
      { name: 'Cấu hình & Tính năng', to: '/app/admin/features', icon: ToggleLeft, phase: 2, isReady: true },
      { name: 'Cấu hình TTS', to: '/app/admin/tts', icon: Volume2, phase: 2, isReady: true },
      { name: 'Quản lý Âm thanh', to: '/app/admin/sounds', icon: Volume2, phase: 2, isReady: true },
    ],
  },
  {
    title: 'KỸ THUẬT & OPS',
    icon: Wrench,
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    items: [
      { name: 'API Keys & Secrets', to: '/app/admin/secrets', icon: KeyRound, phase: 2, isReady: true },
      { name: 'Quản lý Storage', to: '/app/admin/storage', icon: Database, phase: 3, isReady: true },
      { name: 'Edge Functions', to: '/app/admin/functions', icon: Terminal, phase: 4, isReady: true },
      { name: 'Quản lý i18n', to: '/app/admin/i18n', icon: Languages, phase: 4, isReady: true },
      { name: 'Lịch sử thao tác', to: '/app/admin/audit', icon: History, phase: 4, isReady: true },
    ],
  },
]

interface AdminSidebarProps {
  onCloseMobileDrawer?: () => void
}

export function AdminSidebar({ onCloseMobileDrawer }: AdminSidebarProps) {
  return (
    <aside className="w-full md:w-64 shrink-0">
      <div className="neo-card p-4 bg-white border-3 border-slate-900 shadow-[5px_5px_0px_0px_#000] flex flex-col gap-4 rounded-2xl">
        {/* Header Title with Mobile Close button */}
        <div className="flex items-center justify-between pb-3 border-b-3 border-slate-900">
          <div>
            <h2 className="text-base font-black tracking-tight text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-500" />
              <span>HỆ THỐNG ADMIN</span>
            </h2>
            <p className="text-[11px] text-slate-500 font-bold mt-0.5">MemoryLang Control Center</p>
          </div>
          {onCloseMobileDrawer && (
            <button
              type="button"
              onClick={onCloseMobileDrawer}
              className="md:hidden neo-button p-1.5 rounded-xl border-2 border-slate-900 bg-slate-100 hover:bg-slate-200"
              title="Đóng menu"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Categorized Navigation List */}
        <nav className="flex flex-col gap-5">
          {sidebarCategories.map((category) => (
            <div key={category.title} className="space-y-1.5">
              {/* Category Subheader */}
              <div className="px-2 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                  <category.icon size={12} className="text-slate-700" />
                  {category.title}
                </span>
              </div>

              {/* Items in Category */}
              <div className="flex flex-col gap-1">
                {category.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/app/admin'}
                    onClick={onCloseMobileDrawer}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-black border-2 transition-all select-none',
                        isActive
                          ? 'bg-[#fdc800] text-slate-900 border-slate-900 shadow-[2.5px_2.5px_0px_0px_#000] translate-x-[-1px] translate-y-[-1px]'
                          : 'bg-white text-slate-800 border-transparent hover:border-slate-900 hover:bg-slate-50 hover:shadow-[2px_2px_0px_0px_#000]'
                      )
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon size={16} className="shrink-0" />
                      <span>{item.name}</span>
                    </div>
                    {!item.isReady && (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-amber-200 text-amber-900 border border-slate-900 shadow-[1px_1px_0px_0px_#000]">
                        P{item.phase}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  )
}
