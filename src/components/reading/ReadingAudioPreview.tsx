import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ReadingAudioPreviewProps {
  audioUrl?: string | null
  disabled?: boolean
}

export function ReadingAudioPreview({ audioUrl, disabled = false }: ReadingAudioPreviewProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const hasAudio = Boolean(audioUrl) && !disabled

  useEffect(() => {
    const audio = audioRef.current
    return () => audio?.pause()
  }, [])

  useEffect(() => {
    setIsPlaying(false)
  }, [audioUrl])

  const handleToggleAudio = () => {
    if (!hasAudio) return
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
      return
    }

    setIsPlaying(true)
    void audio.play().catch(() => setIsPlaying(false))
  }

  return (
    <>
      {hasAudio && audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          onEnded={() => setIsPlaying(false)}
        />
      )}
      <Button
        type="button"
        variant="secondary"
        aria-label={isPlaying ? 'Dừng audio' : 'Nghe audio'}
        disabled={!hasAudio}
        onClick={handleToggleAudio}
        className="neo-button h-10 w-10 min-h-0 p-0 bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-xl flex items-center justify-center cursor-pointer disabled:opacity-40"
        title={hasAudio ? (isPlaying ? 'Dừng audio' : 'Nghe audio bài đọc') : 'Bài đọc chưa có audio'}
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
      </Button>
    </>
  )
}
