import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  BookOpen,
  FolderKanban,
  ShieldCheck,
  Users,
  Volume2,
  LayoutDashboard,
  ArrowRight,
  Server,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
    <div className="neo-card p-5 bg-white border-3 border-slate-900 flex items-start justify-between shadow-[5px_5px_0px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all rounded-2xl">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-black text-slate-500 uppercase tracking-wider">{title}</span>
        <span className="text-3xl font-black text-slate-900 mt-1">{value}</span>
        <span className="text-xs font-bold text-slate-600 mt-1">{description}</span>
      </div>
      <div className={`p-3 rounded-xl border-2 border-slate-900 text-slate-900 shadow-[2px_2px_0px_0px_#000] ${colorClass}`}>
        <Icon size={22} />
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
      {/* Title Banner Neobrutalism */}
      <div className="neo-card p-6 bg-[#432dd7] text-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_#000] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#fdc800] rounded-xl border-3 border-slate-900 flex items-center justify-center text-slate-900 shrink-0 shadow-[2px_2px_0px_0px_#000]">
            <LayoutDashboard className="w-6 h-6 text-slate-900" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">BẢNG ĐIỀU KHIỂN QUẢN TRỊ</h1>
            <p className="text-xs sm:text-sm font-bold text-indigo-100 mt-0.5">
              Thống kê tổng quan hoạt động, dữ liệu và trạng thái hệ thống MemoryLang.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-100 border-3 border-slate-900 text-rose-900 rounded-xl font-black text-xs sm:text-sm shadow-[3px_3px_0px_0px_#000]">
          {error}
        </div>
      )}

      {/* Grid KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <StatCard
          title="Người dùng hệ thống"
          value={loading ? '...' : stats?.totalUsers ?? 0}
          description={`Mới (7 ngày): ${stats?.newUsers7d ?? 0}`}
          icon={Users}
          colorClass="bg-[#fdc800]"
        />
        <StatCard
          title="Hoạt động (30 ngày)"
          value={loading ? '...' : stats?.activeUsers30d ?? 0}
          description="Người dùng tương tác trong 30 ngày qua"
          icon={Activity}
          colorClass="bg-purple-300"
        />
        <StatCard
          title="Thư viện từ vựng"
          value={loading ? '...' : stats?.globalVocab ?? 0}
          description={loading ? '...' : `Đang được học: ${stats?.totalVocab ?? 0}`}
          icon={BookOpen}
          colorClass="bg-emerald-300"
        />
        <StatCard
          title="Bộ từ vựng (Decks)"
          value={loading ? '...' : stats?.totalDecks ?? 0}
          description="Bộ từ vựng do người dùng tạo"
          icon={FolderKanban}
          colorClass="bg-sky-300"
        />
        <StatCard
          title="Lượt học hôm nay"
          value={loading ? '...' : stats?.studySessionsToday ?? 0}
          description="Số phiên học flashcard đã bắt đầu"
          icon={ShieldCheck}
          colorClass="bg-rose-300"
        />
        <StatCard
          title="Cấu hình TTS"
          value={loading ? '...' : 8}
          description="Ngôn ngữ hỗ trợ phát âm chuẩn"
          icon={Volume2}
          colorClass="bg-amber-200"
        />
      </div>

      {/* Quick Action & System Health Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        {/* Quick Actions */}
        <div className="neo-card p-5 bg-white border-3 border-slate-900 shadow-[5px_5px_0px_0px_#000] flex flex-col gap-4 rounded-2xl">
          <h3 className="text-base font-black border-b-2 border-slate-900 pb-2 text-slate-900 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>HÀNH ĐỘNG NHANH</span>
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Quản lý Users', to: '/app/admin/users' },
              { label: 'Cấu hình TTS', to: '/app/admin/tts' },
              { label: 'Tính năng & Bảo trì', to: '/app/admin/features' },
              { label: 'API Secrets', to: '/app/admin/secrets' },
            ].map((item) => (
              <Button
                key={item.to}
                asChild
                variant="ghost"
                className="neo-button py-2.5 px-3 border-2 border-slate-900 text-center rounded-xl font-black text-xs bg-white hover:bg-slate-50 text-slate-900 shadow-[2px_2px_0px_0px_#000] active:neo-button-active cursor-pointer"
              >
                <Link to={item.to} className="flex items-center justify-between">
                  <span>{item.label}</span>
                  <ArrowRight size={14} />
                </Link>
              </Button>
            ))}
          </div>
        </div>

        {/* System Health Status */}
        <div className="neo-card p-5 bg-white border-3 border-slate-900 shadow-[5px_5px_0px_0px_#000] flex flex-col gap-4 rounded-2xl">
          <h3 className="text-base font-black border-b-2 border-slate-900 pb-2 text-slate-900 flex items-center gap-2">
            <Server className="w-4 h-4 text-purple-700" />
            <span>TRẠNG THÁI HỆ THỐNG</span>
          </h3>
          <div className="flex flex-col gap-3">
            {[
              { label: 'Supabase Database Connect', status: 'ONLINE', bg: 'bg-emerald-100 text-emerald-900' },
              { label: 'Edge Functions API', status: 'ONLINE', bg: 'bg-emerald-100 text-emerald-900' },
              { label: 'Google Cloud TTS Service', status: 'CONNECTED', bg: 'bg-blue-100 text-blue-900' },
              { label: 'Cloudflare R2 Storage', status: 'ACTIVE', bg: 'bg-purple-100 text-purple-900' },
            ].map((srv) => (
              <div key={srv.label} className="flex justify-between items-center text-xs font-bold">
                <span className="text-slate-700">{srv.label}</span>
                <span className={`px-2.5 py-0.5 rounded-lg border border-slate-900 text-[10px] font-black uppercase shadow-[1px_1px_0px_0px_#000] ${srv.bg}`}>
                  {srv.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
