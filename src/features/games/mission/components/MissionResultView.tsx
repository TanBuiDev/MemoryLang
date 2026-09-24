import { CheckCircle2, ListChecks, RotateCcw, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MissionResultViewProps {
  missionNumber: number
  result: {
    score: number
    accuracy: number
    firstTryAccuracy: number
  }
  syncing: boolean
  synced: boolean
  error: string | null
  hasNextMission: boolean
  onRetrySync: () => void
  onBack: () => void
  onReview: () => void
  skippedCount?: number
  onRelearn?: () => void
  onReplay: () => void
  onNext: () => void
}

export function MissionResultView({
  missionNumber,
  result,
  syncing,
  synced,
  error,
  hasNextMission,
  onRetrySync,
  onBack,
  onReview,
  skippedCount = 0,
  onRelearn,
  onReplay,
  onNext,
}: MissionResultViewProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-8">
      <div className="neo-card bg-primary p-8 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14" />
        <h1 className="mt-3 text-3xl font-black">Mission hoàn thành!</h1>
        <p className="mt-2 font-bold">
          Bạn đã hoàn thành Mission {missionNumber}.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="neo-card p-4 text-center">
          <div className="text-2xl font-black">{result.score}</div>
          <div className="text-xs font-bold text-muted-foreground">Điểm</div>
        </div>
        <div className="neo-card p-4 text-center">
          <div className="text-2xl font-black">{result.accuracy}%</div>
          <div className="text-xs font-bold text-muted-foreground">Chính xác</div>
        </div>
        <div className="neo-card p-4 text-center">
          <div className="text-2xl font-black">{result.firstTryAccuracy}%</div>
          <div className="text-xs font-bold text-muted-foreground">Lần đầu</div>
        </div>
      </div>

      {!synced && !error ? (
        <div className="neo-card bg-amber-50 p-4 font-bold text-amber-950">
          Đang đồng bộ kết quả, lịch ôn và tiến trình Mission...
        </div>
      ) : null}

      {error ? (
        <div className="neo-card space-y-3 bg-rose-50 p-4">
          <p className="font-bold text-rose-900">Kết quả đang chờ đồng bộ: {error}</p>
          <Button disabled={syncing} onClick={onRetrySync}>
            {syncing ? 'Đang đồng bộ...' : 'Thử đồng bộ lại'}
          </Button>
        </div>
      ) : null}

      <Button variant="ghost" className="w-full" onClick={onReview}>
        <ListChecks className="h-4 w-4" /> Xem lại bài làm
      </Button>

      {skippedCount > 0 && onRelearn ? (
        <Button variant="secondary" className="w-full" onClick={onRelearn}>
          <BookOpen className="h-4 w-4" /> Ôn lại {skippedCount} từ đã bỏ qua
        </Button>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          variant="ghost"
          className="flex-1"
          disabled={syncing || !synced}
          onClick={onBack}
        >
          Về lộ trình
        </Button>
        <Button
          variant="secondary"
          className="flex-1"
          disabled={syncing || !synced}
          onClick={onReplay}
        >
          <RotateCcw className="h-4 w-4" /> Chơi lại
        </Button>
        {hasNextMission ? (
          <Button
            className="flex-1"
            disabled={Boolean(error) || syncing || !synced}
            onClick={onNext}
          >
            Mission tiếp theo
          </Button>
        ) : null}
      </div>
    </div>
  )
}
