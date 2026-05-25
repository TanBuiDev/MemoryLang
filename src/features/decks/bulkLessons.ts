import { shuffle } from '@/utils/shuffle'

const LESSON_NAME_PATTERN = /^Bai hoc (\d+)$/

export interface LessonDraft {
  name: string
  termIds: string[]
}

export function getNextLessonNumber(existingDecks: Array<{ name: string }>) {
  const highest = existingDecks.reduce((max, deck) => {
    const match = LESSON_NAME_PATTERN.exec(deck.name)
    if (!match) {
      return max
    }

    const parsed = Number(match[1])
    if (!Number.isSafeInteger(parsed) || parsed >= Number.MAX_SAFE_INTEGER) {
      throw new Error('lesson number range exceeded')
    }

    return Math.max(max, parsed)
  }, 0)

  return highest + 1
}

export function buildLessonBatch(
  selectedTermIds: string[],
  wordsPerLesson: number,
  existingDecks: Array<{ name: string }>,
  random: () => number = Math.random,
): LessonDraft[] {
  if (!Number.isInteger(wordsPerLesson) || wordsPerLesson < 1) {
    throw new Error('wordsPerLesson must be a positive integer')
  }

  const shuffledIds = shuffle(Array.from(new Set(selectedTermIds)), random)
  const lessonCount = Math.ceil(shuffledIds.length / wordsPerLesson)
  if (lessonCount === 0) {
    return []
  }

  const firstNumber = getNextLessonNumber(existingDecks)

  if (!Number.isSafeInteger(firstNumber + lessonCount - 1)) {
    throw new Error('lesson number range exceeded')
  }

  return Array.from(
    { length: lessonCount },
    (_, index) => ({
      name: `Bai hoc ${String(firstNumber + index).padStart(2, '0')}`,
      termIds: shuffledIds.slice(index * wordsPerLesson, (index + 1) * wordsPerLesson),
    }),
  )
}
