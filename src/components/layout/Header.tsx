import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Bell,
  BookOpen,
  Brain,
  ChevronDown,
  ClipboardCheck,
  Crown,
  FileText,
  Gauge,
  Globe,
  Headphones,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  Mail,
  Map,
  Menu,
  MessageSquare,
  Mic,
  Moon,
  PenLine,
  Rss,
  ScrollText,
  Settings,
  ShieldAlert,
  Sun,
  User,
  Video,
  X,
} from 'lucide-react'
import { BrandLogo } from '@/components/common/BrandLogo'
import { useI18n } from '@/i18n'
import { authService } from '@/services/supabase/auth.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { useThemeStore } from '@/stores/useThemeStore'
import { useUiLanguageStore } from '@/stores/useUiLanguageStore'
import { cn } from '@/utils/cn'

const mainNavItems = [
  { labelKey: 'header.grammar', to: '/app/grammar', icon: ScrollText },
  { labelKey: 'header.vocabulary', to: '/app/vocabulary', icon: BookOpen },
  { labelKey: 'header.listening', to: '/app/listening', icon: Headphones },
  { labelKey: 'header.speaking', to: '/app/speaking', icon: Mic },
  { labelKey: 'header.reading', to: '/app/reading', icon: FileText },
  { labelKey: 'header.writing', to: '/app/writing', icon: PenLine },
  { labelKey: 'header.exams', to: '/app/exams', icon: ClipboardCheck },
  { labelKey: 'header.roadmap', to: '/app/roadmap', icon: Map },
  { labelKey: 'header.videos', to: '/app/videos', icon: Video },
] as const

const moreDropdownItems = [
  { labelKey: 'nav.dashboard', to: '/app/dashboard', icon: LayoutDashboard },
  { labelKey: 'nav.decks', to: '/app/decks', icon: LibraryBig },
  { labelKey: 'nav.study', to: '/app/study', icon: Brain },
  { labelKey: 'nav.quiz', to: '/app/quiz', icon: ClipboardCheck },
  { labelKey: 'nav.review', to: '/app/review', icon: Gauge },
  { labelKey: 'header.blog', to: '/app/blog', icon: Rss },
  { labelKey: 'header.community', to: '/app/community', icon: MessageSquare },
  { labelKey: 'header.contact', to: '/app/contact', icon: Mail },
] as const

