import type { MultipleChoiceQuestion } from '@/types/quiz.types'
import type { SessionLimit } from '@/types/study.types'
import type { VocabularyItem } from '@/types/vocabulary.types'
import { shuffle } from '@/utils/shuffle'

function getTranslation(item: VocabularyItem): string | null {
  if (typeof item.translation === 'string' && item.translation.trim().length > 0) {
    return item.translation.trim()
  }
  const meaningText = item.meanings?.[0]?.text
  if (meaningText && item.meanings[0]?.language === item.native_language) {
    return meaningText.trim()
  }
  return null
}

export function splitAlternatives(translation: string): string[] {
  return translation
    .split(/\s*[\/,;]\s*|\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function normalizeTranslation(translation: string): string {
  return translation
    .replace(/\s*[\/,;]\s*|\n+/g, ' / ')
    .trim()
}

export function selectDistractors(
  correctTerm: { id: string; translation: string },
  allTerms: Array<{ id: string; translation: string | null }>,
  usedDistractors: Set<string> = new Set(),
): string[] {
  const correctAlternatives = splitAlternatives(correctTerm.translation)
  const correctDisplay = normalizeTranslation(correctTerm.translation)

  const candidates: string[] = []
  for (const t of allTerms) {
    if (t.id === correctTerm.id || !t.translation?.trim()) continue
    const display = normalizeTranslation(t.translation)
    const alts = splitAlternatives(t.translation)
    const hasOverlap = alts.some((alt) => correctAlternatives.includes(alt))
    if (!hasOverlap && display !== correctDisplay) {
      candidates.push(display)
    }
  }

  const scored = candidates.map((c) => ({
    text: c,
    dist: Math.abs(c.length - correctDisplay.length),
  }))

  scored.sort((a, b) => a.dist - b.dist)

  const fresh: string[] = []
  const stale: string[] = []
  const seen = new Set<string>()
  for (const s of scored) {
    if (seen.has(s.text)) continue
    seen.add(s.text)
    if (usedDistractors.has(s.text)) {
      stale.push(s.text)
    } else {
      fresh.push(s.text)
    }
  }

  const selected: string[] = []
  for (const t of fresh) {
    selected.push(t)
    if (selected.length >= 3) break
  }
  for (const t of stale) {
    if (selected.length >= 3) break
    selected.push(t)
  }

  for (const t of selected) {
    usedDistractors.add(t)
  }

  return selected
}

export function generateMultipleChoiceQuestions(
  items: VocabularyItem[],
  questionCount: SessionLimit,
  randomFn = Math.random,
): MultipleChoiceQuestion[] {
  const usable = items.filter(
    (item) => getTranslation(item) !== null,
  )
  const shuffled = shuffle(usable, randomFn)
  const selected = questionCount === 'all' ? shuffled : shuffled.slice(0, questionCount)
  const usedDistractors = new Set<string>()

  return selected.map((item, index) => {
    const translation = getTranslation(item)!
    const correctAlternatives = splitAlternatives(translation)
    const correctDisplay = normalizeTranslation(translation)

    const distractors = selectDistractors(
      { id: item.id, translation },
      usable.map((t) => ({ id: t.id, translation: getTranslation(t) ?? '' })),
      usedDistractors,
    )

    const options = shuffle([correctDisplay, ...distractors], randomFn)
    const correctIndex = options.indexOf(correctDisplay)

    return {
      id: `${item.id}-mc-${index}`,
      userTermId: item.id,
      sourceText: item.source_text,
      ipa: item.ipa,
      partOfSpeech: item.part_of_speech,
      audioUrl: item.audio_url,
      options,
      correctIndex,
      correctAlternatives,
    }
  })
}

export function checkMultipleChoiceAnswer(
  selectedText: string,
  correctAlternatives: string[],
): boolean {
  const selectedAlts = splitAlternatives(selectedText)
  return selectedAlts.some((alt) => correctAlternatives.includes(alt))
}
