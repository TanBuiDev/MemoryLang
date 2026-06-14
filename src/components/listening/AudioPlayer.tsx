import { useCallback, useEffect, useRef, useState } from 'react'
import { Pause, Play, SkipBack, SkipForward, Volume2 } from 'lucide-react'
import { cn } from '@/utils/cn'

const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2] as const

interface AudioPlayerProps {
  src: string
  autoPlay?: boolean
  allowSeek?: boolean
  allowSpeed?: boolean
  onEnd?: () => void
  onTimeUpdate?: (t: number) => void
}

export function AudioPlayer({ src, autoPlay = false, allowSeek = true, allowSpeed = true, onEnd, onTimeUpdate }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speedIdx, setSpeedIdx] = useState(2)
  const [showVolume, setShowVolume] = useState(false)
  const [volume, setVolume] = useState(1)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (autoPlay) audio.play().catch(() => {})
  }, [autoPlay])

  const onLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration)
  }

  const onTimeUpdateHandler = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
      onTimeUpdate?.(audioRef.current.currentTime)
    }
  }

  const onEndedHandler = () => {
    setPlaying(false)
    onEnd?.()
  }

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
      audio.play().catch(() => {})
    }
    setPlaying(!playing)
  }, [playing])

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + seconds))
  }, [])

  const seekTo = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!allowSeek || !audioRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    audioRef.current.currentTime = ratio * duration
  }, [allowSeek, duration])

  const cycleSpeed = () => {
    const next = (speedIdx + 1) % speeds.length
    setSpeedIdx(next)
    if (audioRef.current) audioRef.current.playbackRate = speeds[next]
  }

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex items-center gap-2 py-2">
      <audio
        ref={audioRef}
        src={src}
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={onTimeUpdateHandler}
        onEnded={onEndedHandler}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      {allowSeek && (
        <button onClick={() => seek(-5)} className="neo-button min-h-0 p-1.5 rounded-md border-2 border-border bg-card active:neo-button-active transition shadow-[2px_2px_0_var(--border)]">
          <SkipBack size={16} />
        </button>
      )}

      <button onClick={togglePlay} className="neo-button min-h-0 p-1.5 rounded-md border-2 border-border bg-card active:neo-button-active transition shadow-[2px_2px_0_var(--border)]">
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>

      {allowSeek && (
        <button onClick={() => seek(5)} className="neo-button min-h-0 p-1.5 rounded-md border-2 border-border bg-card active:neo-button-active transition shadow-[2px_2px_0_var(--border)]">
          <SkipForward size={16} />
        </button>
      )}

      <span className="text-xs font-mono font-bold tabular-nums min-w-[4.5rem] text-center">
        {formatTime(currentTime)}/{formatTime(duration)}
      </span>

      <div
        onClick={seekTo}
        className={cn('flex-1 h-2 rounded-full border border-border bg-muted cursor-pointer overflow-hidden', !allowSeek && 'pointer-events-none opacity-50')}
      >
        <div className="h-full bg-primary rounded-full transition-all duration-100" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }} />
      </div>

      {allowSpeed && (
        <button onClick={cycleSpeed} className="neo-button min-h-0 px-2 py-0.5 rounded-md border-2 border-border bg-card text-xs font-black active:neo-button-active transition shadow-[2px_2px_0_var(--border)]">
          {speeds[speedIdx]}x
        </button>
      )}

      <div className="relative">
        <button onClick={() => setShowVolume(!showVolume)} className="neo-button min-h-0 p-1.5 rounded-md border-2 border-border bg-card active:neo-button-active transition shadow-[2px_2px_0_var(--border)]">
          <Volume2 size={16} />
        </button>
        {showVolume && (
          <div className="absolute bottom-full right-0 mb-2 neo-card p-2 z-50">
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                setVolume(v)
                if (audioRef.current) audioRef.current.volume = v
              }}
              className="w-24 accent-primary"
            />
          </div>
        )}
      </div>
    </div>
  )
}
