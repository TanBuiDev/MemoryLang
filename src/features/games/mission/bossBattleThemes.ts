export const BOSS_BATTLE_THEME_IDS = [
  'forest-sunlit-enchanted',
  'forest-peaceful-shrine',
  'meadow-rpg-mountains',
  'valley-snowy-mountains',
] as const

export type BossBattleThemeId = (typeof BOSS_BATTLE_THEME_IDS)[number]

export interface BossBattleTheme {
  id: BossBattleThemeId
  name: string
  background: {
    desktop: string
    mobile: string
  }
  boss: {
    name: string
    image: string
  }
}

export const FALLBACK_BOSS_BACKGROUND =
  '/game/boss-battle/art/backgrounds/forest-arena.svg'

export const FALLBACK_BOSS = {
  name: 'Rune Beetle',
  states: {
    idle: '/game/boss-battle/art/boss/rune-beetle-idle.svg',
    hit: '/game/boss-battle/art/boss/rune-beetle-hit.svg',
    attack: '/game/boss-battle/art/boss/rune-beetle-attack.svg',
    defeated: '/game/boss-battle/art/boss/rune-beetle-defeated.svg',
    finisher: '/game/boss-battle/art/boss/rune-beetle-finisher-hit.svg',
  },
} as const

export const BOSS_BATTLE_THEMES: readonly BossBattleTheme[] = [
  {
    id: 'forest-sunlit-enchanted',
    name: 'Khu rừng nắng mê hoặc',
    background: {
      desktop:
        '/game/boss-battle/art/backgrounds/webp/forest-sunlit-enchanted-desktop.webp',
      mobile:
        '/game/boss-battle/art/backgrounds/webp/forest-sunlit-enchanted-mobile.webp',
    },
    boss: {
      name: 'Sunleaf Guardian',
      image:
        '/game/boss-battle/art/bosses/forest-sunlit-enchanted.webp',
    },
  },
  {
    id: 'forest-peaceful-shrine',
    name: 'Đền rừng thanh bình',
    background: {
      desktop:
        '/game/boss-battle/art/backgrounds/webp/forest-peaceful-shrine-desktop.webp',
      mobile:
        '/game/boss-battle/art/backgrounds/webp/forest-peaceful-shrine-mobile.webp',
    },
    boss: {
      name: 'Shrine Warden',
      image:
        '/game/boss-battle/art/bosses/forest-peaceful-shrine.webp',
    },
  },
  {
    id: 'meadow-rpg-mountains',
    name: 'Đồng cỏ dưới chân núi',
    background: {
      desktop:
        '/game/boss-battle/art/backgrounds/webp/meadow-rpg-mountains-desktop.webp',
      mobile:
        '/game/boss-battle/art/backgrounds/webp/meadow-rpg-mountains-mobile.webp',
    },
    boss: {
      name: 'Summit Guardian',
      image:
        '/game/boss-battle/art/bosses/meadow-rpg-mountains.webp',
    },
  },
  {
    id: 'valley-snowy-mountains',
    name: 'Thung lũng núi tuyết',
    background: {
      desktop:
        '/game/boss-battle/art/backgrounds/webp/valley-snowy-mountains-desktop.webp',
      mobile:
        '/game/boss-battle/art/backgrounds/webp/valley-snowy-mountains-mobile.webp',
    },
    boss: {
      name: 'Frosthorn Guardian',
      image:
        '/game/boss-battle/art/bosses/valley-snowy-mountains.webp',
    },
  },
] as const

export const DEFAULT_BOSS_BATTLE_THEME = BOSS_BATTLE_THEMES[0]

/**
 * Mission routes use a zero-based missionIndex.
 * The mapping intentionally repeats every four missions and never uses randomness,
 * so reloading a mission always restores the same background/boss pair.
 */
export function getBossBattleTheme(
  missionIndex?: number | null,
): BossBattleTheme {
  if (
    missionIndex == null ||
    !Number.isFinite(missionIndex) ||
    missionIndex < 0
  ) {
    return DEFAULT_BOSS_BATTLE_THEME
  }

  const normalizedIndex = Math.floor(missionIndex)
  return (
    BOSS_BATTLE_THEMES[normalizedIndex % BOSS_BATTLE_THEMES.length] ??
    DEFAULT_BOSS_BATTLE_THEME
  )
}
