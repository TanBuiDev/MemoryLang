import { create } from 'zustand'
import type { QuizType } from '@/types/quiz.types'
import type { SessionLimit } from '@/types/study.types'

interface QuizState {
  quizType: QuizType
  questionCount: SessionLimit
  selectedDeckId: string | null
  setQuizType: (quizType: QuizType) => void
  setQuestionCount: (questionCount: SessionLimit) => void
  setSelectedDeckId: (selectedDeckId: string | null) => void
}

export const useQuizStore = create<QuizState>((set) => ({
  quizType: 'translation_input',
  questionCount: 10,
  selectedDeckId: null,
  setQuizType: (quizType) => set({ quizType }),
  setQuestionCount: (questionCount) => set({ questionCount }),
  setSelectedDeckId: (selectedDeckId) => set({ selectedDeckId }),
}))
