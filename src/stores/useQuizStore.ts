import { create } from 'zustand'
import type { QuizType } from '@/types/quiz.types'
import type { SessionLimit } from '@/types/study.types'

const STORAGE_KEY = 'memorylang.quiz.preferences'

interface QuizPreferences {
  autoPlayAudio: boolean
  audioRate: number
  audioRepeat: number
  playAudioOnReveal: boolean
  playAudioOnCorrect: boolean
}

interface QuizState extends QuizPreferences {
  quizType: QuizType
  questionCount: SessionLimit
  selectedDeckId: string | null
  setQuizType: (quizType: QuizType) => void
  setQuestionCount: (questionCount: SessionLimit) => void
  setSelectedDeckId: (selectedDeckId: string | null) => void
  setAutoPlayAudio: (autoPlayAudio: boolean) => void
  setAudioRate: (audioRate: number) => void
  setAudioRepeat: (audioRepeat: number) => void
  setPlayAudioOnReveal: (playAudioOnReveal: boolean) => void
  setPlayAudioOnCorrect: (playAudioOnCorrect: boolean) => void
}

const defaultPreferences: QuizPreferences = {
  autoPlayAudio: false,
  audioRate: 1,
  audioRepeat: 1,
  playAudioOnReveal: false,
  playAudioOnCorrect: false,
}

function loadPreferences(): QuizPreferences {
  if (typeof window === 'undefined') return { ...defaultPreferences }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaultPreferences }
    const parsed = JSON.parse(raw)
    return {
      autoPlayAudio: typeof parsed.autoPlayAudio === 'boolean' ? parsed.autoPlayAudio : defaultPreferences.autoPlayAudio,
      audioRate: typeof parsed.audioRate === 'number' && parsed.audioRate >= 0.5 && parsed.audioRate <= 2 ? parsed.audioRate : defaultPreferences.audioRate,
      audioRepeat: typeof parsed.audioRepeat === 'number' && parsed.audioRepeat >= 1 && parsed.audioRepeat <= 3 ? Math.round(parsed.audioRepeat) : defaultPreferences.audioRepeat,
      playAudioOnReveal: typeof parsed.playAudioOnReveal === 'boolean' ? parsed.playAudioOnReveal : defaultPreferences.playAudioOnReveal,
      playAudioOnCorrect: typeof parsed.playAudioOnCorrect === 'boolean' ? parsed.playAudioOnCorrect : defaultPreferences.playAudioOnCorrect,
    }
  } catch {
    return { ...defaultPreferences }
  }
}

function savePreferences(state: QuizPreferences) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // storage failures are non-critical
  }
}

const preferences = loadPreferences()

function audioPrefs(state: QuizState): QuizPreferences {
  return {
    autoPlayAudio: state.autoPlayAudio,
    audioRate: state.audioRate,
    audioRepeat: state.audioRepeat,
    playAudioOnReveal: state.playAudioOnReveal,
    playAudioOnCorrect: state.playAudioOnCorrect,
  }
}

export const useQuizStore = create<QuizState>((set) => ({
  quizType: 'translation_input',
  questionCount: 10,
  selectedDeckId: null,
  ...preferences,
  setQuizType: (quizType) => set({ quizType }),
  setQuestionCount: (questionCount) => set({ questionCount }),
  setSelectedDeckId: (selectedDeckId) => set({ selectedDeckId }),
  setAutoPlayAudio: (autoPlayAudio) => {
    set((state) => { savePreferences(audioPrefs({ ...state, autoPlayAudio })); return { autoPlayAudio } })
  },
  setAudioRate: (audioRate) => {
    set((state) => { savePreferences(audioPrefs({ ...state, audioRate })); return { audioRate } })
  },
  setAudioRepeat: (audioRepeat) => {
    set((state) => { savePreferences(audioPrefs({ ...state, audioRepeat })); return { audioRepeat } })
  },
  setPlayAudioOnReveal: (playAudioOnReveal) => {
    set((state) => { savePreferences(audioPrefs({ ...state, playAudioOnReveal })); return { playAudioOnReveal } })
  },
  setPlayAudioOnCorrect: (playAudioOnCorrect) => {
    set((state) => { savePreferences(audioPrefs({ ...state, playAudioOnCorrect })); return { playAudioOnCorrect } })
  },
}))
