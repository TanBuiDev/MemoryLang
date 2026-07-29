export function shouldChallengeMfa(levels: {
  currentLevel: string | null
  nextLevel: string | null
}): boolean {
  return levels.currentLevel === 'aal1' && levels.nextLevel === 'aal2'
}
