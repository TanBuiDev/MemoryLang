import { useEffect, useRef, useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import {
  Bell,
  BookOpen,
  Bot,
  Brain,
  ChevronDown,
  ClipboardCheck,
  Crown,
  FileText,
  Gamepad2,
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
import { useNotificationStore, useUnreadCount } from '@/stores/useNotificationStore'
import { useThemeStore } from '@/stores/useThemeStore'
import { useUiLanguageStore } from '@/stores/useUiLanguageStore'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'
import { cn } from '@/utils/cn'

/**
 * Format thời gian tương đối (VD: "5 phút trước", "2 giờ trước")
 */
function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diffSec = Math.floor((now - date) / 1000)
  if (diffSec < 60) return 'Vừa xong'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} phút trước`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} giờ trước`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 7) return `${diffDay} ngày trước`
  return new Date(dateStr).toLocaleDateString()
}

const mainNavItems = [
  { labelKey: 'header.grammar', to: '/app/grammar', icon: ScrollText },
  { labelKey: 'header.vocabulary', to: '/app/vocabulary', icon: BookOpen },
  { labelKey: 'header.listening', to: '/app/listening', icon: Headphones },
  { labelKey: 'header.speaking', to: '/app/speaking', icon: Mic },
  { labelKey: 'header.reading', to: '/app/reading', icon: FileText },
  { labelKey: 'header.writing', to: '/app/writing', icon: PenLine },
  { labelKey: 'header.games', to: '/app/games', icon: Gamepad2 },
] as const

const moreDropdownItems = [
  { labelKey: 'nav.dashboard', to: '/app/dashboard', icon: LayoutDashboard },
  { labelKey: 'nav.decks', to: '/app/decks', icon: LibraryBig },
  { labelKey: 'nav.study', to: '/app/study', icon: Brain },
  { labelKey: 'nav.quiz', to: '/app/quiz', icon: ClipboardCheck },
  { labelKey: 'nav.review', to: '/app/review', icon: Gauge },
  { labelKey: 'nav.aiTutor', to: '/app/chat', icon: Bot },
  { labelKey: 'header.roadmap', to: '/app/roadmap', icon: Map },
  { labelKey: 'header.exams', to: '/app/exams', icon: ClipboardCheck },
  { labelKey: 'header.videos', to: '/app/videos', icon: Video },
  { labelKey: 'header.blog', to: '/app/blog', icon: Rss },
  { labelKey: 'header.community', to: '/app/community', icon: MessageSquare },
  { labelKey: 'header.contact', to: '/app/contact', icon: Mail },
] as const

