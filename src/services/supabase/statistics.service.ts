import { supabase } from '@/services/supabase/client'

export interface DashboardStats {
  totalVocabulary: number
  memorizedWords: number
  difficultWords: number
  reviewDue: number
  deckCount: number
  quizCount: number
  averageAccuracy: number
}

export const statisticsService = {
  async getDashboardStats(userId: string): Promise<DashboardStats> {
    const [{ data: terms }, { data: decks }, { data: quizzes }] = await Promise.all([
      supabase.from('user_terms').select('status,next_review_at,correct_count,wrong_count').eq('user_id', userId),
      supabase.from('decks').select('id').eq('user_id', userId),
      supabase.from('quiz_results').select('correct_answers,total_questions').eq('user_id', userId),
    ])
    const now = Date.now()
    const allTerms = terms ?? []
    const totals = (quizzes ?? []).reduce(
      (acc, quiz) => ({ correct: acc.correct + quiz.correct_answers, total: acc.total + quiz.total_questions }),
      { correct: 0, total: 0 },
    )

    return {
      totalVocabulary: allTerms.length,
      memorizedWords: allTerms.filter((term) => term.status === 'memorized').length,
      difficultWords: allTerms.filter((term) => term.status === 'difficult').length,
      reviewDue: allTerms.filter((term) => term.next_review_at && new Date(term.next_review_at).getTime() <= now).length,
      deckCount: decks?.length ?? 0,
      quizCount: quizzes?.length ?? 0,
      averageAccuracy: totals.total ? Math.round((totals.correct / totals.total) * 100) : 0,
    }
  },
}
