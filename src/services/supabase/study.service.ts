import { supabase } from '@/services/supabase/client'
import type { PendingReviewAction } from '@/services/local/studyLocalDb'
import type { ReviewAction } from '@/utils/spacedRepetition'
import { scheduleReview } from '@/utils/spacedRepetition'
import type { StudyMode, StudySession } from '@/types/study.types'
import type { VocabularyItem } from '@/types/vocabulary.types'

interface FlushStudyChangesInput {
  actions: PendingReviewAction[]
  viewedTermIds: string[]
  sessionId?: string | null
  sessionPatch?: Partial<StudySession> | null
}

export const studyService = {
  async createSession(userId: string, mode: StudyMode, deckId: string | null, totalCards: number): Promise<StudySession> {
    const { data, error } = await supabase
      .from('study_sessions')
      .insert({ user_id: userId, mode, deck_id: deckId, total_cards: totalCards })
      .select('*')
      .single()
    if (error) throw error
    return data as StudySession
  },
  async listRecentSessions(userId: string, limit = 30): Promise<StudySession[]> {
    const { data, error } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data as StudySession[]
  },
  async applyReviewAction(item: VocabularyItem, action: ReviewAction) {
    const result = scheduleReview(action, {
      correctCount: item.correct_count,
      wrongCount: item.wrong_count,
      repetition: item.srs_repetition,
      intervalDays: item.srs_interval_days,
      easeFactor: item.srs_ease_factor,
    })
    const { error } = await supabase
      .from('user_terms')
      .update({
        correct_count: item.correct_count + result.correctIncrement,
        wrong_count: item.wrong_count + result.wrongIncrement,
        srs_repetition: result.repetition,
        srs_interval_days: result.intervalDays,
        srs_ease_factor: result.easeFactor,
        status: result.status,
        last_reviewed_at: new Date().toISOString(),
        next_review_at: result.nextReviewAt.toISOString(),
      })
      .eq('id', item.id)
    if (error) throw error
    return result
  },
  async flushStudyChanges({ actions, viewedTermIds, sessionId, sessionPatch }: FlushStudyChangesInput) {
    const uniqueViewedTermIds = Array.from(new Set(viewedTermIds)).filter(Boolean)
    const rpcActions = actions.map((entry) => ({
      term_id: entry.termId,
      action: entry.action,
      reviewed_at: entry.reviewedAt,
      status: entry.result.status,
      next_review_at: entry.result.nextReviewAt,
      correct_increment: entry.result.correctIncrement,
      wrong_increment: entry.result.wrongIncrement,
      srs_repetition: entry.result.repetition,
      srs_interval_days: entry.result.intervalDays,
      srs_ease_factor: entry.result.easeFactor,
    }))

    if (rpcActions.length === 0 && uniqueViewedTermIds.length === 0 && !sessionPatch) return

    const { error } = await supabase
      .rpc('apply_study_review_batch', {
        actions: rpcActions,
        viewed_term_ids: uniqueViewedTermIds,
        session_patch: sessionPatch
          ? {
              session_id: sessionId,
              total_cards: sessionPatch.total_cards,
              viewed_cards: sessionPatch.viewed_cards,
              remembered_count: sessionPatch.remembered_count,
              difficult_count: sessionPatch.difficult_count,
            }
          : null,
      })
    if (error) throw error
  },
  async flushTermViews(termIds: string[]) {
    const uniqueIds = Array.from(new Set(termIds)).filter(Boolean)
    if (uniqueIds.length === 0) return

    const { error } = await supabase
      .rpc('increment_term_view_counts', { term_ids: uniqueIds })
    if (error) throw error
  },
  async endSession(sessionId: string, patch: Partial<StudySession>) {
    const { error } = await supabase
      .from('study_sessions')
      .update({ ...patch, ended_at: new Date().toISOString() })
      .eq('id', sessionId)
    if (error) throw error
  },
  async deleteSession(sessionId: string) {
    const { error } = await supabase
      .from('study_sessions')
      .delete()
      .eq('id', sessionId)
    if (error) throw error
  },
  async clearHistory(userId: string) {
    const { error } = await supabase
      .from('study_sessions')
      .delete()
      .eq('user_id', userId)
    if (error) throw error
  },
  async pruneHistory(userId: string, keep = 30) {
    const { data, error } = await supabase
      .from('study_sessions')
      .select('id')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .range(keep, 1000)
    if (error) throw error

    const ids = (data ?? []).map((session) => session.id).filter(Boolean)
    if (ids.length === 0) return

    const { error: deleteError } = await supabase
      .from('study_sessions')
      .delete()
      .in('id', ids)
    if (deleteError) throw deleteError
  },
}
