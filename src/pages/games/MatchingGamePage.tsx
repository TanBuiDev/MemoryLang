import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { deckService } from '@/services/supabase/deck.service'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import type { VocabularyItem } from '@/types/vocabulary.types'
import { speak } from '@/utils/audio'
import { soundEffects } from '@/utils/soundEffects'
import { useSoundStore } from '@/stores/useSoundStore'
import { shuffle } from '@/utils/shuffle'
import { motion } from 'framer-motion'
import {
  Gamepad2,
  ArrowLeft,
  XCircle,
  Trophy,
  Clock,
  Sparkles,
  BookOpen,
  Check,
  Volume2,
  VolumeX,
  RotateCcw,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { ConfirmModal } from '@/components/ui/confirm-modal'

interface GameStats {
  accuracy: number
  elapsedSeconds: number
  xpEarned: number
  totalCorrect: number
  totalWrong: number
}

const PAIR_COLORS = [
  { bg: 'bg-emerald-100', border: 'border-emerald-500', text: 'text-emerald-900' },
  { bg: 'bg-purple-100', border: 'border-purple-500', text: 'text-purple-900' },
  { bg: 'bg-amber-100', border: 'border-amber-500', text: 'text-amber-900' },
  { bg: 'bg-rose-100', border: 'border-rose-500', text: 'text-rose-900' },
  { bg: 'bg-sky-100', border: 'border-sky-500', text: 'text-sky-900' },
]

export default function MatchingGamePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const user = useAuthStore((s) => s.user)

  // Query parameters
  const deckId = searchParams.get('source') || 'all'
  const countParam = searchParams.get('count') || '10'
  const totalQuestions = countParam === 'all' ? Infinity : Number(countParam)
  const repeatWrong = searchParams.get('repeatWrong') !== 'false' // default true
  const shuffleMode = searchParams.get('shuffle') !== 'false' // default true

  // Confirm modal state
  const [isConfirmExitOpen, setIsConfirmExitOpen] = useState(false)

  // Sound Effects state
  const { sfxEnabled, toggleSfx } = useSoundStore()

  useEffect(() => {
    const cleanup = soundEffects.initMobileUnlock()
    return () => cleanup()
  }, [])

  // Game data queue states
  const [allPoolTerms, setAllPoolTerms] = useState<VocabularyItem[]>([])
  const [currentQueue, setCurrentQueue] = useState<VocabularyItem[]>([]) // Remaining new terms
  const [failedQueue, setFailedQueue] = useState<VocabularyItem[]>([]) // Accumulated wrong terms
  const [reviewedTerms, setReviewedTerms] = useState<Set<string>>(new Set())

  // Current round state (Max 5 items)
  const [leftItems, setLeftItems] = useState<VocabularyItem[]>([])
  const [rightItems, setRightItems] = useState<VocabularyItem[]>([]) // Matched row-by-row on right
  const [matchedSlots, setMatchedSlots] = useState<Set<number>>(new Set())
  const [roundIncorrectIds, setRoundIncorrectIds] = useState<Set<string>>(new Set())

  // Selections
  const [selectedLeftIndex, setSelectedLeftIndex] = useState<number | null>(null)
  const [selectedRightIndex, setSelectedRightIndex] = useState<number | null>(null)

  // Game phase
  const [phase, setPhase] = useState<'loading' | 'matching' | 'reviewing' | 'finished'>('loading')

  // Stats
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)
  const [startTime, setStartTime] = useState<number>(() => Date.now())
  const [finalStats, setFinalStats] = useState<GameStats | null>(null)

  const sessionKey = `matching_game_session_${deckId}_${countParam}_${repeatWrong}`

  // Load vocabulary or restore session
  useEffect(() => {
    async function loadVocabularyOrRestore() {
      if (!user) return
      try {
        setPhase('loading')

        // 1. Try to restore session first
        const savedSessionStr = sessionStorage.getItem(sessionKey)
        if (savedSessionStr) {
          try {
            const saved = JSON.parse(savedSessionStr)
            setAllPoolTerms(saved.allPoolTerms || [])
            setLeftItems(saved.leftItems || [])
            setRightItems(saved.rightItems || [])
            setMatchedSlots(new Set(saved.matchedSlots || []))
            setRoundIncorrectIds(new Set(saved.roundIncorrectIds || []))
            setCurrentQueue(saved.currentQueue || [])
            setFailedQueue(saved.failedQueue || [])
            setReviewedTerms(new Set(saved.reviewedTerms || []))
            setCorrectCount(saved.correctCount || 0)
            setWrongCount(saved.wrongCount || 0)
            setStartTime(saved.startTime || Date.now())
            setPhase(saved.phase || 'matching')
            return // Successfully restored!
          } catch (e) {
            console.error('Failed to parse saved matching game session:', e)
            sessionStorage.removeItem(sessionKey) // Clear corrupted session
          }
        }

        // 2. Fetch new game if no session restored
        let terms: VocabularyItem[] = []
        if (deckId === 'all') {
          terms = await vocabularyService.list(user.id)
        } else {
          terms = await deckService.listTerms(deckId)
        }

        // Filter valid translation terms
        const validTerms = terms.filter(
          (t) => t.source_text.trim() && (t.translation || '').trim()
        )

        // Shuffle initial pool if requested
        let pool = [...validTerms]
        if (shuffleMode) {
          pool = shuffle(pool)
        }

        // Limit the pool to the totalQuestions size
        const activePool = pool.slice(0, totalQuestions)
        setAllPoolTerms(activePool)

        // Initialize queue and first round
        startFirstRound(activePool)
      } catch (err) {
        console.error('Failed to load terms for matching game:', err)
        navigate('/app/games')
      }
    }
    void loadVocabularyOrRestore()
  }, [user, deckId, totalQuestions])

  // Save state to sessionStorage
  useEffect(() => {
    if (phase === 'loading') return

    if (phase === 'finished') {
      sessionStorage.removeItem(sessionKey)
      return
    }

    const stateToSave = {
      allPoolTerms,
      leftItems,
      rightItems,
      matchedSlots: Array.from(matchedSlots),
      roundIncorrectIds: Array.from(roundIncorrectIds),
      currentQueue,
      failedQueue,
      reviewedTerms: Array.from(reviewedTerms),
      correctCount,
      wrongCount,
      phase,
      startTime,
    }

    sessionStorage.setItem(sessionKey, JSON.stringify(stateToSave))
  }, [
    phase,
    allPoolTerms,
    leftItems,
    rightItems,
    matchedSlots,
    roundIncorrectIds,
    currentQueue,
    failedQueue,
    reviewedTerms,
    correctCount,
    wrongCount,
    startTime,
    sessionKey,
  ])

  const startFirstRound = (pool: VocabularyItem[]) => {
    const firstFive = pool.slice(0, 5)
    const remaining = pool.slice(5)

    setCurrentQueue(remaining)
    setupRound(firstFive)
  }

  const setupRound = (roundTerms: VocabularyItem[]) => {
    setLeftItems(roundTerms)

    // Right column items are shuffled translation equivalents
    const rightShuffled = shuffle([...roundTerms])
    setRightItems(rightShuffled)

    setMatchedSlots(new Set())
    setSelectedLeftIndex(null)
    setSelectedRightIndex(null)
    setRoundIncorrectIds(new Set())
    setPhase('matching')

    // Add to reviewed terms list
    const newReviewed = new Set(reviewedTerms)
    roundTerms.forEach((t) => newReviewed.add(t.id))
    setReviewedTerms(newReviewed)
  }

  const handleRestartGame = () => {
    sessionStorage.removeItem(sessionKey)
    setCorrectCount(0)
    setWrongCount(0)
    setFailedQueue([])
    setReviewedTerms(new Set())
    setStartTime(Date.now())

    let pool = [...allPoolTerms]
    if (shuffleMode) {
      pool = shuffle(pool)
    }
    startFirstRound(pool)
  }

  // Handle card selections
  const handleLeftClick = (index: number) => {
    if (phase !== 'matching') return
    soundEffects.play('cardClick')

    // If the clicked card is already matched, unmatch it first
    if (matchedSlots.has(index)) {
      const newMatched = new Set(matchedSlots)
      newMatched.delete(index)
      setMatchedSlots(newMatched)
    }

    if (selectedLeftIndex === index) {
      setSelectedLeftIndex(null)
    } else {
      setSelectedLeftIndex(index)
      
      // Auto play pronunciation of the selected English card
      const item = leftItems[index]
      if (item) {
        speak(item.source_text, {
          audioUrl: item.audio_url,
          globalTermId: item.id,
        })
      }

      // If right was already selected, execute the swap/match
      if (selectedRightIndex !== null) {
        executeSwap(index, selectedRightIndex)
      }
    }
  }

  const handleRightClick = (index: number) => {
    if (phase !== 'matching') return
    soundEffects.play('cardClick')

    // If the clicked card is already matched, unmatch it first
    if (matchedSlots.has(index)) {
      const newMatched = new Set(matchedSlots)
      newMatched.delete(index)
      setMatchedSlots(newMatched)
    }

    if (selectedRightIndex === index) {
      setSelectedRightIndex(null)
    } else {
      setSelectedRightIndex(index)
      // If left was already selected, execute the swap/match
      if (selectedLeftIndex !== null) {
        executeSwap(selectedLeftIndex, index)
      }
    }
  }

  const executeSwap = (leftIdx: number, rightIdx: number) => {
    soundEffects.play('lineConnect')
    const newRight = [...rightItems]
    const temp = newRight[leftIdx]
    newRight[leftIdx] = newRight[rightIdx]
    newRight[rightIdx] = temp

    setRightItems(newRight)

    // Mark slot as matched
    const newMatched = new Set(matchedSlots)
    newMatched.add(leftIdx)
    setMatchedSlots(newMatched)

    // Clear selections
    setSelectedLeftIndex(null)
    setSelectedRightIndex(null)
  }

  const handleCheckResults = () => {
    let roundCorrect = 0
    let roundWrong = 0
    const roundFailed: VocabularyItem[] = []
    const roundIncorrectSet = new Set<string>()

    leftItems.forEach((item, index) => {
      const match = rightItems[index]
      if (item.id === match.id) {
        roundCorrect++
      } else {
        roundWrong++
        roundFailed.push(item)
        roundIncorrectSet.add(item.id)
      }
    })

    if (roundWrong === 0 || roundCorrect >= roundWrong) {
      soundEffects.play('matchSuccess')
    } else {
      soundEffects.play('matchError')
    }

    setCorrectCount((prev) => prev + roundCorrect)
    setWrongCount((prev) => prev + roundWrong)

    if (repeatWrong) {
      setFailedQueue((prev) => [...prev, ...roundFailed])
    }

    setRoundIncorrectIds(roundIncorrectSet)

    // Reorder rightItems to match leftItems correctly
    const correctedRight = leftItems.map((leftItem) => {
      return rightItems.find((r) => r.id === leftItem.id) || rightItems[0]
    })
    setRightItems(correctedRight)

    setPhase('reviewing')
  }

  const handleNextRound = () => {
    // Determine the next round items:
    const uniqueFailed = Array.from(new Set(failedQueue))
    
    // Clear failedQueue since they will either be placed in this round, 
    // or queued again if matched wrong in this round.
    setFailedQueue([])

    const needed = 5
    const nextRoundTerms: VocabularyItem[] = []

    // 1. Take from failed queue first
    const fromFailed = uniqueFailed.slice(0, needed)
    nextRoundTerms.push(...fromFailed)

    // 2. Take from current queue to fill the rest
    const remainingNeeded = needed - nextRoundTerms.length
    if (remainingNeeded > 0 && currentQueue.length > 0) {
      const fromQueue = currentQueue.slice(0, remainingNeeded)
      nextRoundTerms.push(...fromQueue)
      setCurrentQueue((prev) => prev.slice(remainingNeeded))
    }

    // 3. Put any leftover failed terms back to failed queue
    const leftoverFailed = uniqueFailed.slice(needed)
    if (leftoverFailed.length > 0) {
      setFailedQueue((prev) => [...prev, ...leftoverFailed])
    }

    if (nextRoundTerms.length === 0) {
      // Game Over
      handleFinishGame()
    } else {
      setupRound(nextRoundTerms)
    }
  }

  const handleFinishGame = () => {
    soundEffects.play('roundComplete')
    const elapsedSeconds = Math.round((Date.now() - startTime) / 1000)
    const totalAnswered = correctCount + wrongCount
    const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0

    // XP calculation: 50 XP base, +10 XP for each correct match
    const xpEarned = 50 + correctCount * 10

    setFinalStats({
      accuracy,
      elapsedSeconds,
      xpEarned,
      totalCorrect: correctCount,
      totalWrong: wrongCount,
    })
    setPhase('finished')
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="w-12 h-12 border-4 border-slate-900 border-t-amber-400 rounded-full animate-spin"></div>
        <p className="text-sm font-black text-slate-700">Đang chuẩn bị bộ thẻ ghép từ vựng...</p>
      </div>
    )
  }

  if (phase === 'finished' && finalStats) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header Success Card */}
        <div className="neo-card p-6 md:p-8 bg-[#22c55e] text-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_#000] text-center space-y-4 rounded-2xl">
          <div className="w-16 h-16 bg-[#fdc800] rounded-2xl border-3 border-slate-900 flex items-center justify-center mx-auto shadow-[3px_3px_0px_0px_#000] animate-bounce text-slate-900">
            <Trophy className="w-8 h-8 text-slate-900" />
          </div>
          <div>
            <h1 className="text-3xl font-black">HOÀN THÀNH THỬ THÁCH!</h1>
            <p className="text-sm font-bold text-green-100 mt-1">
              Bạn đã xuất sắc kết nối và củng cố toàn bộ từ vựng!
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="neo-card p-4 bg-white border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] text-center rounded-xl">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Độ chính xác</span>
            <div className="text-2xl sm:text-3xl font-black text-purple-700 mt-1">{finalStats.accuracy}%</div>
          </div>
          <div className="neo-card p-4 bg-white border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] text-center rounded-xl">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Thời gian</span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 flex items-center justify-center gap-1">
              <Clock className="w-5 h-5 text-slate-500" />
              {formatTime(finalStats.elapsedSeconds)}
            </div>
          </div>
          <div className="neo-card p-4 bg-white border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] text-center rounded-xl">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Điểm XP</span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1 flex items-center justify-center gap-1">
              <Sparkles className="w-5 h-5 text-amber-500" />
              +{finalStats.xpEarned}
            </div>
          </div>
        </div>

        {/* Words Reviewed Table */}
        <div className="neo-card p-6 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_#000] space-y-4 rounded-2xl">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#432dd7]" />
            Các từ vựng đã ôn ({reviewedTerms.size})
          </h2>

          <div className="border-2 border-slate-900 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-amber-100 border-b-2 border-slate-900 text-slate-900">
                  <th className="p-3 text-xs font-black uppercase">Từ tiếng Anh</th>
                  <th className="p-3 text-xs font-black uppercase">Nghĩa tiếng Việt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {allPoolTerms.map((term) => (
                  <tr key={term.id} className="hover:bg-slate-50">
                    <td className="p-3 font-black text-sm text-slate-900">
                      {term.source_text} <span className="text-xs text-purple-700 font-mono font-bold ml-1">{term.ipa}</span>
                    </td>
                    <td className="p-3 text-xs text-slate-700 font-bold">
                      {term.translation}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleRestartGame}
            className="neo-button flex-1 bg-[#fdc800] hover:bg-amber-300 py-3.5 px-4 font-black text-slate-900 border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-xl flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            Chơi lại lượt mới
          </button>
          <button
            onClick={() => navigate('/app/games')}
            className="neo-button flex-1 bg-white hover:bg-slate-100 py-3.5 px-4 font-black text-slate-900 border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-xl flex items-center justify-center gap-2"
          >
            <Gamepad2 className="w-5 h-5" />
            Trở lại Game Hub
          </button>
        </div>
      </div>
    )
  }

  // Active Game Round Rendering
  const allMatched = matchedSlots.size === leftItems.length

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Main Game Card with Compact Integrated Control Header */}
      <div className="neo-card p-4 sm:p-6 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_#000] space-y-5 rounded-2xl">
        
        {/* Compact Integrated Header (Exit, Sound, Title, Stats) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b-3 border-slate-900">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                soundEffects.play('modalOpen')
                setIsConfirmExitOpen(true)
              }}
              className="neo-button py-1.5 px-3 flex items-center gap-1.5 text-xs font-black border-2 border-slate-900 bg-white shadow-[2px_2px_0px_0px_#000] rounded-lg text-slate-900 hover:bg-slate-100 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Rời trò chơi
            </button>

            <button
              onClick={toggleSfx}
              title={sfxEnabled ? 'Tắt hiệu ứng âm thanh' : 'Bật hiệu ứng âm thanh'}
              className={cn(
                'neo-button p-1.5 text-xs font-black border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-lg transition-colors',
                sfxEnabled ? 'bg-amber-300 text-slate-900' : 'bg-slate-200 text-slate-500'
              )}
            >
              {sfxEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-1.5 ml-1 sm:ml-2">
              <Gamepad2 className="w-5 h-5 text-amber-500" />
              NỐI TỪ & CỦNG CỐ PHẢN XẠ
            </h2>
          </div>

          {/* Compact Stats Info */}
          <div className="text-xs font-black text-slate-900 flex items-center gap-3 bg-amber-50 border-2 border-slate-900 px-3 py-1.5 rounded-xl shadow-[2px_2px_0px_0px_#000]">
            <span>Đúng: <span className="text-emerald-600 font-black">{correctCount}</span></span>
            <span>Sai: <span className="text-rose-600 font-black">{wrongCount}</span></span>
            {repeatWrong && (
              <span className="bg-amber-200 text-amber-900 border border-slate-900 px-2 py-0.5 rounded font-black text-[10px] uppercase">
                Cần ôn tập: {failedQueue.length} từ
              </span>
            )}
          </div>
        </div>

        {/* Game Matching Layout Container */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 relative">
          {/* Column Headers */}
          <div className="text-center text-xs font-black uppercase text-slate-500 tracking-wider col-span-1">
            Từ tiếng Anh
          </div>
          <div className="text-center text-xs font-black uppercase text-slate-500 tracking-wider col-span-1">
            Nghĩa tiếng Việt
          </div>

          {/* Cards Grid */}
          {leftItems.flatMap((leftItem, index) => {
            const rightItem = rightItems[index]
            if (!rightItem) return []

            // Render Left Card (English)
            const renderLeftCard = (item: VocabularyItem, index: number) => {
              const isSelected = selectedLeftIndex === index
              const isMatched = matchedSlots.has(index)
              const pairColor = PAIR_COLORS[index % PAIR_COLORS.length]

              let stateClasses = ''
              if (phase === 'reviewing') {
                if (roundIncorrectIds.has(item.id)) {
                  stateClasses = 'bg-rose-100 border-rose-500 text-rose-950'
                } else {
                  stateClasses = 'bg-emerald-100 border-emerald-500 text-emerald-950'
                }
              } else if (isSelected) {
                stateClasses = 'bg-[#fdc800] border-slate-900 translate-x-[2px] translate-y-[2px] shadow-none font-black ring-3 ring-amber-400/40 text-slate-900'
              } else if (isMatched) {
                stateClasses = `${pairColor.bg} ${pairColor.border} ${pairColor.text}`
              } else {
                stateClasses = 'bg-white border-slate-900 text-slate-900'
              }

              return (
                <motion.div
                  whileHover={!isSelected && phase === 'matching' ? { scale: 1.015, x: 3 } : {}}
                  whileTap={!isSelected && phase === 'matching' ? { scale: 0.985 } : {}}
                  animate={phase === 'reviewing' && roundIncorrectIds.has(item.id) ? { x: [-4, 4, -4, 4, 0] } : {}}
                  transition={{ duration: 0.3 }}
                  key={`left-${item.id}`}
                  onClick={() => handleLeftClick(index)}
                  className={cn(
                    'border-3 rounded-xl transition-colors duration-150 cursor-pointer relative min-h-[84px] flex flex-col justify-between shadow-[3px_3px_0px_0px_#000] h-full overflow-hidden',
                    stateClasses
                  )}
                >
                  <div className="flex-1 p-2.5 flex flex-col justify-center">
                    <span className="font-black text-sm block md:text-base leading-tight">{item.source_text}</span>
                    {item.ipa && (
                      <span className="text-xs text-purple-700 font-mono font-bold mt-1 block">
                        {item.ipa}
                      </span>
                    )}
                  </div>

                  {/* Row 2: Part of speech & Vibrant Speaker Button */}
                  <div className="border-t-2 border-dashed border-slate-900/20 bg-slate-900/5 flex items-stretch justify-between select-none">
                    <div className="px-2.5 py-1 text-slate-700 uppercase text-[9px] font-black tracking-wider flex items-center">
                      {item.part_of_speech
                        ? item.part_of_speech.split(',').map((s) => s.trim()).join(' / ')
                        : 'VOCABULARY'}
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation()
                        speak(item.source_text, {
                          audioUrl: item.audio_url,
                          globalTermId: item.id,
                        })
                      }}
                      className="border-l-2 border-slate-900 bg-[#fdc800] text-slate-900 px-2.5 py-1 hover:bg-amber-300 active:bg-amber-400 transition-colors flex items-center justify-center cursor-pointer font-black"
                      title="Phát âm"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                </motion.div>
              )
            }

            // Render Right Card (Vietnamese)
            const renderRightCard = (item: VocabularyItem, index: number) => {
              const isSelected = selectedRightIndex === index
              const isMatched = matchedSlots.has(index)
              const pairColor = PAIR_COLORS[index % PAIR_COLORS.length]

              let stateClasses = ''
              if (phase === 'reviewing') {
                if (roundIncorrectIds.has(item.id)) {
                  stateClasses = 'bg-rose-100 border-rose-500 text-rose-950'
                } else {
                  stateClasses = 'bg-emerald-100 border-emerald-500 text-emerald-950'
                }
              } else if (isSelected) {
                stateClasses = 'bg-[#fdc800] border-slate-900 translate-x-[2px] translate-y-[2px] shadow-none font-black ring-3 ring-amber-400/40 text-slate-900'
              } else if (isMatched) {
                stateClasses = `${pairColor.bg} ${pairColor.border} ${pairColor.text}`
              } else {
                stateClasses = 'bg-white border-slate-900 text-slate-900'
              }

              return (
                <motion.div
                  layout
                  whileHover={!isSelected && phase === 'matching' ? { scale: 1.015, x: -3 } : {}}
                  whileTap={!isSelected && phase === 'matching' ? { scale: 0.985 } : {}}
                  animate={phase === 'reviewing' && roundIncorrectIds.has(item.id) ? { x: [-4, 4, -4, 4, 0] } : {}}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  key={`right-${item.id}`}
                  onClick={() => handleRightClick(index)}
                  className={cn(
                    'p-3 border-3 rounded-xl transition-colors duration-150 cursor-pointer relative min-h-[84px] flex flex-col justify-center shadow-[3px_3px_0px_0px_#000] h-full',
                    stateClasses
                  )}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs md:text-sm leading-snug line-clamp-3">
                      {item.translation}
                    </span>

                    {/* Correct/Incorrect Icons */}
                    {phase === 'reviewing' && (
                      <span className="shrink-0 ml-1.5">
                        {roundIncorrectIds.has(item.id) ? (
                          <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                        ) : (
                          <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                        )}
                      </span>
                    )}
                  </div>
                </motion.div>
              )
            }

            return [
              renderLeftCard(leftItem, index),
              renderRightCard(rightItem, index)
            ]
          })}
        </div>

        {/* Match Check & Progress Actions */}
        <div className="border-t-3 border-slate-900 pt-5 flex flex-col items-center gap-3">
          {phase === 'matching' && (
            <span className="text-xs font-black text-slate-700 bg-amber-100 border border-slate-900 px-3 py-1 rounded-full shadow-[2px_2px_0px_0px_#000]">
              Đã ghép: {matchedSlots.size}/{leftItems.length} cặp 🧩
            </span>
          )}

          {phase === 'matching' ? (
            <button
              onClick={handleCheckResults}
              disabled={!allMatched}
              className={cn(
                'neo-button px-8 py-3 text-base font-black text-center border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-xl transition-all',
                allMatched
                  ? 'bg-[#fdc800] hover:bg-amber-300 text-slate-900 cursor-pointer active:neo-button-active'
                  : 'bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed shadow-none border-slate-400'
              )}
            >
              Kiểm tra kết quả
            </button>
          ) : (
            <button
              onClick={() => {
                const nextQueueSize = currentQueue.length + (repeatWrong ? failedQueue.length : 0)
                if (nextQueueSize === 0) {
                  handleFinishGame()
                } else {
                  handleNextRound()
                }
              }}
              className="neo-button px-8 py-3 bg-[#fdc800] hover:bg-amber-300 text-base font-black text-slate-900 border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-xl active:neo-button-active transition-all"
            >
              Tiếp tục ➔
            </button>
          )}
        </div>
      </div>

      <ConfirmModal
        open={isConfirmExitOpen}
        title="Rời trò chơi"
        description="Bạn có chắc chắn muốn rời khỏi trò chơi hiện tại? Tiến trình chơi sẽ không được lưu."
        confirmLabel="Rời đi"
        cancelLabel="Ở lại"
        onConfirm={() => {
          soundEffects.play('modalClose')
          sessionStorage.removeItem(sessionKey)
          navigate('/app/games')
        }}
        onCancel={() => {
          soundEffects.play('modalClose')
          setIsConfirmExitOpen(false)
        }}
        variant="danger"
      />
    </div>
  )
}
