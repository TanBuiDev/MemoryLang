import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useI18n } from '@/i18n'
import { demoTest } from '@/features/listening/demoData'
import { useListeningStore } from '@/stores/useListeningStore'
import { Card, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ContentLockState } from '@/components/subscription/ContentLockState'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'
import { listeningService } from '@/services/supabase/listening.service'
import { canAccessContent } from '@/utils/contentAccess'

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
    setTest(testId)
    navigate(`${testId}`)
  }

  if (isTopicLoading || isTestsLoading) {
    return (
      <div>
        <h1 className="text-2xl font-black mb-4">{t('listening.selectTest')}</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-16 bg-muted rounded-lg" />
        </div>
      </div>
    )
  }

  if (shouldUseRemoteData && !isDemoTopic && !topicAccess) {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-black">Không tìm thấy nội dung</p>
        <Button onClick={() => navigate('/app/listening')} className="mt-4">{t('listening.backToList')}</Button>
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
    <div>
      <h1 className="text-2xl font-black mb-4">{t('listening.selectTest')}</h1>
      <div className="grid gap-3">
        {tests.map((test) => (
          <Card key={test.id} className="hover:bg-muted cursor-pointer transition" onClick={() => handleSelect(test.id)}>
            <CardTitle>{test.title}</CardTitle>
          </Card>
        ))}
      </div>
    </div>
  )
}
