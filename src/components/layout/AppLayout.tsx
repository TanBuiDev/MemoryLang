import { Outlet } from 'react-router-dom'
import { Header } from '@/components/layout/Header'

export function AppLayout() {
  return (
    <div className="brand-grid-bg min-h-screen bg-background text-foreground">
      <Header />
      <main className="w-full max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
