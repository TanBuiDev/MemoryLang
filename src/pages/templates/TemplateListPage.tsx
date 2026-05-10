import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { useI18n } from '@/i18n'

export function TemplateListPage() {
  const { t } = useI18n()

  return (
    <>
      <PageHeader title={t('templates.title')} description={t('templates.description')} />
      <EmptyState title={t('templates.emptyTitle')} description={t('templates.emptyDescription')} />
    </>
  )
}
