import { useCallback, useEffect, useState } from 'react'
import {
  Activity,
  BarChart3,
  CheckCircle2,
  CircleOff,
  Eye,
  EyeOff,
  HeartPulse,
  KeyRound,
  Layers3,
  RefreshCw,
  Server,
  ShieldCheck,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { showToast } from '@/components/ui/toast'
import { adminService } from '@/services/supabase/admin.service'
import { isStatsApiConfigured, statsApiService } from '@/services/stats/statsApi.service'
import type { DashboardInsights, StatsApiHealth } from '@/services/stats/statsApi.types'

const VISIBILITY_FLAG = 'learning_analytics_dashboard'
const VISIBILITY_DESCRIPTION = 'Hiển thị khối Phân tích học tập từ Java Statistics API trên dashboard người học'

export default function AdminAnalyticsPage() {
  const [visible, setVisible] = useState(true)
  const [visibilityLoading, setVisibilityLoading] = useState(true)
  const [savingVisibility, setSavingVisibility] = useState(false)
  const [health, setHealth] = useState<StatsApiHealth | null>(null)
  const [insights, setInsights] = useState<DashboardInsights | null>(null)
  const [monitoring, setMonitoring] = useState(false)
  const [monitorError, setMonitorError] = useState<string | null>(null)
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null)

  const refreshMonitoring = useCallback(async () => {
    setMonitoring(true)
    setMonitorError(null)
    setHealth(null)
    setInsights(null)

    if (!isStatsApiConfigured) {
      setMonitorError('Frontend production chưa cấu hình VITE_STATS_API_URL.')
      setLastCheckedAt(new Date())
      setMonitoring(false)
      return
    }

    const [healthResult, insightsResult] = await Promise.allSettled([
      statsApiService.getHealth(),
      statsApiService.getDashboardInsights(),
    ])

    if (healthResult.status === 'fulfilled') setHealth(healthResult.value)
    if (insightsResult.status === 'fulfilled') setInsights(insightsResult.value)

    if (healthResult.status === 'rejected' || insightsResult.status === 'rejected') {
      setMonitorError('Một hoặc nhiều bước kiểm tra Statistics API không thành công.')
    }
    setLastCheckedAt(new Date())
    setMonitoring(false)
  }, [])

  useEffect(() => {
    let active = true
    const monitoringTimer = window.setTimeout(() => {
      void refreshMonitoring()
    }, 0)

    void adminService.listFeatureFlags()
      .then((flags) => {
        if (!active) return
        setVisible(flags.find((item) => item.flag === VISIBILITY_FLAG)?.enabled ?? true)
      })
      .catch(() => {
        if (active) {
          showToast({
            type: 'error',
            title: 'Không tải được cấu hình',
            message: 'Dashboard sẽ giữ trạng thái hiển thị mặc định.',
          })
        }
      })
      .finally(() => {
        if (active) setVisibilityLoading(false)
      })
    return () => {
      active = false
      window.clearTimeout(monitoringTimer)
    }
  }, [refreshMonitoring])

  const handleVisibilityChange = async () => {
    const nextVisible = !visible
    try {
      setSavingVisibility(true)
      const updated = await adminService.updateFeatureFlag(
        VISIBILITY_FLAG,
        nextVisible,
        VISIBILITY_DESCRIPTION,
      )
      setVisible(updated.enabled)
      showToast({
        type: 'success',
        title: updated.enabled ? 'Đã hiện phân tích học tập' : 'Đã ẩn phân tích học tập',
        message: 'Thay đổi áp dụng cho dashboard người học sau lần tải dữ liệu kế tiếp.',
      })
    } catch {
      showToast({
        type: 'error',
        title: 'Không lưu được thay đổi',
        message: 'Vui lòng kiểm tra quyền admin và thử lại.',
      })
    } finally {
      setSavingVisibility(false)
    }
  }

  const healthUp = health?.status === 'UP'
  const authenticatedCheckUp = Boolean(insights)

  return (
    <div className="space-y-6">
      <section className="neo-card relative overflow-hidden border-3 border-slate-900 bg-slate-950 p-6 text-white shadow-[6px_6px_0px_0px_#fdc800] sm:p-8">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full border-4 border-[#fdc800] bg-purple-700/60" />
        <div className="relative max-w-3xl">
          <Badge className="border-2 border-white bg-[#fdc800] px-3 py-1 font-black text-slate-950">
            JAVA STATISTICS CONTROL ROOM
          </Badge>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">PHÂN TÍCH HỌC TẬP</h1>
          <p className="mt-2 font-bold text-slate-300">
            Điều khiển khả năng hiển thị và giám sát đường truyền dữ liệu từ Supabase đến Java API rồi về dashboard.
          </p>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="neo-card border-3 border-slate-900 bg-white p-5 shadow-[5px_5px_0px_0px_#000]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-purple-700">Quyền hiển thị</p>
              <h2 className="mt-1 text-xl font-black text-slate-900">Widget dashboard người học</h2>
            </div>
            {visible ? <Eye className="h-7 w-7 text-emerald-600" /> : <EyeOff className="h-7 w-7 text-rose-600" />}
          </div>

          <div className={`mt-5 rounded-xl border-3 border-slate-900 p-5 ${visible ? 'bg-emerald-100' : 'bg-rose-100'}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-slate-600">Trạng thái hiện tại</p>
                <p className="mt-1 text-3xl font-black text-slate-950">
                  {visibilityLoading ? 'ĐANG TẢI' : visible ? 'ĐANG HIỆN' : 'ĐANG ẨN'}
                </p>
              </div>
              <div className={`h-5 w-5 rounded-full border-2 border-slate-900 ${visible ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            </div>
          </div>

          <p className="mt-4 text-sm font-semibold text-slate-600">
            Khi ẩn, Java API vẫn có thể hoạt động nhưng dashboard người học không gọi các endpoint analytics.
          </p>

          <Button
            className="mt-5 w-full"
            disabled={visibilityLoading || savingVisibility}
            onClick={() => void handleVisibilityChange()}
            variant={visible ? 'danger' : 'primary'}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {savingVisibility
              ? 'Đang lưu…'
              : visible
                ? 'Ẩn khỏi người học'
                : 'Hiện cho người học'}
          </Button>
        </section>

        <section className="neo-card border-3 border-slate-900 bg-white p-5 shadow-[5px_5px_0px_0px_#000]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-purple-700">Giám sát trực tiếp</p>
              <h2 className="mt-1 text-xl font-black text-slate-900">Tình trạng đường truyền</h2>
            </div>
            <Button variant="ghost" disabled={monitoring} onClick={() => void refreshMonitoring()}>
              <RefreshCw className={`h-4 w-4 ${monitoring ? 'animate-spin' : ''}`} />
              Kiểm tra lại
            </Button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <MonitorStep
              icon={Server}
              label="Frontend config"
              ok={isStatsApiConfigured}
              value={isStatsApiConfigured ? 'Đã cấu hình' : 'Thiếu URL'}
            />
            <MonitorStep
              icon={HeartPulse}
              label="Java health"
              ok={healthUp}
              value={monitoring ? 'Đang kiểm tra' : health?.status ?? 'Không phản hồi'}
            />
            <MonitorStep
              icon={KeyRound}
              label="JWT + RLS query"
              ok={authenticatedCheckUp}
              value={monitoring ? 'Đang kiểm tra' : authenticatedCheckUp ? 'Thành công' : 'Chưa xác minh'}
            />
          </div>

          {monitorError ? (
            <div className="mt-4 flex gap-2 rounded-xl border-2 border-amber-500 bg-amber-100 p-3 text-sm font-bold text-amber-950">
              <CircleOff className="h-5 w-5 shrink-0" />
              <p>{monitorError}</p>
            </div>
          ) : null}

          <div className="mt-4 flex items-center justify-between border-t-2 border-dashed border-slate-300 pt-3 text-xs font-bold text-slate-500">
            <span>Kiểm tra health công khai và 2 endpoint có JWT</span>
            <span>{lastCheckedAt ? lastCheckedAt.toLocaleTimeString('vi-VN') : '—'}</span>
          </div>
        </section>
      </div>

      <section className="neo-card border-3 border-slate-900 bg-white p-5 shadow-[5px_5px_0px_0px_#000]">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-purple-700" />
          <div>
            <h2 className="text-xl font-black text-slate-900">Mẫu dữ liệu tài khoản admin</h2>
            <p className="text-sm font-semibold text-slate-500">Dùng để xác nhận pipeline; không đọc dữ liệu của người dùng khác.</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric icon={Activity} label="Phiên học / 30 ngày" value={insights ? `${insights.activity.totalSessions} phiên` : '—'} tone="bg-sky-100" />
          <Metric icon={Layers3} label="Thẻ đã học" value={insights ? `${insights.activity.totalCards} thẻ` : '—'} tone="bg-cyan-100" />
          <Metric icon={ShieldCheck} label="Tỷ lệ ghi nhớ" value={insights ? `${Math.round(insights.activity.rememberedRatio * 100)}%` : '—'} tone="bg-emerald-100" />
          <Metric icon={CheckCircle2} label="Chuỗi hiện tại" value={insights ? `${insights.currentStreak.currentStreakDays} ngày` : '—'} tone="bg-amber-100" />
        </div>
      </section>
    </div>
  )
}

function MonitorStep({
  icon: Icon,
  label,
  ok,
  value,
}: {
  icon: typeof Server
  label: string
  ok: boolean
  value: string
}) {
  return (
    <div className={`rounded-xl border-2 border-slate-900 p-3 ${ok ? 'bg-emerald-100' : 'bg-slate-100'}`}>
      <div className="flex items-center justify-between gap-2">
        <Icon className="h-5 w-5" />
        <span className={`h-3 w-3 rounded-full border border-slate-900 ${ok ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      </div>
      <p className="mt-3 text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-black text-slate-900">{value}</p>
    </div>
  )
}

function Metric({
  icon: Icon,
  label,
  tone,
  value,
}: {
  icon: typeof Activity
  label: string
  tone: string
  value: string
}) {
  return (
    <div className={`rounded-xl border-2 border-slate-900 p-4 shadow-[3px_3px_0px_0px_#000] ${tone}`}>
      <Icon className="h-5 w-5" />
      <p className="mt-3 text-[10px] font-black uppercase tracking-wide text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
    </div>
  )
}
