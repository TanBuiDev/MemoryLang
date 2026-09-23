import type { StudyMode } from '@/types/study.types'

export const studyModeLabels: Record<StudyMode, string> = {
  two_side: 'Two-side card',
  one_side: 'One-side card',
  quick_flash: 'Quick Flash',
  audio_only: 'Audio-only',
  meaning_first: 'Meaning-first',
  ipa_first: 'IPA-first',
  example_first: 'Example-first',
  game_mission: 'Game Mission',
}

export const mvpStudyModes: StudyMode[] = ['two_side', 'one_side']
