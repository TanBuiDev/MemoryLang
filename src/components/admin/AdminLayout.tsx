import { Link, Outlet } from 'react-router-dom'
import { ArrowLeft, LogOut, ShieldAlert } from 'lucide-react'
import { BrandLogo } from '@/components/common/BrandLogo'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { authService } from '@/services/supabase/auth.service'
import { useAuthStore } from '@/stores/useAuthStore'

export function AdminLayout() {
  const profile = useAuthStore((s) => s.profile)
  const profileInitial = (profile?.display_name ?? 'A')[0].toUpperCase()

  const handleLogout = () => {
    void authService.signOut()
  }

  return (
    <div className="brand-grid-bg min-h-screen bg-background text-foreground flex flex-col">
      {/* Admin Header */}
      <header className="sticky top-0 z-30 h-16 border-b-2 border-border bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 h-full max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <Link to="/app/admin" className="flex items-center gap-2 rounded-md p-1 border border-transparent hover:border-border hover:bg-muted transition">
              <BrandLogo variant="compact" size="md" className="h-10" />
            </Link>
            <div className="h-6 w-[2px] bg-border hidden sm:block" />
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-100 text-rose-800 border border-rose-300 text-xs font-black uppercase">
              <ShieldAlert size={14} />
              <span>Admin Mode</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Nút quay lại giao diện người dùng */}
            <Link
              to="/app/dashboard"
              className="flex items-center gap-1.5 neo-button min-h-0 px-3 py-1.5 rounded-md border-2 border-border text-sm font-black bg-secondary text-secondary-foreground hover:bg-[#321fb0] active:neo-button-active transition"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Về App Học</span>
            </Link>

            <div className="h-6 w-[2px] bg-border" />

            {/* Avatar Admin & Logout */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-md bg-primary text-primary-foreground border-2 border-border shadow-[2px_2px_0_var(--border)] flex items-center justify-center text-sm font-black">
                {profileInitial}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="p-2 rounded-md border-2 border-transparent hover:border-border hover:bg-rose-100 hover:text-rose-700 transition"
                title="Đăng xuất"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Admin Workspace */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 flex flex-col md:flex-row gap-6">
        <AdminSidebar />
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
