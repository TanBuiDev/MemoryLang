import type { TranslationInputQuestion } from '@/types/quiz.types'
import type { SessionLimit } from '@/types/study.types'
import type { VocabularyItem } from '@/types/vocabulary.types'
import { shuffle } from '@/utils/shuffle'

type VocabularyWithTranslation = VocabularyItem & { translation: string }

export function hasTranslation(item: VocabularyItem): item is VocabularyWithTranslation {
  return typeof item.translation === 'string' && item.translation.trim().length > 0
}

export function generateTranslationQuestions(
  items: VocabularyItem[],
  questionCount: SessionLimit,
  random = Math.random,
): TranslationInputQuestion[] {
  const usable = items.filter(hasTranslation)
  const shuffled = shuffle(usable, random)
  const selected = questionCount === 'all' ? shuffled : shuffled.slice(0, questionCount)

  return selected.map((item, index) => ({
    id: `${item.id}-${index}`,
    userTermId: item.id,
    sourceText: item.source_text,
    ipa: item.ipa,
    partOfSpeech: item.part_of_speech,
    expectedTranslation: item.translation.trim(),
  }))
}

export function normalizeTranslationAnswer(answer: string): string {
  return answer
    .normalize('NFC')
    .trim()
    .toLowerCase()
    .replace(/^[.,!?;:]+|[.,!?;:]+$/g, '')
    .trim()
    .replace(/\s+/g, ' ')
}

function levenshteinDistance(left: string, right: string): number {
  const leftCharacters = Array.from(left)
  const rightCharacters = Array.from(right)
  const previous = rightCharacters.map((_, index) => index + 1)
  previous.unshift(0)

  for (let leftIndex = 1; leftIndex <= leftCharacters.length; leftIndex += 1) {
    const current = [leftIndex]

    for (let rightIndex = 1; rightIndex <= rightCharacters.length; rightIndex += 1) {
      const substitutionCost = leftCharacters[leftIndex - 1] === rightCharacters[rightIndex - 1] ? 0 : 1
      current[rightIndex] = Math.min(
        current[rightIndex - 1]! + 1,
        previous[rightIndex]! + 1,
        previous[rightIndex - 1]! + substitutionCost,
      )
    }

    previous.splice(0, previous.length, ...current)
  }

  return previous[rightCharacters.length]!
}

function matchesNormalizedAnswer(normalizedAnswer: string, normalizedExpected: string): boolean {
  if (!normalizedExpected) return false
  if (normalizedAnswer === normalizedExpected) return true
  if (Array.from(normalizedExpected).length < 8) return false

  return levenshteinDistance(normalizedAnswer, normalizedExpected) <= 1
}

function getExpectedAnswerCandidates(expectedAnswer: string): string[] {
  const alternatives = expectedAnswer
    .split(/[,;\n]+/)
    .map((candidate) => candidate.replace(/^\s*\([^)]*\)\s*/, ''))

  return [expectedAnswer, ...alternatives]
    .map(normalizeTranslationAnswer)
    .filter((candidate, index, candidates) => candidate && candidates.indexOf(candidate) === index)
}

export function isTranslationAnswerCorrect(answer: string, expectedAnswer: string): boolean {
  const normalizedAnswer = normalizeTranslationAnswer(answer)
  if (!normalizedAnswer) return false

  return getExpectedAnswerCandidates(expectedAnswer)
    .some((candidate) => matchesNormalizedAnswer(normalizedAnswer, candidate))
}
