import { normalizeMissionAnswer } from './generators'
import type { AnswerRecord, GameTerm, MissionAttemptState, MissionDefinition, MissionQuestionType } from './mission.types'

const partOfSpeechLabels: Record<string, string> = {
  noun: 'n · danh từ',
  verb: 'v · động từ',
  adjective: 'adj · tính từ',
  adverb: 'adv · trạng từ',
}

export function formatMissionPartOfSpeech(value: string | null): string {
  return value?.split(',').map((part) => part.trim().toLowerCase()).filter(Boolean)
    .map((part) => partOfSpeechLabels[part] ?? part).join(' / ') ?? ''
}

export function calculateMissionProgress(
  definition: MissionDefinition,
  attempt: Pick<MissionAttemptState, 'stageIndex' | 'questionIndex' | 'answers' | 'status'>,
): number {
  if (attempt.status === 'completed') return 100
  const learnStageIndex = definition.stages.findIndex((stage) => stage.type === 'learn')
  const learnTotal = learnStageIndex < 0 ? 0 : definition.stages[learnStageIndex].targetTermIds.length
  const learned = learnStageIndex < 0 ? 0 : attempt.stageIndex > learnStageIndex ? learnTotal : attempt.stageIndex === learnStageIndex ? Math.min(attempt.questionIndex, learnTotal) : 0
  const questionIds = new Set(definition.stages.flatMap((stage) => stage.questions.map((question) => question.id)))
  const total = learnTotal + questionIds.size
  if (total === 0) return 0
  const graded = new Set(attempt.answers.filter((answer) => questionIds.has(answer.questionId)).map((answer) => answer.questionId)).size
  return Math.min(100, Math.round(((learned + graded) / total) * 100))
}

export function createSkippedMissionAnswer(
  question: { id: string; targetTermId: string; type: MissionQuestionType },
  attempts: number,
  submittedAnswer: string,
  answeredAt: string,
): AnswerRecord {
  return {
    questionId: question.id,
    targetTermId: question.targetTermId,
    type: question.type,
    attempts,
    hintLevel: 0,
    isCorrect: false,
    firstTryCorrect: false,
    score: 0,
    answeredAt,
    submittedAnswer,
    skipped: true,
  }
}

export function getMissionRetryFeedback(submitted: string, expected: string): string {
  const actualWords = normalizeMissionAnswer(submitted).split(' ')
  const targetWords = normalizeMissionAnswer(expected).split(' ')
  if (actualWords.length !== targetWords.length) return 'Chưa đúng. Bạn có thể xem gợi ý rồi thử thêm một lần.'
  const different = actualWords.map((word, index) => word === targetWords[index] ? -1 : index).filter((index) => index >= 0)
  if (different.length !== 1) return 'Chưa đúng. Bạn có thể xem gợi ý rồi thử thêm một lần.'
  const index = different[0]
  const actual = actualWords[index]
  const target = targetWords[index]
  if (!actual || !target || actual[0] !== target[0]) return 'Chưa đúng. Bạn có thể xem gợi ý rồi thử thêm một lần.'
  const matrix = Array.from({ length: actual.length + 1 }, () => Array<number>(target.length + 1).fill(0))
  for (let row = 0; row <= actual.length; row += 1) matrix[row][0] = row
  for (let column = 0; column <= target.length; column += 1) matrix[0][column] = column
  for (let row = 1; row <= actual.length; row += 1) {
    for (let column = 1; column <= target.length; column += 1) {
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + (actual[row - 1] === target[column - 1] ? 0 : 1),
      )
    }
  }
  if (matrix[actual.length][target.length] > 2) return 'Chưa đúng. Bạn có thể xem gợi ý rồi thử thêm một lần.'
  const mismatch = [...target].findIndex((character, position) => character !== actual[position])
  return `Bạn gần đúng rồi. Hãy xem lại từ thứ ${index + 1}, gần vị trí ${mismatch + 1} (${target.length} ký tự).`
}

export function selectMatchingTranslation(
  selections: Record<string, string>,
  questionId: string,
  value: string,
): Record<string, string> {
  const next = { ...selections }
  if (!value) {
    delete next[questionId]
    return next
  }
  const occupied = Object.keys(next).find((id) => id !== questionId && next[id] === value)
  if (occupied) delete next[occupied]
  next[questionId] = value
  return next
}

export function scoreMissionAnswer(correct: boolean, attempts: number, hintLevel: number): number {
  if (!correct) return 0
  return attempts === 1 && hintLevel === 0 ? 100 : 50
}

export function getMissionContextTranslation(
  question: { targetTermId: string; sourceExampleIndex?: number },
  terms: GameTerm[],
): string | null {
  if (question.sourceExampleIndex === undefined) return null
  const target = terms.find((term) => term.globalTermId === question.targetTermId)
  return target?.examples[question.sourceExampleIndex]?.translation?.trim() || null
}
