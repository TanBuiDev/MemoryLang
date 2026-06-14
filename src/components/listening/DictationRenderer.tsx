import { useState } from 'react'
import { useI18n } from '@/i18n'

interface DictationRendererProps {
  transcript: string
  dictAnswers: Record<number, string>
  showResult?: boolean
  correctAnswers?: string[]
  onDictAnswer: (blankIndex: number, value: string) => void
}

export function DictationRenderer({ transcript, dictAnswers, showResult, correctAnswers, onDictAnswer }: DictationRendererProps) {
  const { t } = useI18n()
  const [currentBlank, setCurrentBlank] = useState(0)

  const sentences = transcript.split('\n').filter(Boolean)
  const totalBlanks = sentences.length

  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (idx < totalBlanks - 1) setCurrentBlank(idx + 1)
    }
  }

  return (
    <div className="grid gap-4">
      <p className="text-xs font-black uppercase text-muted-foreground">{t('listening.dictationMode')}</p>
      {sentences.map((sentence, idx) => {
        const userAnswer = dictAnswers[idx] ?? ''
        const isCorrect = showResult && correctAnswers ? userAnswer.trim().toLowerCase() === (correctAnswers[idx] ?? '').toLowerCase() : null

        return (
          <div key={idx} className={`neo-card p-3 ${showResult ? (isCorrect ? 'border-success' : 'border-danger') : ''}`}>
            <p className="text-sm font-semibold mb-2">{sentence}</p>
            <div className="flex items-center gap-2">
              <input
                value={userAnswer}
                onChange={(e) => onDictAnswer(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                onFocus={() => setCurrentBlank(idx)}
                placeholder="Nhập câu bạn nghe được..."
                className={`flex-1 neo-card min-h-0 px-3 py-2 rounded-md border-2 border-border bg-card text-sm font-semibold focus:outline-none focus:border-secondary ${
                  showResult ? (isCorrect ? 'bg-success/10' : 'bg-danger/10') : idx === currentBlank ? 'border-secondary' : ''
                }`}
              />
              {showResult && (
                <span className={`text-xs font-black ${isCorrect ? 'text-success' : 'text-danger'}`}>
                  {isCorrect ? '✓' : '✗'}
                </span>
              )}
            </div>
            {showResult && !isCorrect && correctAnswers?.[idx] && (
              <p className="mt-1 text-xs text-success font-semibold">Đáp án: {correctAnswers[idx]}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
