import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { ArrowLeft, LogOut, Menu, ShieldAlert, X } from 'lucide-react'
import { BrandLogo } from '@/components/common/BrandLogo'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { Button } from '@/components/ui/button'
import { authService } from '@/services/supabase/auth.service'
import { useAuthStore } from '@/stores/useAuthStore'

export function AdminLayout() {
  const location = useLocation()
  const profile = useAuthStore((s) => s.profile)
  const profileInitial = (profile?.display_name ?? 'A')[0].toUpperCase()

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    void authService.signOut()
  }

  // Get current page title for breadcrumb
  const getPageTitle = () => {
    const path = location.pathname
    if (path === '/app/admin') return 'Dashboard'
    if (path.includes('/users')) return 'Người dùng'
    if (path.includes('/subscriptions')) return 'Gói đăng ký'
    if (path.includes('/notifications')) return 'Thông báo'
    if (path.includes('/tts')) return 'Cấu hình TTS'
    if (path.includes('/sounds')) return 'Quản lý Âm thanh'
    if (path.includes('/secrets')) return 'API Secrets'
    if (path.includes('/features')) return 'Cấu hình & Tính năng'
    if (path.includes('/games')) return 'Quản lý Trò chơi'
    if (path.includes('/vocabulary')) return 'Thư viện Từ vựng'
    if (path.includes('/grammar')) return 'Quản lý Ngữ pháp'
    if (path.includes('/listening')) return 'Quản lý Luyện nghe'
    if (path.includes('/exam-media')) return 'Media đề B1'
    if (path.includes('/storage')) return 'Quản lý Storage'
    if (path.includes('/functions')) return 'Edge Functions'
    if (path.includes('/i18n')) return 'Quản lý i18n'
    if (path.includes('/audit')) return 'Lịch sử thao tác'
    if (path.includes('/analytics')) return 'Phân tích học tập'
    return 'Quản trị'
  }

  return (
    <div className="brand-grid-bg min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Admin Top Header */}
      <header className="sticky top-0 z-40 h-16 sm:h-18 border-b-3 border-slate-900 bg-white/95 backdrop-blur shadow-[0_2px_0_#000]">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-full w-full">
          {/* Left section: Hamburger button + Logo + Admin badge + Breadcrumb */}
          <div className="flex items-center gap-2.5 sm:gap-4">
            {/* Mobile Hamburger toggle */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden neo-button p-2 rounded-xl border-2 border-slate-900 bg-[#fdc800] text-slate-900 shadow-[2px_2px_0px_0px_#000] cursor-pointer"
              aria-label="Toggle admin sidebar menu"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <Link
              to="/app/admin"
              className="flex items-center gap-2 rounded-xl p-1 border-2 border-transparent hover:border-slate-900 hover:bg-slate-100 transition"
            >
              <BrandLogo variant="compact" size="md" className="h-8 sm:h-10" />
            </Link>

            <div className="h-6 w-[2px] bg-slate-900 hidden sm:block" />

            {/* Admin Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-900 border-2 border-slate-900 text-xs font-black uppercase shadow-[1.5px_1.5px_0px_0px_#000]">
              <ShieldAlert size={14} className="text-rose-700" />
              <span>Admin Mode</span>
            </div>

            {/* Breadcrumb current route */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <span>/</span>
              <span className="font-black text-slate-900 uppercase tracking-wide px-2 py-0.5 bg-amber-100 border border-slate-900 rounded-md">
                {getPageTitle()}
              </span>
            </div>
          </div>

          {/* Right section: Back to App + User profile */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Back to main learning app button */}
            <Button
              asChild
              variant="secondary"
              className="neo-button min-h-0 px-3 py-1.5 h-9 text-xs sm:text-sm font-black border-2 border-slate-900 bg-[#432dd7] text-white hover:bg-[#321fb0] shadow-[2px_2px_0px_0px_#000] rounded-xl"
            >
              <Link to="/app/dashboard" className="flex items-center gap-1.5">
                <ArrowLeft size={16} />
                <span className="hidden sm:inline">Về App Học</span>
              </Link>
            </Button>

            <div className="h-6 w-[2px] bg-slate-900" />

            {/* Admin Avatar & Logout */}
            <div className="flex items-center gap-2">
              <div
                className="w-9 h-9 rounded-xl bg-[#fdc800] text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] flex items-center justify-center text-sm font-black"
                title={profile?.display_name || 'Admin'}
              >
                {profileInitial}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="neo-button p-2 rounded-xl border-2 border-slate-900 bg-white hover:bg-rose-100 hover:text-rose-700 text-slate-700 shadow-[2px_2px_0px_0px_#000] transition cursor-pointer"
                title="Đăng xuất"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Overlay Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Admin Content Container */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row gap-6 relative">
        {/* Desktop Sticky Sidebar */}
        <div className="hidden md:block">
          <AdminSidebar />
        </div>

        {/* Mobile Slide-over Drawer Sidebar */}
        <div
          className={`fixed inset-y-0 left-0 z-50 w-72 bg-white p-4 overflow-y-auto shadow-2xl transition-transform duration-300 md:hidden ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <AdminSidebar onCloseMobileDrawer={() => setIsMobileMenuOpen(false)} />
        </div>

        {/* Page Content Outlet */}
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
