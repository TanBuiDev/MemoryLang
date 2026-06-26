import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { AddVocabularyForm } from '@/components/vocabulary/AddVocabularyForm'
import { useI18n } from '@/i18n'
import { useAuthStore } from '@/stores/useAuthStore'

export function AddVocabularyPage() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const profile = useAuthStore((state) => state.profile)

  useEffect(() => {
    if (profile && !profile.is_admin) {
      navigate('/app/dashboard', { replace: true })
    }
  }, [profile, navigate])

  if (!profile || !profile.is_admin) {
    return null
  }

  return (
    <>
      <PageHeader title={t('vocabulary.addTitle')} description={t('vocabulary.addDescription')} />
      <AddVocabularyForm onSuccess={() => navigate('/app/vocabulary')} />
    </>
  )
}
