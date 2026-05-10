import { supabase } from '@/services/supabase/client'
import type { QuizType, TrueFalseQuestion } from '@/types/quiz.types'

export interface SaveQuizInput {
  userId: string
  deckId: string | null
  quizType: QuizType
  durationMs: number
  answers: Array<{ question: TrueFalseQuestion; userAnswer: boolean }>
}

export const quizService = {
  async saveResult(input: SaveQuizInput) {
    const correct = input.answers.filter((answer) => answer.userAnswer === answer.question.expectedAnswer)
    const wrong = input.answers.length - correct.length
    const { data, error } = await supabase
      .from('quiz_results')
      .insert({
        user_id: input.userId,
        deck_id: input.deckId,
        quiz_type: input.quizType,
        total_questions: input.answers.length,
        correct_answers: correct.length,
        wrong_answers: wrong,
        duration_ms: input.durationMs,
      })
      .select('*')
      .single()
    if (error) throw error

    const { error: answerError } = await supabase.from('quiz_answers').insert(
      input.answers.map((answer) => ({
        quiz_result_id: data.id,
        user_term_id: answer.question.userTermId,
        question: answer.question.prompt,
        user_answer: String(answer.userAnswer),
        correct_answer: String(answer.question.expectedAnswer),
        is_correct: answer.userAnswer === answer.question.expectedAnswer,
      })),
    )
    if (answerError) throw answerError
    return data
  },
}
