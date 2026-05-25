import { supabase } from '@/services/supabase/client'
import type { QuizResult } from '@/types/quiz.types'

export interface SaveQuizAnswer {
  userTermId: string
  question: string
  userAnswer: string
  correctAnswer: string
  isCorrect: boolean
}

export interface SaveQuizInput {
  userId: string
  deckId: string | null
  quizType: string
  totalQuestions: number
  correctAnswers: number
  wrongAnswers: number
  durationMs: number
  answers: SaveQuizAnswer[]
}

export const quizService = {
  async saveResult(input: SaveQuizInput): Promise<QuizResult> {
    const { data, error } = await supabase
      .from('quiz_results')
      .insert({
        user_id: input.userId,
        deck_id: input.deckId,
        quiz_type: input.quizType,
        total_questions: input.totalQuestions,
        correct_answers: input.correctAnswers,
        wrong_answers: input.wrongAnswers,
        duration_ms: input.durationMs,
      })
      .select('*')
      .single()
    if (error) throw error

    if (input.answers.length > 0) {
      const { error: answerError } = await supabase.from('quiz_answers').insert(
        input.answers.map((answer) => ({
          quiz_result_id: data.id,
          user_term_id: answer.userTermId,
          question: answer.question,
          user_answer: answer.userAnswer,
          correct_answer: answer.correctAnswer,
          is_correct: answer.isCorrect,
        })),
      )
      if (answerError) throw answerError
    }

    return data as QuizResult
  },

  async listRecentResults(userId: string): Promise<QuizResult[]> {
    const { data, error } = await supabase
      .from('quiz_results')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)
    if (error) throw error
    return (data ?? []) as QuizResult[]
  },

  async deleteResult(id: string): Promise<void> {
    const { error } = await supabase.from('quiz_results').delete().eq('id', id)
    if (error) throw error
  },

  async clearHistory(userId: string): Promise<void> {
    const { error } = await supabase.from('quiz_results').delete().eq('user_id', userId)
    if (error) throw error
  },

  async pruneHistory(userId: string): Promise<void> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const { error: oldError } = await supabase
      .from('quiz_results')
      .delete()
      .eq('user_id', userId)
      .lt('created_at', thirtyDaysAgo)
    if (oldError) throw oldError

    const { data } = await supabase
      .from('quiz_results')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (data && data.length > 30) {
      const idsToDelete = data.slice(30).map((row) => row.id)
      const { error } = await supabase.from('quiz_results').delete().in('id', idsToDelete)
      if (error) throw error
    }
  },
}
