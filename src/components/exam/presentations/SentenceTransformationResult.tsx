import { compareExactText, groupWritingComparisonTokens, type WritingComparisonToken } from '@/utils/writingComparison'
import { parseSentenceTransformationPrompt } from './SentenceTransformationAttempt'

interface SentenceTransformationResultProps {
  question: string
  userAnswer: string
  acceptedAnswers: string[]
  correctOptionKeys: string[]
  isCorrect: boolean
}

function Tokens({ tokens, missing }: { tokens: WritingComparisonToken[]; missing: boolean }) {
  return <>{groupWritingComparisonTokens(tokens).map((token, index) => <span key={`${token.value}-${index}`} className={token.status === 'same' ? '' : missing ? 'bg-yellow-300 px-0.5 text-black' : 'bg-danger/15 px-0.5 text-danger'}>{token.value}</span>)}</>
}

export function SentenceTransformationResult({ question, userAnswer, acceptedAnswers, correctOptionKeys, isCorrect }: SentenceTransformationResultProps) {
  const parsed = parseSentenceTransformationPrompt(question)
  if (!parsed) return null
  const expected = [...acceptedAnswers, ...correctOptionKeys].join(', ')
  const comparison = compareExactText(userAnswer.trim(), expected)
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-2 text-base font-bold text-foreground"><span>{parsed.originalSentence}</span>{parsed.keyword && <span className="border border-border bg-secondary/15 px-2 py-0.5 text-xs font-black text-secondary">({parsed.keyword})</span>}</div>
    <div className="flex flex-wrap items-baseline gap-1.5 pt-1 text-base font-bold text-foreground"><span className="mr-1 font-mono text-xl font-black text-secondary">↳</span>{parsed.prefixText && <span>{parsed.prefixText}</span>}{isCorrect ? <span className="px-1 font-black text-secondary underline decoration-2 underline-offset-4">{userAnswer.trim() || expected}</span> : <span className="inline-flex flex-wrap items-baseline gap-1.5"><Tokens tokens={comparison.learner} missing={false} /><span className="font-black text-muted-foreground">→</span><Tokens tokens={comparison.expected} missing /></span>}{parsed.suffixText && <span>{parsed.suffixText}</span>}</div>
  </div>
}
