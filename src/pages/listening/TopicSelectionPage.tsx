import { useNavigate } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { demoTopic } from '@/features/listening/demoData'
import { useListeningStore } from '@/stores/useListeningStore'
import { Card, CardTitle } from '@/components/ui/card'

export function TopicSelectionPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const setTopic = useListeningStore((s) => s.setTopic)

  const handleSelect = (topicId: string) => {
    setTopic(topicId)
    navigate(`/app/listening/${topicId}`)
  }

  return (
    <div>
      <h1 className="text-2xl font-black mb-4">{t('listening.selectTopic')}</h1>
      <Card className="hover:bg-muted cursor-pointer transition" onClick={() => handleSelect(demoTopic.id)}>
        <CardTitle>{demoTopic.title}</CardTitle>
        {demoTopic.description && <p className="text-sm text-muted-foreground mt-1">{demoTopic.description}</p>}
      </Card>
    </div>
  )
}
