import { useState } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Input, Label, Select } from '@/components/ui/input'
import { uiLanguageOptions, useI18n } from '@/i18n'
import { authService } from '@/services/supabase/auth.service'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'
import type { UiLanguageCode } from '@/types/auth.types'
import type { LanguageCode } from '@/types/language.types'
import { languageOptions } from '@/utils/languageCodes'

export function SettingsPage() {
  const user = useAuthStore((state) => state.user)
  const profile = useAuthStore((state) => state.profile)
  const setProfile = useAuthStore((state) => state.setProfile)
  const { t } = useI18n()
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [nativeLanguage, setNativeLanguage] = useState<LanguageCode>(profile?.native_language ?? 'vi')
  const [targetLanguage, setTargetLanguage] = useState<LanguageCode>(profile?.current_target_language ?? 'en')
  const [uiLanguage, setUiLanguage] = useState<UiLanguageCode>(profile?.ui_language ?? 'vi')
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function saveSettings() {
    setMessage('')
    setIsSaving(true)

    try {
      if (isSupabaseConfigured && user) {
        const updatedProfile = await authService.updateProfile(user.id, {
          display_name: displayName || null,
          native_language: nativeLanguage,
          current_target_language: targetLanguage,
          ui_language: uiLanguage,
        })
        setProfile(updatedProfile)
      } else if (profile) {
        setProfile({
          ...profile,
          display_name: displayName || null,
          native_language: nativeLanguage,
          current_target_language: targetLanguage,
          ui_language: uiLanguage,
        })
      }

      setMessage(t('settings.saved'))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('settings.saveError'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title={t('settings.title')}
        description={t('settings.description')}
        actions={<Button onClick={() => void saveSettings()} disabled={isSaving}>{isSaving ? t('actions.saving') : t('actions.saveSettings')}</Button>}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>{t('settings.profile')}</CardTitle>
          <CardDescription className="mt-2">{t('settings.profileDescription')}</CardDescription>
          <div className="mt-4 grid gap-4">
            <div><Label>{t('settings.displayName')}</Label><Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></div>
            <div><Label>{t('settings.email')}</Label><Input defaultValue={user?.email ?? 'learner@example.com'} type="email" disabled /></div>
          </div>
        </Card>
        <Card>
          <CardTitle>{t('settings.languages')}</CardTitle>
          <div className="mt-4 grid gap-4">
            <div><Label>{t('settings.interfaceLanguage')}</Label><Select value={uiLanguage} onChange={(event) => setUiLanguage(event.target.value as UiLanguageCode)}>{uiLanguageOptions.map((item) => <option key={item.code} value={item.code}>{t(`language.${item.code}`)}</option>)}</Select></div>
            <div><Label>{t('settings.nativeLanguage')}</Label><Select value={nativeLanguage} onChange={(event) => setNativeLanguage(event.target.value as LanguageCode)}>{languageOptions.map((item) => <option key={item.code} value={item.code}>{t(`language.${item.code}`)}</option>)}</Select></div>
            <div><Label>{t('settings.targetLanguage')}</Label><Select value={targetLanguage} onChange={(event) => setTargetLanguage(event.target.value as LanguageCode)}>{languageOptions.map((item) => <option key={item.code} value={item.code}>{t(`language.${item.code}`)}</option>)}</Select></div>
          </div>
        </Card>
        <Card>
          <CardTitle>{t('settings.studyPreferences')}</CardTitle>
          <div className="mt-4 grid gap-4">
            <div><Label>{t('settings.dailyGoal')}</Label><Select defaultValue="10"><option value="5">{t('settings.wordsPerDay', { count: 5 })}</option><option value="10">{t('settings.wordsPerDay', { count: 10 })}</option><option value="20">{t('settings.wordsPerDay', { count: 20 })}</option></Select></div>
            <div><Label>{t('settings.defaultStudyMode')}</Label><Select defaultValue="two_side"><option value="two_side">{t('study.twoSide')}</option><option value="one_side">{t('study.oneSide')}</option></Select></div>
          </div>
        </Card>
        <Card>
          <CardTitle>{t('settings.audioPreferences')}</CardTitle>
          <div className="mt-4 grid gap-4">
            <div><Label>{t('settings.speechRate')}</Label><Input defaultValue="1" type="number" step="0.1" /></div>
            <div><Label>{t('settings.speechPitch')}</Label><Input defaultValue="1" type="number" step="0.1" /></div>
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <CardTitle>{t('settings.dataAccount')}</CardTitle>
          <CardDescription className="mt-2">{t('settings.dataAccountDescription')}</CardDescription>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="ghost">{t('actions.exportCsv')}</Button>
            <Button variant="ghost">{t('actions.importCsv')}</Button>
            <Button variant="danger">{t('actions.deleteAllVocabulary')}</Button>
          </div>
        </Card>
        {message ? <p className="lg:col-span-2 text-sm font-black text-secondary">{message}</p> : null}
      </div>
    </>
  )
}
