import { GENERATOR_VERSION, STANDARD_SCRIPT_VERSION, seededShuffle } from './curriculum'
import { findExactCloze, generateQuestion, normalizeMissionAnswer } from './generators'
import type { GameTerm, MissionDefinition, MissionDiagnostic, MissionQuestionType, MissionReadiness, MissionStageDefinition } from './mission.types'

const STANDARD_STAGES: Array<{ type: MissionQuestionType; count: number; required: boolean }> = [
  { type: 'matching', count: 5, required: true },
  { type: 'listening_choice', count: 3, required: false },
  { type: 'listening_typing', count: 2, required: false },
  { type: 'context_cloze', count: 5, required: false },
  { type: 'meaning_recall', count: 5, required: true },
]

function buildQuestionStage(type: MissionQuestionType, count: number, required: boolean, terms: GameTerm[], seed: string) {
  const questions = []
  const diagnostics: MissionDiagnostic[] = []
  for (const term of seededShuffle(terms, seed + ':' + type)) {
    const result = generateQuestion(type, term, terms, seed)
    if (result.question) questions.push(result.question)
    if (result.diagnostic) diagnostics.push(result.diagnostic)
    if (questions.length >= Math.min(count, terms.length)) break
  }
  return {
    stage: { type, targetTermIds: questions.map((question) => question.targetTermId), questions, required } satisfies MissionStageDefinition,
    diagnostics,
  }
}

function buildBossStage(terms: GameTerm[], seed: string) {
  const preferred: MissionQuestionType[] = ['meaning_recall', 'listening_typing', 'context_cloze', 'spelling', 'matching']
  const questions = []
  const diagnostics: MissionDiagnostic[] = []
  const shuffledTerms = seededShuffle(terms, seed + ':boss')
  for (let index = 0; index < shuffledTerms.length && questions.length < 5; index += 1) {
    const term = shuffledTerms[index]
    const start = index % preferred.length
    for (let offset = 0; offset < preferred.length; offset += 1) {
      const type = preferred[(start + offset) % preferred.length]
      const result = generateQuestion(type, term, terms, seed + ':boss')
      if (result.question) {
        questions.push({ ...result.question, id: 'boss:' + result.question.id })
        break
      }
      if (result.diagnostic) diagnostics.push(result.diagnostic)
    }
  }
  return { stage: { type: 'boss', targetTermIds: questions.map((question) => question.targetTermId), questions, required: true } satisfies MissionStageDefinition, diagnostics }
}

export function evaluateMissionReadiness(terms: GameTerm[]): MissionReadiness {
  const totalTerms = terms.length
  const blocking: MissionDiagnostic[] = []
  const warnings: MissionDiagnostic[] = []
  if (totalTerms < 5) blocking.push({ code: 'INSUFFICIENT_TERMS', blocking: true, message: 'Mission cần tối thiểu 5 từ hợp lệ.' })
  const translatedTerms = terms.filter((term) => Boolean(term.translation?.trim()))
  const withTranslation = translatedTerms.length
  const uniqueTranslations = new Set(
    translatedTerms.map((term) => normalizeMissionAnswer(term.translation ?? '')),
  ).size
  const withAudio = terms.filter((term) => Boolean(term.audioUrl?.trim())).length
  const withExactCloze = terms.filter((term) => Boolean(findExactCloze(term))).length
  if (withTranslation < Math.min(5, totalTerms)) blocking.push({ code: 'MISSING_TRANSLATION', blocking: true, message: 'Không đủ từ có bản dịch để tạo stage bắt buộc.' })
  if (uniqueTranslations < Math.min(5, totalTerms)) blocking.push({ code: 'DUPLICATE_TRANSLATION', blocking: true, message: 'Không đủ bản dịch duy nhất để tạo Matching và Recall an toàn.' })
  if (withAudio < Math.min(3, totalTerms)) warnings.push({ code: 'MISSING_AUDIO', blocking: false, message: 'Coverage audio thấp; Listening Stage sẽ tự giảm câu hỏi.' })
  if (withExactCloze < Math.min(3, totalTerms)) warnings.push({ code: 'NO_EXACT_EXAMPLE_MATCH', blocking: false, message: 'Coverage cloze thấp; Context Stage có thể được rút gọn.' })
  return { playable: blocking.length === 0, blocking, warnings, coverage: { totalTerms, withTranslation, withAudio, withExactCloze } }
}

export function createMissionDefinition(input: { deckId: string; curriculumFingerprint: string; missionIndex: number; terms: GameTerm[]; scriptKey?: string }) {
  const scriptKey = input.scriptKey ?? 'standard'
  const seed = input.curriculumFingerprint + ':' + input.missionIndex
  const diagnostics: MissionDiagnostic[] = []
  const stages: MissionStageDefinition[] = [{
    type: 'learn',
    targetTermIds: input.terms.map((term) => term.globalTermId),
    questions: [],
    required: true,
  }]
  for (const config of STANDARD_STAGES) {
    const result = buildQuestionStage(config.type, config.count, config.required, input.terms, seed)
    diagnostics.push(...result.diagnostics)
    if (result.stage.questions.length > 0) stages.push(result.stage)
  }
  const boss = buildBossStage(input.terms, seed)
  diagnostics.push(...boss.diagnostics)
  stages.push(boss.stage)
  const definition: MissionDefinition = {
    deckId: input.deckId,
    curriculumFingerprint: input.curriculumFingerprint,
    missionIndex: input.missionIndex,
    targetTermIds: input.terms.map((term) => term.globalTermId),
    scriptKey,
    scriptVersion: STANDARD_SCRIPT_VERSION,
    generatorVersion: GENERATOR_VERSION,
    stages,
  }
  return { definition, diagnostics }
}

export function calculateMissionScore(
  definition: MissionDefinition,
  answers: Array<{ questionId: string; score: number; isCorrect: boolean; firstTryCorrect: boolean }>,
) {
  const questionIds = new Set(definition.stages.flatMap((stage) => stage.questions.map((question) => question.id)))
  const graded = answers.filter((answer) => questionIds.has(answer.questionId))
  if (graded.length === 0) return { score: 0, accuracy: 0, firstTryAccuracy: 0 }
  const totalScore = graded.reduce((sum, answer) => sum + answer.score, 0)
  const correct = graded.filter((answer) => answer.isCorrect).length
  const firstTry = graded.filter((answer) => answer.firstTryCorrect).length
  return {
    score: Math.round(totalScore / graded.length),
    accuracy: Math.round((correct / graded.length) * 100),
    firstTryAccuracy: Math.round((firstTry / graded.length) * 100),
  }
}
