import { supabase } from '@/services/supabase/client'
import type { ReviewAction } from '@/utils/spacedRepetition'
import { scheduleReview } from '@/utils/spacedRepetition'
import type { StudyMode, StudySession } from '@/types/study.types'
import type { VocabularyItem } from '@/types/vocabulary.types'

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
  async applyReviewAction(item: VocabularyItem, action: ReviewAction) {
    const result = scheduleReview(action, { correctCount: item.correct_count, wrongCount: item.wrong_count })
    const { error } = await supabase
      .from('user_terms')
      .update({
        correct_count: item.correct_count + result.correctIncrement,
        wrong_count: item.wrong_count + result.wrongIncrement,
        view_count: item.view_count + 1,
        status: result.status,
        last_reviewed_at: new Date().toISOString(),
        next_review_at: result.nextReviewAt.toISOString(),
      })
      .eq('id', item.id)
    if (error) throw error
    return result
  },
  async endSession(sessionId: string, patch: Partial<StudySession>) {
    const { error } = await supabase
      .from('study_sessions')
      .update({ ...patch, ended_at: new Date().toISOString() })
      .eq('id', sessionId)
    if (error) throw error
  },
}
