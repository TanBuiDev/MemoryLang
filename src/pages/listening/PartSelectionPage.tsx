import { useNavigate } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { demoParts } from '@/features/listening/demoData'
import { useListeningStore } from '@/stores/useListeningStore'
import { Card, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'
import type { ListeningMode } from '@/types/listening.types'

const partLabels: Record<number, string> = {
  1: 'listening.part1',
  2: 'listening.part2',
  3: 'listening.part3',
  4: 'listening.part4',
}

export function PartSelectionPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { mode, setPart, setMode } = useListeningStore()

  const handleStart = (partId: string) => {
    setPart(partId)
    navigate(`/app/listening/session/${partId}/${mode}`)
  }

  return (
    <div>
      <h1 className="text-2xl font-black mb-4">{t('listening.selectPart')}</h1>

      <div className="grid gap-3 mb-6">
        <p className="text-xs font-black uppercase text-muted-foreground">{t('listening.mode')}</p>
        <div className="flex gap-2">
          {(['test', 'dictation'] as ListeningMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                'neo-button min-h-0 px-4 py-2 rounded-md border-2 text-sm font-bold transition',
                mode === m
                  ? 'border-border bg-primary text-primary-foreground shadow-[2px_2px_0_var(--border)]'
                  : 'border-border bg-card hover:bg-muted shadow-[2px_2px_0_var(--border)]',
              )}
            >
              {m === 'test' ? t('listening.testMode') : t('listening.dictationMode')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3">
        {demoParts.map((part) => (
          <Card key={part.id} className="grid gap-2">
            <CardTitle>{t(partLabels[part.partNumber])}</CardTitle>
            <p className="text-xs text-muted-foreground">{part.directions}</p>
            <Button onClick={() => handleStart(part.id)}>{t('listening.startSession')}</Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
