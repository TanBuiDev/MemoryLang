import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { NotificationBootstrap } from '@/app/NotificationBootstrap'
import { Header } from '@/components/layout/Header'
import { MascotRadialFab } from '@/components/layout/MascotRadialFab'
import { AiTutorModal } from '@/components/chat/AiTutorModal'
import { supabase } from '@/services/supabase/client'
import { useChatStore } from '@/stores/useChatStore'

export function AppLayout() {
  const location = useLocation()
  const [isFabEnabled, setIsFabEnabled] = useState(true)
  const [fabDesktop, setFabDesktop] = useState(true)
  const [fabMobile, setFabMobile] = useState(true)
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 639px)').matches)

  const isAiModalOpen = useChatStore((s) => s.isAiModalOpen)
  const toggleAiModal = useChatStore((s) => s.toggleAiModal)

  useEffect(() => {
    function handleGlobalKeyDown(e: globalThis.KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        toggleAiModal()
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [toggleAiModal])

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
      <main className="w-full max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>
      {showFab && <MascotRadialFab />}
      {isAiModalOpen && <AiTutorModal />}
    </div>
  )
}
