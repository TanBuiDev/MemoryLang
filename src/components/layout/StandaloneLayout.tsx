import { Outlet } from 'react-router-dom'
import { BrandLogo } from '@/components/common/BrandLogo'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { authService } from '@/services/supabase/auth.service'

export function StandaloneLayout() {
  const user = useAuthStore(s => s.user)
  
  return (
    <div className="min-h-screen bg-background brand-grid-bg text-foreground selection:bg-secondary/30">
      <header className="sticky top-0 z-50 border-b-4 border-border bg-card shadow-[0_4px_0_var(--border)]">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
           <Link to="/app/dashboard" className="flex items-center gap-2">
             <BrandLogo variant="compact" size="md" />
           </Link>
           {user && (
             <Button variant="ghost" className="font-black text-sm" onClick={() => void authService.signOut()}>
               <LogOut size={16} className="mr-2" />
               Đăng xuất
             </Button>
           )}
        </div>
      </header>
      <main className="p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  )
}
