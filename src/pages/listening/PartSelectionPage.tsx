import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useI18n } from '@/i18n'
import { demoParts } from '@/features/listening/demoData'
import { useListeningStore } from '@/stores/useListeningStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ContentLockState } from '@/components/subscription/ContentLockState'
import { cn } from '@/utils/cn'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'
import { listeningService } from '@/services/supabase/listening.service'
import { canAccessContent } from '@/utils/contentAccess'
import { ChevronLeft, Target, Edit3, Image, MessageSquare, Users, Volume2, ArrowRight, Play } from 'lucide-react'
import { soundEffects } from '@/utils/soundEffects'

const partMeta: Record<number, { title: string; desc: string; questions: string; bgClass: string; badgeColor: string }> = {
  1: {
    title: 'Part 1: Photographs (Mô Tả Hình Ảnh)',
    desc: 'Lắng nghe 4 câu mô tả bức ảnh và chọn câu mô tả chính xác nhất.',
    questions: '6 Câu hỏi',
    bgClass: 'bg-amber-100 border-amber-950',
    badgeColor: 'bg-[#fdc800] text-slate-900',
  },
  2: {
    title: 'Part 2: Question-Response (Hỏi & Đáp)',
    desc: 'Lắng nghe 1 câu hỏi và 3 câu phản hồi (A, B, C) để chọn câu trả lời đúng.',
    questions: '25 Câu hỏi',
    bgClass: 'bg-rose-100 border-rose-950',
    badgeColor: 'bg-rose-400 text-slate-900',
  },
  3: {
    title: 'Part 3: Conversations (Hội Thoại Ngắn)',
    desc: 'Nghe bài đối thoại giữa 2-3 người và trả lời cụm 3 câu hỏi liên quan.',
    questions: '39 Câu hỏi',
    bgClass: 'bg-sky-100 border-sky-950',
    badgeColor: 'bg-sky-400 text-slate-900',
  },
  4: {
    title: 'Part 4: Short Talks (Bài Phát Biểu Ngắn)',
    desc: 'Nghe bài nói đơn (thông báo, quảng cáo, tin nhắn thoại) và trả lời cụm 3 câu hỏi.',
    questions: '30 Câu hỏi',
    bgClass: 'bg-emerald-100 border-emerald-950',
    badgeColor: 'bg-emerald-400 text-slate-900',
  },
}

const partIcons: Record<number, any> = {
  1: Image,
  2: MessageSquare,
  3: Users,
  4: Volume2,
}

