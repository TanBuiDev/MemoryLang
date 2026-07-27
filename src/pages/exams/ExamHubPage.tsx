import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileText,
  Headphones,
  History,
  Layers,
  PenTool,
  Play,
  RotateCcw,
  Search,
  Settings2,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Input, Label } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { showToast } from '@/components/ui/toast'
import { examPracticeService } from '@/services/supabase/examPractice.service'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'
import type { Exam } from '@/types/exam.types'

const DURATION_PRESETS = [
  { id: '90', label: '90 phút', subtext: 'Nhanh' },
  { id: '120', label: '120 phút', subtext: 'Gợi ý B1', recommended: true },
  { id: '150', label: '150 phút', subtext: 'Thư thả' },
  { id: 'custom', label: 'Tự chọn', subtext: 'Tự đặt phút' },
]

function getDurationMinutes(exam: Exam, selectedDuration: string, customMinutes: string) {
  if (selectedDuration === 'custom') {
    const parsed = Number.parseInt(customMinutes, 10)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return Number.parseInt(selectedDuration || String(exam.default_time_minutes ?? 120), 10)
}

function formatDurationSeconds(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const hrs = Math.floor(mins / 60)
  const remainMins = mins % 60
  if (hrs > 0) return `${hrs}h ${remainMins > 0 ? `${remainMins}m` : ''}`
  return `${mins} phút`
}

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

export function ExamHubPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const shouldUseRemoteData = isSupabaseConfigured && Boolean(user)

  const [activeTab, setActiveTab] = useState<'catalog' | 'history'>('catalog')
  const [durationChoice, setDurationChoice] = useState('120')
  const [customMinutes, setCustomMinutes] = useState('120')
  const [searchQuery, setSearchQuery] = useState('')
  const [tierFilter, setTierFilter] = useState<'all' | 'free' | 'pro'>('all')
  const [pendingAbandonAttemptId, setPendingAbandonAttemptId] = useState<string | null>(null)

  const examsQuery = useQuery({
    queryKey: ['b1-practice-exams'],
    queryFn: examPracticeService.listAvailableExams,
    enabled: shouldUseRemoteData,
  })

  const attemptsQuery = useQuery({
    queryKey: ['b1-user-attempts', user?.id],
    queryFn: examPracticeService.listUserAttempts,
    enabled: shouldUseRemoteData,
  })

  const exams = examsQuery.data ?? []
  const userAttempts = attemptsQuery.data ?? []

  const inProgressAttempts = useMemo(
    () => userAttempts.filter((a) => a.status === 'in_progress'),
    [userAttempts],
  )
  const submittedAttempts = useMemo(
    () => userAttempts.filter((a) => a.status === 'submitted'),
    [userAttempts],
  )

  const startMutation = useMutation({
    mutationFn: ({ exam, durationSeconds }: { exam: Exam; durationSeconds: number }) =>
      examPracticeService.startAttempt(exam.id, durationSeconds),
    onSuccess: (attempt) => navigate(`/app/exams/attempt/${attempt.id}`),
    onError: (error) =>
      showToast({
        type: 'error',
        title: 'Không thể bắt đầu đề',
        message: error instanceof Error ? error.message : 'Vui lòng thử lại.',
      }),
  })

  const abandonMutation = useMutation({
    mutationFn: (attemptId: string) => examPracticeService.abandonAttempt(attemptId),
    onSuccess: async () => {
      setPendingAbandonAttemptId(null)
      await queryClient.invalidateQueries({ queryKey: ['b1-user-attempts', user?.id] })
      showToast({
        type: 'success',
        title: 'Đã đóng bài thi',
        message: 'Bài làm dở đã được đóng và không còn trong danh sách tiếp tục.',
      })
    },
    onError: (error) =>
      showToast({
        type: 'error',
        title: 'Không thể đóng bài thi',
        message: error instanceof Error ? error.message : 'Vui lòng thử lại.',
      }),
  })

  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (exam.description && exam.description.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesTier = tierFilter === 'all' || exam.access_tier === tierFilter
      return matchesSearch && matchesTier
    })
  }, [exams, searchQuery, tierFilter])

  const selectedMinutes = useMemo(() => {
    if (durationChoice === 'custom') {
      const parsed = Number.parseInt(customMinutes, 10)
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 120
    }
    return Number.parseInt(durationChoice, 10) || 120
  }, [customMinutes, durationChoice])

  const timeBreakdown = useMemo(() => {
    const readingMins = Math.round(selectedMinutes * 0.4)
    const listeningMins = Math.round(selectedMinutes * 0.25)
    const writingMins = selectedMinutes - readingMins - listeningMins
    return { readingMins, listeningMins, writingMins }
  }, [selectedMinutes])

  const startExam = (exam: Exam) => {
    const minutes = getDurationMinutes(exam, durationChoice, customMinutes)
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 480) {
      showToast({
        type: 'warning',
        title: 'Thời gian chưa hợp lệ',
        message: 'Hãy đặt thời gian từ 1 đến 480 phút.',
      })
      return
    }
    startMutation.mutate({ exam, durationSeconds: minutes * 60 })
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      {/* Hero Banner Header */}
      <section className="neo-card bg-primary p-6 sm:p-8 relative overflow-hidden">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border-2 border-border bg-card px-3 py-1 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_var(--border)]">
              <Sparkles size={14} className="text-secondary" />
              <span>B1 PET CEFR · THI THỬ DỰA TRÊN ĐỀ THẬT</span>
            </div>
            <h1 className="text-3xl font-black sm:text-4xl lg:text-5xl tracking-tight leading-tight">
              Luyện thi B1 trọn bộ & Chủ động nhịp làm
            </h1>
            <p className="font-semibold text-foreground/85 text-base sm:text-lg">
              Đồng hồ đếm giờ linh hoạt cho toàn bộ 4 kỹ năng. Hệ thống tự động ghi nhận tiến trình và chấm điểm trắc nghiệm tức thì ngay khi nộp bài.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-3 min-w-[210px]">
            <div className="neo-card bg-card p-3 font-black text-center shadow-[3px_3px_0_var(--border)]">
              <span className="text-xs uppercase text-muted-foreground block font-bold">Đề thi sẵn sàng</span>
              <span className="text-2xl font-black text-secondary">{exams.length} Bộ đề</span>
            </div>
            <div className="neo-card bg-card p-3 font-black text-center shadow-[3px_3px_0_var(--border)]">
              <span className="text-xs uppercase text-muted-foreground block font-bold">Đồng hồ đếm giờ</span>
              <span className="text-sm font-black text-foreground flex items-center justify-center gap-1 mt-0.5">
                <Clock3 size={15} /> Linh hoạt overtime
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Timer & Time-Breakdown Configuration Panel */}
      <section className="neo-card p-5 sm:p-6 bg-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Settings2 size={20} className="text-secondary" />
              <h2 className="text-xl font-black">Cấu hình thời gian thi</h2>
            </div>
            <p className="text-sm font-semibold text-muted-foreground mt-0.5">
              Bạn có thể điều chỉnh thời lượng làm bài theo mục tiêu cá nhân trước khi bắt đầu.
            </p>
          </div>
          <div className="border-2 border-border bg-muted/60 px-3 py-1.5 font-black text-xs uppercase shadow-[2px_2px_0_var(--border)] self-start sm:self-auto">
            Đồng hồ chung cho toàn bộ bài thi
          </div>
        </div>

        {/* Preset Selection Buttons (Desktop / Mobile Pills) */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {DURATION_PRESETS.map((preset) => {
            const isSelected = durationChoice === preset.id
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setDurationChoice(preset.id)}
                className={`neo-card p-3 text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-primary border-primary shadow-[4px_4px_0_var(--border)] font-black'
                    : 'bg-background hover:bg-muted/40 font-semibold'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-base">{preset.label}</span>
                  {preset.recommended && (
                    <span className="bg-secondary text-secondary-foreground text-[10px] font-black px-1.5 py-0.5 border border-border">
                      GỢI Ý
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground font-bold mt-1 block">
                  {preset.subtext}
                </span>
              </button>
            )}
          )}
        </div>

        {/* Custom duration input when selected */}
        {durationChoice === 'custom' && (
          <div className="pt-2 sm:max-w-xs">
            <Label htmlFor="custom-duration" className="font-black text-sm">
              Số phút tự chọn (1 – 480 phút)
            </Label>

            <Input
              id="custom-duration"
              type="number"
              min={1}
              max={480}
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              className="mt-1 font-black"
            />
          </div>
        )}

        {/* Dynamic Section Time Allocation Calculator */}
        <div className="bg-muted/40 border-2 border-border p-4 shadow-[2px_2px_0_var(--border)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="font-black text-sm flex items-center gap-2">
              <Clock3 size={16} className="text-secondary" />
              <span>Gợi ý phân bổ cho tổng {selectedMinutes} phút:</span>
            </div>
            <span className="text-xs font-black text-secondary uppercase bg-card border border-border px-2 py-0.5">
              Hết giờ vẫn tiếp tục được
            </span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-black">
            <div className="bg-card p-2 border border-border">
              <div className="text-muted-foreground uppercase text-[10px]">Grammar & Reading</div>
              <div className="text-sm font-black text-foreground mt-0.5">~{timeBreakdown.readingMins} phút</div>
            </div>
            <div className="bg-card p-2 border border-border">
              <div className="text-muted-foreground uppercase text-[10px]">Listening</div>
              <div className="text-sm font-black text-foreground mt-0.5">~{timeBreakdown.listeningMins} phút</div>
            </div>
            <div className="bg-card p-2 border border-border">
              <div className="text-muted-foreground uppercase text-[10px]">Writing & Speaking</div>
              <div className="text-sm font-black text-foreground mt-0.5">~{timeBreakdown.writingMins} phút</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Navigation Tabs: Catalog vs History */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b-2 border-border pb-2">
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === 'catalog' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('catalog')}
            className="flex items-center gap-2 font-black"
          >
            <Layers size={18} />
            <span>Danh sách đề thi</span>
            <span className="ml-1 rounded-full border border-border bg-card px-2 py-0.5 text-xs font-black">
              {filteredExams.length}
            </span>
          </Button>

          <Button
            variant={activeTab === 'history' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('history')}
            className="flex items-center gap-2 font-black"
          >
            <History size={18} />
            <span>Lịch sử thi</span>
            {inProgressAttempts.length > 0 && (
              <span className="ml-1 rounded-full bg-secondary text-secondary-foreground px-2 py-0.5 text-xs font-black animate-pulse">
                {inProgressAttempts.length} dang dở
              </span>
            )}
          </Button>
        </div>

        {/* Search & Tier Filter Bar when in Catalog mode */}
        {activeTab === 'catalog' && (
          <div className="flex items-center gap-2">
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                placeholder="Tìm đề thi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 text-sm font-semibold"
              />
            </div>

            <div className="w-32">
              <Select
                value={tierFilter}
                onChange={(val) => setTierFilter(val as 'all' | 'free' | 'pro')}
                options={[
                  { value: 'all', label: 'Tất cả thẻ' },
                  { value: 'free', label: 'Miễn phí' },
                  { value: 'pro', label: 'Pro' },
                ]}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tab 1 Content: Catalog Grid */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {examsQuery.isLoading && (
            <div className="grid gap-5 md:grid-cols-2">
              <div className="neo-card animate-pulse p-8 text-center font-black">Đang tải danh sách đề B1...</div>
              <div className="neo-card animate-pulse p-8 text-center font-black">Đang tải danh sách đề B1...</div>
            </div>
          )}

          {examsQuery.isError && (
            <div className="neo-card border-danger p-8 text-center font-black">
              Không thể tải đề thi B1. Vui lòng kiểm tra lại kết nối.
            </div>
          )}

          {!shouldUseRemoteData && (
            <div className="neo-card p-8 text-center font-black space-y-3">
              <FileText className="mx-auto text-muted-foreground" size={32} />
              <h3 className="text-xl">Chế độ xem thử nghiệm</h3>
              <p className="font-semibold text-muted-foreground max-w-md mx-auto">
                Hãy đăng nhập tài khoản MemoryLang và kết nối dữ liệu Supabase để bắt đầu luyện làm bài thi thử B1.
              </p>
            </div>
          )}

          {shouldUseRemoteData && !examsQuery.isLoading && filteredExams.length === 0 && (
            <div className="neo-card p-10 text-center space-y-3">
              <FileText className="mx-auto text-muted-foreground" size={36} />
              <h3 className="text-xl font-black">Không tìm thấy đề thi phù hợp</h3>
              <p className="font-semibold text-muted-foreground max-w-md mx-auto text-sm">
                {searchQuery || tierFilter !== 'all'
                  ? 'Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc thẻ tài khoản.'
                  : 'Hiện tại chưa có đề thi B1 nào được xuất bản. Quản trị viên sẽ cập nhật thêm sớm.'}
              </p>
              {(searchQuery || tierFilter !== 'all') && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearchQuery('')
                    setTierFilter('all')
                  }}
                  className="mt-2"
                >
                  <RotateCcw size={16} /> Xóa bộ lọc
                </Button>
              )}
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {filteredExams.map((exam) => (
              <article
                key={exam.id}
                className="neo-card flex flex-col justify-between p-6 bg-card hover:-translate-y-1 transition-all shadow-[4px_4px_0_var(--border)]"
              >
                <div className="space-y-4">
                  {/* Card Header & Tier Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-secondary">
                          {exam.cefr_level || 'B1'} PET · Đề thi thử
                        </span>
                      </div>
                      <h2 className="text-2xl font-black leading-snug">{exam.title}</h2>
                    </div>
                    <span
                      className={`border-2 border-border px-2.5 py-1 text-xs font-black uppercase shadow-[2px_2px_0_var(--border)] ${
                        exam.access_tier === 'pro'
                          ? 'bg-secondary text-secondary-foreground'
                          : 'bg-primary text-primary-foreground'
                      }`}
                    >
                      {exam.access_tier}
                    </span>
                  </div>

                  {/* Description */}
                  {exam.description && (
                    <p className="font-semibold text-muted-foreground text-sm leading-relaxed line-clamp-3">
                      {exam.description}
                    </p>
                  )}

                  {/* Skill Badge Tags */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="border border-border bg-muted px-2 py-0.5 text-xs font-black rounded-sm inline-flex items-center gap-1">
                      <FileText size={13} className="text-secondary" />
                      <span>Grammar & Vocabulary</span>
                    </span>
                    <span className="border border-border bg-muted px-2 py-0.5 text-xs font-black rounded-sm inline-flex items-center gap-1">
                      <BookOpen size={13} className="text-secondary" />
                      <span>Reading</span>
                    </span>
                    <span className="border border-border bg-muted px-2 py-0.5 text-xs font-black rounded-sm inline-flex items-center gap-1">
                      <Headphones size={13} className="text-secondary" />
                      <span>Listening</span>
                    </span>
                    <span className="border border-border bg-muted px-2 py-0.5 text-xs font-black rounded-sm inline-flex items-center gap-1">
                      <PenTool size={13} className="text-secondary" />
                      <span>Writing & Speaking</span>
                    </span>
                  </div>
                </div>

                {/* Card Footer Action */}
                <div className="mt-6 pt-4 border-t-2 border-border flex items-center justify-between gap-4">
                  <div className="text-xs font-black text-muted-foreground flex items-center gap-1">
                    <Clock3 size={15} />
                    <span>Thời lượng chọn: {selectedMinutes} phút</span>
                  </div>

                  <Button
                    variant="primary"
                    onClick={() => startExam(exam)}
                    disabled={startMutation.isPending}
                    className="font-black flex items-center gap-2"
                  >
                    <Play size={17} />
                    <span>Bắt đầu đề</span>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2 Content: Exam History & In-Progress Attempts */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {attemptsQuery.isLoading && (
            <div className="neo-card animate-pulse p-8 text-center font-black">
              Đang tải lịch sử thi...
            </div>
          )}

          {attemptsQuery.isError && (
            <div className="neo-card border-danger p-8 text-center font-black">
              Không thể tải lịch sử thi thử. Vui lòng thử lại sau.
            </div>
          )}

          {!attemptsQuery.isLoading && userAttempts.length === 0 && (
            <div className="neo-card p-10 text-center space-y-4">
              <History className="mx-auto text-muted-foreground" size={40} />
              <h3 className="text-2xl font-black">Chưa có lịch sử bài làm</h3>
              <p className="font-semibold text-muted-foreground max-w-md mx-auto">
                Bạn chưa thực hiện bài thi thử B1 nào. Hãy chọn một đề từ danh sách và bắt đầu ngay!
              </p>
              <Button variant="primary" onClick={() => setActiveTab('catalog')} className="mt-2 font-black">
                Khám phá danh sách đề thi
              </Button>
            </div>
          )}

          {/* Active / In Progress Attempts Section */}
          {inProgressAttempts.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2 font-black text-lg">
                <Clock3 className="text-secondary" size={20} />
                <h2>Bài thi đang làm dở ({inProgressAttempts.length})</h2>
              </div>

              <div className="grid gap-4">
                {inProgressAttempts.map((att) => (
                  <div
                    key={att.id}
                    className="neo-card p-5 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-2 border-secondary"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="bg-secondary text-secondary-foreground text-[11px] font-black px-2 py-0.5 uppercase border border-border">
                          Đang làm dở
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">
                          Bắt đầu: {formatDate(att.started_at)}
                        </span>
                      </div>

                      <h3 className="text-xl font-black">
                        {att.exams?.title || 'Bài thi thử B1 PET'}
                      </h3>

                      <p className="text-xs font-semibold text-muted-foreground">
                        Thời gian đã trôi qua: {formatDurationSeconds(att.elapsed_seconds || 0)} /{' '}
                        {formatDurationSeconds(att.target_duration_seconds || 7200)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                      <Button
                        variant="ghost"
                        onClick={() => setPendingAbandonAttemptId(att.id)}
                        disabled={abandonMutation.isPending}
                        className="font-black flex items-center justify-center gap-2"
                      >
                        <Trash2 size={16} />
                        <span>Đóng bài thi</span>
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => navigate(`/app/exams/attempt/${att.id}`)}
                        className="font-black flex items-center justify-center gap-2"
                      >
                        <span>Tiếp tục làm bài</span>
                        <ArrowRight size={17} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Submitted Attempts Section */}
          {submittedAttempts.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2 font-black text-lg">
                <Award className="text-primary-foreground" size={20} />
                <h2>Bài thi đã hoàn thành ({submittedAttempts.length})</h2>
              </div>

              <div className="grid gap-4">
                {submittedAttempts.map((att) => (
                  <div
                    key={att.id}
                    className="neo-card p-5 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="bg-muted text-foreground text-[11px] font-black px-2 py-0.5 uppercase border border-border flex items-center gap-1">
                          <CheckCircle2 size={12} className="text-secondary" />
                          Đã nộp bài
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">
                          Nộp lúc: {formatDate(att.submitted_at || att.updated_at)}
                        </span>
                      </div>

                      <h3 className="text-xl font-black">
                        {att.exams?.title || 'Bài thi thử B1 PET'}
                      </h3>

                      <p className="text-xs font-semibold text-muted-foreground">
                        Thời gian làm bài: {formatDurationSeconds(att.elapsed_seconds || 0)}
                        {att.overtime_seconds > 0 && ` (Overtime: +${formatDurationSeconds(att.overtime_seconds)})`}
                      </p>
                    </div>

                    <Button
                      variant="secondary"
                      onClick={() => navigate(`/app/exams/result/${att.id}`)}
                      className="font-black flex items-center justify-center gap-2 self-start sm:self-center"
                    >
                      <FileText size={17} />
                      <span>Xem kết quả</span>
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <ConfirmModal
        open={Boolean(pendingAbandonAttemptId)}
        title="Đóng bài thi này?"
        description="Bạn sẽ không thể tiếp tục bài làm này. Các bài viết nháp đã tự lưu vẫn được giữ lại trong lịch sử bản nháp."
        confirmLabel={abandonMutation.isPending ? 'Đang đóng...' : 'Đóng bài thi'}
        cancelLabel="Tiếp tục làm"
        variant="danger"
        confirmDisabled={abandonMutation.isPending}
        onConfirm={() => {
          if (pendingAbandonAttemptId) abandonMutation.mutate(pendingAbandonAttemptId)
        }}
        onCancel={() => setPendingAbandonAttemptId(null)}
      />
    </div>
  )
}
