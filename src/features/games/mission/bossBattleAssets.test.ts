import { describe, expect, it } from 'vitest'
import {
  BOSS_BACKGROUND_THEMES,
  FALLBACK_BOSS_BACKGROUND,
  getBossBackgroundTheme,
  getBossBackgroundThemeByMissionNumber,
} from './bossBattleAssets'

describe('bossBattleAssets', () => {
  describe('BOSS_BACKGROUND_THEMES definition', () => {
    it('defines exactly 4 themes in the specified order', () => {
      expect(BOSS_BACKGROUND_THEMES).toHaveLength(4)
      expect(BOSS_BACKGROUND_THEMES.map((theme) => theme.id)).toEqual([
        'forest-sunlit-enchanted',
        'forest-peaceful-shrine',
        'meadow-rpg-mountains',
        'valley-snowy-mountains',
      ])
    })

    it('each theme provides matching desktop and mobile webp paths', () => {
      for (const theme of BOSS_BACKGROUND_THEMES) {
        expect(theme.desktop).toBe(`/game/boss-battle/art/backgrounds/webp/${theme.id}-desktop.webp`)
        expect(theme.mobile).toBe(`/game/boss-battle/art/backgrounds/webp/${theme.id}-mobile.webp`)
      }
    })

    it('defines a valid fallback svg path', () => {
      expect(FALLBACK_BOSS_BACKGROUND).toBe('/game/boss-battle/art/backgrounds/forest-arena.svg')
    })
  })

  describe('getBossBackgroundTheme (zero-based index)', () => {
    it('maps zero-based mission index to themes deterministically', () => {
      // Mission 1 (index 0) -> forest-sunlit-enchanted
      expect(getBossBackgroundTheme(0).id).toBe('forest-sunlit-enchanted')
      // Mission 2 (index 1) -> forest-peaceful-shrine
      expect(getBossBackgroundTheme(1).id).toBe('forest-peaceful-shrine')
      // Mission 3 (index 2) -> meadow-rpg-mountains
      expect(getBossBackgroundTheme(2).id).toBe('meadow-rpg-mountains')
      // Mission 4 (index 3) -> valley-snowy-mountains
      expect(getBossBackgroundTheme(3).id).toBe('valley-snowy-mountains')
      // Mission 5 (index 4) -> forest-sunlit-enchanted
      expect(getBossBackgroundTheme(4).id).toBe('forest-sunlit-enchanted')
      // Mission 8 (index 7) -> valley-snowy-mountains
      expect(getBossBackgroundTheme(7).id).toBe('valley-snowy-mountains')
      // Mission 9 (index 8) -> forest-sunlit-enchanted
      expect(getBossBackgroundTheme(8).id).toBe('forest-sunlit-enchanted')
    })

    it('ensures desktop and mobile belong to the exact same theme', () => {
      for (let index = 0; index < 12; index++) {
        const theme = getBossBackgroundTheme(index)
        expect(theme.desktop).toContain(theme.id)
        expect(theme.mobile).toContain(theme.id)
      }
    })

    it('handles edge cases gracefully by falling back to theme 1', () => {
      expect(getBossBackgroundTheme(undefined).id).toBe('forest-sunlit-enchanted')
      expect(getBossBackgroundTheme(null).id).toBe('forest-sunlit-enchanted')
      expect(getBossBackgroundTheme(Number.NaN).id).toBe('forest-sunlit-enchanted')
      expect(getBossBackgroundTheme(-1).id).toBe('forest-sunlit-enchanted')
      expect(getBossBackgroundTheme(-100).id).toBe('forest-sunlit-enchanted')
      expect(getBossBackgroundTheme(Number.POSITIVE_INFINITY).id).toBe('forest-sunlit-enchanted')
    })

    it('floors floating-point mission indices', () => {
      expect(getBossBackgroundTheme(2.9).id).toBe('meadow-rpg-mountains')
      expect(getBossBackgroundTheme(3.1).id).toBe('valley-snowy-mountains')
    })

    it('is completely deterministic and repeatable across multiple calls', () => {
      const firstCall = getBossBackgroundTheme(2)
      const secondCall = getBossBackgroundTheme(2)
      const thirdCall = getBossBackgroundTheme(2)
      expect(firstCall).toEqual(secondCall)
      expect(secondCall).toEqual(thirdCall)
    })
  })

  describe('getBossBackgroundThemeByMissionNumber (one-based number)', () => {
    it('maps one-based mission numbers correctly', () => {
      expect(getBossBackgroundThemeByMissionNumber(1).id).toBe('forest-sunlit-enchanted')
      expect(getBossBackgroundThemeByMissionNumber(2).id).toBe('forest-peaceful-shrine')
      expect(getBossBackgroundThemeByMissionNumber(3).id).toBe('meadow-rpg-mountains')
      expect(getBossBackgroundThemeByMissionNumber(4).id).toBe('valley-snowy-mountains')
      expect(getBossBackgroundThemeByMissionNumber(5).id).toBe('forest-sunlit-enchanted')
      expect(getBossBackgroundThemeByMissionNumber(8).id).toBe('valley-snowy-mountains')
      expect(getBossBackgroundThemeByMissionNumber(9).id).toBe('forest-sunlit-enchanted')
    })

    it('handles invalid numbers by falling back to theme 1', () => {
      expect(getBossBackgroundThemeByMissionNumber(0).id).toBe('forest-sunlit-enchanted')
      expect(getBossBackgroundThemeByMissionNumber(-1).id).toBe('forest-sunlit-enchanted')
      expect(getBossBackgroundThemeByMissionNumber(Number.NaN).id).toBe('forest-sunlit-enchanted')
      expect(getBossBackgroundThemeByMissionNumber(undefined).id).toBe('forest-sunlit-enchanted')
      expect(getBossBackgroundThemeByMissionNumber(null).id).toBe('forest-sunlit-enchanted')
    })
  })
})
