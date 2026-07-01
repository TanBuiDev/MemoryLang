import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { grammarService } from '@/services/supabase/grammar.service'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'
import { useI18n } from '@/i18n'
import { Badge } from '@/components/ui/badge'
import { AppLoading } from '@/components/common/AppLoading'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'

const levelColors: Record<string, string> = {
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-yellow-100 text-yellow-800',
  advanced: 'bg-red-100 text-red-800',
}

const levelLabels: Record<string, string> = {
  beginner: 'Co ban',
  intermediate: 'Trung cap',
  advanced: 'Nang cao',
}

export function GrammarPage() {
  const { t } = useI18n()
  const { user } = useAuthStore()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

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

  const filteredTopics = selectedCategory
    ? topics.filter((t) => t.category === selectedCategory)
    : topics

  if (!shouldFetch) {
    return (
      <div className="px-4 py-8">
        <PageHeader title={t('grammar.title')} description={t('grammar.description', { count: 0 })} />
        <EmptyState
          title={t('grammar.emptyTitle')}
          description="Dang nhap de xem bai hoc ngu phap"
        />
      </div>
    )
  }

  if (isLoading) return <AppLoading />

  return (
    <div className="px-4 py-6">
      <PageHeader title={t('grammar.title')} description={t('grammar.description', { count: topics.length })} />

      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 text-sm font-bold rounded-lg border-2 border-(--border) transition-colors ${
              selectedCategory === null
                ? 'bg-purple-600 text-white'
                : 'bg-white hover:bg-gray-100'
            }`}
          >
            {t('grammar.allCategories')}
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-sm font-bold rounded-lg border-2 border-(--border) transition-colors ${
                selectedCategory === cat
                  ? 'bg-purple-600 text-white'
                  : 'bg-white hover:bg-gray-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {filteredTopics.length === 0 ? (
        <EmptyState
          title={t('grammar.emptyTitle')}
          description={t('grammar.emptyDescription')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTopics.map((topic) => (
            <Link
              key={topic.id}
              to={`/app/grammar/${topic.id}`}
              className="neo-card p-5 hover:shadow-[6px_6px_0_var(--border)] transition-shadow cursor-pointer"
            >
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge className="bg-purple-100 text-purple-800">{topic.category}</Badge>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border-2 border-(--border) ${levelColors[topic.level] ?? 'bg-gray-100'}`}>
                  {levelLabels[topic.level] ?? topic.level}
                </span>
                <span className="text-xs text-gray-400 ml-auto">
                  {topic.view_count ?? 0}
                </span>
              </div>
              <h3 className="text-lg font-bold">{topic.title}</h3>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
