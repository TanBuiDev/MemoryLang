import { useState, useRef, useEffect } from 'react'
import { Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'

interface ListeningAudioPlayerProps {
  src: string
  onTimeUpdate?: (currentTime: number) => void
  seekToTime?: number | null
  className?: string
}

export function ListeningAudioPlayer({
  src,
  onTimeUpdate,
  seekToTime,
  className,
}: ListeningAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState<number>(1.0)
  const [isMuted, setIsMuted] = useState(false)

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate
    }
  }, [playbackRate])

  useEffect(() => {
    if (seekToTime !== null && seekToTime !== undefined && audioRef.current) {
      audioRef.current.currentTime = seekToTime
      setCurrentTime(seekToTime)
      if (!isPlaying) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {})
      }
    }
  }, [seekToTime])

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {})
    }
  }

  const handleSkip = (seconds: number) => {
    if (!audioRef.current) return
    const newTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds))
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = val
      setCurrentTime(val)
    }
  }

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00'
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className={cn(
      "neo-card p-4 bg-white border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-2xl space-y-3",
      className
    )}>
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={() => {
          if (audioRef.current) {
            const cur = audioRef.current.currentTime
            setCurrentTime(cur)
            if (onTimeUpdate) onTimeUpdate(cur)
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration)
          }
        }}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
        {/* Play / Skip Controls */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleSkip(-5)}
            className="h-9 w-9 p-0 rounded-xl border-2 border-slate-900 hover:bg-amber-100 shrink-0"
            title="Lùi 5 giây"
          >
            <RotateCcw className="w-4 h-4 text-slate-900" />
          </Button>

          <Button
            type="button"
            onClick={togglePlay}
            className="h-11 px-5 rounded-xl bg-[#fdc800] hover:bg-amber-300 text-slate-900 font-black border-3 border-slate-900 shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] flex items-center gap-2"
          >
            {isPlaying ? (
              <>
                <Pause className="w-5 h-5 fill-slate-900" />
                <span>Tạm dừng</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-slate-900 ml-0.5" />
                <span>Phát Audio</span>
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => handleSkip(5)}
            className="h-9 w-9 p-0 rounded-xl border-2 border-slate-900 hover:bg-amber-100 shrink-0"
            title="Tới 5 giây"
          >
            <RotateCw className="w-4 h-4 text-slate-900" />
          </Button>
        </div>

        {/* Speed & Volume Controls */}
        <div className="flex items-center gap-2">
          {/* Speed Selector */}
          <div className="flex items-center border-2 border-slate-900 rounded-xl overflow-hidden bg-slate-50 text-xs font-black">
            {[0.8, 1.0, 1.25, 1.5].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => setPlaybackRate(rate)}
                className={cn(
                  "px-2.5 py-1.5 transition-colors cursor-pointer",
                  playbackRate === rate
                    ? "bg-purple-600 text-white"
                    : "text-slate-700 hover:bg-slate-200"
                )}
              >
                {rate}x
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.muted = !isMuted
                setIsMuted(!isMuted)
              }
            }}
            className="h-9 w-9 p-0 rounded-xl border-2 border-slate-900 hover:bg-slate-100 shrink-0"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-600" /> : <Volume2 className="w-4 h-4 text-slate-900" />}
          </Button>
        </div>
      </div>

      {/* Progress Bar & Time */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono font-black text-slate-700 shrink-0">
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 h-2.5 bg-slate-200 border-2 border-slate-900 rounded-lg appearance-none cursor-pointer accent-purple-600"
        />
        <span className="text-xs font-mono font-bold text-slate-500 shrink-0">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  )
}
