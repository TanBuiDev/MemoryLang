import { Volume2, BookOpen, ArrowRight, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatMissionPartOfSpeech } from '../missionInteraction'
import type { GameTerm } from '../mission.types'

interface MissionLearnStageProps {
  term: GameTerm
  index: number
  total: number
  onPlayAudio: () => void
  onNext: () => void
  reviewMode?: boolean
}

export function MissionLearnStage({
  term,
  index,
  total,
  onPlayAudio,
  onNext,
  reviewMode = false,
}: MissionLearnStageProps) {
  return (
    <div className="neo-card border-4 border-slate-900 bg-white p-6 sm:p-8 shadow-[6px_6px_0px_#000] rounded-2xl space-y-6 relative overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 border-b-2 border-slate-200 pb-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 border-2 border-slate-900 text-purple-900 font-black text-xs uppercase tracking-wider rounded-full shadow-[1.5px_1.5px_0px_#000]">
          <BookOpen className="h-3.5 w-3.5" />
          {reviewMode ? 'Ôn Lại Từ Vựng' : 'Chặng 1: Làm Quen'}
        </span>
        <span className="text-xs font-black px-2.5 py-1 bg-[#fdc800] border-2 border-slate-900 rounded-lg shadow-[1.5px_1.5px_0px_#000] text-slate-900">
          Từ {index + 1}/{total}
        </span>
      </div>

      {/* Main Flashcard Center Area */}
      <div className="text-center py-2 px-2 space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {term.partOfSpeech ? (
            <span className="px-2.5 py-0.5 text-xs font-black uppercase tracking-wider bg-indigo-100 text-indigo-900 border-2 border-slate-900 rounded-md shadow-[1.5px_1.5px_0px_#000]">
              {formatMissionPartOfSpeech(term.partOfSpeech)}
            </span>
          ) : null}
          {term.ipa ? (
            <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-slate-100 text-slate-700 border-2 border-slate-900 rounded-md">
              {term.ipa}
            </span>
          ) : null}
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
          {term.sourceText}
        </h1>

        {/* Big Neobrutalist Audio Button */}
        <div className="pt-2">
          <Button
            type="button"
            variant="secondary"
            className="h-12 w-12 sm:h-14 sm:w-14 p-0 mx-auto rounded-2xl bg-[#fdc800] hover:bg-amber-300 text-slate-900 border-3 border-slate-900 shadow-[3px_3px_0px_#000] active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] transition-all flex items-center justify-center cursor-pointer"
            aria-label="Nghe lại phát âm"
            title="Nghe lại phát âm"
            onClick={onPlayAudio}
          >
            <Volume2 className="h-6 w-6 stroke-[2.5]" />
          </Button>
        </div>
      </div>

      {/* Translation & Context Example Box */}
      <div className="rounded-2xl border-3 border-slate-900 bg-amber-50/60 p-5 shadow-[4px_4px_0px_#000] space-y-3">
        <div>
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">
            Nghĩa của từ
          </span>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">
            {term.translation || 'Chưa có bản dịch'}
          </p>
        </div>

        {term.examples[0]?.sentence ? (
          <div className="mt-3 pt-3 border-t-2 border-dashed border-slate-300">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">
              Ví dụ ngữ cảnh
            </span>
            <p className="text-sm sm:text-base font-bold text-slate-900 leading-relaxed">
              {term.examples[0].sentence}
            </p>
            {term.examples[0].translation ? (
              <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-600 leading-relaxed">
                {term.examples[0].translation}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Next Step Action Button */}
      <Button
        className="w-full h-12 text-sm sm:text-base font-black bg-[#fdc800] hover:bg-amber-300 text-slate-900 border-3 border-slate-900 shadow-[4px_4px_0px_#000] rounded-xl flex items-center justify-center gap-2 cursor-pointer"
        onClick={onNext}
      >
        <span>{index + 1 < total ? 'Từ tiếp theo' : reviewMode ? 'Về kết quả' : 'Bắt đầu thử thách'}</span>
        {index + 1 < total ? (
          <ArrowRight className="h-5 w-5" />
        ) : (
          <Play className="h-5 w-5 fill-slate-900" />
        )}
      </Button>
    </div>
  )
}
