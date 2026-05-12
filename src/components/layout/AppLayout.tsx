import {
  BookOpen,
  Brain,
  ClipboardCheck,
  Gauge,
  LayoutDashboard,
  LibraryBig,
  Settings,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'
import { authService } from '@/services/supabase/auth.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { cn } from '@/utils/cn'

const navItems = [
  { to: '/app/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/app/vocabulary', labelKey: 'nav.vocabulary', icon: BookOpen },
  { to: '/app/decks', labelKey: 'nav.decks', icon: LibraryBig },
  { to: '/app/study', labelKey: 'nav.study', icon: Brain },
  { to: '/app/quiz', labelKey: 'nav.quiz', icon: ClipboardCheck },
  { to: '/app/review', labelKey: 'nav.review', icon: Gauge },
  { to: '/app/settings', labelKey: 'nav.settings', icon: Settings },
] as const

export function AppLayout() {
  const profile = useAuthStore((state) => state.profile)
  const { t } = useI18n()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r-2 border-border bg-card p-4 lg:block">
        <NavLink to="/app/dashboard" className="block text-2xl font-black">
          MemoryLang
        </NavLink>
        <nav className="mt-8 grid gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md border-2 border-transparent px-3 py-2 text-sm font-black',
                  isActive && 'border-border bg-primary',
                )
              }
            >
              <item.icon size={18} />
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b-2 border-border bg-background/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-muted-foreground">{t('app.target')}</p>
              <p className="font-black">{t('app.languagePair', { target: profile?.current_target_language?.toUpperCase() ?? 'EN', native: profile?.native_language?.toUpperCase() ?? 'VI' })}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild>
                <NavLink to="/app/vocabulary/new">{t('actions.addWord')}</NavLink>
              </Button>
              <Button variant="ghost" onClick={() => void authService.signOut()}>
                {t('actions.logout')}
              </Button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
