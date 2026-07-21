import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { grammarService } from '@/services/supabase/grammar.service'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'
import { useI18n } from '@/i18n'
import { Badge } from '@/components/ui/badge'
import { AppLoading } from '@/components/common/AppLoading'
import { EmptyState } from '@/components/common/EmptyState'
import { ContentLockOverlay } from '@/components/subscription/ContentLockOverlay'
import { ContentLockModal } from '@/components/subscription/ContentLockModal'
import { soundEffects } from '@/utils/soundEffects'
import type { TeaserConfig } from '@/types/subscription.types'
import {
  ScrollText,
  Search,
  BookOpen,
  Eye,
  Crown,
  Sparkles,
  Filter,
} from 'lucide-react'

const levelColors: Record<string, { bg: string; text: string; border: string }> = {
  beginner: { bg: 'bg-emerald-100', text: 'text-emerald-950', border: 'border-emerald-500' },
  intermediate: { bg: 'bg-amber-100', text: 'text-amber-950', border: 'border-amber-500' },
  advanced: { bg: 'bg-rose-100', text: 'text-rose-950', border: 'border-rose-500' },
}

const levelLabels: Record<string, string> = {
  beginner: 'Cơ bản',
  intermediate: 'Trung cấp',
  advanced: 'Nâng cao',
}

