export const BOSS_BACKGROUND_THEME_IDS = [
  'forest-sunlit-enchanted',
  'forest-peaceful-shrine',
  'meadow-rpg-mountains',
  'valley-snowy-mountains',
] as const

export type BossBackgroundThemeId = (typeof BOSS_BACKGROUND_THEME_IDS)[number]

export interface BossBackgroundTheme {
  id: BossBackgroundThemeId
  name: string
  desktop: string
  mobile: string
}

export const FALLBACK_BOSS_BACKGROUND = '/game/boss-battle/art/backgrounds/forest-arena.svg'

export const BOSS_BACKGROUND_THEMES: readonly BossBackgroundTheme[] = [
  {
    id: 'forest-sunlit-enchanted',
    name: 'Khu rừng mê hoặc chan hòa ánh nắng',
    desktop: '/game/boss-battle/art/backgrounds/webp/forest-sunlit-enchanted-desktop.webp',
    mobile: '/game/boss-battle/art/backgrounds/webp/forest-sunlit-enchanted-mobile.webp',
  },
  {
    id: 'forest-peaceful-shrine',
    name: 'Đền thờ thanh bình giữa rừng sâu',
    desktop: '/game/boss-battle/art/backgrounds/webp/forest-peaceful-shrine-desktop.webp',
    mobile: '/game/boss-battle/art/backgrounds/webp/forest-peaceful-shrine-mobile.webp',
  },
  {
    id: 'meadow-rpg-mountains',
    name: 'Đồng cỏ thung lũng nhìn ra dãy núi',
    desktop: '/game/boss-battle/art/backgrounds/webp/meadow-rpg-mountains-desktop.webp',
    mobile: '/game/boss-battle/art/backgrounds/webp/meadow-rpg-mountains-mobile.webp',
  },
  {
    id: 'valley-snowy-mountains',
    name: 'Thung lũng tuyết dưới chân rặng núi',
    desktop: '/game/boss-battle/art/backgrounds/webp/valley-snowy-mountains-desktop.webp',
    mobile: '/game/boss-battle/art/backgrounds/webp/valley-snowy-mountains-mobile.webp',
  },
] as const

export const DEFAULT_BOSS_BACKGROUND_THEME = BOSS_BACKGROUND_THEMES[0]

export const BOSS_BATTLE_STATIC_ASSETS = {
  boss: {
    idle: '/game/boss-battle/art/boss/rune-beetle-idle.svg',
    hit: '/game/boss-battle/art/boss/rune-beetle-hit.svg',
    attack: '/game/boss-battle/art/boss/rune-beetle-attack.svg',
    defeated: '/game/boss-battle/art/boss/rune-beetle-defeated.svg',
    finisher: '/game/boss-battle/art/boss/rune-beetle-finisher-hit.svg',
  },
  effects: {
    slash: '/game/boss-battle/art/effects/slash.svg',
    impact: '/game/boss-battle/art/effects/impact.svg',
    finisher: '/game/boss-battle/art/effects/finisher-burst.svg',
  },
  skillReady: '/game/boss-battle/art/ui/skill-ready.svg',
  sfx: {
    playerAttack: '/game/boss-battle/audio/sfx/player-attack.wav',
    bossHit: '/game/boss-battle/audio/sfx/boss-hit.wav',
    bossAttack: '/game/boss-battle/audio/sfx/boss-attack.wav',
    playerHit: '/game/boss-battle/audio/sfx/player-hit.wav',
    skillCharge: '/game/boss-battle/audio/sfx/skill-charge.wav',
    finisher: '/game/boss-battle/audio/sfx/finisher.wav',
    victory: '/game/boss-battle/audio/sfx/victory.wav',
  },
  bgm: '/game/boss-battle/audio/bgm/boss-battle-loop.wav',
} as const

/**
 * Lấy theme hình nền Boss Battle theo missionIndex (zero-based index, ví dụ 0 cho Mission 1).
 * Công thức: themeIndex = missionIndex % 4
 *
 * Deterministic: không dùng Math.random(), luôn trả cùng một kết quả cho cùng một missionIndex.
 * Cả desktop và mobile dùng cùng một theme, chỉ khác file hình ảnh responsive.
 */
export function getBossBackgroundTheme(missionIndex?: number | null): BossBackgroundTheme {
  if (missionIndex == null || !Number.isFinite(missionIndex) || missionIndex < 0) {
    return DEFAULT_BOSS_BACKGROUND_THEME
  }

  const normalizedIndex = Math.floor(missionIndex)
  const themeIndex = normalizedIndex % BOSS_BACKGROUND_THEMES.length
  return BOSS_BACKGROUND_THEMES[themeIndex] ?? DEFAULT_BOSS_BACKGROUND_THEME
}

/**
 * Lấy theme hình nền Boss Battle theo missionNumber (1-based số thứ tự Mission, ví dụ 1 cho Mission 1).
 * Công thức: themeIndex = (missionNumber - 1) % 4
 */
export function getBossBackgroundThemeByMissionNumber(missionNumber?: number | null): BossBackgroundTheme {
  if (missionNumber == null || !Number.isFinite(missionNumber) || missionNumber < 1) {
    return DEFAULT_BOSS_BACKGROUND_THEME
  }

  const normalizedNumber = Math.floor(missionNumber)
  const themeIndex = (normalizedNumber - 1) % BOSS_BACKGROUND_THEMES.length
  return BOSS_BACKGROUND_THEMES[themeIndex] ?? DEFAULT_BOSS_BACKGROUND_THEME
}
