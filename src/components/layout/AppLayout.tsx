import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { MascotRadialFab } from '@/components/layout/MascotRadialFab'
import { supabase } from '@/services/supabase/client'

export function AppLayout() {
  const location = useLocation()
  const [isFabEnabled, setIsFabEnabled] = useState(true)

  useEffect(() => {
    const checkFabFlag = async () => {
      try {
        const { data, error } = await supabase
          .from('feature_flags')
          .select('enabled')
          .eq('flag', 'mascot_radial_fab')
          .maybeSingle()
        if (!error && data) {
          setIsFabEnabled(data.enabled)
        }
      } catch (e) {
        console.warn('Failed to fetch Mascot Radial FAB feature flag:', e)
      }
    }
    void checkFabFlag()
  }, [])

  const showFab = isFabEnabled && !location.pathname.includes('/session/')

  return (
    <div className="brand-grid-bg min-h-screen bg-background text-foreground">
      <Header />
      <main className="w-full max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>
      {showFab && <MascotRadialFab />}
    </div>
  )
}
