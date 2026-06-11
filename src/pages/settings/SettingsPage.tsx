import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Input, Label, PasswordInput, Select } from '@/components/ui/input'
import { defaultStudyHotkeys, duplicateStudyHotkeys, formatStudyHotkey, hotkeyFromKeyboardEvent, type StudyHotkeyAction } from '@/features/study/studyHotkeys'
import { uiLanguageOptions, useI18n } from '@/i18n'
import { authService } from '@/services/supabase/auth.service'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'
import { useStudyStore } from '@/stores/useStudyStore'
import type { UiLanguageCode } from '@/types/auth.types'
import type { LanguageCode } from '@/types/language.types'
import { languageOptions } from '@/utils/languageCodes'

export function SettingsPage() {
  const user = useAuthStore((state) => state.user)
  const profile = useAuthStore((state) => state.profile)
  const setProfile = useAuthStore((state) => state.setProfile)
  const { t } = useI18n()
  const navigate = useNavigate()
  const hotkeys = useStudyStore((state) => state.hotkeys)
  const setHotkeys = useStudyStore((state) => state.setHotkeys)

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [nativeLanguage, setNativeLanguage] = useState<LanguageCode>(profile?.native_language ?? 'vi')
  const [targetLanguage, setTargetLanguage] = useState<LanguageCode>(profile?.current_target_language ?? 'en')
  const [uiLanguage, setUiLanguage] = useState<UiLanguageCode>(profile?.ui_language ?? 'vi')
  const [profileSaved, setProfileSaved] = useState(false)
  const [savingUiLanguage, setSavingUiLanguage] = useState(false)
  const [capturingHotkey, setCapturingHotkey] = useState<StudyHotkeyAction | null>(null)
  const [hotkeysOpen, setHotkeysOpen] = useState(false)

  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const duplicateHotkeySet = duplicateStudyHotkeys(hotkeys)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const hasProfileChanged =
    displayName !== (profile?.display_name ?? '') ||
    nativeLanguage !== (profile?.native_language ?? 'vi') ||
    targetLanguage !== (profile?.current_target_language ?? 'en')

  const saveProfileRef = useRef<() => Promise<void>>(() => Promise.resolve())
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  saveProfileRef.current = useCallback(async () => {
    if (!isSupabaseConfigured || !user || !profile) return
    const changed = displayName !== (profile.display_name ?? '')
      || nativeLanguage !== profile.native_language
      || targetLanguage !== profile.current_target_language
    const uiChanged = uiLanguage !== profile.ui_language

    if (!changed && !uiChanged) return

    try {
      const update: Record<string, unknown> = {}
      if (changed) {
        update.display_name = displayName || null
        update.native_language = nativeLanguage
        update.current_target_language = targetLanguage
      }
      if (uiChanged) {
        update.ui_language = uiLanguage
      }
      const updated = await authService.updateProfile(user.id, update as Parameters<typeof authService.updateProfile>[1])
      setProfile(updated)
      setProfileSaved(true)
    } catch { /* silently ignore */ }
  }, [displayName, nativeLanguage, targetLanguage, uiLanguage, profile, user, setProfile])

  useEffect(() => {
    if (!hasProfileChanged) return

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      void saveProfileRef.current()
    }, 800)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [displayName, nativeLanguage, targetLanguage, hasProfileChanged])

  useEffect(() => {
    function flushBeforeUnload() {
      if (timerRef.current) clearTimeout(timerRef.current)
      void saveProfileRef.current()
    }

    function handleVisibility() {
      if (document.visibilityState === 'hidden') flushBeforeUnload()
    }

    window.addEventListener('beforeunload', flushBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      flushBeforeUnload()
      window.removeEventListener('beforeunload', flushBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  useEffect(() => {
    if (!profileSaved) return
    const timer = setTimeout(() => setProfileSaved(false), 2000)
    return () => clearTimeout(timer)
  }, [profileSaved])

  async function saveUiLanguage() {
    if (!isSupabaseConfigured || !user || !profile) return
    setSavingUiLanguage(true)
    try {
      const updated = await authService.updateProfile(user.id, { ui_language: uiLanguage })
      setProfile(updated)
    } catch { /* silently ignore */ }
    finally { setSavingUiLanguage(false) }
  }

  async function deleteAccount() {
    if (deleteConfirmText !== 'DELETE') return
    setIsDeleting(true)
    try {
      await authService.deleteAccount()
      navigate('/')
    } catch (error) {
      setIsDeleting(false)
    }
  }

  function resetPasswordForm() {
    setNewPassword('')
    setConfirmNewPassword('')
    setPasswordMessage('')
    setPasswordError('')
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
    } catch (error) {
      const msg = error instanceof Error ? error.message : ''
      setPasswordError(/same|different|old|giống|khác|cũ/i.test(msg) ? t('auth.passwordSameAsOld') : t('settings.passwordChangeError'))
    } finally {
      setIsChangingPassword(false)
    }
  }

  const showPasswordSection = isSupabaseConfigured && user && profile?.password_set
  const hotkeyLabelKeys: Record<StudyHotkeyAction, string> = {
    confirmRemember: 'settings.hotkeyConfirmRemember',
    know: 'settings.hotkeyKnow',
    dontKnow: 'settings.hotkeyDontKnow',
    flip: 'settings.hotkeyFlip',
    previous: 'settings.hotkeyPrevious',
    next: 'settings.hotkeyNext',
    playAudio: 'settings.hotkeyPlayAudio',
    toggleAuto: 'settings.hotkeyToggleAuto',
    endSession: 'settings.hotkeyEndSession',
  }

  const hotkeyGroups: Array<{ key: string; actions: StudyHotkeyAction[] }> = [
    { key: 'settings.hotkeyGroupRating', actions: ['confirmRemember', 'know', 'dontKnow'] },
    { key: 'settings.hotkeyGroupNavigation', actions: ['flip', 'previous', 'next'] },
    { key: 'settings.hotkeyGroupAudio', actions: ['playAudio'] },
    { key: 'settings.hotkeyGroupSession', actions: ['toggleAuto', 'endSession'] },
  ]

  function captureHotkey(action: StudyHotkeyAction, event: KeyboardEvent<HTMLButtonElement>) {
    if (capturingHotkey !== action) return
    event.preventDefault()
    const key = hotkeyFromKeyboardEvent(event)
    if (!key) return
    setHotkeys({ ...hotkeys, [action]: key })
    setCapturingHotkey(null)
  }

  return (
    <>
      <PageHeader
        title={t('settings.title')}
        description={t('settings.description')}
        actions={profileSaved ? <span className="flex items-center gap-1 text-sm font-bold text-secondary"><Check className="h-4 w-4" /> {t('settings.saved')}</span> : null}
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
            <div><Label>{t('settings.interfaceLanguage')}</Label><div className="flex gap-2"><Select className="flex-1" value={uiLanguage} onChange={(event) => setUiLanguage(event.target.value as UiLanguageCode)}>{uiLanguageOptions.map((item) => <option key={item.code} value={item.code}>{t(`language.${item.code}`)}</option>)}</Select><Button variant="primary" className="min-h-10 shrink-0" onClick={() => void saveUiLanguage()} disabled={uiLanguage === (profile?.ui_language ?? 'vi') || savingUiLanguage}>{savingUiLanguage ? '...' : t('actions.saveChanges')}</Button></div></div>
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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>{t('settings.studyHotkeys')}</CardTitle>
              <CardDescription className="mt-2">{t('settings.studyHotkeysDescription')}</CardDescription>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" onClick={() => { setHotkeys({ ...defaultStudyHotkeys }); setCapturingHotkey(null) }}>
                {t('settings.hotkeyReset')}
              </Button>
              <Button variant="ghost" className="h-10 min-h-0 w-10 p-0" aria-label={hotkeysOpen ? t('settings.hotkeyCollapse') : t('settings.hotkeyExpand')} onClick={() => setHotkeysOpen((open) => !open)}>
                {hotkeysOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </Button>
            </div>
          </div>
          {hotkeysOpen ? (
            <>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {hotkeyGroups.map((group) => (
              <div key={group.key} className="md:col-span-4">
                <p className="text-sm font-black uppercase text-muted-foreground">{t(group.key)}</p>
                <div className="mt-2 rounded-md border-2 border-border bg-muted/50 p-3">
                  <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                    {group.actions.map((action) => {
                    const label = t(hotkeyLabelKeys[action])
                    const isDuplicate = Boolean(hotkeys[action] && duplicateHotkeySet.has(hotkeys[action]!))
                    return (
                      <div key={action} className={`rounded-md border-2 p-3 ${isDuplicate ? 'border-destructive bg-destructive/10' : 'border-border bg-background'}`}>
                        <p className="text-sm font-black">{label}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            aria-label={t('settings.hotkeyAssign', { action: label })}
                            aria-pressed={capturingHotkey === action}
                            onClick={() => setCapturingHotkey(action)}
                            onKeyDown={(event) => captureHotkey(action, event)}
                            className="neo-button min-h-10 flex-1 rounded-md border-2 border-border bg-card px-3 py-2 text-left font-mono text-sm font-black"
                          >
                            {capturingHotkey === action
                              ? t('settings.hotkeyPressKeys')
                              : hotkeys[action]
                                ? formatStudyHotkey(hotkeys[action])
                                : t('settings.hotkeyUnassigned')}
                          </button>
                          <Button
                            variant="ghost"
                            className="min-h-10 px-3"
                            aria-label={t('settings.hotkeyClearAction', { action: label })}
                            onClick={() => setHotkeys({ ...hotkeys, [action]: null })}
                          >
                            {t('settings.hotkeyClear')}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
                </div>
              </div>
            ))}
          </div>
          {duplicateHotkeySet.size > 0 ? (
            <p role="alert" className="mt-4 text-sm font-black text-destructive">{t('settings.hotkeyDuplicateError')}</p>
          ) : null}
            </>
          ) : null}
        </Card>
        <Card className="lg:col-span-2">
          <CardTitle>{t('settings.dataAccount')}</CardTitle>
          <CardDescription className="mt-2">{t('settings.dataAccountDescription')}</CardDescription>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="ghost">{t('actions.exportCsv')}</Button>
            <Button variant="ghost">{t('actions.importCsv')}</Button>
            <Button variant="danger">{t('actions.deleteAllVocabulary')}</Button>
          </div>
          {isSupabaseConfigured && user ? (
            <div className="mt-6 border-t-2 border-border pt-4">
              <Button variant="danger" onClick={() => setShowDeleteModal(true)}>{t('actions.deleteAccount')}</Button>
            </div>
          ) : null}
        </Card>
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

      <ConfirmModal
        open={showDeleteModal}
        title={t('actions.deleteAccount')}
        description={t('settings.deleteAccountWarning')}
        confirmLabel={isDeleting ? t('settings.deleting') : t('settings.deleteAccountConfirm')}
        cancelLabel={t('actions.cancel')}
        variant="danger"
        confirmDisabled={deleteConfirmText !== 'DELETE' || isDeleting}
        onConfirm={() => void deleteAccount()}
        onCancel={() => { setShowDeleteModal(false); setDeleteConfirmText('') }}
      >
        <div className="grid gap-3">
          <div>
            <Label>{t('settings.typeDeleteToConfirm')}</Label>
            <Input value={deleteConfirmText} onChange={(event) => setDeleteConfirmText(event.target.value)} placeholder="DELETE" />
          </div>
        </div>
      </ConfirmModal>
    </>
  )
}
