import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  BookOpen,
  FolderKanban,
  ShieldCheck,
  Users,
  Volume2,
} from 'lucide-react'
import { adminService } from '@/services/supabase/admin.service'
import type { AdminUserStats } from '@/types/admin.types'

interface StatCardProps {
  title: string
  value: string | number
  description: string
  icon: any
  colorClass: string
}

function StatCard({ title, value, description, icon: Icon, colorClass }: StatCardProps) {
  return (
    <div className={`neo-card p-5 bg-card border-2 border-border flex items-start justify-between shadow-[4px_4px_0_var(--border)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all`}>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-black text-muted-foreground uppercase tracking-wider">{title}</span>
        <span className="text-3xl font-black text-foreground">{value}</span>
        <span className="text-xs font-bold text-muted-foreground mt-1">{description}</span>
      </div>
      <div className={`p-3 rounded-md border-2 border-border text-foreground shadow-[2px_2px_0_var(--border)] ${colorClass}`}>
        <Icon size={20} />
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminUserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true)
        const data = await adminService.getDashboardStats()
        setStats(data)
      } catch (err: any) {
        console.error(err)
        setError(err.message || 'Không thể tải thống kê hệ thống')
      } finally {
        setLoading(false)
      }
    }
    void loadStats()
  }, [])

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">BẢNG ĐIỀU KHIỂN</h1>
          <p className="text-muted-foreground font-bold">Thống kê tổng quan hoạt động và nội dung của MemoryLang.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-100 border-2 border-rose-400 text-rose-900 rounded-md font-bold text-sm">
          {error}
        </div>
      )}

      {/* Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Người dùng hệ thống"
          value={loading ? '...' : stats?.totalUsers ?? 0}
          description={`Mới (7 ngày): ${stats?.newUsers7d ?? 0}`}
          icon={Users}
          colorClass="bg-[#fdc800]" // Yellow
        />
        <StatCard
          title="Hoạt động (30 ngày)"
          value={loading ? '...' : stats?.activeUsers30d ?? 0}
          description="Người dùng học trong 30 ngày qua"
          icon={Activity}
          colorClass="bg-[#c084fc]" // Light Purple
        />
        <StatCard
          title="Thư viện từ vựng"
          value={loading ? '...' : stats?.globalVocab ?? 0}
          description={loading ? '...' : `Đang được học: ${stats?.totalVocab ?? 0}`}
          icon={BookOpen}
          colorClass="bg-[#86efac]" // Light Green
        />
        <StatCard
          title="Bộ từ vựng (Decks)"
          value={loading ? '...' : stats?.totalDecks ?? 0}
          description="Bộ từ vựng được người dùng tạo"
          icon={FolderKanban}
          colorClass="bg-[#93c5fd]" // Light Blue
        />
        <StatCard
          title="Lượt học hôm nay"
          value={loading ? '...' : stats?.studySessionsToday ?? 0}
          description="Số phiên học flashcard đã bắt đầu"
          icon={ShieldCheck}
          colorClass="bg-[#fda4af]" // Light Pink
        />
        <StatCard
          title="Cấu hình TTS"
          value={loading ? '...' : 8}
          description="Ngôn ngữ được hỗ trợ TTS"
          icon={Volume2}
          colorClass="bg-[#fde047]" // Light Yellow
        />
      </div>

      {/* Quick Action & System Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        {/* Quick Actions */}
        <div className="neo-card p-5 bg-card border-2 border-border shadow-[4px_4px_0_var(--border)] flex flex-col gap-4">
          <h3 className="text-md font-black border-b-2 border-border pb-2 text-foreground">HÀNH ĐỘNG NHANH</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/app/admin/users"
              className="px-4 py-2 border-2 border-border text-center rounded-md font-black text-sm bg-card hover:bg-muted transition-colors shadow-[2px_2px_0_var(--border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              Quản lý Users
            </Link>
            <Link
              to="/app/admin/tts"
              className="px-4 py-2 border-2 border-border text-center rounded-md font-black text-sm bg-card hover:bg-muted transition-colors shadow-[2px_2px_0_var(--border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              Cấu hình TTS
            </Link>
            <Link
              to="/app/admin/features"
              className="px-4 py-2 border-2 border-border text-center rounded-md font-black text-sm bg-card hover:bg-muted transition-colors shadow-[2px_2px_0_var(--border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              Cấu hình & Tính năng
            </Link>
            <Link
              to="/app/admin/secrets"
              className="px-4 py-2 border-2 border-border text-center rounded-md font-black text-sm bg-card hover:bg-muted transition-colors shadow-[2px_2px_0_var(--border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              API Secrets
            </Link>
          </div>
        </div>

        {/* System Health Status */}
        <div className="neo-card p-5 bg-card border-2 border-border shadow-[4px_4px_0_var(--border)] flex flex-col gap-4">
          <h3 className="text-md font-black border-b-2 border-border pb-2 text-foreground">TRẠNG THÁI HỆ THỐNG</h3>
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center text-sm font-bold">
              <span className="text-muted-foreground">Supabase Database Connect</span>
              <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 border border-green-300 text-xs">ONLINE</span>
            </div>
            <div className="flex justify-between items-center text-sm font-bold">
              <span className="text-muted-foreground">Edge Functions API</span>
              <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 border border-green-300 text-xs">ONLINE</span>
            </div>
            <div className="flex justify-between items-center text-sm font-bold">
              <span className="text-muted-foreground">Google Cloud TTS Service</span>
              <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 border border-green-300 text-xs">CONNECTED</span>
            </div>
            <div className="flex justify-between items-center text-sm font-bold">
              <span className="text-muted-foreground">Cloudflare R2 Storage</span>
              <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 border border-green-300 text-xs">ACTIVE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
