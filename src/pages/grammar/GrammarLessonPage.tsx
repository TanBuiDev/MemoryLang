import { useParams, Link } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { grammarService } from '@/services/supabase/grammar.service'
import { BlockRenderer } from '@/components/grammar/BlockRenderer'
import { Badge } from '@/components/ui/badge'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'
import { AppLoading } from '@/components/common/AppLoading'
import { ContentLockState } from '@/components/subscription/ContentLockState'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'
import { canAccessContent } from '@/utils/contentAccess'
import type { TeaserConfig } from '@/types/subscription.types'

export default function GrammarLessonPage() {
  const { topicId } = useParams<{ topicId: string }>()
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

  const levelColors: Record<string, string> = {
    beginner: 'bg-green-100 text-green-800',
    intermediate: 'bg-yellow-100 text-yellow-800',
    advanced: 'bg-red-100 text-red-800',
  }

  if (!shouldFetch) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="p-8 text-center neo-card">
          <p className="text-gray-500 font-semibold">
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

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Link
        to="/app/grammar"
        className="inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 font-semibold mb-4"
      >
        ← Quay lại danh sách
      </Link>

      <div className="neo-card p-6 mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge className="bg-purple-100 text-purple-800">{topic.category}</Badge>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border-2 border-(--border) ${levelColors[topic.level] ?? 'bg-gray-100'}`}>
            {topic.level === 'beginner' ? 'Cơ bản' : topic.level === 'intermediate' ? 'Trung cấp' : 'Nâng cao'}
          </span>
          <span className="text-xs text-gray-500 ml-auto">
            {topic.view_count ?? 0} lượt học
          </span>
        </div>
        <h1 className="text-2xl font-black">{topic.title}</h1>
      </div>

      <div className="space-y-1">
        {blocks?.map((block) => (
          <BlockRenderer key={block.id} block={block} />
        ))}
      </div>

      <div className="flex justify-between mt-8 pt-6 border-t-2 border-(--border)">
        <Link
          to="/app/grammar"
          className="neo-button px-6 py-3 font-bold"
        >
          ← Quay lại danh sách
        </Link>
      </div>
    </div>
  )
}
