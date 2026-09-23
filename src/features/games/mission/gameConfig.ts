import { z } from 'zod'

export type GameAccessTier = 'free' | 'pro'
export type GameKey = 'matching' | 'mission' | 'speed' | 'puzzle' | 'listening'

export interface GameAccessConfig { accessTier: GameAccessTier }
export interface AllowedDeckConfig {
  deckId: string
  allowed: boolean
  accessTier: GameAccessTier
  missionEnabled?: boolean
  termsPerMission?: number
  scriptKey?: string
}
export interface GameHubConfig {
  games: Record<GameKey, GameAccessConfig>
  allowedDecks: AllowedDeckConfig[]
}

const accessTierSchema = z.enum(['free', 'pro'])
const gameAccessSchema = z.object({ accessTier: accessTierSchema }).passthrough()
const allowedDeckSchema = z.object({
  deckId: z.string().min(1),
  allowed: z.boolean(),
  accessTier: accessTierSchema,
  missionEnabled: z.boolean().optional(),
  termsPerMission: z.number().int().min(5).max(20).optional(),
  scriptKey: z.string().min(1).optional(),
}).passthrough()
const rawConfigSchema = z.object({
  games: z.record(z.string(), gameAccessSchema).optional(),
  allowedDecks: z.array(allowedDeckSchema).optional(),
}).passthrough()

export const DEFAULT_GAME_HUB_CONFIG: GameHubConfig = {
  games: {
    matching: { accessTier: 'free' },
    mission: { accessTier: 'free' },
    speed: { accessTier: 'pro' },
    puzzle: { accessTier: 'pro' },
    listening: { accessTier: 'pro' },
  },
  allowedDecks: [{ deckId: 'all', allowed: true, accessTier: 'free', missionEnabled: false }],
}

export function parseGameHubConfig(value: unknown): GameHubConfig {
  const parsed = rawConfigSchema.safeParse(value)
  if (!parsed.success) return DEFAULT_GAME_HUB_CONFIG
  const games = { ...DEFAULT_GAME_HUB_CONFIG.games }
  for (const key of Object.keys(games) as GameKey[]) {
    const next = parsed.data.games?.[key]
    if (next) games[key] = { accessTier: next.accessTier }
  }
  return {
    games,
    allowedDecks: parsed.data.allowedDecks?.map((item) => ({
      deckId: item.deckId,
      allowed: item.allowed,
      accessTier: item.accessTier,
      missionEnabled: item.missionEnabled ?? false,
      termsPerMission: item.termsPerMission ?? 10,
      scriptKey: item.scriptKey ?? 'standard',
    })) ?? DEFAULT_GAME_HUB_CONFIG.allowedDecks,
  }
}

export function getDeckGameConfig(config: GameHubConfig, deckId: string): AllowedDeckConfig {
  return config.allowedDecks.find((item) => item.deckId === deckId) ?? {
    deckId,
    allowed: false,
    accessTier: 'free',
    missionEnabled: false,
    termsPerMission: 10,
    scriptKey: 'standard',
  }
}
