interface ProgressBarProps {
  current: number
  total: number
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold">{current}/{total}</span>
      <div className="flex-1 h-2 rounded-full border border-border bg-muted overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(current / total) * 100}%` }} />
      </div>
    </div>
  )
}
