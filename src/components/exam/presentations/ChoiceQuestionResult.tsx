export interface ChoiceQuestionResultOption {
  key: string
  text: string
}

interface ChoiceQuestionResultProps {
  options: ChoiceQuestionResultOption[]
  userAnswer: string
  correctOptionKeys: string[]
}

export function ChoiceQuestionResult({ options, userAnswer, correctOptionKeys }: ChoiceQuestionResultProps) {
  const normalizedUserAnswer = userAnswer.trim().toUpperCase()

  return <div className={`grid gap-2.5 pt-2 ${
    options.every((option) => option.text.trim().length <= 35)
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      : 'grid-cols-1 sm:grid-cols-2'
  }`}>
    {options.map((option) => {
      const isCorrect = correctOptionKeys.includes(option.key)
      const isWrongUserChoice = normalizedUserAnswer === option.key && !isCorrect
      return <div
        key={option.key}
        data-option-key={option.key}
        className={`flex select-none items-center gap-2.5 border-2 p-2.5 text-left text-sm font-black transition-all ${
          isCorrect
            ? 'border-black bg-yellow-300 text-black shadow-[2.5px_2.5px_0_#000]'
            : isWrongUserChoice
              ? 'border-danger bg-danger text-white shadow-[2.5px_2.5px_0_var(--border)]'
              : 'border-border bg-background text-foreground opacity-70'
        }`}
      >
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-xs border-2 text-xs font-black ${
          isCorrect
            ? 'border-black bg-black text-yellow-300'
            : isWrongUserChoice
              ? 'border-danger bg-danger text-white'
              : 'border-border bg-muted text-foreground'
        }`}>
          {option.key}
        </span>
        <span className="min-w-0 break-words leading-snug">{option.text}</span>
        {isCorrect && <span className="ml-auto shrink-0 rounded-xs bg-black px-1.5 py-0.5 text-[11px] font-black text-yellow-300">Đáp án đúng</span>}
      </div>
    })}
  </div>
}
