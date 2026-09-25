import type { AnswerRecord, MissionAttemptState } from './mission.types'

export type MissionAttemptAction =
  | { type: 'restore'; state: MissionAttemptState }
  | { type: 'transition'; stageIndex: number; questionIndex: number; at: string }
  | { type: 'recordAnswers'; answers: AnswerRecord[]; at: string }
  | { type: 'enqueueRetry'; questionId: string; at: string }
  | { type: 'setDraft'; draft: NonNullable<MissionAttemptState['draft']>; at: string }
  | { type: 'complete'; at: string }

export function shouldAutoSyncMission(
  completed: boolean,
  hasResult: boolean,
  progressSynced: boolean,
  initialSaveInFlight: boolean,
  hasError = false,
) {
  return completed && hasResult && !progressSynced && !initialSaveInFlight && !hasError
}

export function missionAttemptReducer(
  state: MissionAttemptState | null,
  action: MissionAttemptAction,
): MissionAttemptState | null {
  if (action.type === 'restore') return action.state
  if (!state) return state

  if (action.type === 'transition') {
    if (action.stageIndex < 0 || action.questionIndex < 0) return state
    const isNewStage = action.stageIndex !== state.stageIndex
    return {
      ...state,
      stageIndex: action.stageIndex,
      questionIndex: action.questionIndex,
      retryQueue: isNewStage ? undefined : state.retryQueue,
      draft: undefined,
      updatedAt: action.at,
    }
  }

  if (action.type === 'enqueueRetry') {
    const queue = state.retryQueue ?? []
    const count = queue.filter((id) => id === action.questionId).length
    if (count >= 3) return state
    return {
      ...state,
      retryQueue: [...queue, action.questionId],
      updatedAt: action.at,
    }
  }

  if (action.type === 'recordAnswers') {
    const incomingIds = new Set(action.answers.map((answer) => answer.questionId))
    return {
      ...state,
      answers: [
        ...state.answers.filter((answer) => !incomingIds.has(answer.questionId)),
        ...action.answers,
      ],
      updatedAt: action.at,
    }
  }

  if (action.type === 'setDraft') {
    return { ...state, draft: action.draft, updatedAt: action.at }
  }

  return {
    ...state,
    status: 'completed',
    updatedAt: action.at,
  }
}
