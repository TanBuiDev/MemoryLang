import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useI18n } from '@/i18n'
import { demoTopic } from '@/features/listening/demoData'
import { useListeningStore } from '@/stores/useListeningStore'
import { Card, CardTitle } from '@/components/ui/card'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'
import { listeningService } from '@/services/supabase/listening.service'

export function TopicSelectionPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const setTopic = useListeningStore((s) => s.setTopic)
  const user = useAuthStore((s) => s.user)
  const shouldUseRemoteData = isSupabaseConfigured && Boolean(user)

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
    setTopic(topicId)
    navigate(`/app/listening/${topicId}`)
  }

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-black mb-4">{t('listening.selectTopic')}</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-muted rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-black mb-4">{t('listening.selectTopic')}</h1>
      <div className="grid gap-3">
        {topics.map((topic) => (
          <Card key={topic.id} className="hover:bg-muted cursor-pointer transition" onClick={() => handleSelect(topic.id)}>
            <CardTitle>{topic.title}</CardTitle>
            {topic.description && <p className="text-sm text-muted-foreground mt-1">{topic.description}</p>}
          </Card>
        ))}
      </div>
    </div>
  )
}
