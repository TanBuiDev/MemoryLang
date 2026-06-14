import { useNavigate } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { demoTest } from '@/features/listening/demoData'
import { useListeningStore } from '@/stores/useListeningStore'
import { Card, CardTitle } from '@/components/ui/card'

export function TestSelectionPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const setTest = useListeningStore((s) => s.setTest)

  const handleSelect = (testId: string) => {
    setTest(testId)
    navigate(`${testId}`)
  }

  return (
    <div>
      <h1 className="text-2xl font-black mb-4">{t('listening.selectTest')}</h1>
      <Card className="hover:bg-muted cursor-pointer transition" onClick={() => handleSelect(demoTest.id)}>
        <CardTitle>{demoTest.title}</CardTitle>
      </Card>
    </div>
  )
}
