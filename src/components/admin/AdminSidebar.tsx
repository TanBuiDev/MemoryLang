import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  Bell,
  BookOpen,
  Database,
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
} from 'lucide-react'
import { cn } from '@/utils/cn'

interface SidebarItem {
  name: string
  to: string
  icon: any
  phase: number
  isReady: boolean
}

const sidebarItems: SidebarItem[] = [
  { name: 'Dashboard', to: '/app/admin', icon: LayoutDashboard, phase: 1, isReady: true },
  { name: 'Người dùng', to: '/app/admin/users', icon: Users, phase: 1, isReady: true },
  { name: 'Thông báo', to: '/app/admin/notifications', icon: Bell, phase: 1, isReady: true },
  { name: 'Cấu hình TTS', to: '/app/admin/tts', icon: Volume2, phase: 2, isReady: true },
  { name: 'API Keys & Secrets', to: '/app/admin/secrets', icon: KeyRound, phase: 2, isReady: true },
  { name: 'Cấu hình & Tính năng', to: '/app/admin/features', icon: ToggleLeft, phase: 2, isReady: true },
  { name: 'Quản lý Trò chơi', to: '/app/admin/games', icon: Gamepad2, phase: 3, isReady: true },
  // Phase 3 & 4 (Show placeholder)
  { name: 'Thư viện từ vựng', to: '/app/admin/vocabulary', icon: BookOpen, phase: 3, isReady: true },
  { name: 'Quản lý Ngữ pháp', to: '/app/admin/grammar', icon: ScrollText, phase: 3, isReady: true },
  { name: 'Quản lý Luyện nghe', to: '/app/admin/listening', icon: Headphones, phase: 3, isReady: true },
  { name: 'Quản lý Storage', to: '/app/admin/storage', icon: Database, phase: 3, isReady: true },
  { name: 'Edge Functions', to: '/app/admin/functions', icon: Terminal, phase: 4, isReady: true },
  { name: 'Quản lý i18n', to: '/app/admin/i18n', icon: Languages, phase: 4, isReady: true },
  { name: 'Lịch sử thao tác', to: '/app/admin/audit', icon: History, phase: 4, isReady: true },
  { name: 'Thống kê nâng cao', to: '/app/admin/analytics', icon: BarChart3, phase: 4, isReady: true },
]

export function AdminSidebar() {
  return (
    <aside className="w-full md:w-64 shrink-0">
      <div className="neo-card p-4 bg-card border-2 border-border shadow-[4px_4px_0_var(--border)] flex flex-col gap-2">
        <div className="px-2 py-1.5 border-b-2 border-border mb-2 pb-2">
          <h2 className="text-lg font-black tracking-tight text-foreground">HỆ THỐNG ADMIN</h2>
          <p className="text-xs text-muted-foreground font-bold">MemoryLang Control Center</p>
        </div>
        <nav className="flex flex-col gap-1">
          {sidebarItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/app/admin'}
              className={({ isActive }) =>
                cn(
                  'flex items-center justify-between px-3 py-2 rounded-md text-sm font-bold border-2 border-transparent transition-all',
                  isActive
                    ? 'bg-primary text-primary-foreground border-border shadow-[2px_2px_0_var(--border)] translate-x-[-2px] translate-y-[-2px]'
                    : 'hover:bg-muted hover:border-border hover:translate-x-[-1px] hover:translate-y-[-1px]'
                )
              }
            >
              <div className="flex items-center gap-2.5">
                <item.icon size={18} className="shrink-0" />
                <span>{item.name}</span>
              </div>
              {!item.isReady && (
                <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 border border-amber-400">
                  P{item.phase}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  )
}
