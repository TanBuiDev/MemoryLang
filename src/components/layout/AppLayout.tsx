import { useState } from 'react'
import {
  BookOpen,
  Brain,
  ClipboardCheck,
  Gauge,
  Home,
  LayoutDashboard,
  LibraryBig,
  Menu,
  Settings,
  X,
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { BrandLogo, BrandMark } from '@/components/common/BrandLogo'
import { Button } from '@/components/ui/button'
import { hasActiveStudySession } from '@/features/study/sessionPersistence'
import { useI18n } from '@/i18n'
import { studyLocalDb } from '@/services/local/studyLocalDb'
import { authService } from '@/services/supabase/auth.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { cn } from '@/utils/cn'

const navItemsBeforeStudy = [
  { to: '/', labelKey: 'nav.home', icon: Home },
  { to: '/app/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/app/vocabulary', labelKey: 'nav.vocabulary', icon: BookOpen },
  { to: '/app/decks', labelKey: 'nav.decks', icon: LibraryBig },
] as const

const navItemsAfterStudy = [
  { to: '/app/quiz', labelKey: 'nav.quiz', icon: ClipboardCheck },
  { to: '/app/review', labelKey: 'nav.review', icon: Gauge },
  { to: '/app/settings', labelKey: 'nav.settings', icon: Settings },
] as const

export function AppLayout() {
  const profile = useAuthStore((state) => state.profile)
  const { t } = useI18n()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const studyTo = location.pathname.startsWith('/app/study/result')
    ? '/app/study'
    : hasActiveStudySession() ?? '/app/study'

  return (
    <div className="brand-grid-bg min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r-2 border-border bg-card/95 p-4 lg:block">
        <NavLink to="/app/dashboard" className="block rounded-md border-2 border-transparent p-1 transition hover:border-border hover:bg-muted">
          <BrandLogo variant="compact" size="lg" className="h-11" />
        </NavLink>
        <nav className="mt-8 grid gap-2">
          {navItemsBeforeStudy.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md border-2 border-transparent px-3 py-2 text-sm font-black transition',
                  isActive ? 'border-border bg-primary shadow-[3px_3px_0_var(--border)]' : 'hover:border-border hover:bg-muted',
                )
              }
            >
              <item.icon size={18} />
              {t(item.labelKey)}
            </NavLink>
          ))}
          <NavLink
            to={studyTo}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md border-2 border-transparent px-3 py-2 text-sm font-black transition',
                isActive ? 'border-border bg-primary shadow-[3px_3px_0_var(--border)]' : 'hover:border-border hover:bg-muted',
              )
            }
          >
            <Brain size={18} />
            {t('nav.study')}
          </NavLink>
          {navItemsAfterStudy.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md border-2 border-transparent px-3 py-2 text-sm font-black transition',
                  isActive ? 'border-border bg-primary shadow-[3px_3px_0_var(--border)]' : 'hover:border-border hover:bg-muted',
                )
              }
            >
              <item.icon size={18} />
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Mobile navigation drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Drawer content */}
          <aside className="fixed inset-y-0 left-0 w-64 border-r-2 border-border bg-card p-4 shadow-[4px_0_0_var(--border)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3 mb-8">
                <NavLink to="/app/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="block rounded-md border-2 border-transparent p-1 transition hover:border-border hover:bg-muted">
                  <BrandLogo variant="compact" size="lg" className="h-11" />
                </NavLink>
                <button
                  type="button"
                  className="p-1 rounded-md border-2 border-border bg-card shadow-[1.5px_1.5px_0_var(--border)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-label="Close menu"
                >
                  <X size={16} />
                </button>
              </div>
              <nav className="grid gap-2">
                {navItemsBeforeStudy.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-md border-2 border-transparent px-3 py-2 text-sm font-black transition',
                        isActive ? 'border-border bg-primary shadow-[3px_3px_0_var(--border)]' : 'hover:border-border hover:bg-muted',
                      )
                    }
                  >
                    <item.icon size={18} />
                    {t(item.labelKey)}
                  </NavLink>
                ))}
                <NavLink
                  to={studyTo}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-md border-2 border-transparent px-3 py-2 text-sm font-black transition',
                      isActive ? 'border-border bg-primary shadow-[3px_3px_0_var(--border)]' : 'hover:border-border hover:bg-muted',
                    )
                  }
                >
                  <Brain size={18} />
                  {t('nav.study')}
                </NavLink>
                {navItemsAfterStudy.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-md border-2 border-transparent px-3 py-2 text-sm font-black transition',
                        isActive ? 'border-border bg-primary shadow-[3px_3px_0_var(--border)]' : 'hover:border-border hover:bg-muted',
                      )
                    }
                  >
                    <item.icon size={18} />
                    {t(item.labelKey)}
                  </NavLink>
                ))}
              </nav>
            </div>
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b-2 border-border bg-background/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="lg:hidden p-1.5 rounded-md border-2 border-border bg-card shadow-[2px_2px_0_var(--border)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_var(--border)]"
                onClick={() => setIsMobileMenuOpen(true)}
                aria-label="Menu"
              >
                <Menu size={20} />
              </button>
              <NavLink to="/app/dashboard" className="lg:hidden">
                <BrandMark size="sm" />
              </NavLink>
              <div>
                <p className="text-xs font-black uppercase text-muted-foreground">{t('app.target')}</p>
                <p className="font-black">{t('app.languagePair', { target: profile?.current_target_language?.toUpperCase() ?? 'EN', native: profile?.native_language?.toUpperCase() ?? 'VI' })}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild>
                <NavLink to="/app/vocabulary/new">{t('actions.addWord')}</NavLink>
              </Button>
              <Button variant="ghost" onClick={() => { void studyLocalDb.clearAllData(); void authService.signOut() }}>
                {t('actions.logout')}
              </Button>
            </div>
          </div>
        </header>
        <main className="w-full px-4 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
