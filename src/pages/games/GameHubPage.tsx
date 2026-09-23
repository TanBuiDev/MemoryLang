import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'
import { deckService } from '@/services/supabase/deck.service'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import { supabase } from '@/services/supabase/client'
import type { Deck } from '@/types/deck.types'
import {
  Gamepad2,
  Rocket,
  Zap,
  Puzzle,
  Headphones,
  Clock,
  Trophy,
  X,
  BookOpen,
  Hash,
  AlertTriangle,
  Crown,
  Play,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Select } from '@/components/ui/select'
import { cn } from '@/utils/cn'

interface GameAccessConfig {
  accessTier: 'free' | 'pro'
}

interface AllowedDeckConfig {
  deckId: string
  allowed: boolean
  accessTier: 'free' | 'pro'
  missionEnabled?: boolean
  termsPerMission?: number
  scriptKey?: string
}

interface GameHubConfig {
  games: {
    matching: GameAccessConfig
    mission: GameAccessConfig
    speed: GameAccessConfig
    puzzle: GameAccessConfig
    listening: GameAccessConfig
  }
  allowedDecks: AllowedDeckConfig[]
}

const DEFAULT_CONFIG: GameHubConfig = {
  games: {
    matching: { accessTier: 'free' },
    mission: { accessTier: 'free' },
    speed: { accessTier: 'pro' },
    puzzle: { accessTier: 'pro' },
    listening: { accessTier: 'pro' },
  },
  allowedDecks: [{ deckId: 'all', allowed: true, accessTier: 'free' }],
}

