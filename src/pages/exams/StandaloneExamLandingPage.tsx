import { useQuery, useMutation } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { AlertTriangle, Clock3, Play, Sparkles } from 'lucide-react'
import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { showToast } from '@/components/ui/toast'
import { examPracticeService } from '@/services/supabase/examPractice.service'
import { supabase } from '@/services/supabase/client'
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

export function StandaloneExamLandingPage() {
  const { examId = '' } = useParams()
  const navigate = useNavigate()

  const [durationChoice, setDurationChoice] = useState('120')
  const [customMinutes, setCustomMinutes] = useState('120')

  const examQuery = useQuery({
    queryKey: ['b1-exam-detail', examId],
    queryFn: async () => {
      const { data, error } = await supabase.from('exams').select('*').eq('id', examId).single()
      if (error) throw error
      return data as Exam
    },
    enabled: Boolean(examId),
  })

  const startMutation = useMutation({
    mutationFn: ({ exam, durationSeconds }: { exam: Exam; durationSeconds: number }) =>
      examPracticeService.startAttempt(exam.id, durationSeconds),
    onSuccess: (attempt) => navigate(`/e/attempt/${attempt.id}`),
    onError: (error) =>
      showToast({
        type: 'error',
        title: 'Không thể bắt đầu đề',
        message: error instanceof Error ? error.message : 'Vui lòng thử lại.',
      }),
  })

  const exam = examQuery.data

  const startExam = () => {
    if (!exam) return
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

  const selectedMinutes = useMemo(() => {
    if (durationChoice === 'custom') {
      const parsed = Number.parseInt(customMinutes, 10)
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 120
    }
    return Number.parseInt(durationChoice, 10) || 120
  }, [customMinutes, durationChoice])

  if (examQuery.isLoading) {
    return (
      <div className="mx-auto max-w-3xl py-12">
        <div className="neo-card animate-pulse p-10 text-center font-black space-y-3">
          <Sparkles className="mx-auto text-secondary" size={32} />
          <p className="text-xl">Đang tải thông tin đề thi...</p>
        </div>
      </div>
    )
  }

  if (examQuery.isError || !exam) {
    return (
      <div className="mx-auto max-w-3xl py-12">
        <div className="neo-card p-10 text-center font-black space-y-4">
          <AlertTriangle className="mx-auto text-danger" size={40} />
          <h2 className="text-2xl">Không tìm thấy đề thi</h2>
          <p className="font-semibold text-muted-foreground text-sm">Đường dẫn không hợp lệ hoặc đề thi đã bị gỡ.</p>
          <Button variant="primary" onClick={() => navigate('/app/exams')}>
            Quay lại danh sách đề thi
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8 pt-4">
      <section className="neo-card bg-primary p-6 sm:p-8 relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border-2 border-border bg-card px-3 py-1 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_var(--border)]">
            <Sparkles size={14} className="text-secondary" />
            <span>{exam.cefr_level || 'B1'} PET · Đề thi thử</span>
          </div>
          <h1 className="text-3xl font-black sm:text-4xl tracking-tight leading-tight">
            {exam.title}
          </h1>
          {exam.description && (
            <p className="font-semibold text-foreground/85 text-base mt-2">
              {exam.description}
            </p>
          )}
        </div>
      </section>

      <section className="neo-card p-5 sm:p-6 bg-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Clock3 size={20} className="text-secondary" />
              <h2 className="text-xl font-black">Cấu hình thời gian thi</h2>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
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
            )
          })}
        </div>

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

        <div className="mt-6 pt-4 border-t-2 border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-sm font-black text-muted-foreground flex items-center gap-1">
            <Clock3 size={16} />
            <span>Sẽ làm bài trong: {selectedMinutes} phút</span>
          </div>

          <Button
            variant="primary"
            onClick={startExam}
            disabled={startMutation.isPending || !exam.is_published}
            className="font-black flex items-center gap-2"
          >
            <Play size={17} />
            <span>{exam.is_published ? 'Bắt đầu bài thi' : 'Đề chưa xuất bản'}</span>
          </Button>
        </div>
      </section>
    </div>
  )
}