export function PartSelectionPage() {
  const { testId } = useParams<{ testId: string }>()
  const { t } = useI18n()
  const navigate = useNavigate()
  const { mode, setPart, setMode } = useListeningStore()
  const user = useAuthStore((s) => s.user)
  const isPro = useSubscriptionStore((s) => s.isPro)
  const shouldUseRemoteData = isSupabaseConfigured && Boolean(user)
  const isDemoTest = testId === 'ets2026-test1'

  const { data: topicAccess, isLoading: isTopicLoading } = useQuery({
    queryKey: ['listening-test-topic-access', testId, user?.id],
    queryFn: () => listeningService.getTopicByTestId(testId!),
    enabled: shouldUseRemoteData && Boolean(testId) && !isDemoTest,
  })

  const hasAccess = !shouldUseRemoteData || isDemoTest || canAccessContent(topicAccess?.access_tier, isPro)

  const { data: parts = [], isLoading: isPartsLoading } = useQuery({
    queryKey: ['listening-parts', testId, user?.id],
    queryFn: async () => {
      if (!shouldUseRemoteData || !testId) return demoParts
      if (isDemoTest) return demoParts

      try {
        const list = await listeningService.listParts(testId)
        return list.length > 0 ? list : demoParts
      } catch (err) {
        console.error('Error fetching listening parts from DB:', err)
        return demoParts
      }
    },
    enabled: Boolean(testId) && (!shouldUseRemoteData || isDemoTest || Boolean(topicAccess && hasAccess))
  })

  const handleStart = (partId: string) => {
    soundEffects.play('cardClick')
    setPart(partId)
    navigate(`/app/listening/session/${partId}/${mode}`)
  }

  const handleBack = () => {
    soundEffects.play('cardClick')
    navigate(-1)
  }

  if (isTopicLoading || isPartsLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <div className="h-40 bg-white border-3 border-slate-900 rounded-2xl animate-pulse" />
        <div className="h-24 bg-white border-3 border-slate-900 rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (shouldUseRemoteData && !isDemoTest && !topicAccess) {
    return (
      <div className="max-w-xl mx-auto text-center py-12 neo-card p-6 bg-white border-3 border-slate-900 rounded-2xl">
        <p className="text-lg font-black text-slate-900">Không tìm thấy nội dung</p>
        <Button onClick={() => navigate('/app/listening')} className="mt-4 neo-button bg-[#fdc800] text-slate-900 border-2 border-slate-900">
          {t('listening.backToList')}
        </Button>
      </div>
    )
  }

  if (!hasAccess && topicAccess) {
    return (
      <ContentLockState
        title={topicAccess.title}
        contentType="listening"
        teaserConfig={topicAccess.teaser_config}
        backTo="/app/listening"
      />
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Top Bar with Back Button */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="neo-button p-2.5 rounded-xl border-2 border-slate-900 bg-white hover:bg-amber-100 active:neo-button-active transition shadow-[2px_2px_0px_0px_#000]"
        >
          <ChevronLeft className="w-5 h-5 text-slate-900" />
        </button>
        <div className="flex items-center gap-2">
          <Badge className="bg-purple-600 text-white font-black text-xs px-3 py-1 border border-slate-900">
            Chọn Part Thi TOEIC
          </Badge>
          <span className="text-xs font-bold text-slate-500">Lựa chọn Part 1-4 & Chế độ làm bài</span>
        </div>
      </div>

      {/* Mode Selector Tabs (Test vs Dictation) */}
      <div className="neo-card p-5 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_#000] rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <span>Chọn Chế Độ Luyện Tập</span>
          </h2>
          <span className="text-xs font-bold text-slate-500">Chuyển đổi linh hoạt trước khi thi</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Test Mode */}
          <button
            type="button"
            onClick={() => {
              soundEffects.play('cardClick')
              setMode('test')
            }}
            className={cn(
              "neo-button p-4 rounded-xl border-3 border-slate-900 text-left transition-all flex items-start gap-3 cursor-pointer",
              mode === 'test'
                ? "bg-[#fdc800] text-slate-900 shadow-[4px_4px_0px_0px_#000]"
                : "bg-slate-50 hover:bg-amber-50 text-slate-700 shadow-[2px_2px_0px_0px_#000]"
            )}
          >
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 mt-0.5">
              <Target className="w-5 h-5 text-[#fdc800]" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900">{t('listening.testMode')} 🎯</h3>
              <p className="text-xs font-semibold text-slate-700 leading-snug mt-0.5">
                Làm bài thi thử chuẩn bấm giờ, ẩn transcript chuẩn quy cách thi thật ETS.
              </p>
            </div>
          </button>

          {/* Dictation Mode */}
          <button
            type="button"
            onClick={() => {
              soundEffects.play('cardClick')
              setMode('dictation')
            }}
            className={cn(
              "neo-button p-4 rounded-xl border-3 border-slate-900 text-left transition-all flex items-start gap-3 cursor-pointer",
              mode === 'dictation'
                ? "bg-purple-600 text-white shadow-[4px_4px_0px_0px_#000]"
                : "bg-slate-50 hover:bg-purple-50 text-slate-700 shadow-[2px_2px_0px_0px_#000]"
            )}
          >
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 mt-0.5">
              <Edit3 className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <h3 className={cn("font-black text-sm", mode === 'dictation' ? "text-white" : "text-slate-900")}>
                {t('listening.dictationMode')} ✍️
              </h3>
              <p className={cn("text-xs font-semibold leading-snug mt-0.5", mode === 'dictation' ? "text-purple-100" : "text-slate-600")}>
                Luyện chép chính tả từng câu, điền từ còn thiếu để tăng phản xạ nghe chi tiết.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Part Cards Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <span>{t('listening.selectPart')}</span>
        </h2>

        <div className="grid gap-4">
          {parts.map((part) => {
            const meta = partMeta[part.partNumber] || {
              title: `Part ${part.partNumber}`,
              desc: part.directions,
              questions: 'Nhiều câu hỏi',
              bgClass: 'bg-white border-slate-900',
              badgeColor: 'bg-slate-200 text-slate-900',
            }
            const Icon = partIcons[part.partNumber] || Volume2

            return (
              <div
                key={part.id}
                className={cn(
                  "neo-card p-5 sm:p-6 border-3 border-slate-900 shadow-[5px_5px_0px_0px_#000] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:scale-[1.01]",
                  meta.bgClass
                )}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 text-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-6 h-6 text-[#fdc800]" />
                  </div>

                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-black text-slate-900">
                        {meta.title}
                      </h3>
                      <Badge className={cn("border border-slate-900 font-black text-[11px] px-2 py-0.5", meta.badgeColor)}>
                        {meta.questions}
                      </Badge>
                    </div>

                    <p className="text-xs sm:text-sm font-bold text-slate-700 leading-snug">
                      {part.directions?.trim() || meta.desc}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleStart(part.id)}
                  className="neo-button py-3 px-6 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs sm:text-sm border-2 border-slate-900 shadow-[3px_3px_0px_0px_#000] rounded-xl flex items-center justify-center gap-2 shrink-0 transition-all self-start sm:self-center cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Bắt đầu Luyện Part</span>
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