export function Header() {
  const { t } = useI18n()
  const profile = useAuthStore((s) => s.profile)
  const user = useAuthStore((s) => s.user)
  const isPro = useSubscriptionStore((s) => s.isPro)
  const { theme, toggleTheme } = useThemeStore()
  const { uiLanguage, setUiLanguage } = useUiLanguageStore()
  const effectiveUiLanguage = uiLanguage ?? profile?.ui_language ?? 'vi'

  // Notification store
  const notifications = useNotificationStore((s) => s.notifications)
  const readIds = useNotificationStore((s) => s.readIds)
  const markAsRead = useNotificationStore((s) => s.markAsRead)
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead)
  const unreadCount = useUnreadCount()

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
    <header className="sticky top-0 z-40 h-16 border-b-2 border-border bg-background/95 backdrop-blur">
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-1.5 flex-1 shrink-0 min-w-max">
          <button
            type="button"
            onClick={() => { setMobileMenuOpen(!mobileMenuOpen); setProfileOpen(false); setNotifOpen(false); setMoreOpen(false) }}
            className="xl:hidden p-2 rounded-md border-2 border-transparent hover:border-border hover:bg-muted transition flex items-center justify-center shrink-0"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <NavLink to="/" className="shrink-0 rounded-md border-2 border-transparent p-1 hover:border-border hover:bg-muted transition">
            <BrandLogo variant="compact" size="md" className="h-10" />
          </NavLink>
        </div>

        <nav className="hidden xl:flex items-center gap-0.5 xl:gap-1 shrink-0">
          {mainNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
                className={({ isActive }) =>
                  cn(
                    'px-2 py-1.5 xl:px-3 xl:py-2 rounded-md text-xs xl:text-sm font-bold transition border-2 border-transparent whitespace-nowrap flex items-center gap-1 xl:gap-1.5',
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
                'px-2 py-1.5 xl:px-3 xl:py-2 rounded-md text-xs xl:text-sm font-bold transition border-2 border-transparent hover:bg-muted hover:border-border flex items-center gap-1',
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

        <div className="flex items-center gap-1 flex-1 justify-end shrink-0 min-w-max">
          <Link
            to="/app/upgrade"
            className={cn(
              "hidden sm:inline-flex items-center gap-1.5 neo-button min-h-0 px-3 py-1.5 rounded-md border-2 border-border text-sm font-black transition whitespace-nowrap active:neo-button-active",
              isPro
                ? "bg-[#dcfce7] text-[#166534] hover:bg-[#bbf7d0]"
                : "bg-[#fdc800] text-[#1c293c] hover:bg-[#e6b800]"
            )}
          >
            {isPro ? (
              <>
                <span>Pro 👑</span>
              </>
            ) : (
              <>
                <Crown size={16} />
                <span className="hidden md:inline">{t('header.upgrade')}</span>
              </>
            )}
          </Link>

          <div ref={notifRef} className="relative">
            <button
              type="button"
              onClick={() => { setNotifOpen(!notifOpen); setMoreOpen(false); setProfileOpen(false) }}
              className="p-2 rounded-md border-2 border-transparent hover:border-border hover:bg-muted transition relative"
              aria-label={t('header.notifications')}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-danger text-white text-[10px] font-black rounded-full border-2 border-background">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute top-full right-0 mt-2 w-80 neo-card p-0 z-40 max-h-[420px] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b-2 border-border">
                  <p className="text-sm font-black">{t('header.notifications')}</p>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => { if (user) void markAllAsRead(user.id) }}
                      className="text-[10px] font-black text-secondary hover:underline"
                    >
                      {t('notifications.markAllRead')}
                    </button>
                  )}
                </div>

                {/* List */}
                <div className="overflow-y-auto flex-1">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <Bell size={24} className="mx-auto text-muted-foreground/40 mb-2" />
                      <p className="text-xs text-muted-foreground font-bold">{t('header.noNotifications')}</p>
                    </div>
                  ) : (
                    notifications.map((notif) => {
                      const isRead = readIds.has(notif.id)
                      return (
                        <button
                          key={notif.id}
                          type="button"
                          onClick={() => { if (user && !isRead) void markAsRead(user.id, notif.id) }}
                          className={cn(
                            'w-full text-left px-4 py-3 flex gap-3 items-start hover:bg-muted/50 transition border-b border-border/50 last:border-b-0',
                            !isRead && 'bg-primary/5',
                          )}
                        >
                          {/* Unread dot */}
                          <div className="pt-1.5 shrink-0">
                            <div className={cn(
                              'w-2 h-2 rounded-full',
                              !isRead ? 'bg-secondary' : 'bg-transparent',
                            )} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              'text-xs leading-tight',
                              !isRead ? 'font-black text-foreground' : 'font-bold text-muted-foreground',
                            )}>
                              {notif.title}
                            </p>
                            <p className="text-[11px] text-muted-foreground font-semibold mt-0.5 line-clamp-2 leading-snug">
                              {notif.message}
                            </p>
                            <p className="text-[10px] text-muted-foreground/60 font-bold mt-1">
                              {formatRelativeTime(notif.created_at)}
                            </p>
                          </div>

                          {/* Priority indicator */}
                          {(notif.priority === 'high' || notif.priority === 'urgent') && (
                            <div className={cn(
                              'shrink-0 w-1.5 h-full rounded-full self-stretch',
                              notif.priority === 'urgent' ? 'bg-danger' : 'bg-amber-400',
                            )} />
                          )}
                        </button>
                      )
                    })
                  )}
                </div>
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
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false)
                    toggleTheme()
                  }}
                  className={cn(dropdownLinkClass, 'w-full text-left')}
                >
                  {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                  {theme === 'dark' ? t('theme.light') : t('theme.dark')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false)
                    handleLanguageToggle()
                  }}
                  className={cn(dropdownLinkClass, 'w-full text-left')}
                >
                  <Globe size={14} />
                  {effectiveUiLanguage === 'vi' ? 'English (EN)' : 'Tiếng Việt (VI)'}
                </button>
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
        <div className="xl:hidden fixed inset-x-0 top-16 z-20 bg-background/95 backdrop-blur border-b-2 border-border max-h-[calc(100vh-4rem)] overflow-y-auto animate-in slide-in-from-top duration-200">
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
              
              {isPro ? (
                <NavLink
                  to="/app/upgrade"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 mt-2 rounded-md text-sm font-black border-2 border-border bg-[#dcfce7] text-[#166534] shadow-[2px_2px_0_var(--border)] active:translate-y-[2px] active:shadow-none transition-all"
                >
                  👑 Gói Pro hoạt động
                </NavLink>
              ) : (
                <NavLink
                  to="/app/upgrade"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 mt-2 rounded-md text-sm font-black border-2 border-border bg-[#fdc800] text-[#1c293c] shadow-[2px_2px_0_var(--border)] active:translate-y-[2px] active:shadow-none transition-all"
                >
                  <Crown size={18} />
                  Nâng cấp Pro 👑
                </NavLink>
              )}
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
