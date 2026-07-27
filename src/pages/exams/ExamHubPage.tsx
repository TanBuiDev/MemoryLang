import { useMutation, useQuery } from '@tanstack/react-query'
import { Clock3, FileText, Play, Settings2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { showToast } from '@/components/ui/toast'
import { examPracticeService } from '@/services/supabase/examPractice.service'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'
import type { Exam } from '@/types/exam.types'

const durationOptions = [
  { value: '90', label: '90 phút' },
  { value: '120', label: '120 phút (gợi ý)' },
  { value: '150', label: '150 phút' },
  { value: 'custom', label: 'Tự đặt thời gian' },
]

function getDurationMinutes(exam: Exam, selectedDuration: string, customMinutes: string) {
  if (selectedDuration === 'custom') {
    const parsed = Number.parseInt(customMinutes, 10)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return Number.parseInt(selectedDuration || String(exam.default_time_minutes ?? 120), 10)
}

export function ExamHubPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const shouldUseRemoteData = isSupabaseConfigured && Boolean(user)
  const [durationChoice, setDurationChoice] = useState('120')
  const [customMinutes, setCustomMinutes] = useState('120')

  const examsQuery = useQuery({
    queryKey: ['b1-practice-exams'],
    queryFn: examPracticeService.listAvailableExams,
    enabled: shouldUseRemoteData,
  })
  const exams = examsQuery.data ?? []
  const startMutation = useMutation({
    mutationFn: ({ exam, durationSeconds }: { exam: Exam; durationSeconds: number }) =>
      examPracticeService.startAttempt(exam.id, durationSeconds),
    onSuccess: (attempt) => navigate(`/app/exams/attempt/${attempt.id}`),
    onError: (error) => showToast({
      type: 'error',
      title: 'Không thể bắt đầu đề',
      message: error instanceof Error ? error.message : 'Vui lòng thử lại.',
    }),
  })

  const durationDescription = useMemo(() => {
    const minutes = durationChoice === 'custom' ? customMinutes : durationChoice
    return `${minutes || '—'} phút cho toàn bộ các phần`
  }, [customMinutes, durationChoice])

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
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="neo-card bg-primary p-6 sm:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-sm font-black uppercase tracking-wide">Luyện thi B1</p>
            <h1 className="text-3xl font-black sm:text-4xl">Thi thử theo nhịp của bạn</h1>
            <p className="mt-3 max-w-2xl font-semibold text-foreground/80">
              Làm một đề trọn bộ với đồng hồ chung. Hết giờ chỉ nhắc bạn — bạn vẫn có thể tiếp tục hoàn thiện bài.
            </p>
          </div>
          <div className="border-2 border-border bg-card px-4 py-3 font-black shadow-[3px_3px_0_var(--border)]">
            <Clock3 className="mb-1 inline-block mr-2" size={18} />
            Đồng hồ chung cho toàn bộ kỳ thi
          </div>
        </div>
      </section>

      <section className="neo-card p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Settings2 size={20} />
          <h2 className="text-xl font-black">Thiết lập thời gian</h2>
        </div>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">Không phải thi thật: bạn có thể tự điều chỉnh trước khi bắt đầu.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="exam-duration">Thời lượng chung</Label>
            <Select id="exam-duration" value={durationChoice} onChange={setDurationChoice} options={durationOptions} />
          </div>
          {durationChoice === 'custom' && (
            <div>
              <Label htmlFor="custom-duration">Số phút tự đặt</Label>
              <Input
                id="custom-duration"
                type="number"
                min={1}
                max={480}
                value={customMinutes}
                onChange={(event) => setCustomMinutes(event.target.value)}
              />
            </div>
          )}
        </div>
        <p className="mt-3 text-sm font-black text-secondary">{durationDescription}</p>
      </section>

      {examsQuery.isLoading && <div className="neo-card animate-pulse p-8 text-center font-black">Đang tải đề B1…</div>}
      {examsQuery.isError && <div className="neo-card border-danger p-8 text-center font-black">Không thể tải đề. Vui lòng thử lại.</div>}
      {!shouldUseRemoteData && <div className="neo-card p-8 text-center font-black">Hãy đăng nhập và cấu hình Supabase để làm đề B1.</div>}
      {shouldUseRemoteData && !examsQuery.isLoading && exams.length === 0 && (
        <div className="neo-card p-8 text-center">
          <FileText className="mx-auto mb-3" size={30} />
          <h2 className="text-xl font-black">Chưa có đề B1 sẵn sàng</h2>
          <p className="mt-2 font-semibold text-muted-foreground">Quản trị viên cần hoàn tất media và xuất bản đề trước.</p>
        </div>
      )}
      <div className="grid gap-5 md:grid-cols-2">
        {exams.map((exam) => (
          <article key={exam.id} className="neo-card flex flex-col gap-4 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-secondary">B1 · Đề thi thử</p>
                <h2 className="mt-1 text-2xl font-black">{exam.title}</h2>
              </div>
              <span className="border-2 border-border bg-muted px-2 py-1 text-xs font-black uppercase">{exam.access_tier}</span>
            </div>
            {exam.description && <p className="flex-1 font-semibold text-muted-foreground">{exam.description}</p>}
            <Button onClick={() => startExam(exam)} disabled={startMutation.isPending}>
              <Play size={17} />
              Bắt đầu đề
            </Button>
          </article>
        ))}
      </div>
    </div>
  )
}
