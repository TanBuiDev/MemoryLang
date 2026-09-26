import { describe, expect, it } from 'vitest'
import {
  BOSS_BATTLE_THEMES,
  DEFAULT_BOSS_BATTLE_THEME,
  FALLBACK_BOSS,
  FALLBACK_BOSS_BACKGROUND,
  getBossBattleTheme,
} from './bossBattleThemes'

describe('bossBattleThemes', () => {
  it('defines four complete theme pairs in the expected order', () => {
    expect(BOSS_BATTLE_THEMES.map((theme) => theme.id)).toEqual([
      'forest-sunlit-enchanted',
      'forest-peaceful-shrine',
      'meadow-rpg-mountains',
      'valley-snowy-mountains',
    ])

    for (const theme of BOSS_BATTLE_THEMES) {
      expect(theme.background.desktop).toContain(theme.id)
      expect(theme.background.desktop.endsWith('-desktop.webp')).toBe(true)
      expect(theme.background.mobile).toContain(theme.id)
      expect(theme.background.mobile.endsWith('-mobile.webp')).toBe(true)
      expect(theme.boss.image).toContain(theme.id)
      expect(theme.boss.image.endsWith('.webp')).toBe(true)
      expect(theme.boss.name.length).toBeGreaterThan(0)
    }
  })

  it('rotates deterministically by zero-based mission index', () => {
    expect(getBossBattleTheme(0).id).toBe('forest-sunlit-enchanted')
    expect(getBossBattleTheme(1).id).toBe('forest-peaceful-shrine')
    expect(getBossBattleTheme(2).id).toBe('meadow-rpg-mountains')
    expect(getBossBattleTheme(3).id).toBe('valley-snowy-mountains')
    expect(getBossBattleTheme(4).id).toBe('forest-sunlit-enchanted')
    expect(getBossBattleTheme(7).id).toBe('valley-snowy-mountains')
    expect(getBossBattleTheme(8).id).toBe('forest-sunlit-enchanted')
  })

  it('always returns one coherent background and boss theme', () => {
    for (let missionIndex = 0; missionIndex < 20; missionIndex += 1) {
      const theme = getBossBattleTheme(missionIndex)
      expect(theme.background.desktop).toContain(theme.id)
      expect(theme.background.mobile).toContain(theme.id)
      expect(theme.boss.image).toContain(theme.id)
    }
  })

  it('falls back safely for invalid mission indices', () => {
    expect(getBossBattleTheme(undefined)).toEqual(DEFAULT_BOSS_BATTLE_THEME)
    expect(getBossBattleTheme(null)).toEqual(DEFAULT_BOSS_BATTLE_THEME)
    expect(getBossBattleTheme(Number.NaN)).toEqual(DEFAULT_BOSS_BATTLE_THEME)
    expect(getBossBattleTheme(Number.POSITIVE_INFINITY)).toEqual(
      DEFAULT_BOSS_BATTLE_THEME,
    )
    expect(getBossBattleTheme(-1)).toEqual(DEFAULT_BOSS_BATTLE_THEME)
  })

  it('keeps the legacy Rune Beetle and SVG arena as resilient fallbacks', () => {
    expect(FALLBACK_BOSS_BACKGROUND.endsWith('forest-arena.svg')).toBe(true)
    expect(FALLBACK_BOSS.name).toBe('Rune Beetle')
    expect(FALLBACK_BOSS.states.idle.endsWith('rune-beetle-idle.svg')).toBe(true)
    expect(FALLBACK_BOSS.states.hit.endsWith('rune-beetle-hit.svg')).toBe(true)
    expect(FALLBACK_BOSS.states.attack.endsWith('rune-beetle-attack.svg')).toBe(true)
    expect(FALLBACK_BOSS.states.finisher.endsWith(
      'rune-beetle-finisher-hit.svg',
    )).toBe(true)
    expect(FALLBACK_BOSS.states.defeated.endsWith(
      'rune-beetle-defeated.svg',
    )).toBe(true)
  })
})
