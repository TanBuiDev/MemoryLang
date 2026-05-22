import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Input, Label, PasswordInput, Select } from '@/components/ui/input'
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
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [nativeLanguage, setNativeLanguage] = useState<LanguageCode>(profile?.native_language ?? 'vi')
  const [targetLanguage, setTargetLanguage] = useState<LanguageCode>(profile?.current_target_language ?? 'en')
  const [uiLanguage, setUiLanguage] = useState<UiLanguageCode>(profile?.ui_language ?? 'vi')
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')

  function resetPasswordForm() {
    setNewPassword('')
    setConfirmNewPassword('')
    setPasswordMessage('')
    setPasswordError('')
  }

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

  async function changePassword() {
    setPasswordMessage('')
    setPasswordError('')

    if (newPassword.length < 6) {
      setPasswordError(t('auth.passwordMinLength'))
      return
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError(t('auth.passwordMismatch'))
      return
    }

    setIsChangingPassword(true)
    try {
      await authService.setPassword(newPassword)
      setShowPasswordModal(false)
      resetPasswordForm()
      setMessage(t('settings.passwordChanged'))
      await authService.signOutAllDevices()
      navigate('/login')
    } catch (error) {
      const msg = error instanceof Error ? error.message : ''
      setPasswordError(/same|different|old|giống|khác|cũ/i.test(msg) ? t('auth.passwordSameAsOld') : t('settings.passwordChangeError'))
    } finally {
      setIsChangingPassword(false)
    }
  }

  const showPasswordSection = isSupabaseConfigured && user && profile?.password_set

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
          {showPasswordSection ? (
            <div className="mt-6 border-t-2 border-border pt-4">
              <Button variant="ghost" onClick={() => setShowPasswordModal(true)}>{t('settings.changePassword')}</Button>
            </div>
          ) : null}
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

      <ConfirmModal
        open={showPasswordModal}
        title={t('settings.changePassword')}
        description={t('settings.changePasswordDescription')}
        confirmLabel={isChangingPassword ? t('settings.passwordChanging') : t('settings.changePassword')}
        cancelLabel={t('actions.cancel')}
        variant="primary"
        confirmDisabled={isChangingPassword}
        onConfirm={() => void changePassword()}
        onCancel={() => { setShowPasswordModal(false); resetPasswordForm() }}
      >
        <input type="text" autoComplete="username" className="hidden" aria-hidden="true" tabIndex={-1} />
        <input type="password" className="hidden" aria-hidden="true" tabIndex={-1} />
        <div className="grid gap-3">
          <div>
            <Label>{t('settings.newPassword')}</Label>
            <PasswordInput value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" />
          </div>
          <div>
            <Label>{t('settings.confirmNewPassword')}</Label>
            <PasswordInput value={confirmNewPassword} onChange={(event) => setConfirmNewPassword(event.target.value)} autoComplete="new-password" />
          </div>
          {passwordError ? <p className="text-sm font-black text-destructive">{passwordError}</p> : null}
          {passwordMessage ? <p className="text-sm font-black text-secondary">{passwordMessage}</p> : null}
        </div>
      </ConfirmModal>
    </>
  )
}
