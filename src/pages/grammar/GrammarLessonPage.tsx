import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { grammarService } from '@/services/supabase/grammar.service'
import { BlockRenderer } from '@/components/grammar/BlockRenderer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'
import { AppLoading } from '@/components/common/AppLoading'
import { ContentLockState } from '@/components/subscription/ContentLockState'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'
import { canAccessContent } from '@/utils/contentAccess'
import { soundEffects } from '@/utils/soundEffects'
import type { TeaserConfig } from '@/types/subscription.types'
import {
  ArrowLeft,
  BookOpen,
  Eye,
  Crown,
  Sparkles,
  ListOrdered,
} from 'lucide-react'

const levelColors: Record<string, { bg: string; text: string; border: string }> = {
  beginner: { bg: 'bg-emerald-100', text: 'text-emerald-950', border: 'border-emerald-500' },
  intermediate: { bg: 'bg-amber-100', text: 'text-amber-950', border: 'border-amber-500' },
  advanced: { bg: 'bg-rose-100', text: 'text-rose-950', border: 'border-rose-500' },
}

export default function GrammarLessonPage() {
  const { topicId } = useParams<{ topicId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isPro = useSubscriptionStore((s) => s.isPro)
  const viewedRef = useRef(false)

  const shouldFetch = isSupabaseConfigured && Boolean(user)

  const { data: topic, isLoading: topicLoading } = useQuery({
    queryKey: ['grammar-topic', topicId],
    queryFn: () => grammarService.getTopic(topicId!),
    enabled: shouldFetch && Boolean(topicId),
  })

  const { data: blocks, isLoading: blocksLoading } = useQuery({
    queryKey: ['lesson-blocks', topicId],
    queryFn: () => grammarService.getBlocks(topicId!),
    enabled: shouldFetch && Boolean(topicId) && Boolean(topic) && canAccessContent(topic?.access_tier, isPro),
  })

  useEffect(() => {
    if (topic && canAccessContent(topic.access_tier, isPro) && !viewedRef.current && shouldFetch) {
      viewedRef.current = true
      grammarService.incrementViewCount(topic.id).catch(() => {})
    }
  }, [topic, shouldFetch, isPro])

  if (!shouldFetch) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="p-8 text-center neo-card bg-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_#000] rounded-2xl">
          <p className="text-slate-700 font-bold">
            Đăng nhập để xem bài học ngữ pháp
          </p>
        </div>
      </div>
    )
  }

  if (topicLoading || blocksLoading) return <AppLoading />
  if (!topic) return null

  const hasAccess = canAccessContent(topic.access_tier, isPro)

  if (!hasAccess) {
    return (
      <ContentLockState
        title={topic.title}
        contentType="grammar"
        teaserConfig={topic.teaser_config as TeaserConfig | undefined}
        backTo="/app/grammar"
      />
    )
  }

  // Extract Heading blocks for Table of Contents (TOC)
  const headingBlocks = blocks?.filter((b) => b.block_type === 'heading') || []

  const handleBack = () => {
    soundEffects.play('cardClick')
    navigate('/app/grammar')
  }

  const scrollToSection = (blockId: string) => {
    soundEffects.play('cardClick')
    const element = document.getElementById(`block-${blockId}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const levelStyle = levelColors[topic.level] ?? { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-400' }
  const isProTier = topic.access_tier === 'pro'

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Top Navigation Bar */}
      <div>
        <Button
          variant="secondary"
          onClick={handleBack}
          className="neo-button text-xs sm:text-sm font-black border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-xl flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách bài học
        </Button>
      </div>

      {/* Main Lesson Title Card */}
      <div className="neo-card p-6 sm:p-8 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_#000] rounded-2xl space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-purple-100 text-purple-900 border-2 border-slate-900 font-black text-xs">
            {topic.category}
          </Badge>
          <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border-2 border-slate-900 ${levelStyle.bg} ${levelStyle.text}`}>
            {topic.level === 'beginner' ? 'Cơ bản' : topic.level === 'intermediate' ? 'Trung cấp' : 'Nâng cao'}
          </span>

          {isProTier ? (
            <span className="text-xs font-black px-2.5 py-0.5 rounded-full border border-slate-900 bg-amber-200 text-amber-900 flex items-center gap-1 shadow-[1px_1px_0px_0px_#000]">
              <Crown size={13} className="fill-amber-400 text-amber-600" /> PRO
            </span>
          ) : (
            <span className="text-xs font-black px-2.5 py-0.5 rounded-full border border-slate-900 bg-emerald-100 text-emerald-800 flex items-center gap-1">
              <Sparkles size={12} className="text-emerald-600" /> Miễn phí
            </span>
          )}

          <span className="text-xs font-bold text-slate-500 ml-auto flex items-center gap-1">
            <Eye size={14} className="text-slate-400" />
            {topic.view_count ?? 0} lượt học
          </span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-[#432dd7] shrink-0" />
          {topic.title}
        </h1>
      </div>

      {/* Table of Contents (TOC) Bar if headings exist */}
      {headingBlocks.length > 0 && (
        <div className="neo-card p-4 sm:p-5 bg-amber-50 border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-2xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-wider">
            <ListOrdered className="w-4 h-4 text-amber-600" />
            <span>Mục lục bài học</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {headingBlocks.map((hb, idx) => {
              const headingText = (hb.content as { text?: string })?.text || `Mục ${idx + 1}`
              return (
                <button
                  key={hb.id}
                  onClick={() => scrollToSection(hb.id)}
                  className="px-3 py-1.5 bg-white hover:bg-amber-100 text-slate-900 text-xs font-black border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-xl transition-all cursor-pointer"
                >
                  {idx + 1}. {headingText}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Lesson Blocks Body */}
      <div className="space-y-4">
        {blocks?.map((block) => (
          <div key={block.id} id={`block-${block.id}`} className="scroll-mt-6">
            <BlockRenderer block={block} />
          </div>
        ))}
      </div>

      {/* Footer Actions */}
      <div className="flex justify-between items-center pt-6 border-t-3 border-slate-900">
        <Button
          variant="secondary"
          onClick={handleBack}
          className="neo-button px-6 py-3 font-black text-slate-900 border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-xl flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách bài học
        </Button>
      </div>
    </div>
  )
}
