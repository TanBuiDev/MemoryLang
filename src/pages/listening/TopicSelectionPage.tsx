import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useI18n } from '@/i18n'
import { demoTopic } from '@/features/listening/demoData'
import { useListeningStore } from '@/stores/useListeningStore'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'
import { listeningService } from '@/services/supabase/listening.service'
import { ContentLockOverlay } from '@/components/subscription/ContentLockOverlay'
import { ContentLockModal } from '@/components/subscription/ContentLockModal'
import { Badge } from '@/components/ui/badge'
import { Headphones, Sparkles, ArrowRight, BookOpen } from 'lucide-react'
import { soundEffects } from '@/utils/soundEffects'

export function TopicSelectionPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const setTopic = useListeningStore((s) => s.setTopic)
  const user = useAuthStore((s) => s.user)
  const shouldUseRemoteData = isSupabaseConfigured && Boolean(user)

  const [lockedTopic, setLockedTopic] = useState<{ title: string; teaserConfig: any } | null>(null)

  const { data: topics = [], isLoading } = useQuery({
    queryKey: ['listening-topics', user?.id],
    queryFn: async () => {
      if (!shouldUseRemoteData) return [demoTopic]
      try {
        const list = await listeningService.listTopics()
        return list.length > 0 ? list : [demoTopic]
      } catch (err) {
        console.error('Error fetching listening topics from DB:', err)
        return [demoTopic]
      }
    }
  })

  const handleSelect = (topicId: string) => {
    soundEffects.play('cardClick')
    setTopic(topicId)
    navigate(`/app/listening/${topicId}`)
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <div className="h-40 bg-white border-3 border-slate-900 rounded-2xl animate-pulse" />
        <div className="h-24 bg-white border-3 border-slate-900 rounded-2xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Hero Header Banner */}
      <div className="neo-card p-6 sm:p-8 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_#000] rounded-2xl space-y-4">
        <div className="flex items-center gap-2">
          <Badge className="bg-[#fdc800] text-slate-900 border-2 border-slate-900 font-black px-3 py-1 shadow-[2px_2px_0px_0px_#000]">
            🎧 Toeic Listening Standard
          </Badge>
          <Badge className="bg-purple-100 text-purple-950 border border-slate-900 font-bold px-2.5 py-0.5">
            ETS 2024 - 2026
          </Badge>
        </div>

        <div className="space-y-1.5 max-w-2xl">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Luyện Nghe TOEIC ETS</span>
            <Sparkles className="w-7 h-7 text-amber-500 shrink-0" />
          </h1>
          <p className="text-slate-600 text-sm sm:text-base font-semibold">
            Bộ đề thi nghe TOEIC chuẩn cấu trúc ETS (Part 1 - Part 4), hỗ trợ điều tốc audio, dịch transcript song ngữ và luyện chép chính tả.
          </p>
        </div>

        {/* Feature Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
          <div className="p-2.5 bg-amber-50 border-2 border-slate-900 rounded-xl text-center">
            <span className="text-[10px] font-black uppercase text-amber-950 block">Part 1</span>
            <span className="text-xs font-black text-slate-900">Photographs (6 câu)</span>
          </div>
          <div className="p-2.5 bg-purple-50 border-2 border-slate-900 rounded-xl text-center">
            <span className="text-[10px] font-black uppercase text-purple-950 block">Part 2</span>
            <span className="text-xs font-black text-slate-900">Response (25 câu)</span>
          </div>
          <div className="p-2.5 bg-sky-50 border-2 border-slate-900 rounded-xl text-center">
            <span className="text-[10px] font-black uppercase text-sky-950 block">Part 3</span>
            <span className="text-xs font-black text-slate-900">Conversations (39 câu)</span>
          </div>
          <div className="p-2.5 bg-emerald-50 border-2 border-slate-900 rounded-xl text-center">
            <span className="text-[10px] font-black uppercase text-emerald-950 block">Part 4</span>
            <span className="text-xs font-black text-slate-900">Short Talks (30 câu)</span>
          </div>
        </div>
      </div>

      {/* Select Topic Section */}
      <div className="space-y-3">
        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-purple-700" />
          <span>{t('listening.selectTopic')}</span>
        </h2>

        <div className="grid gap-4">
          {topics.map((topic) => (
            <ContentLockOverlay
              key={topic.id}
              accessTier={topic.access_tier || 'free'}
              onLockedClick={() => setLockedTopic({ title: topic.title, teaserConfig: topic.teaser_config })}
            >
              <div
                onClick={() => handleSelect(topic.id)}
                className="neo-card p-5 bg-white hover:bg-amber-50 border-3 border-slate-900 shadow-[5px_5px_0px_0px_#000] rounded-2xl cursor-pointer transition-all flex items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#fdc800] border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] flex items-center justify-center shrink-0">
                    <Headphones className="w-6 h-6 text-slate-900" />
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-lg font-black text-slate-900 group-hover:text-purple-700 transition-colors">
                      {topic.title}
                    </h3>
                    {topic.description && (
                      <p className="text-xs sm:text-sm font-bold text-slate-600">
                        {topic.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="hidden sm:inline-block text-xs font-black text-purple-700">Chọn bộ đề</span>
                  <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center group-hover:bg-purple-700 transition-colors">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </ContentLockOverlay>
          ))}
        </div>
      </div>

      {lockedTopic && (
        <ContentLockModal
          open={!!lockedTopic}
          title={lockedTopic.title}
          contentType="listening"
          teaserConfig={lockedTopic.teaserConfig}
          onClose={() => setLockedTopic(null)}
        />
      )}
    </div>
  )
}
