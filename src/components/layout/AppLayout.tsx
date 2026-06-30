import { Outlet, useLocation } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { MascotRadialFab } from '@/components/layout/MascotRadialFab'

export function AppLayout() {
  const location = useLocation()
  const showFab = !location.pathname.includes('/session/')

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