export function Header() {
  const { t } = useI18n()
  const profile = useAuthStore((s) => s.profile)
  const user = useAuthStore((s) => s.user)
  const { theme, toggleTheme } = useThemeStore()
  const { uiLanguage, setUiLanguage } = useUiLanguageStore()
  const effectiveUiLanguage = uiLanguage ?? profile?.ui_language ?? 'vi'

  const [moreOpen, setMoreOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const moreRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (moreRef.current && !moreRef.current.contains(target)) setMoreOpen(false)
      if (profileRef.current && !profileRef.current.contains(target)) setProfileOpen(false)
      if (notifRef.current && !notifRef.current.contains(target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleLanguageToggle = () => {
    setUiLanguage(effectiveUiLanguage === 'vi' ? 'en' : 'vi')
  }

  const handleLogout = () => {
    void authService.signOut()
  }

  const profileInitial = (profile?.display_name ?? 'U')[0].toUpperCase()

  const dropdownPanelClass = 'absolute top-full right-0 mt-2 neo-card p-2 z-40 flex flex-col gap-0.5 min-w-44'

  const dropdownLinkClass = 'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold hover:bg-muted transition'

  return (
    <header className="sticky top-0 z-30 h-16 border-b-2 border-border bg-background/95 backdrop-blur">
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-1.5 flex-1">
          <button
            type="button"
            onClick={() => { setMobileMenuOpen(!mobileMenuOpen); setProfileOpen(false); setNotifOpen(false); setMoreOpen(false) }}
            className="lg:hidden p-2 rounded-md border-2 border-transparent hover:border-border hover:bg-muted transition flex items-center justify-center"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <NavLink to="/" className="shrink-0 rounded-md border-2 border-transparent p-1 hover:border-border hover:bg-muted transition">
            <BrandLogo variant="compact" size="md" className="h-10" />
          </NavLink>
        </div>

        <nav className="hidden lg:flex items-center gap-0.5">
          {mainNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
                className={({ isActive }) =>
                  cn(
                    'px-3 py-2 rounded-md text-sm font-bold transition border-2 border-transparent whitespace-nowrap flex items-center gap-1.5',
                    isActive
                      ? 'bg-primary text-primary-foreground border-border shadow-[2px_2px_0_var(--border)]'
                      : 'hover:bg-muted hover:border-border',
                  )
                }
              >
                <item.icon size={16} />
                {t(item.labelKey)}
            </NavLink>
          ))}

          <div ref={moreRef} className="relative">
            <button
              type="button"
              onClick={() => { setMoreOpen(!moreOpen); setProfileOpen(false); setNotifOpen(false) }}
              className={cn(
                'px-3 py-2 rounded-md text-sm font-bold transition border-2 border-transparent hover:bg-muted hover:border-border flex items-center gap-1',
                moreOpen && 'bg-muted border-border',
              )}
            >
              {t('header.more')}
              <ChevronDown size={16} className={cn('transition', moreOpen && 'rotate-180')} />
            </button>

            {moreOpen && (
              <div className={dropdownPanelClass}>
                {moreDropdownItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMoreOpen(false)}
                    className={({ isActive }) =>
                      cn(dropdownLinkClass, isActive && 'bg-primary text-primary-foreground')
                    }
                  >
                    <item.icon size={16} />
                    {t(item.labelKey)}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="flex items-center gap-1 flex-1 justify-end">
          <button
            type="button"
            className="hidden sm:inline-flex items-center gap-1.5 neo-button min-h-0 px-3 py-1.5 rounded-md border-2 border-border text-sm font-black bg-secondary text-secondary-foreground hover:bg-[#321fb0] active:neo-button-active transition whitespace-nowrap"
          >
            <Crown size={16} />
            <span className="hidden md:inline">{t('header.upgrade')}</span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-md border-2 border-transparent hover:border-border hover:bg-muted transition"
            aria-label={t('header.toggleTheme')}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <button
            type="button"
            onClick={handleLanguageToggle}
            className="neo-button min-h-0 px-2.5 py-1.5 rounded-md border-2 border-border bg-card text-sm font-black active:neo-button-active transition hover:bg-muted shadow-[2px_2px_0_var(--border)]"
            aria-label={t('header.switchLanguage')}
          >
            <Globe size={16} className="sm:hidden" />
            <span className="hidden sm:inline">{effectiveUiLanguage === 'vi' ? 'EN' : 'VI'}</span>
          </button>

          <div ref={notifRef} className="relative">
            <button
              type="button"
              onClick={() => { setNotifOpen(!notifOpen); setMoreOpen(false); setProfileOpen(false) }}
              className="p-2 rounded-md border-2 border-transparent hover:border-border hover:bg-muted transition relative"
              aria-label={t('header.notifications')}
            >
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full border border-border" />
            </button>

            {notifOpen && (
              <div className="absolute top-full right-0 mt-2 w-72 neo-card p-4 z-40">
                <p className="text-sm font-black">{t('header.notifications')}</p>
                <p className="text-xs text-muted-foreground mt-2">{t('header.noNotifications')}</p>
              </div>
            )}
          </div>

          <div ref={profileRef} className="relative">
            <button
              type="button"
              onClick={() => { setProfileOpen(!profileOpen); setMoreOpen(false); setNotifOpen(false) }}
              className="p-0.5 rounded-md border-2 border-transparent hover:border-border hover:bg-muted transition"
            >
              <div className="w-9 h-9 rounded-md bg-secondary text-secondary-foreground flex items-center justify-center text-sm font-black">
                {profileInitial}
              </div>
            </button>

            {profileOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 neo-card p-2 z-40 flex flex-col gap-0.5">
                <div className="px-3 py-2">
                  <p className="text-sm font-black truncate">{profile?.display_name ?? 'User'}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email ?? 'demo@memorylang.app'}</p>
                </div>
                <hr className="border-border" />
                <NavLink
                  to="/app/settings"
                  onClick={() => setProfileOpen(false)}
                  className={dropdownLinkClass}
                >
                  <Settings size={14} />
                  {t('nav.settings')}
                </NavLink>
                <NavLink
                  to="/"
                  onClick={() => setProfileOpen(false)}
                  className={dropdownLinkClass}
                >
                  <User size={14} />
                  {t('nav.home')}
                </NavLink>
                {profile?.is_admin && (
                  <NavLink
                    to="/app/admin"
                    onClick={() => setProfileOpen(false)}
                    className={cn(dropdownLinkClass, 'text-rose-600 hover:bg-rose-50')}
                  >
                    <ShieldAlert size={14} />
                    Quản trị hệ thống
                  </NavLink>
                )}
                <hr className="border-border" />
                <button
                  type="button"
                  onClick={() => { setProfileOpen(false); handleLogout() }}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-bold hover:bg-danger hover:text-white transition text-left"
                >
                  <LogOut size={14} />
                  {t('actions.logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-16 z-20 bg-background/95 backdrop-blur border-b-2 border-border max-h-[calc(100vh-4rem)] overflow-y-auto animate-in slide-in-from-top duration-200">
          <div className="p-4 flex flex-col gap-4">
            {/* Học tập Section */}
            <div className="flex flex-col gap-1">
              <span className="text-xs font-black uppercase text-muted-foreground px-3 mb-1">Học tập</span>
              {mainNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-bold transition border-2 border-transparent',
                      isActive
                        ? 'bg-primary text-primary-foreground border-border shadow-[2px_2px_0_var(--border)]'
                        : 'hover:bg-muted hover:border-border',
                    )
                  }
                >
                  <item.icon size={18} />
                  {t(item.labelKey)}
                </NavLink>
              ))}
            </div>

            <hr className="border-border border-dashed" />

            {/* Mở rộng Section */}
            <div className="flex flex-col gap-1">
              <span className="text-xs font-black uppercase text-muted-foreground px-3 mb-1">Mở rộng</span>
              {moreDropdownItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-bold transition border-2 border-transparent',
                      isActive
                        ? 'bg-primary text-primary-foreground border-border shadow-[2px_2px_0_var(--border)]'
                        : 'hover:bg-muted hover:border-border',
                    )
                  }
                >
                  <item.icon size={18} />
                  {t(item.labelKey)}
                </NavLink>
              ))}
            </div>

            {profile?.is_admin && (
              <>
                <hr className="border-border border-dashed" />
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-black uppercase text-muted-foreground px-3 mb-1">Quản trị</span>
                  <NavLink
                    to="/app/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-bold transition border-2 border-transparent text-rose-600 hover:bg-rose-50',
                        isActive
                          ? 'bg-rose-600 text-white border-border shadow-[2px_2px_0_var(--border)]'
                          : 'hover:bg-rose-50 hover:border-rose-200',
                      )
                    }
                  >
                    <ShieldAlert size={18} />
                    Quản trị hệ thống
                  </NavLink>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
