import type { TrueFalseQuestion } from '@/types/quiz.types'
import type { SessionLimit } from '@/types/study.types'
import type { VocabularyItem } from '@/types/vocabulary.types'
import { shuffle } from '@/utils/shuffle'

export function generateTrueFalseQuestions(items: VocabularyItem[], questionCount: SessionLimit): TrueFalseQuestion[] {
  const usable = items.filter((item) => item.meanings[0]?.text)
  const shuffled = questionCount === 'all' ? shuffle(usable) : shuffle(usable).slice(0, questionCount)

  return shuffled.map((item, index) => {
    const shouldBeTrue = index % 2 === 0 || usable.length < 2
    const mismatched = usable.find((candidate) => candidate.id !== item.id)
    const meaning = shouldBeTrue ? item.meanings[0]?.text : mismatched?.meanings[0]?.text ?? item.meanings[0]?.text

    return {
      id: `${item.id}-${index}`,
      userTermId: item.id,
      prompt: `${item.source_text} = ${meaning}`,
      statement: meaning ?? '',
      expectedAnswer: shouldBeTrue,
    }
  })
}
