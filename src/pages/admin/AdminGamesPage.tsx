import { useEffect, useState } from 'react'
import { CheckSquare, Gamepad2, Save, Square, Swords } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { adminService } from '@/services/supabase/admin.service'
import { deckService } from '@/services/supabase/deck.service'
import { supabase } from '@/services/supabase/client'
import {
  DEFAULT_GAME_HUB_CONFIG,
  getDeckGameConfig,
  parseGameHubConfig,
  type GameAccessTier,
  type GameHubConfig,
  type GameKey,
} from '@/features/games/mission/gameConfig'

interface SimpleDeckInfo {
  id: string
  name: string
  parent_id: string | null
  term_count: number
}

const TERMS_PER_MISSION_OPTIONS = [5, 10, 15, 20].map((value) => ({
  value: String(value),
  label: String(value) + ' từ / Mission',
}))

const GAME_LABELS: Record<GameKey, string> = {
  matching: 'Nối từ (Matching)',
  mission: 'Học theo Mission',
  speed: 'Tốc độ (Speed)',
  puzzle: 'Xếp hình (Puzzle)',
  listening: 'Nghe (Listening)',
}

export default function AdminGamesPage() {
  const [config, setConfig] = useState<GameHubConfig>(DEFAULT_GAME_HUB_CONFIG)
  const [decks, setDecks] = useState<SimpleDeckInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setLoading(true)
      try {
        const [decksResult, settingResult] = await Promise.all([
          supabase
            .from('decks')
            .select('id, name, parent_id, deck_terms(count)')
            .order('created_at', { ascending: false }),
          supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'game_hub_config')
            .maybeSingle(),
        ])

        if (decksResult.error) throw decksResult.error
        if (settingResult.error) throw settingResult.error

        const mapped = (decksResult.data ?? []).map((deck: any) => ({
          id: deck.id,
          name: deck.name,
          parent_id: deck.parent_id,
          term_count: deck.deck_terms?.[0]?.count ?? 0,
        }))

        mapped.sort((a, b) => {
          const pathA = deckService.getDeckPath(a.id, mapped)
          const pathB = deckService.getDeckPath(b.id, mapped)
          return pathA.localeCompare(pathB, 'vi', { sensitivity: 'base' })
        })

        if (!cancelled) {
          setDecks(mapped)
          setConfig(parseGameHubConfig(settingResult.data?.value))
        }
      } catch (cause) {
        if (!cancelled) {
          const detail = cause instanceof Error ? cause.message : 'Lỗi không xác định'
          setMessage({ type: 'error', text: 'Không thể tải cấu hình: ' + detail })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadData()
    return () => {
      cancelled = true
    }
  }, [])

  const setGameTier = (gameKey: GameKey, accessTier: GameAccessTier) => {
    setConfig((previous) => ({
      ...previous,
      games: {
        ...previous.games,
        [gameKey]: { accessTier },
      },
    }))
  }

  const updateDeck = (
    deckId: string,
    update: Partial<ReturnType<typeof getDeckGameConfig>>,
  ) => {
    setConfig((previous) => {
      const current = getDeckGameConfig(previous, deckId)
      const next = { ...current, ...update }
      const rest = previous.allowedDecks.filter((item) => item.deckId !== deckId)
      return { ...previous, allowedDecks: [...rest, next] }
    })
  }

  const saveConfig = async () => {
    setSaving(true)
    setMessage(null)
    try {
      await adminService.updateSetting(
        'game_hub_config',
        config,
        'Cấu hình quyền truy cập Game Hub, Mission và các bộ từ được phép sử dụng',
      )
      await adminService.logAction(
        'update_game_hub_config',
        'app_setting',
        'game_hub_config',
        config,
      )
      setMessage({ type: 'success', text: 'Đã lưu cấu hình Game Hub và Mission.' })
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : 'Lỗi không xác định'
      setMessage({ type: 'error', text: 'Lưu thất bại: ' + detail })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm font-bold text-muted-foreground">Đang tải cấu hình trò chơi...</p>
      </div>
    )
  }

  const allConfig = getDeckGameConfig(config, 'all')

  return (
    <div className="w-full space-y-6">
      <section className="neo-card flex flex-col gap-4 bg-[#432dd7] p-6 text-white sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-white bg-[#fdc800]">
            <Gamepad2 className="h-7 w-7 text-[#1c293c]" />
          </div>
          <div>
            <h1 className="text-2xl font-black">QUẢN LÝ TRÒ CHƠI</h1>
            <p className="text-xs font-bold uppercase tracking-wide text-indigo-100">
              Game access, shared curriculum Mission và quyền truy cập theo deck
            </p>
          </div>
        </div>
        <Button onClick={() => void saveConfig()} disabled={saving}>
          <Save size={16} />
          {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
        </Button>
      </section>

      {message ? (
        <div
          role="status"
          className={
            'neo-card p-4 text-sm font-bold ' +
            (message.type === 'success'
              ? 'bg-emerald-50 text-emerald-900'
              : 'bg-rose-50 text-rose-900')
          }
        >
          {message.text}
        </div>
      ) : null}

      <section className="neo-card space-y-4 p-6">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black">
            <Gamepad2 className="h-5 w-5 text-primary" />
            1. Quyền truy cập theo trò chơi
          </h2>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            Mission dùng curriculum chung; Free/Pro chỉ quyết định quyền truy cập, không đổi nội dung theo từng người.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {(Object.keys(config.games) as GameKey[]).map((gameKey) => {
            const tier = config.games[gameKey].accessTier
            return (
              <article key={gameKey} className="rounded-lg border-2 border-border bg-muted/20 p-4">
                <p className="mb-3 text-sm font-black">{GAME_LABELS[gameKey]}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={tier === 'free' ? 'primary' : 'ghost'}
                    onClick={() => setGameTier(gameKey, 'free')}
                    className="px-2"
                  >
                    Free
                  </Button>
                  <Button
                    variant={tier === 'pro' ? 'secondary' : 'ghost'}
                    onClick={() => setGameTier(gameKey, 'pro')}
                    className="px-2"
                  >
                    Pro
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="neo-card space-y-4 p-6">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black">
            <CheckSquare className="h-5 w-5 text-primary" />
            2. Dữ liệu cá nhân động cho game cũ
          </h2>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            “Tất cả từ vựng của bạn” vẫn dành cho các game luyện tập cũ; Mission không dùng nguồn động này.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border-2 border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant={allConfig.allowed ? 'primary' : 'ghost'}
            onClick={() => updateDeck('all', { allowed: !allConfig.allowed, missionEnabled: false })}
          >
            {allConfig.allowed ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
            {allConfig.allowed ? 'Đang cho phép' : 'Đang tắt'}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={allConfig.accessTier === 'free' ? 'primary' : 'ghost'}
              disabled={!allConfig.allowed}
              onClick={() => updateDeck('all', { accessTier: 'free', missionEnabled: false })}
            >
              Free
            </Button>
            <Button
              variant={allConfig.accessTier === 'pro' ? 'secondary' : 'ghost'}
              disabled={!allConfig.allowed}
              onClick={() => updateDeck('all', { accessTier: 'pro', missionEnabled: false })}
            >
              Pro
            </Button>
          </div>
        </div>
      </section>

      <section className="neo-card space-y-4 p-6">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black">
            <Swords className="h-5 w-5 text-primary" />
            3. Playable Decks và Mission
          </h2>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            Mission chỉ dùng từ trực tiếp trong từng deck. Deck cần tối thiểu 5 từ trực tiếp để bật Mission.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {decks.map((deck) => {
            const deckConfig = getDeckGameConfig(config, deck.id)
            const canMission = deck.term_count >= 5
            return (
              <article key={deck.id} className="space-y-4 rounded-xl border-2 border-border bg-muted/20 p-4">
                <div>
                  <p className="line-clamp-2 text-sm font-black" title={deckService.getDeckPath(deck.id, decks)}>
                    {deckService.getDeckPath(deck.id, decks)}
                  </p>
                  <p className="mt-1 text-xs font-bold text-muted-foreground">
                    {deck.term_count} từ trực tiếp
                    {!canMission ? ' · cần ít nhất 5 từ để bật Mission' : ''}
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <Button
                    variant={deckConfig.allowed ? 'primary' : 'ghost'}
                    onClick={() => updateDeck(deck.id, { allowed: !deckConfig.allowed })}
                  >
                    {deckConfig.allowed ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                    Game Hub
                  </Button>
                  <Button
                    variant={deckConfig.accessTier === 'free' ? 'primary' : 'ghost'}
                    disabled={!deckConfig.allowed}
                    onClick={() => updateDeck(deck.id, { accessTier: 'free' })}
                  >
                    Free
                  </Button>
                  <Button
                    variant={deckConfig.accessTier === 'pro' ? 'secondary' : 'ghost'}
                    disabled={!deckConfig.allowed}
                    onClick={() => updateDeck(deck.id, { accessTier: 'pro' })}
                  >
                    Pro
                  </Button>
                </div>

                <div className="border-t-2 border-dashed border-border pt-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Button
                      variant={deckConfig.missionEnabled ? 'secondary' : 'ghost'}
                      disabled={!deckConfig.allowed || !canMission}
                      onClick={() => updateDeck(deck.id, { missionEnabled: !deckConfig.missionEnabled })}
                      className="shrink-0"
                    >
                      <Swords className="h-4 w-4" />
                      {deckConfig.missionEnabled ? 'Mission đang bật' : 'Bật Mission'}
                    </Button>
                    <Select
                      value={String(deckConfig.termsPerMission ?? 10)}
                      onChange={(value) => updateDeck(deck.id, { termsPerMission: Number(value) })}
                      options={TERMS_PER_MISSION_OPTIONS}
                      disabled={!deckConfig.missionEnabled}
                    />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-muted-foreground">
                    Script: Standard · Learn → Matching → Listening → Context → Recall → Boss
                  </p>
                </div>
              </article>
            )
          })}
        </div>

        {decks.length === 0 ? (
          <p className="py-6 text-center text-sm font-bold text-muted-foreground">
            Chưa có deck nào để cấu hình.
          </p>
        ) : null}
      </section>
    </div>
  )
}
