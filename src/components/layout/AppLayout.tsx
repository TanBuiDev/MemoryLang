import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { NotificationBootstrap } from '@/app/NotificationBootstrap'
import { Header } from '@/components/layout/Header'
import { MascotRadialFab } from '@/components/layout/MascotRadialFab'
import { supabase } from '@/services/supabase/client'

export function AppLayout() {
  const location = useLocation()
  const [isFabEnabled, setIsFabEnabled] = useState(true)
  const [fabDesktop, setFabDesktop] = useState(true)
  const [fabMobile, setFabMobile] = useState(true)
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 639px)').matches)

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 639px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    const checkFabConfig = async () => {
      try {
        const [flagRes, deviceRes] = await Promise.all([
          supabase.from('feature_flags').select('enabled').eq('flag', 'mascot_radial_fab').maybeSingle(),
          supabase.from('app_settings').select('value').eq('key', 'mascot_radial_fab_device').maybeSingle(),
        ])
        if (!flagRes.error && flagRes.data) {
          setIsFabEnabled(flagRes.data.enabled)
        }
        if (!deviceRes.error && deviceRes.data?.value) {
          const device = deviceRes.data.value as { desktop?: boolean; mobile?: boolean }
          if (typeof device.desktop === 'boolean') setFabDesktop(device.desktop)
          if (typeof device.mobile === 'boolean') setFabMobile(device.mobile)
        }
      } catch (e) {
        console.warn('Failed to fetch Mascot Radial FAB config:', e)
      }
    }
    void checkFabConfig()
  }, [])

  const deviceAllowed = isMobile ? fabMobile : fabDesktop
  const showFab = isFabEnabled && deviceAllowed && !location.pathname.includes('/session/')

  return (
    <div className="brand-grid-bg min-h-screen bg-background text-foreground">
      <NotificationBootstrap />
      <Header />
      <main className="w-full max-w-[1760px] mx-auto px-3 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
      {showFab && <MascotRadialFab />}
    </div>
  )
}
