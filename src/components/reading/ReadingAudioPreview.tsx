import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ReadingAudioPreviewProps {
  audioUrl: string
}

export function ReadingAudioPreview({ audioUrl }: ReadingAudioPreviewProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    return () => audio?.pause()
  }, [])

  useEffect(() => {
    setIsPlaying(false)
  }, [audioUrl])

  const handleToggleAudio = () => {
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
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onEnded={() => setIsPlaying(false)}
      />
      <Button
        type="button"
        variant="secondary"
        aria-label={isPlaying ? 'Dừng audio' : 'Nghe audio'}
        onClick={handleToggleAudio}
        className="h-9"
      >
        {isPlaying ? <Pause size={15} /> : <Play size={15} />}
        {isPlaying ? 'Dừng audio' : 'Nghe audio'}
      </Button>
    </>
  )
}
