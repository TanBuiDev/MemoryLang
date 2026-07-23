import { useState } from 'react'
import type { TranscriptSegment } from '@/types/listening.types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Play, Languages } from 'lucide-react'
import { cn } from '@/utils/cn'

interface TranscriptViewerProps {
  segments?: TranscriptSegment[]
  rawTranscript?: string
  currentTime?: number
  onSeek?: (seconds: number) => void
  className?: string
}

export function TranscriptViewer({
  segments,
  rawTranscript,
  currentTime = 0,
  onSeek,
  className,
}: TranscriptViewerProps) {
  const [showVietnamese, setShowVietnamese] = useState(true)

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className={cn(
      "neo-card p-4 sm:p-5 bg-white border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-2xl space-y-4",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b-2 border-slate-900 pb-3">
        <div className="flex items-center gap-2">
          <Badge className="bg-purple-600 text-white border border-slate-900 font-black text-xs">
            📄 Transcript Bài Nghe
          </Badge>
          <span className="text-xs font-bold text-slate-500 hidden sm:inline">
            (Bấm vào câu bất kỳ để nghe lại từ mốc giây đó)
          </span>
        </div>

        <Button
          type="button"
          variant="ghost"
          onClick={() => setShowVietnamese(!showVietnamese)}
          className={cn(
            "h-8 px-3 rounded-lg border-2 border-slate-900 font-black text-xs flex items-center gap-1.5 transition-colors",
            showVietnamese ? "bg-[#fdc800] text-slate-900" : "bg-slate-100 text-slate-700"
          )}
        >
          <Languages className="w-3.5 h-3.5" />
          <span>{showVietnamese ? 'Ẩn dịch VI' : 'Hiện dịch VI'}</span>
        </Button>
      </div>

      {/* Segments View */}
      {segments && segments.length > 0 ? (
        <div className="space-y-2.5 max-h-96 overflow-auto pr-1">
          {segments.map((seg) => {
            const isActive = currentTime >= seg.start && currentTime <= seg.end

            return (
              <div
                key={seg.id}
                onClick={() => onSeek && onSeek(seg.start)}
                className={cn(
                  "neo-card p-3 rounded-xl border-2 border-slate-900 transition-all cursor-pointer hover:bg-amber-50 group space-y-1",
                  isActive
                    ? "bg-amber-100 border-3 border-purple-900 shadow-[3px_3px_0px_0px_#000]"
                    : "bg-slate-50 shadow-[2px_2px_0px_0px_#000]"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-slate-900 text-white flex items-center gap-1">
                      <Play className="w-2.5 h-2.5 fill-white" />
                      {formatTime(seg.start)}
                    </span>
                    {seg.speaker && (
                      <span className="text-xs font-black text-purple-900 uppercase">
                        {seg.speaker}:
                      </span>
                    )}
                  </div>
                  {isActive && (
                    <span className="text-[10px] font-black uppercase text-purple-700 animate-pulse">
                      ▶ Đang phát
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                  {seg.textEn}
                </p>

                {showVietnamese && seg.textVi && (
                  <p className="text-xs font-semibold text-slate-600 pt-0.5 border-t border-slate-200">
                    {seg.textVi}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        /* Fallback Raw Transcript */
        <div className="p-3 bg-slate-50 border-2 border-slate-900 rounded-xl text-xs font-bold text-slate-800 whitespace-pre-line leading-relaxed">
          {rawTranscript || 'Chưa có dữ liệu lời thoại cho bài nghe này.'}
        </div>
      )}
    </div>
  )
}
