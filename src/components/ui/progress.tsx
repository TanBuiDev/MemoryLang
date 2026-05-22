interface ProgressProps {
  value: number
}

export function Progress({ value }: ProgressProps) {
  const safeValue = Math.max(0, Math.min(100, value))

  return (
    <div className="h-4 overflow-hidden rounded-full border-2 border-border bg-card" aria-label={`${safeValue}%`}>
      <div className="h-full border-r-2 border-border bg-success" style={{ width: `${safeValue}%` }} />
    </div>
  )
}
