import type { PendingReviewAction } from '@/services/local/studyLocalDb'
import { scheduleReview, type ReviewAction, type ReviewSnapshot } from '@/utils/spacedRepetition'
import type { AnswerRecord } from './mission.types'

const RECALL_TYPES = new Set(['listening_typing', 'context_cloze', 'meaning_recall', 'spelling'])
export interface TermReviewSnapshot extends ReviewSnapshot { globalTermId: string }

function chooseAction(records: AnswerRecord[]): ReviewAction | null {
  const graded = records.filter((record) => RECALL_TYPES.has(record.type) || record.type === 'matching' || record.type === 'listening_choice')
  if (graded.length === 0) return null
  if (graded.some((record) => !record.isCorrect)) return 'dont_know'
  if (graded.some((record) => record.hintLevel > 0 || record.attempts > 1)) return 'difficult'
  const recallRecords = graded.filter((record) => RECALL_TYPES.has(record.type))
  if (recallRecords.length > 0 && recallRecords.every((record) => record.firstTryCorrect)) return 'know'
  return 'difficult'
}

export function buildMissionReviewActions(
  answers: AnswerRecord[],
  snapshots: Map<string, TermReviewSnapshot>,
  now = new Date(),
): PendingReviewAction[] {
  const byTerm = new Map<string, AnswerRecord[]>()
  for (const answer of answers) {
    const list = byTerm.get(answer.targetTermId) ?? []
    list.push(answer)
    byTerm.set(answer.targetTermId, list)
  }
  const pending: PendingReviewAction[] = []
  for (const [globalTermId, records] of byTerm) {
    const action = chooseAction(records)
    if (!action) continue
    const snapshot = snapshots.get(globalTermId) ?? {
      globalTermId,
      correctCount: 0,
      wrongCount: 0,
      repetition: 0,
      intervalDays: 0,
      easeFactor: 2.5,
    }
    const result = scheduleReview(action, snapshot, now)
    pending.push({
      termId: globalTermId,
      action,
      reviewedAt: now.toISOString(),
      result: {
        status: result.status,
        nextReviewAt: result.nextReviewAt.toISOString(),
        correctIncrement: result.correctIncrement,
        wrongIncrement: result.wrongIncrement,
        repetition: result.repetition,
        intervalDays: result.intervalDays,
        easeFactor: result.easeFactor,
      },
    })
  }
  return pending
}
