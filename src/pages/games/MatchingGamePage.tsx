import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { deckService } from '@/services/supabase/deck.service'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import type { VocabularyItem } from '@/types/vocabulary.types'
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

export default function MatchingGamePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const user = useAuthStore((s) => s.user)

  // Query parameters
  const deckId = searchParams.get('source') || 'all'
  const countParam = searchParams.get('count') || '10'
  const totalQuestions = countParam === 'all' ? Infinity : Number(countParam)
  const repeatWrong = searchParams.get('repeatWrong') !== 'false' // default true
  const shuffleMode = searchParams.get('shuffle') === 'true' // default false

  // Confirm modal state
  const [isConfirmExitOpen, setIsConfirmExitOpen] = useState(false)

  // Game data queue states
  const [allPoolTerms, setAllPoolTerms] = useState<VocabularyItem[]>([])
  const [currentQueue, setCurrentQueue] = useState<VocabularyItem[]>([]) // Remaining new terms
  const [failedQueue, setFailedQueue] = useState<VocabularyItem[]>([]) // Accumulated wrong terms
  const [reviewedTerms, setReviewedTerms] = useState<Set<string>>(new Set())

  // Current round state (Max 5 items)
  const [leftItems, setLeftItems] = useState<VocabularyItem[]>([])
  const [rightItems, setRightItems] = useState<VocabularyItem[]>([]) // Matched row-by-row on right
  const [matchedSlots, setMatchedSlots] = useState<Set<number>>(new Set())

  // Selections
  const [selectedLeftIndex, setSelectedLeftIndex] = useState<number | null>(null)
  const [selectedRightIndex, setSelectedRightIndex] = useState<number | null>(null)

  // Game phase
  const [phase, setPhase] = useState<'loading' | 'matching' | 'reviewing' | 'finished'>('loading')

  // Stats
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)
  const [startTime] = useState<number>(() => Date.now())
  const [finalStats, setFinalStats] = useState<GameStats | null>(null)

  // Load vocabulary
  useEffect(() => {
    async function loadVocabulary() {
      if (!user) return
      try {
        setPhase('loading')
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
        if (shuffleMode || deckId === 'all') {
          pool.sort(() => Math.random() - 0.5)
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
    void loadVocabulary()
  }, [user, deckId, totalQuestions])

  const startFirstRound = (pool: VocabularyItem[]) => {
    const firstFive = pool.slice(0, 5)
    const remaining = pool.slice(5)

    setCurrentQueue(remaining)
    setupRound(firstFive)
  }

  const setupRound = (roundTerms: VocabularyItem[]) => {
    setLeftItems(roundTerms)

    // Right column items are shuffled translation equivalents
    const rightShuffled = [...roundTerms].sort(() => Math.random() - 0.5)
    setRightItems(rightShuffled)

    setMatchedSlots(new Set())
    setSelectedLeftIndex(null)
    setSelectedRightIndex(null)
    setPhase('matching')

    // Add to reviewed terms list
    const newReviewed = new Set(reviewedTerms)
    roundTerms.forEach((t) => newReviewed.add(t.id))
    setReviewedTerms(newReviewed)
  }

  // Handle card selections
  const handleLeftClick = (index: number) => {
    if (phase !== 'matching') return
    if (selectedLeftIndex === index) {
      setSelectedLeftIndex(null)
    } else {
      setSelectedLeftIndex(index)
      // If right was already selected, execute the swap/match
      if (selectedRightIndex !== null) {
        executeSwap(index, selectedRightIndex)
      }
    }
  }

  const handleRightClick = (index: number) => {
    if (phase !== 'matching') return
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
    setPhase('reviewing')

    let roundCorrect = 0
    let roundWrong = 0
    const roundFailed: VocabularyItem[] = []

    leftItems.forEach((item, index) => {
      const match = rightItems[index]
      if (item.id === match.id) {
        roundCorrect++
      } else {
        roundWrong++
        roundFailed.push(item)
      }
    })

    setCorrectCount((prev) => prev + roundCorrect)
    setWrongCount((prev) => prev + roundWrong)

    if (repeatWrong) {
      setFailedQueue((prev) => [...prev, ...roundFailed])
    }
  }

  const handleNextRound = () => {
    // Determine the next round items:
    // We need 5 items. We pull from failedQueue first, then currentQueue.
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
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-bold text-muted-foreground">Đang tải bộ từ vựng...</p>
      </div>
    )
  }

  if (phase === 'finished' && finalStats) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header Success Card */}
        <div className="neo-card p-6 md:p-8 bg-[#22c55e] text-white border-4 border-[#1c293c] shadow-[6px_6px_0px_0px_#1c293c] text-center space-y-4">
          <div className="w-16 h-16 bg-[#fdc800] rounded-full border-4 border-[#1c293c] flex items-center justify-center mx-auto shadow-[3px_3px_0px_0px_#1c293c] animate-bounce">
            <Trophy className="w-8 h-8 text-[#1c293c]" />
          </div>
          <div>
            <h1 className="text-3xl font-black">HOÀN THÀNH THỬ THÁCH!</h1>
            <p className="text-sm font-bold text-green-100">
              Bạn đã xuất sắc kết nối và củng cố toàn bộ từ vựng!
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="neo-card p-4 bg-background border-4 border-[#1c293c] shadow-[4px_4px_0px_0px_#1c293c] text-center">
            <span className="text-[10px] font-black uppercase text-muted-foreground">Độ chính xác</span>
            <div className="text-2xl font-black text-primary mt-1">{finalStats.accuracy}%</div>
          </div>
          <div className="neo-card p-4 bg-background border-4 border-[#1c293c] shadow-[4px_4px_0px_0px_#1c293c] text-center">
            <span className="text-[10px] font-black uppercase text-muted-foreground">Thời gian</span>
            <div className="text-2xl font-black text-navy mt-1 flex items-center justify-center gap-1">
              <Clock className="w-5 h-5 text-muted-foreground" />
              {formatTime(finalStats.elapsedSeconds)}
            </div>
          </div>
          <div className="neo-card p-4 bg-background border-4 border-[#1c293c] shadow-[4px_4px_0px_0px_#1c293c] text-center">
            <span className="text-[10px] font-black uppercase text-muted-foreground">Điểm XP</span>
            <div className="text-2xl font-black text-emerald-600 mt-1 flex items-center justify-center gap-1">
              <Sparkles className="w-5 h-5 text-emerald-500" />
              +{finalStats.xpEarned}
            </div>
          </div>
        </div>

        {/* Words Reviewed */}
        <div className="neo-card p-6 bg-background border-4 border-[#1c293c] shadow-[6px_6px_0px_0px_#1c293c] space-y-4">
          <h2 className="text-lg font-black flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Các từ vựng đã ôn ({reviewedTerms.size})
          </h2>

          <div className="border-2 border-[#1c293c] rounded-md overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted border-b-2 border-[#1c293c]">
                  <th className="p-3 text-xs font-black uppercase">Từ tiếng Anh</th>
                  <th className="p-3 text-xs font-black uppercase">Nghĩa tiếng Việt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c293c]/20">
                {allPoolTerms.map((term) => (
                  <tr key={term.id} className="hover:bg-muted/20">
                    <td className="p-3 font-bold text-sm">
                      {term.source_text} <span className="text-[10px] text-muted-foreground font-semibold">{term.ipa}</span>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground font-semibold">
                      {term.translation}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/app/games')}
            className="neo-button flex-1 bg-yellow-400 hover:bg-yellow-300 py-3 font-black text-navy border-2 border-border shadow-[4px_4px_0px_0px_#1c293c]"
          >
            Trở lại Game Hub
          </button>
        </div>
      </div>
    )
  }

  // Active Game Round Rendering
  const allMatched = matchedSlots.size === leftItems.length

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setIsConfirmExitOpen(true)}
          className="neo-button py-2 px-3 flex items-center gap-1.5 text-xs font-black border-2 border-border"
        >
          <ArrowLeft className="w-4 h-4" />
          Rời trò chơi
        </button>

        {/* Progress Text */}
        <div className="text-xs font-black text-muted-foreground flex items-center gap-4">
          <span>Đúng: <span className="text-emerald-600">{correctCount}</span></span>
          <span>Sai: <span className="text-rose-600">{wrongCount}</span></span>
          {repeatWrong && (
            <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded font-black text-[10px] uppercase">
              Cần ôn tập: {failedQueue.length} từ
            </span>
          )}
        </div>
      </div>

      {/* Main Game Card */}
      <div className="neo-card p-6 bg-background border-4 border-[#1c293c] shadow-[6px_6px_0px_0px_#1c293c] space-y-6">
        {/* Game Title */}
        <div className="text-center pb-4 border-b-2 border-dashed border-[#1c293c]/30">
          <h2 className="text-xl font-black text-primary flex items-center justify-center gap-1.5">
            <Gamepad2 className="w-5 h-5 text-yellow-500" />
            NỐI TỪ & CỦNG CỐ PHẢN XẠ
          </h2>
          <p className="text-xs text-muted-foreground font-semibold mt-1">
            Chọn một từ ở cột trái và một nghĩa ở cột phải để ghép cặp. Thẻ bên phải sẽ tự động di chuyển lên đối diện.
          </p>
        </div>

        {/* Game Matching Layout Container */}
        <div className="grid grid-cols-2 gap-4 relative md:px-4">
          {/* Column Left: English words */}
          <div className="space-y-4">
            <h3 className="text-center text-xs font-black uppercase text-muted-foreground tracking-wider mb-2">
              Từ tiếng Anh
            </h3>
            {leftItems.map((item, index) => {
              const isSelected = selectedLeftIndex === index
              const isMatched = matchedSlots.has(index)
              const matchRightItem = rightItems[index]

              // Review borders
              let reviewBorder = 'border-[#1c293c]'
              let reviewBg = 'bg-background'
              if (phase === 'reviewing') {
                if (item.id === matchRightItem.id) {
                  reviewBorder = 'border-green-500'
                  reviewBg = 'bg-green-50/50'
                } else {
                  reviewBorder = 'border-rose-500'
                  reviewBg = 'bg-rose-50/50'
                }
              }

              return (
                <div
                  key={`left-${item.id}-${index}`}
                  onClick={() => handleLeftClick(index)}
                  className={cn(
                    'p-4 border-2 rounded-md transition-all cursor-pointer relative min-h-[72px] flex flex-col justify-center shadow-[3px_3px_0px_0px_#1c293c]',
                    isSelected && 'bg-yellow-50 border-yellow-500 translate-x-[2px] translate-y-[2px] shadow-none',
                    isMatched && !isSelected && 'bg-indigo-50/30 border-indigo-400',
                    reviewBorder,
                    reviewBg
                  )}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-black text-sm block md:text-base">{item.source_text}</span>
                      {item.ipa && (
                        <span className="text-[10px] text-muted-foreground font-mono mt-0.5 block">
                          {item.ipa}
                        </span>
                      )}
                    </div>

                    {item.part_of_speech && (
                      <span className="text-[8px] md:text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-900 border border-indigo-300">
                        {item.part_of_speech}
                      </span>
                    )}
                  </div>

                  {/* Correct translation helper on review */}
                  {phase === 'reviewing' && item.id !== matchRightItem.id && (
                    <div className="mt-2 text-[10px] font-black text-emerald-600 border-t border-dashed border-[#1c293c]/10 pt-1">
                      ✓ Đúng: {item.translation}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Column Right: Vietnamese translations */}
          <div className="space-y-4">
            <h3 className="text-center text-xs font-black uppercase text-muted-foreground tracking-wider mb-2">
              Nghĩa tiếng Việt
            </h3>
            {rightItems.map((item, index) => {
              const isSelected = selectedRightIndex === index
              const isMatched = matchedSlots.has(index)
              const matchLeftItem = leftItems[index]

              // Review borders
              let reviewBorder = 'border-[#1c293c]'
              let reviewBg = 'bg-background'
              if (phase === 'reviewing') {
                if (item.id === matchLeftItem.id) {
                  reviewBorder = 'border-green-500'
                  reviewBg = 'bg-green-50/50'
                } else {
                  reviewBorder = 'border-rose-500'
                  reviewBg = 'bg-rose-50/50'
                }
              }

              return (
                <motion.div
                  layout
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  key={`right-${item.id}`}
                  onClick={() => handleRightClick(index)}
                  className={cn(
                    'p-4 border-2 rounded-md transition-all cursor-pointer relative min-h-[72px] flex flex-col justify-center shadow-[3px_3px_0px_0px_#1c293c]',
                    isSelected && 'bg-yellow-50 border-yellow-500 translate-x-[2px] translate-y-[2px] shadow-none',
                    isMatched && !isSelected && 'bg-indigo-50/30 border-indigo-400',
                    reviewBorder,
                    reviewBg
                  )}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs md:text-sm line-clamp-2 leading-snug">
                      {item.translation}
                    </span>

                    {/* Correct/Incorrect Icons */}
                    {phase === 'reviewing' && (
                      <span className="shrink-0 ml-1.5">
                        {item.id === matchLeftItem.id ? (
                          <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                        )}
                      </span>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Match Check Actions */}
        <div className="border-t-4 border-[#1c293c] pt-6 flex justify-center">
          {phase === 'matching' ? (
            <button
              onClick={handleCheckResults}
              disabled={!allMatched}
              className={cn(
                'neo-button px-8 py-3 text-base font-black text-center border-2 border-border shadow-[4px_4px_0px_0px_#1c293c] transition-all',
                allMatched
                  ? 'bg-yellow-400 hover:bg-yellow-300 text-navy cursor-pointer active:neo-button-active'
                  : 'bg-muted text-muted-foreground opacity-55 cursor-not-allowed shadow-none'
              )}
            >
              Kiểm tra kết quả
            </button>
          ) : (
            <button
              onClick={() => {
                // If there are no more terms in currentQueue and failedQueue, complete session
                const nextQueueSize = currentQueue.length + (repeatWrong ? failedQueue.length : 0)
                if (nextQueueSize === 0) {
                  handleFinishGame()
                } else {
                  handleNextRound()
                }
              }}
              className="neo-button px-8 py-3 bg-[#fdc800] hover:bg-[#e6b800] text-base font-black text-navy border-2 border-border shadow-[4px_4px_0px_0px_#1c293c] active:neo-button-active transition-all"
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
        onConfirm={() => navigate('/app/games')}
        onCancel={() => setIsConfirmExitOpen(false)}
        variant="danger"
      />
    </div>
  )
}
