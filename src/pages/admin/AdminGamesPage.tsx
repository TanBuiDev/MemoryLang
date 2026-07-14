import { useEffect, useState } from 'react'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'
import { supabase } from '@/services/supabase/client'
import { adminService } from '@/services/supabase/admin.service'
import {
  Gamepad2,
  Crown,
  ShieldAlert,
  Save,
  CheckSquare,
  Square,
} from 'lucide-react'

interface GameAccessConfig {
  accessTier: 'free' | 'pro'
}

interface AllowedDeckConfig {
  deckId: string
  allowed: boolean
  accessTier: 'free' | 'pro'
}

interface GameHubConfig {
  games: {
    matching: GameAccessConfig
    speed: GameAccessConfig
    puzzle: GameAccessConfig
    listening: GameAccessConfig
  }
  allowedDecks: AllowedDeckConfig[]
}

interface SimpleDeckInfo {
  id: string
  name: string
  term_count: number
}

const DEFAULT_CONFIG: GameHubConfig = {
  games: {
    matching: { accessTier: 'free' },
    speed: { accessTier: 'pro' },
    puzzle: { accessTier: 'pro' },
    listening: { accessTier: 'pro' },
  },
  allowedDecks: [{ deckId: 'all', allowed: true, accessTier: 'free' }],
}

