import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { StatTile } from '@/components/common/StatTile'
import { Button } from '@/components/ui/button'
import { demoVocabulary } from '@/features/demo/demoData'
import { useI18n } from '@/i18n'

export function StudyResultPage() {
  const { t } = useI18n()

  return (
    <>
      <PageHeader title={t('study.resultTitle')} description={t('study.resultDescription')} actions={<Button asChild><Link to="/app/study">{t('study.studyAgain')}</Link></Button>} />
      <div className="grid gap-4 md:grid-cols-4">
        <StatTile label={t('study.viewedCards')} value={demoVocabulary.length} />
        <StatTile label={t('study.known')} value={2} />
        <StatTile label={t('study.difficult')} value={1} />
        <StatTile label={t('study.timeSpent')} value="4m" />
      </div>
    </>
  )
}
