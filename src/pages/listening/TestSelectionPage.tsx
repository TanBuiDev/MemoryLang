import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useI18n } from '@/i18n'
import { demoTest } from '@/features/listening/demoData'
import { useListeningStore } from '@/stores/useListeningStore'
import { Card, CardTitle } from '@/components/ui/card'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'
import { listeningService } from '@/services/supabase/listening.service'

export function TestSelectionPage() {
  const { topicId } = useParams<{ topicId: string }>()
  const { t } = useI18n()
  const navigate = useNavigate()
  const setTest = useListeningStore((s) => s.setTest)
  const user = useAuthStore((s) => s.user)
  const shouldUseRemoteData = isSupabaseConfigured && Boolean(user)

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ['listening-tests', topicId, user?.id],
    queryFn: async () => {
      if (!shouldUseRemoteData || !topicId) return [demoTest]
      const isDemoTopic = topicId === 'ets2026'
      if (isDemoTopic) return [demoTest]

      try {
        const list = await listeningService.listTests(topicId)
        return list.length > 0 ? list : [demoTest]
      } catch (err) {
        console.error('Error fetching listening tests from DB:', err)
        return [demoTest]
      }
    },
    enabled: Boolean(topicId)
  })

  const handleSelect = (testId: string) => {
    setTest(testId)
    navigate(`${testId}`)
  }

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-black mb-4">{t('listening.selectTest')}</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-16 bg-muted rounded-lg" />
        </div>
      </div>
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