export default function AdminGamesPage() {
  const isSimulatedPro = useSubscriptionStore((s) => s.isSimulatedPro)
  const isPro = useSubscriptionStore((s) => s.isPro)
  const setSimulatedPro = useSubscriptionStore((s) => s.setSimulatedPro)

  // Configuration state
  const [config, setConfig] = useState<GameHubConfig>(DEFAULT_CONFIG)
  const [publicDecks, setPublicDecks] = useState<SimpleDeckInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        // 1. Fetch public decks
        const { data: decksData, error: decksError } = await supabase
          .from('decks')
          .select('*, deck_terms(count)')
          .order('created_at', { ascending: false })

        if (decksError) throw decksError

        const mappedDecks = (decksData ?? []).map((d: any) => ({
          id: d.id,
          name: d.name,
          term_count: d.deck_terms?.[0]?.count ?? 0,
        }))
        setPublicDecks(mappedDecks)

        // 2. Fetch game hub config setting
        const { data: settingData, error: settingError } = await supabase
          .from('app_settings')
          .select('*')
          .eq('key', 'game_hub_config')
          .maybeSingle()

        if (settingError) throw settingError

        if (settingData?.value) {
          const parsed = settingData.value as GameHubConfig
          // Deep merge with defaults to avoid missing keys
          setConfig({
            games: {
              ...DEFAULT_CONFIG.games,
              ...parsed.games,
            },
            allowedDecks: parsed.allowedDecks || DEFAULT_CONFIG.allowedDecks,
          })
        }
      } catch (err: any) {
        console.error('Failed to load admin game config:', err)
        setMessage({ type: 'error', text: 'Không thể tải dữ liệu cấu hình: ' + err.message })
      } finally {
        setLoading(false)
      }
    }
    void loadData()
  }, [])

  const handleTogglePro = () => {
    if (isSimulatedPro === true) {
      setSimulatedPro(false)
    } else if (isSimulatedPro === false) {
      setSimulatedPro(null)
    } else {
      setSimulatedPro(true)
    }
  }

  const handleGameTierChange = (gameKey: 'matching' | 'speed' | 'puzzle' | 'listening', tier: 'free' | 'pro') => {
    setConfig((prev) => ({
      ...prev,
      games: {
        ...prev.games,
        [gameKey]: { accessTier: tier },
      },
    }))
  }

  const handleDeckAllowedToggle = (deckId: string) => {
    setConfig((prev) => {
      const idx = prev.allowedDecks.findIndex((d) => d.deckId === deckId)
      let newDecks = [...prev.allowedDecks]

      if (idx > -1) {
        newDecks[idx] = { ...newDecks[idx], allowed: !newDecks[idx].allowed }
      } else {
        newDecks.push({ deckId, allowed: true, accessTier: 'free' })
      }

      return { ...prev, allowedDecks: newDecks }
    })
  }

  const handleDeckTierChange = (deckId: string, tier: 'free' | 'pro') => {
    setConfig((prev) => {
      const idx = prev.allowedDecks.findIndex((d) => d.deckId === deckId)
      let newDecks = [...prev.allowedDecks]

      if (idx > -1) {
        newDecks[idx] = { ...newDecks[idx], accessTier: tier }
      } else {
        newDecks.push({ deckId, allowed: true, accessTier: tier })
      }

      return { ...prev, allowedDecks: newDecks }
    })
  }

  const handleSaveConfig = async () => {
    try {
      setSaving(true)
      setMessage(null)

      // Save to app_settings table
      await adminService.updateSetting(
        'game_hub_config',
        config,
        'Cấu hình phân quyền Game Hub và các bộ từ vựng cho phép chơi game'
      )

      // Log the admin action
      await adminService.logAction(
        'update_game_hub_config',
        'app_setting',
        'game_hub_config',
        config
      )

      setMessage({ type: 'success', text: 'Đã lưu cấu hình phân quyền trò chơi thành công!' })
    } catch (err: any) {
      console.error('Failed to save config:', err)
      setMessage({ type: 'error', text: 'Lưu thất bại: ' + err.message })
    } finally {
      setSaving(false)
    }
  }

  const getSimStatusLabel = () => {
    if (isSimulatedPro === true) return '👑 Giả lập PRO (Bắt buộc)'
    if (isSimulatedPro === false) return '🚫 Giả lập FREE (Bắt buộc)'
    return '🔌 Sử dụng cấu hình cơ sở dữ liệu'
  }

  const getSimStatusColor = () => {
    if (isSimulatedPro === true) return 'bg-[#dcfce7] text-[#166534] border-[#166534]'
    if (isSimulatedPro === false) return 'bg-[#fee2e2] text-[#991b1b] border-[#991b1b]'
    return 'bg-muted text-foreground border-border'
  }

  // Helper check deck stats in config
  const getDeckConfig = (deckId: string) => {
    const found = config.allowedDecks.find((d) => d.deckId === deckId)
    return found || { deckId, allowed: false, accessTier: 'free' as const }
  }

  const getGameLabel = (key: string) => {
    switch (key) {
      case 'matching':
        return 'Nối từ (Matching)'
      case 'speed':
        return 'Tốc độ (Speed)'
      case 'puzzle':
        return 'Xếp hình (Puzzle)'
      case 'listening':
        return 'Nghe (Listening)'
      default:
        return key
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-bold text-muted-foreground">Đang tải cấu hình trò chơi...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="neo-card p-6 bg-[#432dd7] text-white border-4 border-[#1c293c] shadow-[6px_6px_0px_0px_#1c293c] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#fdc800] rounded-full border-2 border-white flex items-center justify-center text-navy shrink-0">
            <Gamepad2 className="w-7 h-7 text-[#1c293c]" />
          </div>
          <div>
            <h1 className="text-2xl font-black">QUẢN LÝ TRÒ CHƠI</h1>
            <p className="text-xs font-bold text-[#e0e7ff] uppercase tracking-wide">
              Cấu hình quyền truy cập và hạn chế các bộ thẻ trong Game Hub
            </p>
          </div>
        </div>

        <button
          onClick={handleSaveConfig}
          disabled={saving}
          className="neo-button bg-yellow-400 hover:bg-yellow-300 text-navy font-black text-sm px-6 py-2.5 flex items-center gap-1.5 border-2 border-[#1c293c] shadow-[3px_3px_0px_0px_#1c293c] active:neo-button-active"
        >
          <Save size={16} />
          {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
        </button>
      </div>

      {/* Message feedback */}
      {message && (
        <div
          className={`p-4 border-4 rounded-md font-bold text-sm shadow-[4px_4px_0px_0px_#1c293c] ${
            message.type === 'success'
              ? 'bg-[#dcfce7] border-[#166534] text-[#166534]'
              : 'bg-[#fee2e2] border-[#991b1b] text-[#991b1b]'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Simulation Settings Column */}
        <div className="lg:col-span-1 space-y-6">
          {/* Simulated pro card */}
          <div className="neo-card p-6 bg-background border-4 border-[#1c293c] shadow-[6px_6px_0px_0px_#1c293c]">
            <h2 className="text-lg font-black mb-4 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              Giả lập Gói Dịch vụ
            </h2>
            <p className="text-xs text-muted-foreground font-bold mb-4 leading-relaxed">
              Dùng để thử nghiệm các tính năng giới hạn (Pro Feature Gate) trên các màn hình trò chơi hoặc học tập mà không cần đổi trực tiếp trong DB.
            </p>

            <div className="space-y-4">
              <div>
                <span className="text-[11px] font-black uppercase text-muted-foreground">Trạng thái hiện tại:</span>
                <div className={`mt-1 px-3 py-2 rounded-md border-2 font-black text-xs text-center transition-all ${getSimStatusColor()}`}>
                  {getSimStatusLabel()}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-black uppercase text-muted-foreground">Trạng thái thực tế:</span>
                <div className="mt-1 px-3 py-2 rounded-md border-2 border-border font-bold text-xs bg-muted text-muted-foreground">
                  {isPro ? '💎 PRO Active' : 'FREE Tier'}
                </div>
              </div>

              <button
                onClick={handleTogglePro}
                className="neo-button w-full bg-[#fdc800] hover:bg-[#e6b800] py-3 text-sm font-black text-navy flex items-center justify-center gap-2 transition-all mt-2 active:neo-button-active"
              >
                <Crown className="w-4 h-4" />
                Thay đổi trạng thái giả lập
              </button>
            </div>
          </div>
        </div>

        {/* Configurations Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Game tiers config card */}
          <div className="neo-card p-6 bg-background border-4 border-[#1c293c] shadow-[6px_6px_0px_0px_#1c293c] space-y-4">
            <h2 className="text-lg font-black flex items-center gap-2 border-b-2 border-dashed border-[#1c293c]/20 pb-3">
              <Gamepad2 className="w-5 h-5 text-primary" />
              1. Cấu hình Quyền truy cập Trò chơi
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(Object.keys(config.games) as Array<keyof typeof config.games>).map((gameKey) => {
                const gameTier = config.games[gameKey].accessTier
                return (
                  <div
                    key={gameKey}
                    className="p-4 border-2 border-[#1c293c] rounded-md bg-muted/20 flex items-center justify-between gap-4"
                  >
                    <span className="font-black text-sm">{getGameLabel(gameKey)}</span>

                    <div className="flex border-2 border-[#1c293c] rounded-md overflow-hidden shrink-0">
                      <button
                        onClick={() => handleGameTierChange(gameKey, 'free')}
                        className={`px-3 py-1 text-xs font-black transition-colors ${
                          gameTier === 'free'
                            ? 'bg-[#dcfce7] text-[#166534] border-r-2 border-[#1c293c]'
                            : 'bg-background hover:bg-muted border-r-2 border-[#1c293c]'
                        }`}
                      >
                        Free
                      </button>
                      <button
                        onClick={() => handleGameTierChange(gameKey, 'pro')}
                        className={`px-3 py-1 text-xs font-black transition-colors ${
                          gameTier === 'pro'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-background hover:bg-muted'
                        }`}
                      >
                        Pro 👑
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Decks config card */}
          <div className="neo-card p-6 bg-background border-4 border-[#1c293c] shadow-[6px_6px_0px_0px_#1c293c] space-y-4">
            <h2 className="text-lg font-black flex items-center gap-2 border-b-2 border-dashed border-[#1c293c]/20 pb-3">
              <CheckSquare className="w-5 h-5 text-primary" />
              2. Danh sách Bộ từ vựng cho phép chơi game
            </h2>
            <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
              Tích chọn để hiển thị bộ từ vựng tương ứng trên màn hình chọn trước khi bắt đầu chơi. Điều chỉnh bộ từ vựng chỉ Pro mới được phép sử dụng.
            </p>

            <div className="space-y-3">
              {/* Special row for "Tất cả từ vựng của bạn" */}
              {(() => {
                const allDeckConfig = getDeckConfig('all')
                return (
                  <div className="p-4 border-2 border-[#1c293c] rounded-md bg-yellow-50/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div
                      className="flex items-center gap-3 cursor-pointer select-none"
                      onClick={() => handleDeckAllowedToggle('all')}
                    >
                      {allDeckConfig.allowed ? (
                        <CheckSquare className="w-5 h-5 text-primary shrink-0" />
                      ) : (
                        <Square className="w-5 h-5 text-muted-foreground shrink-0" />
                      )}
                      <div>
                        <span className="font-black text-sm block">Tất cả từ vựng của bạn</span>
                        <span className="text-[10px] text-muted-foreground font-bold">
                          (Dữ liệu cá nhân động của từng user)
                        </span>
                      </div>
                    </div>

                    <div className="flex border-2 border-[#1c293c] rounded-md overflow-hidden shrink-0">
                      <button
                        onClick={() => handleDeckTierChange('all', 'free')}
                        disabled={!allDeckConfig.allowed}
                        className={`px-3 py-1 text-xs font-black transition-colors ${
                          !allDeckConfig.allowed
                            ? 'opacity-40 cursor-not-allowed bg-muted text-muted-foreground border-r-2 border-[#1c293c]'
                            : allDeckConfig.accessTier === 'free'
                            ? 'bg-[#dcfce7] text-[#166534] border-r-2 border-[#1c293c]'
                            : 'bg-background hover:bg-muted border-r-2 border-[#1c293c]'
                        }`}
                      >
                        Free
                      </button>
                      <button
                        onClick={() => handleDeckTierChange('all', 'pro')}
                        disabled={!allDeckConfig.allowed}
                        className={`px-3 py-1 text-xs font-black transition-colors ${
                          !allDeckConfig.allowed
                            ? 'opacity-40 cursor-not-allowed bg-muted text-muted-foreground'
                            : allDeckConfig.accessTier === 'pro'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-background hover:bg-muted'
                        }`}
                      >
                        Pro 👑
                      </button>
                    </div>
                  </div>
                )
              })()}

              {/* Public Decks List */}
              {publicDecks.map((deck) => {
                const deckConfig = getDeckConfig(deck.id)
                return (
                  <div
                    key={deck.id}
                    className="p-4 border-2 border-[#1c293c] rounded-md bg-muted/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                  >
                    <div
                      className="flex items-center gap-3 cursor-pointer select-none"
                      onClick={() => handleDeckAllowedToggle(deck.id)}
                    >
                      {deckConfig.allowed ? (
                        <CheckSquare className="w-5 h-5 text-primary shrink-0" />
                      ) : (
                        <Square className="w-5 h-5 text-muted-foreground shrink-0" />
                      )}
                      <div>
                        <span className="font-black text-sm block">{deck.name}</span>
                        <span className="text-[10px] text-muted-foreground font-bold">
                          Số lượng: {deck.term_count} từ
                        </span>
                      </div>
                    </div>

                    <div className="flex border-2 border-[#1c293c] rounded-md overflow-hidden shrink-0">
                      <button
                        onClick={() => handleDeckTierChange(deck.id, 'free')}
                        disabled={!deckConfig.allowed}
                        className={`px-3 py-1 text-xs font-black transition-colors ${
                          !deckConfig.allowed
                            ? 'opacity-40 cursor-not-allowed bg-muted text-muted-foreground border-r-2 border-[#1c293c]'
                            : deckConfig.accessTier === 'free'
                            ? 'bg-[#dcfce7] text-[#166534] border-r-2 border-[#1c293c]'
                            : 'bg-background hover:bg-muted border-r-2 border-[#1c293c]'
                        }`}
                      >
                        Free
                      </button>
                      <button
                        onClick={() => handleDeckTierChange(deck.id, 'pro')}
                        disabled={!deckConfig.allowed}
                        className={`px-3 py-1 text-xs font-black transition-colors ${
                          !deckConfig.allowed
                            ? 'opacity-40 cursor-not-allowed bg-muted text-muted-foreground'
                            : deckConfig.accessTier === 'pro'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-background hover:bg-muted'
                        }`}
                      >
                        Pro 👑
                      </button>
                    </div>
                  </div>
                )
              })}

              {publicDecks.length === 0 && (
                <div className="text-center py-6 text-xs text-muted-foreground font-bold">
                  Không tìm thấy bộ thẻ công khai (public) nào để cấu hình.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
