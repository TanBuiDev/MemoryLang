import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { useI18n } from '@/i18n'

export function TemplateBuilderPage() {
  const { t } = useI18n()

  return (
    <>
      <PageHeader title={t('templates.builderTitle')} description={t('templates.builderDescription')} />
      <EmptyState title={t('templates.builderEmptyTitle')} description={t('templates.builderEmptyDescription')} />
    </>
  )
}
