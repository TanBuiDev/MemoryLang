export interface AttemptTimerState {
  elapsedSeconds: number
  remainingSeconds: number
  overtimeSeconds: number
  isOvertime: boolean
}

export function getAttemptTimerState(
  startedAt: string,
  targetDurationSeconds: number,
  now = new Date(),
): AttemptTimerState {
  const startedAtMs = new Date(startedAt).getTime()
  const elapsedSeconds = Number.isFinite(startedAtMs)
    ? Math.max(0, Math.floor((now.getTime() - startedAtMs) / 1000))
    : 0
  const overtimeSeconds = Math.max(0, elapsedSeconds - targetDurationSeconds)

  return {
    elapsedSeconds,
    remainingSeconds: Math.max(0, targetDurationSeconds - elapsedSeconds),
    overtimeSeconds,
    isOvertime: overtimeSeconds > 0,
  }
}

export function formatExamDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const seconds = safeSeconds % 60
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
}
