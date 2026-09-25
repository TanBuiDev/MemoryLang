import type { AnswerRecord } from './mission.types'

export const BOSS_PLAYER_MAX_HP = 5

export interface BossBattleSnapshot {
  bossMaxHp: number
  bossHp: number
  bossHpPercent: number
  playerMaxHp: number
  playerHp: number
  playerHpPercent: number
  correctHits: number
  wrongHits: number
  skillPercent: number
  skillReady: boolean
  defeated: boolean
}

export function calculateBossBattleSnapshot(
  questionIds: string[],
  answers: AnswerRecord[],
): BossBattleSnapshot {
  const ids = new Set(questionIds)
  const latest = new Map<string, AnswerRecord>()

  for (const answer of answers) {
    if (ids.has(answer.questionId)) latest.set(answer.questionId, answer)
  }

  const resolved = [...latest.values()]
  const correctHits = resolved.filter((answer) => answer.isCorrect).length
  const wrongHits = resolved.reduce((sum, answer) => {
    const attempts = Math.max(1, answer.attempts)
    return sum + Math.max(0, attempts - (answer.isCorrect ? 1 : 0))
  }, 0)

  const bossMaxHp = Math.max(1, questionIds.length)
  const bossHp = Math.max(0, bossMaxHp - correctHits)
  const playerMaxHp = BOSS_PLAYER_MAX_HP
  const playerHp = Math.max(0, playerMaxHp - wrongHits)
  const finisherChargeTarget = Math.max(1, bossMaxHp - 1)
  const skillPercent = Math.min(100, Math.round((correctHits / finisherChargeTarget) * 100))
  const skillReady = bossHp === 1 && correctHits >= bossMaxHp - 1

  return {
    bossMaxHp,
    bossHp,
    bossHpPercent: Math.round((bossHp / bossMaxHp) * 100),
    playerMaxHp,
    playerHp,
    playerHpPercent: Math.round((playerHp / playerMaxHp) * 100),
    correctHits,
    wrongHits,
    skillPercent,
    skillReady,
    defeated: bossHp === 0,
  }
}
