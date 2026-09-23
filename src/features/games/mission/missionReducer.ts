import type { AnswerRecord, MissionAttemptState } from './mission.types'

export type MissionAttemptAction =
  | { type: 'restore'; state: MissionAttemptState }
  | { type: 'transition'; stageIndex: number; questionIndex: number; at: string }
  | { type: 'recordAnswers'; answers: AnswerRecord[]; at: string }
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
    return {
      ...state,
      stageIndex: action.stageIndex,
      questionIndex: action.questionIndex,
      draft: undefined,
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
