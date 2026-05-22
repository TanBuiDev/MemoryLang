import { studyLocalDb } from '@/services/local/studyLocalDb'
import { studyService } from '@/services/supabase/study.service'

export const studySyncService = {
  async flushPendingStudyChanges(userId: string) {
    const pending = await studyLocalDb.getPendingStudyChanges(userId)
    const hasChanges = pending.actions.length > 0 || pending.viewedTermIds.length > 0 || Boolean(pending.sessionPatch)
    if (!hasChanges) return false

    await studyService.flushStudyChanges({
      actions: pending.actions,
      viewedTermIds: pending.viewedTermIds,
      sessionId: pending.sessionId,
      sessionPatch: pending.sessionPatch,
    })
    await studyLocalDb.clearPendingStudyChanges(userId)
    return true
  },
}
