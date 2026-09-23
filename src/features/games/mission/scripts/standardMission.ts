import type { MissionScript } from '../mission.types'

export const standardMissionScript: MissionScript = {
  key: 'standard',
  version: 1,
  stages: [
    { type: 'matching', questionCount: 5, required: true },
    { type: 'listening_choice', questionCount: 3, required: false },
    { type: 'listening_typing', questionCount: 2, required: false },
    { type: 'context_cloze', questionCount: 5, required: false },
    { type: 'meaning_recall', questionCount: 5, required: true },
  ],
  bossQuestionCount: 5,
}
