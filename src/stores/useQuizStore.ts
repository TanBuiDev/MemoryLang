import { create } from 'zustand'
import type { QuizType } from '@/types/quiz.types'

interface QuizState {
  quizType: QuizType
  questionCount: number
  setQuizType: (quizType: QuizType) => void
  setQuestionCount: (questionCount: number) => void
}

export const useQuizStore = create<QuizState>((set) => ({
  quizType: 'true_false',
  questionCount: 10,
  setQuizType: (quizType) => set({ quizType }),
  setQuestionCount: (questionCount) => set({ questionCount }),
}))
