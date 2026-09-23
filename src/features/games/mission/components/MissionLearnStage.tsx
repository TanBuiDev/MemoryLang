import { Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { GameTerm } from '../mission.types'

interface MissionLearnStageProps {
  term: GameTerm
  index: number
  total: number
  onPlayAudio: () => void
  onNext: () => void
}

export function MissionLearnStage({
  term,
  index,
  total,
  onPlayAudio,
  onNext,
}: MissionLearnStageProps) {
  return (
    <div className="neo-card space-y-6 p-6 sm:p-8">
      <div className="text-center">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Từ {index + 1}/{total}
        </p>
        <h1 className="mt-2 text-4xl font-black">{term.sourceText}</h1>
        {term.ipa ? (
          <p className="mt-2 font-mono text-sm font-bold text-muted-foreground">{term.ipa}</p>
        ) : null}
        <Button variant="secondary" className="mt-4 h-11 w-11 p-0" aria-label="Nghe lại phát âm" title="Nghe lại phát âm" onClick={onPlayAudio}>
          <Volume2 className="h-5 w-5" />
        </Button>
      </div>

      <div className="rounded-xl border-2 border-border bg-muted/30 p-4">
        <p className="text-2xl font-black">{term.translation || 'Chưa có bản dịch'}</p>
        {term.examples[0]?.sentence ? (
          <div className="mt-4 border-t-2 border-dashed border-border pt-3">
            <p className="font-bold">{term.examples[0].sentence}</p>
            {term.examples[0].translation ? (
              <p className="mt-1 text-sm font-semibold text-muted-foreground">
                {term.examples[0].translation}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <Button className="w-full" onClick={onNext}>
        {index + 1 < total ? 'Từ tiếp theo' : 'Bắt đầu thử thách'}
      </Button>
    </div>
  )
}
