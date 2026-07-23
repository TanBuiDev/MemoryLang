import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useI18n } from '@/i18n'
import { demoTest } from '@/features/listening/demoData'
import { useListeningStore } from '@/stores/useListeningStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ContentLockState } from '@/components/subscription/ContentLockState'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'
import { listeningService } from '@/services/supabase/listening.service'
import { canAccessContent } from '@/utils/contentAccess'
import { ChevronLeft, Headphones, Clock, HelpCircle, ArrowRight, BookOpen, CheckCircle2 } from 'lucide-react'
import { soundEffects } from '@/utils/soundEffects'

export function TestSelectionPage() {
  const { topicId } = useParams<{ topicId: string }>()
  const { t } = useI18n()
  const navigate = useNavigate()
  const setTest = useListeningStore((s) => s.setTest)
  const user = useAuthStore((s) => s.user)
  const isPro = useSubscriptionStore((s) => s.isPro)
  const shouldUseRemoteData = isSupabaseConfigured && Boolean(user)
  const isDemoTopic = topicId === 'ets2026'

  const { data: topicAccess, isLoading: isTopicLoading } = useQuery({
    queryKey: ['listening-topic-access', topicId, user?.id],
    queryFn: () => listeningService.getTopic(topicId!),
    enabled: shouldUseRemoteData && Boolean(topicId) && !isDemoTopic,
  })

  const hasAccess = !shouldUseRemoteData || isDemoTopic || canAccessContent(topicAccess?.access_tier, isPro)

  const { data: tests = [], isLoading: isTestsLoading } = useQuery({
    queryKey: ['listening-tests', topicId, user?.id],
    queryFn: async () => {
      if (!shouldUseRemoteData || !topicId) return [demoTest]
      if (isDemoTopic) return [demoTest]

      try {
        const list = await listeningService.listTests(topicId)
        return list.length > 0 ? list : [demoTest]
      } catch (err) {
        console.error('Error fetching listening tests from DB:', err)
        return [demoTest]
      }
    },
    enabled: Boolean(topicId) && (!shouldUseRemoteData || isDemoTopic || Boolean(topicAccess && hasAccess))
  })

  const handleSelect = (testId: string) => {
    soundEffects.play('cardClick')
    setTest(testId)
    navigate(`${testId}`)
  }

  const handleBack = () => {
    soundEffects.play('cardClick')
    navigate('/app/listening')
  }

  if (isTopicLoading || isTestsLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <div className="h-40 bg-white border-3 border-slate-900 rounded-2xl animate-pulse" />
        <div className="h-24 bg-white border-3 border-slate-900 rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (shouldUseRemoteData && !isDemoTopic && !topicAccess) {
    return (
      <div className="max-w-xl mx-auto text-center py-12 neo-card p-6 bg-white border-3 border-slate-900 rounded-2xl">
        <p className="text-lg font-black text-slate-900">Không tìm thấy nội dung</p>
        <Button onClick={handleBack} className="mt-4 neo-button bg-[#fdc800] text-slate-900 border-2 border-slate-900">
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
            Danh Sách Đề Thi TOEIC
          </Badge>
          <span className="text-xs font-bold text-slate-500">Chọn đề thi để bắt đầu làm bài</span>
        </div>
      </div>

      {/* Header Topic Banner */}
      <div className="neo-card p-6 sm:p-8 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_#000] rounded-2xl space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#fdc800] border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] flex items-center justify-center shrink-0">
            <Headphones className="w-6 h-6 text-slate-900" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              {topicAccess?.title || 'Bộ Đề Thi TOEIC Listening ETS'}
            </h1>
            <p className="text-xs sm:text-sm font-bold text-slate-600">
              Mỗi đề thi bao gồm đầy đủ 100 câu hỏi chia làm 4 Part chuẩn định dạng thi thật.
            </p>
          </div>
        </div>
      </div>

      {/* Test Selection List */}
      <div className="space-y-4">
        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-purple-700" />
          <span>{t('listening.selectTest')}</span>
        </h2>

        <div className="grid gap-4">
          {tests.map((test) => (
            <div
              key={test.id}
              onClick={() => handleSelect(test.id)}
              className="neo-card p-5 sm:p-6 bg-white hover:bg-amber-50 border-3 border-slate-900 shadow-[5px_5px_0px_0px_#000] rounded-2xl cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl font-black text-slate-900 group-hover:text-purple-700 transition-colors">
                    {test.title}
                  </h3>
                  <Badge className="bg-emerald-100 text-emerald-950 font-bold border border-slate-900 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                    Chuẩn ETS
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-xs font-bold text-slate-600">
                  <span className="flex items-center gap-1">
                    <HelpCircle className="w-4 h-4 text-purple-700" />
                    100 Câu hỏi
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-amber-600" />
                    45 Phút
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="neo-button py-2.5 px-5 bg-[#fdc800] group-hover:bg-amber-300 text-slate-900 font-black text-xs sm:text-sm border-2 border-slate-900 shadow-[3px_3px_0px_0px_#000] rounded-xl flex items-center justify-center gap-2 shrink-0 transition-all self-start sm:self-center"
              >
                <span>Chọn Đề Này</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
