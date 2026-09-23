import { buildMissionReviewActions } from '@/features/games/mission/missionSrsAdapter'
import type { MissionAttemptState } from '@/features/games/mission/mission.types'
import {
  gameMissionAttemptKey,
  gameMissionLocalDb,
  type StoredGameMissionAttempt,
} from '@/services/local/gameMissionLocalDb'
import { gameMissionService } from '@/services/supabase/gameMission.service'
import { studyService } from '@/services/supabase/study.service'

export interface MissionCompletionStats {
  score: number
  accuracy: number
  firstTryAccuracy: number
}

interface SyncMissionCompletionInput {
  userId: string
  deckId: string
  curriculumFingerprint: string
  missionIndex: number
  studySessionId: string | null
  state: MissionAttemptState
  stats: MissionCompletionStats
  missionTermIds: string[]
}

export const gameMissionSyncService = {
  async syncCompletion(input: SyncMissionCompletionInput) {
    let record = await gameMissionLocalDb.getAttempt(
      input.userId,
      input.deckId,
      input.curriculumFingerprint,
      input.missionIndex,
    )

    if (!record) {
      record = {
        key: gameMissionAttemptKey(
          input.userId,
          input.deckId,
          input.curriculumFingerprint,
          input.missionIndex,
        ),
        userId: input.userId,
        deckId: input.deckId,
        curriculumFingerprint: input.curriculumFingerprint,
        missionIndex: input.missionIndex,
        studySessionId: input.studySessionId,
        state: input.state,
        pendingResult: input.stats,
        updatedAt: new Date().toISOString(),
      }
      await gameMissionLocalDb.saveAttempt(record)
    }

    const checkpoint = async (patch: Partial<StoredGameMissionAttempt>) => {
      record = {
        ...record!,
        ...patch,
        state: input.state,
        pendingResult: input.stats,
        updatedAt: new Date().toISOString(),
      }
      await gameMissionLocalDb.saveAttempt(record)
    }

    if (!record.srsSynced) {
      const snapshots = await gameMissionService.getReviewSnapshots(input.userId, input.missionTermIds)
      const actions = buildMissionReviewActions(input.state.answers, snapshots)
      const correctCount = input.state.answers.filter((item) => item.isCorrect).length
      const difficultCount = input.state.answers.filter(
        (item) => item.hintLevel > 0 || !item.isCorrect,
      ).length

      await studyService.flushStudyChanges({
        actions,
        viewedTermIds: input.missionTermIds,
        sessionId: input.studySessionId,
        sessionPatch: input.studySessionId
          ? {
              total_cards: input.state.answers.length,
              viewed_cards: input.state.answers.length,
              remembered_count: correctCount,
              difficult_count: difficultCount,
            }
          : null,
      })
      await checkpoint({ srsSynced: true })
    }

    if (input.studySessionId && !record.studySessionEnded) {
      await studyService.endSession(input.studySessionId, {
        total_cards: input.state.answers.length,
        viewed_cards: input.state.answers.length,
        remembered_count: input.state.answers.filter((item) => item.isCorrect).length,
        difficult_count: input.state.answers.filter(
          (item) => item.hintLevel > 0 || !item.isCorrect,
        ).length,
      })
      await checkpoint({ srsSynced: true, studySessionEnded: true })
    }

    if (!record.progressSynced) {
      await gameMissionService.completeMission(
        input.deckId,
        input.curriculumFingerprint,
        input.missionIndex,
        input.stats.score,
        input.stats.accuracy,
      )
      await checkpoint({
        srsSynced: true,
        studySessionEnded: true,
        progressSynced: true,
      })
    }

    await gameMissionLocalDb.clearAttempt(
      input.userId,
      input.deckId,
      input.curriculumFingerprint,
      input.missionIndex,
    )

    return {
      srsSynced: true,
      studySessionEnded: true,
      progressSynced: true,
    } as const
  },
}