export function GrammarPage() {
  const { t } = useI18n()
  const { user } = useAuthStore()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [lockedTopic, setLockedTopic] = useState<{ title: string; teaserConfig?: TeaserConfig } | null>(null)

  const shouldFetch = isSupabaseConfigured && Boolean(user)

  const { data: topics = [], isLoading } = useQuery({
    queryKey: ['grammar-topics', user?.id],
    queryFn: () => grammarService.listTopics(),
    enabled: shouldFetch,
  })

  const categories = useMemo(
    () => [...new Set(topics.map((t) => t.category))].sort(),
    [topics]
  )

  const filteredTopics = useMemo(() => {
    return topics.filter((topic) => {
      const matchesCategory = selectedCategory ? topic.category === selectedCategory : true
      const matchesSearch = searchQuery.trim()
        ? topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          topic.category.toLowerCase().includes(searchQuery.toLowerCase())
        : true
      return matchesCategory && matchesSearch
    })
  }, [topics, selectedCategory, searchQuery])

  const handleCardClick = () => {
    soundEffects.play('cardClick')
  }

  if (!shouldFetch) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="neo-card p-6 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_#000] rounded-2xl text-center space-y-3">
          <ScrollText className="w-12 h-12 text-[#432dd7] mx-auto" />
          <h1 className="text-2xl font-black text-slate-900">Bài Học Ngữ Pháp Hệ Thống</h1>
        </div>
        <EmptyState
          title={t('grammar.emptyTitle')}
          description="Đăng nhập để xem và luyện tập bài học ngữ pháp."
        />
      </div>
    )
  }

  if (isLoading) return <AppLoading />

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Hero Header Banner */}
      <div className="neo-card p-6 sm:p-8 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_#000] rounded-2xl relative overflow-hidden space-y-3">
        <div className="flex items-center gap-2">
          <Badge className="bg-purple-100 text-purple-900 border-2 border-slate-900 font-black px-3 py-1 shadow-[2px_2px_0px_0px_#000]">
            📜 Bài Học Ngữ Pháp Hệ Thống
          </Badge>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
          Làm Chủ Cấu Trúc Tiếng Anh
        </h1>
        <p className="text-slate-600 text-sm sm:text-base font-semibold max-w-2xl">
          Nắm vững ngữ pháp tiếng Anh từ cơ bản đến nâng cao thông qua hệ thống bài giảng trực quan và bài tập thực hành củng cố phản xạ.
        </p>

        <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-black text-slate-700">
          <div className="flex items-center gap-1.5 bg-amber-100 border-2 border-slate-900 px-3 py-1.5 rounded-xl shadow-[2px_2px_0px_0px_#000]">
            <BookOpen className="w-4 h-4 text-slate-900" />
            <span>{topics.length} bài học có sẵn</span>
          </div>
          <div className="flex items-center gap-1.5 bg-purple-100 border-2 border-slate-900 px-3 py-1.5 rounded-xl shadow-[2px_2px_0px_0px_#000]">
            <Sparkles className="w-4 h-4 text-purple-700" />
            <span>{categories.length} chủ đề bài giảng</span>
          </div>
        </div>
      </div>

      {/* Search & Category Filter Section */}
      <div className="neo-card p-4 sm:p-5 bg-white border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm bài học..."
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm font-bold border-2 border-slate-900 rounded-xl shadow-[2px_2px_0px_0px_#000] focus:outline-none focus:bg-amber-50 text-slate-900 placeholder:text-slate-400"
            />
          </div>

          {/* Filter Label Indicator */}
          <div className="flex items-center gap-1.5 text-xs font-black text-slate-600 self-start sm:self-center">
            <Filter className="w-4 h-4 text-purple-700" />
            <span>Danh mục:</span>
          </div>
        </div>

        {/* Category Filter Chips */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => {
                handleCardClick()
                setSelectedCategory(null)
              }}
              className={`px-3 py-1.5 text-xs font-black rounded-xl border-2 border-slate-900 transition-all cursor-pointer ${
                selectedCategory === null
                  ? 'bg-[#fdc800] text-slate-900 shadow-[3px_3px_0px_0px_#000]'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 shadow-[2px_2px_0px_0px_#000]'
              }`}
            >
              Tất cả ({topics.length})
            </button>
            {categories.map((cat) => {
              const count = topics.filter((t) => t.category === cat).length
              return (
                <button
                  key={cat}
                  onClick={() => {
                    handleCardClick()
                    setSelectedCategory(cat)
                  }}
                  className={`px-3 py-1.5 text-xs font-black rounded-xl border-2 border-slate-900 transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#fdc800] text-slate-900 shadow-[3px_3px_0px_0px_#000]'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 shadow-[2px_2px_0px_0px_#000]'
                  }`}
                >
                  {cat} ({count})
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Grammar Topics Grid */}
      {filteredTopics.length === 0 ? (
        <EmptyState
          title={t('grammar.emptyTitle')}
          description={
            searchQuery
              ? `Không tìm thấy bài học nào khớp với từ khóa "${searchQuery}".`
              : t('grammar.emptyDescription')
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {filteredTopics.map((topic) => {
            const levelStyle = levelColors[topic.level] ?? { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-400' }
            const isProTier = topic.access_tier === 'pro'

            return (
              <ContentLockOverlay
                key={topic.id}
                accessTier={topic.access_tier || 'free'}
                onLockedClick={() => setLockedTopic({ title: topic.title, teaserConfig: topic.teaser_config as TeaserConfig })}
              >
                <Link
                  to={`/app/grammar/${topic.id}`}
                  onClick={handleCardClick}
                  className="neo-card p-5 sm:p-6 bg-white border-3 border-slate-900 rounded-2xl shadow-[5px_5px_0px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-transform cursor-pointer block h-full space-y-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-purple-100 text-purple-900 border-2 border-slate-900 font-black text-[11px]">
                      {topic.category}
                    </Badge>
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border-2 border-slate-900 ${levelStyle.bg} ${levelStyle.text}`}>
                      {levelLabels[topic.level] ?? topic.level}
                    </span>

                    {isProTier ? (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full border border-slate-900 bg-amber-200 text-amber-900 flex items-center gap-1 shadow-[1px_1px_0px_0px_#000]">
                        <Crown size={12} className="fill-amber-400 text-amber-600" /> PRO
                      </span>
                    ) : (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full border border-slate-900 bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <Sparkles size={11} className="text-emerald-600" /> Miễn phí
                      </span>
                    )}

                    <span className="text-xs font-bold text-slate-500 ml-auto flex items-center gap-1">
                      <Eye size={13} className="text-slate-400" />
                      {topic.view_count ?? 0}
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
                    {topic.title}
                  </h3>
                </Link>
              </ContentLockOverlay>
            )
          })}
        </div>
      )}

      {lockedTopic && (
        <ContentLockModal
          open={!!lockedTopic}
          title={lockedTopic.title}
          contentType="grammar"
          teaserConfig={lockedTopic.teaserConfig}
          onClose={() => setLockedTopic(null)}
        />
      )}
    </div>
  )
}