export default function GameHubPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isPro = useSubscriptionStore((s) => s.isPro)

  // Data states
  const [decks, setDecks] = useState<Deck[]>([])
  const [allTermsCount, setAllTermsCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [hubConfig, setHubConfig] = useState<GameHubConfig>(DEFAULT_CONFIG)

  // UI state
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [isProPromptOpen, setIsProPromptOpen] = useState(false)
  const [proPromptReason, setProPromptReason] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  // Config form states
  const [selectedSource, setSelectedSource] = useState<string>('all') // 'all' or deckId
  const [missionDeckId, setMissionDeckId] = useState<string>('')
  const [questionCountType, setQuestionCountType] = useState<string>('10') // '5', '10', '20', 'custom'
  const [customQuestionCount, setCustomQuestionCount] = useState<number>(25)
  const [repeatWrong, setRepeatWrong] = useState(true)
  const [shuffleCompletely, setShuffleCompletely] = useState(false)

  useEffect(() => {
    async function loadData() {
      if (!user) return
      try {
        setLoading(true)
        const [decksList, termsList, settingData] = await Promise.all([
          deckService.list(user.id),
          vocabularyService.list(user.id),
          supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'game_hub_config')
            .maybeSingle(),
        ])
        // Calculate term count recursively including sub-decks
        const mapped = (decksList ?? []).map((d: any) => ({
          ...d,
          directCount: d.term_count ?? 0,
        }))

        const getCount = (deckId: string): number => {
          const current = mapped.find((d) => d.id === deckId)
          if (!current) return 0
          const direct = current.directCount
          const children = mapped.filter((d) => d.parent_id === deckId)
          const childrenSum = children.reduce((sum, child) => sum + getCount(child.id), 0)
          return direct + childrenSum
        }

        const updatedDecks = mapped.map((d) => ({
          ...d,
          term_count: getCount(d.id),
        }))

        setDecks(updatedDecks)
        setAllTermsCount(termsList.length)

        if (settingData?.data?.value) {
          const parsed = settingData.data.value as GameHubConfig
          setHubConfig({
            games: {
              ...DEFAULT_CONFIG.games,
              ...parsed.games,
            },
            allowedDecks: parsed.allowedDecks || DEFAULT_CONFIG.allowedDecks,
          })
        }
      } catch (err) {
        console.error('Failed to load Game Hub data:', err)
      } finally {
        setLoading(false)
      }
    }
    void loadData()
  }, [user])

  const handleStartGame = () => {
    // 1. Get word count
    let count = 0
    if (selectedSource === 'all') {
      count = allTermsCount
    } else {
      const selectedDeck = decks.find((d) => d.id === selectedSource)
      count = selectedDeck?.term_count ?? 0
    }

    // 2. Validate count
    if (count < 5) {
      setValidationError(
        'Bộ từ vựng này không đủ 5 từ để bắt đầu chơi. Vui lòng thêm từ vựng hoặc chọn bộ khác!'
      )
      return
    }

    // Determine final question count
    let finalCount: string | number
    if (questionCountType === 'all') {
      finalCount = 'all'
      if (count > 20 && !isPro) {
        setValidationError('Số lượng câu hỏi lớn hơn 20 yêu cầu gói Pro. Vui lòng nâng cấp Pro!')
        return
      }
    } else if (questionCountType === 'custom') {
      finalCount = Number(customQuestionCount)
      if (isNaN(finalCount) || finalCount < 5) {
        setValidationError('Số lượng câu hỏi tối thiểu là 5.')
        return
      }
    } else {
      finalCount = Number(questionCountType)
    }

    setValidationError(null)
    setIsConfigOpen(false)

    // Navigate to game with params
    const searchParams = new URLSearchParams()
    searchParams.set('source', selectedSource)
    searchParams.set('count', String(finalCount))
    searchParams.set('repeatWrong', String(repeatWrong))
    searchParams.set('shuffle', String(shuffleCompletely))

    navigate(`/app/games/matching?${searchParams.toString()}`)
  }

  // Handle Pro Lock interaction
  const triggerProPrompt = (reason: string) => {
    setProPromptReason(reason)
    setIsProPromptOpen(true)
  }

  const handleProOptionClick = (
    e: React.MouseEvent,
    hasAccess: boolean,
    onAllowed: () => void,
    reason: string
  ) => {
    if (!hasAccess) {
      e.preventDefault()
      triggerProPrompt(reason)
    } else {
      onAllowed()
    }
  }

  // Helper check deck config in loaded hubConfig
  const getDeckConfig = (deckId: string) => {
    const found = hubConfig.allowedDecks.find((d) => d.deckId === deckId)
    return found || { deckId, allowed: false, accessTier: 'free' as const }
  }

  const games = [
    {
      id: 'matching',
      name: 'NỐI TỪ',
      icon: Rocket,
      desc: 'Ghép từ tiếng Anh với nghĩa tiếng Việt tương ứng thật chính xác',
      duration: '5-10 phút',
      xp: '+50 XP',
      isAvailable: true,
      color: 'bg-yellow-400',
    },
    {
      id: 'speed',
      name: 'TỐC ĐỘ',
      icon: Zap,
      desc: 'Chọn đáp án đúng cực nhanh trong 10 giây phản xạ',
      duration: '3-5 phút',
      xp: '+80 XP',
      isAvailable: false,
      color: 'bg-purple-400',
    },
    {
      id: 'puzzle',
      name: 'PUZZLE',
      icon: Puzzle,
      desc: 'Xếp hình các mảnh từ vựng để tạo câu hoàn chỉnh',
      duration: '5-10 phút',
      xp: '+60 XP',
      isAvailable: false,
      color: 'bg-sky-400',
    },
    {
      id: 'listening',
      name: 'NGHE LỰA CHỌN',
      icon: Headphones,
      desc: 'Nghe phát âm chuẩn và chọn nghĩa tiếng Việt chính xác',
      duration: '5 phút',
      xp: '+50 XP',
      isAvailable: false,
      color: 'bg-emerald-400',
    },
  ]

  // Filter allowed decks and sort them by path
  const allowedDecksToShow = decks
    .filter((deck) => {
      const deckConf = getDeckConfig(deck.id)
      return deckConf.allowed
    })
    .sort((a, b) => {
      const pathA = deckService.getDeckPath(a.id, decks)
      const pathB = deckService.getDeckPath(b.id, decks)
      return pathA.localeCompare(pathB, 'vi', { sensitivity: 'base' })
    })

  const isAllVocabularyAllowed = getDeckConfig('all').allowed

  const missionDeckOptions = allowedDecksToShow
    .filter((deck) => getDeckConfig(deck.id).missionEnabled !== false)
    .map((deck) => {
      const deckConf = getDeckConfig(deck.id)
      const suffix = !isPro && deckConf.accessTier === 'pro' ? ' 👑 Pro' : ''
      return {
        value: deck.id,
        label: deckService.getDeckPath(deck.id, decks) + ' (' + String(deck.term_count ?? 0) + ' từ)' + suffix,
      }
    })

  const selectOptions = [
    ...(isAllVocabularyAllowed
      ? [
          {
            value: 'all',
            label: `Tất cả từ vựng (${allTermsCount} từ)${!isPro && getDeckConfig('all').accessTier === 'pro' ? ' 👑 Pro' : ''}`,
          },
        ]
      : []),
    ...allowedDecksToShow.map((deck) => {
      const deckConf = getDeckConfig(deck.id)
      const isDeckPro = deckConf.accessTier === 'pro'
      const labelSuffix = ` (${deck.term_count ?? 0} từ)${!isPro && isDeckPro ? ' 👑 Pro' : ''}`
      return {
        value: deck.id,
        label: `${deckService.getDeckPath(deck.id, decks)}${labelSuffix}`,
      }
    }),
  ]

  const handleSourceChange = (val: string) => {
    if (val === 'all') {
      const allConf = getDeckConfig('all')
      const isAllPro = allConf.accessTier === 'pro'
      const hasAllAccess = !isAllPro || isPro
      if (!hasAllAccess) {
        triggerProPrompt('để sử dụng bộ từ vựng này')
        return
      }
    } else {
      const deckConf = getDeckConfig(val)
      const isDeckPro = deckConf.accessTier === 'pro'
      const hasDeckAccess = !isDeckPro || isPro
      if (!hasDeckAccess) {
        triggerProPrompt('để sử dụng bộ thẻ này')
        return
      }
    }
    setSelectedSource(val)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 sm:space-y-8">
      {/* Header Banner Neobrutalism */}
      <div className="neo-card p-6 sm:p-8 bg-[#432dd7] text-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_#000] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
        <div className="flex items-center gap-4 z-10">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#fdc800] rounded-2xl border-3 border-slate-900 flex items-center justify-center text-slate-900 shrink-0 shadow-[3px_3px_0px_0px_#000]">
            <Gamepad2 className="w-8 h-8 sm:w-9 sm:h-9 text-slate-900" />
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-yellow-300 border-2 border-slate-900 shadow-[1.5px_1.5px_0px_0px_#000] rounded-full text-slate-900 font-black text-xs uppercase">
              <Sparkles className="w-3.5 h-3.5" /> Thử Thách Phản Xạ
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">TRÒ CHƠI & PHẢN XẠ</h1>
            <p className="text-xs sm:text-sm font-bold text-indigo-100 max-w-xl leading-relaxed">
              Luyện nhớ từ vựng qua các trò chơi tương tác thú vị, giúp khắc sâu ghi nhớ và tăng phản xạ ngôn ngữ nhanh chóng!
            </p>
          </div>
        </div>
      </div>

      {/* Shared curriculum Mission */}
      <section className="neo-card border-4 border-slate-900 bg-yellow-50 p-5 shadow-[6px_6px_0px_0px_#000] rounded-2xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border-2 border-slate-900 bg-[#fdc800] px-3 py-1 text-xs font-black uppercase">
              <BookOpen className="h-4 w-4" /> Học theo Mission
            </div>
            <h2 className="mt-3 text-2xl font-black text-slate-900">Lộ trình chung theo từng bộ từ</h2>
            <p className="mt-1 text-sm font-bold text-slate-600">
              Mỗi người học cùng một curriculum: làm quen, nghe, ngữ cảnh, gọi lại từ trí nhớ và Boss Battle.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 lg:max-w-xl lg:flex-row">
            <Select
              value={missionDeckId}
              onChange={(value) => {
                const deckConf = getDeckConfig(value)
                if ((deckConf.accessTier === 'pro' || hubConfig.games.mission.accessTier === 'pro') && !isPro) {
                  triggerProPrompt('để học bộ từ này bằng Mission')
                  return
                }
                setMissionDeckId(value)
              }}
              options={missionDeckOptions}
              placeholder="Chọn bộ từ để học Mission..."
              disabled={missionDeckOptions.length === 0}
            />
            <Button
              className="shrink-0"
              disabled={!missionDeckId}
              onClick={() => {
                if (missionDeckId) navigate('/app/games/mission/' + missionDeckId)
              }}
            >
              <Play className="h-4 w-4 fill-current" /> Vào lộ trình
            </Button>
          </div>
        </div>
      </section>

      {/* Grid of Games */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {games.map((game) => {
          const Icon = game.icon
          const gameConf = hubConfig.games[game.id as keyof typeof hubConfig.games] || { accessTier: 'free' }
          const isGameProGated = gameConf.accessTier === 'pro'
          const hasAccess = !isGameProGated || isPro

          return (
            <div
              key={game.id}
              className="neo-card bg-white p-6 border-4 border-slate-900 shadow-[6px_6px_0px_0px_#000] hover:translate-y-[-4px] hover:shadow-[8px_8px_0px_0px_#000] transition-all relative flex flex-col justify-between min-h-[340px] rounded-2xl"
            >
              <div>
                {/* Game Icon */}
                <div
                  className={cn(
                    'w-16 h-16 mx-auto mb-4 rounded-2xl border-3 border-slate-900 flex items-center justify-center shadow-[3px_3px_0px_0px_#000]',
                    game.color
                  )}
                >
                  <Icon className="w-8 h-8 text-slate-900" />
                </div>

                {/* Game Title */}
                <h3 className="text-xl font-black text-center text-slate-900 mb-2 flex items-center justify-center gap-1.5">
                  <span>{game.name}</span>
                  {isGameProGated && (
                    <Crown size={18} className="text-amber-500 shrink-0" />
                  )}
                </h3>

                {/* Description */}
                <p className="text-xs text-slate-600 font-bold text-center mb-5 leading-relaxed">
                  {game.desc}
                </p>

                {/* Duration & XP Badges */}
                <div className="flex items-center justify-center gap-3 mb-5 text-xs font-black">
                  <span className="neo-card px-2.5 py-1 bg-slate-100 border-2 border-slate-900 rounded-lg flex items-center gap-1 text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    {game.duration}
                  </span>
                  <span className="neo-card px-2.5 py-1 bg-emerald-100 border-2 border-slate-900 rounded-lg flex items-center gap-1 text-emerald-800">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    {game.xp}
                  </span>
                </div>
              </div>

              {/* Start Button */}
              {game.isAvailable ? (
                <Button
                  type="button"
                  onClick={(e) => {
                    handleProOptionClick(
                      e,
                      hasAccess,
                      () => {
                        setIsConfigOpen(true)
                        setValidationError(null)
                      },
                      'để chơi trò chơi này'
                    )
                  }}
                  className="neo-button w-full py-3 bg-[#fdc800] hover:bg-amber-300 text-slate-900 font-black text-sm border-2 border-slate-900 shadow-[3px_3px_0px_0px_#000] rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-slate-900" />
                  <span>Chơi ngay</span>
                </Button>
              ) : (
                <Button
                  disabled
                  variant="ghost"
                  className="w-full py-3 bg-slate-100 text-slate-400 font-bold text-sm border-2 border-slate-300 rounded-xl cursor-not-allowed"
                >
                  Sắp ra mắt
                </Button>
              )}

              {/* Pro / Coming Soon Badge */}
              {!game.isAvailable ? (
                <div className="absolute -top-2.5 -right-2.5 bg-purple-600 text-white px-2.5 py-0.5 text-[10px] font-black rotate-6 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-md uppercase">
                  Sớm ra mắt
                </div>
              ) : isGameProGated ? (
                <div className="absolute -top-2.5 -right-2.5 bg-amber-500 text-slate-900 px-2 py-0.5 text-[10px] font-black rotate-6 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-md uppercase flex items-center gap-1">
                  <Crown size={10} /> Pro
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      {/* Configuration Modal */}
      {isConfigOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200"
        >
          <div className="neo-card bg-white max-w-2xl w-full border-4 border-slate-900 shadow-[8px_8px_0px_0px_#000] rounded-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b-4 border-slate-900 bg-[#432dd7] text-white flex justify-between items-center shrink-0">
              <h2 className="text-lg sm:text-xl font-black flex items-center gap-2">
                <Rocket className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-300" />
                <span>CẤU HÌNH TRÒ CHƠI NỐI TỪ</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsConfigOpen(false)}
                className="neo-button p-1.5 rounded-xl border-2 border-slate-900 bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <div className="overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* Validation Error Alert */}
              {validationError && (
                <div className="p-4 border-3 border-rose-600 bg-rose-50 text-rose-900 rounded-xl flex items-start gap-3 font-bold text-xs shadow-[3px_3px_0px_0px_#000]">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
                  <span className="leading-relaxed">{validationError}</span>
                </div>
              )}

              {/* Section 1: Vocabulary Source */}
              <section className="space-y-3">
                <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-purple-700" />
                  <span>Chọn Bộ Từ Vựng</span>
                </h3>
                {allowedDecksToShow.length === 0 && !isAllVocabularyAllowed ? (
                  <div className="p-4 border-2 border-dashed border-slate-400 text-center text-xs text-slate-500 font-bold rounded-xl bg-slate-50">
                    Không có bộ thẻ nào được phép chơi. Vui lòng liên hệ Admin cấu hình.
                  </div>
                ) : (
                  <div className="w-full">
                    <Select
                      value={selectedSource}
                      onChange={handleSourceChange}
                      options={selectOptions}
                      placeholder={loading ? "Đang tải dữ liệu..." : "Chọn bộ từ vựng..."}
                      disabled={loading}
                    />
                  </div>
                )}
              </section>

              {/* Section 2: Question Count */}
              <section className="space-y-3">
                <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
                  <Hash className="w-4 h-4 text-amber-600" />
                  <span>Số Lượng Câu Hỏi</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-3">
                  {(() => {
                    const getCount = () => {
                      if (selectedSource === 'all') return allTermsCount
                      const selectedDeck = decks.find((d) => d.id === selectedSource)
                      return selectedDeck?.term_count ?? 0
                    }
                    const sourceCount = getCount()

                    return [
                      { value: '5', label: '5 câu', time: '~1 phút' },
                      { value: '10', label: '10 câu', time: '~2 phút' },
                      { value: '20', label: '20 câu', time: '~5 phút' },
                      { value: 'all', label: 'Toàn bộ', time: `Tất cả (${sourceCount} câu)` },
                      { value: 'custom', label: 'Tùy chỉnh', time: 'Nhập số câu' },
                    ].map((opt) => {
                      const isAll = opt.value === 'all'
                      const allRequiresPro = isAll && sourceCount > 20
                      const hasAccess = !allRequiresPro || isPro

                      return (
                        <label
                          key={opt.value}
                          onClick={(e) => {
                            if (!hasAccess) {
                              e.preventDefault()
                              triggerProPrompt('để chơi chế độ Toàn bộ với bộ thẻ lớn hơn 20 từ')
                            } else {
                              setQuestionCountType(opt.value)
                            }
                          }}
                          className={cn(
                            'p-3 border-2 border-slate-900 rounded-xl text-center cursor-pointer transition-all block relative select-none shadow-[2px_2px_0px_0px_#000]',
                            questionCountType === opt.value
                              ? 'bg-[#fdc800] text-slate-900 font-black shadow-[3px_3px_0px_0px_#000]'
                              : 'bg-white text-slate-900 hover:bg-slate-50',
                            !hasAccess && 'opacity-80'
                          )}
                        >
                          <input
                            type="radio"
                            name="questionCount"
                            value={opt.value}
                            checked={questionCountType === opt.value}
                            disabled={!hasAccess}
                            onChange={() => setQuestionCountType(opt.value)}
                            className="sr-only"
                          />
                          <div className="font-black text-sm flex items-center justify-center gap-1">
                            <span>{opt.label}</span>
                            {allRequiresPro && (
                              <Crown size={14} className="text-amber-600 shrink-0" />
                            )}
                          </div>
                          <div className="text-[10px] text-slate-600 font-bold mt-0.5">{opt.time}</div>

                          {allRequiresPro && !isPro && (
                            <span className="absolute top-1 right-1 text-amber-900 bg-amber-200 px-1 border border-slate-900 rounded flex items-center gap-0.5 text-[8px] font-black uppercase">
                              Pro
                            </span>
                          )}
                        </label>
                      )
                    })
                  })()}
                </div>

                {/* Custom questions input */}
                {questionCountType === 'custom' && (
                  <div className="mt-3 p-4 bg-slate-50 border-2 border-slate-900 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[2px_2px_0px_0px_#000]">
                    <div className="space-y-0.5">
                      <label htmlFor="custom-count-input" className="text-xs font-black block text-slate-900">Nhập số câu hỏi:</label>
                      <span className="text-[10px] text-slate-600 font-bold block">
                        (Từ 5 đến 50 câu. Số lượng &gt; 20 yêu cầu PRO)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        id="custom-count-input"
                        type="number"
                        min="5"
                        max="50"
                        value={customQuestionCount}
                        onChange={(e) => {
                          const val = Number(e.target.value)
                          if (val > 20) {
                            handleProOptionClick(
                              e as any,
                              isPro,
                              () => setCustomQuestionCount(val),
                              'để mở khóa số lượng câu hỏi tùy chỉnh lớn hơn 20'
                            )
                          } else {
                            setCustomQuestionCount(val)
                          }
                        }}
                        className="neo-input w-28 bg-white border-2 border-slate-900 font-black text-center text-sm py-1.5 rounded-xl shadow-[2px_2px_0px_0px_#000]"
                      />
                      {!isPro && (
                        <span className="text-amber-900 bg-amber-200 px-2 py-1 border border-slate-900 rounded-lg flex items-center gap-1 text-[10px] font-black uppercase">
                          <Crown size={12} /> Pro
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </section>

              {/* Section 3: Review Settings */}
              <section className="space-y-3">
                <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-emerald-700" />
                  <span>Chế Độ Ôn Tập</span>
                </h3>
                <div className="space-y-2.5">
                  {/* Option: Repeat wrong terms */}
                  <label className="flex items-start gap-3 p-3.5 border-2 border-slate-900 rounded-xl cursor-pointer bg-white hover:bg-slate-50 transition-colors shadow-[2px_2px_0px_0px_#000] select-none">
                    <input
                      type="checkbox"
                      checked={repeatWrong}
                      onChange={(e) => setRepeatWrong(e.target.checked)}
                      className="w-5 h-5 accent-emerald-600 rounded border-2 border-slate-900 mt-0.5 cursor-pointer"
                    />
                    <div className="leading-tight">
                      <div className="font-black text-sm text-slate-900">Lặp lại từ sai (Recommended)</div>
                      <div className="text-[11px] text-slate-600 font-bold mt-0.5">
                        Từ bị nối sai sẽ tự động xuất hiện lại ở các vòng chơi sau cho tới khi bạn nối đúng.
                      </div>
                    </div>
                  </label>

                  {/* Option: Complete Shuffle */}
                  <label
                    onClick={(e) =>
                      handleProOptionClick(
                        e,
                        isPro,
                        () => setShuffleCompletely(!shuffleCompletely),
                        'để mở khóa tùy chọn Trộn ngẫu nhiên hoàn toàn'
                      )
                    }
                    className="flex items-start gap-3 p-3.5 border-2 border-slate-900 rounded-xl cursor-pointer bg-white hover:bg-slate-50 transition-colors shadow-[2px_2px_0px_0px_#000] relative select-none"
                  >
                    <input
                      type="checkbox"
                      checked={shuffleCompletely}
                      disabled={!isPro}
                      onChange={(e) => setShuffleCompletely(e.target.checked)}
                      className="w-5 h-5 accent-purple-600 rounded border-2 border-slate-900 mt-0.5 cursor-pointer disabled:opacity-50"
                    />
                    <div className="leading-tight">
                      <div className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                        <span>Trộn ngẫu nhiên hoàn toàn</span>
                        {!isPro && (
                          <span className="text-amber-900 bg-amber-200 px-1.5 py-0.5 border border-slate-900 rounded flex items-center gap-0.5 text-[9px] font-black uppercase">
                            <Crown size={10} /> Pro
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-600 font-bold mt-0.5">
                        Trộn ngẫu nhiên hoàn toàn các câu hỏi mà không ưu tiên lặp lại các từ sai.
                      </div>
                    </div>
                  </label>
                </div>
              </section>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t-4 border-slate-900 bg-slate-50 flex flex-col sm:flex-row gap-3 shrink-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsConfigOpen(false)}
                className="flex-1 py-3 font-black text-sm text-slate-700"
              >
                Hủy
              </Button>
              <Button
                type="button"
                onClick={handleStartGame}
                className="neo-button flex-[2] bg-[#fdc800] hover:bg-amber-300 py-3.5 font-black text-slate-900 text-sm border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-xl flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-slate-900" />
                <span>BẮT ĐẦU CHƠI</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Pro Gating Prompt Modal */}
      <ConfirmModal
        open={isProPromptOpen}
        title="Tính năng giới hạn gói Pro"
        description={`Vui lòng nâng cấp gói dịch vụ Pro ${proPromptReason}. Bạn sẽ được thêm từ vựng, bộ thẻ và mở khóa tất cả chế độ trò chơi không giới hạn!`}
        confirmLabel="Nâng cấp ngay — 49k/tháng 👑"
        cancelLabel="Để sau"
        onConfirm={() => {
          setIsProPromptOpen(false)
          navigate('/app/upgrade')
        }}
        onCancel={() => setIsProPromptOpen(false)}
        variant="primary"
      />
    </div>
  )
}
