import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  Check,
  Crown,
  Database,
  Download,
  Globe,
  KeyRound,
  Layers,
  Lock,
  Mail,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Upload,
  User,
  UserCheck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Input, Label, PasswordInput } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { uiLanguageOptions, useI18n } from '@/i18n'
import { MfaSetupSection } from '@/pages/settings/MfaSetupSection'
import { authService } from '@/services/supabase/auth.service'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'
import type { UiLanguageCode } from '@/types/auth.types'
import type { LanguageCode } from '@/types/language.types'
import { languageOptions } from '@/utils/languageCodes'

type SettingsCategory = 'all' | 'profile' | 'language' | 'security' | 'notifications' | 'data'

interface NavTab {
  id: SettingsCategory
  label: string
  icon: LucideIcon
  badge?: string
  badgeColor?: string
}

const navTabs: NavTab[] = [
  { id: 'all', label: 'Tất cả cài đặt', icon: Layers },
  { id: 'profile', label: 'Hồ sơ & Mật khẩu', icon: User },
  { id: 'language', label: 'Ngôn ngữ & Vùng', icon: Globe },
  {
    id: 'security',
    label: 'Bảo mật 2 Lớp (MFA)',
    icon: ShieldCheck,
    badge: '2FA',
    badgeColor: 'bg-emerald-100 text-emerald-950 border-slate-900',
  },
  { id: 'notifications', label: 'Email & Thông báo', icon: Mail },
  {
    id: 'data',
    label: 'Dữ liệu & Quyền riêng tư',
    icon: Database,
    badge: 'Danger',
    badgeColor: 'bg-rose-100 text-rose-950 border-slate-900',
  },
]

export function SettingsPage() {
  const user = useAuthStore((state) => state.user)
  const profile = useAuthStore((state) => state.profile)
  const setProfile = useAuthStore((state) => state.setProfile)
  const { t } = useI18n()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<SettingsCategory>('all')

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [nativeLanguage, setNativeLanguage] = useState<LanguageCode>(profile?.native_language ?? 'vi')
  const [targetLanguage, setTargetLanguage] = useState<LanguageCode>(profile?.current_target_language ?? 'en')
  const [uiLanguage, setUiLanguage] = useState<UiLanguageCode>(profile?.ui_language ?? 'vi')
  const [emailRemindersEnabled, setEmailRemindersEnabled] = useState(profile?.email_reminders_enabled ?? true)
  const [weeklyDigestEnabled, setWeeklyDigestEnabled] = useState(profile?.weekly_digest_enabled ?? true)
  const [savingEmailPreferences, setSavingEmailPreferences] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [savingUiLanguage, setSavingUiLanguage] = useState(false)

  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')

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
    const changed =
      displayName !== (profile.display_name ?? '') ||
      nativeLanguage !== profile.native_language ||
      targetLanguage !== profile.current_target_language
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
    } catch {
      /* silently ignore */
    }
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
    } catch {
      /* silently ignore */
    } finally {
      setSavingUiLanguage(false)
    }
  }

  async function saveEmailPreferences(reminders: boolean, digest: boolean) {
    if (!isSupabaseConfigured || !user || !profile) return
    setSavingEmailPreferences(true)
    try {
      const updated = await authService.updateProfile(user.id, {
        email_reminders_enabled: reminders,
        weekly_digest_enabled: digest,
      })
      setProfile(updated)
      setEmailRemindersEnabled(updated.email_reminders_enabled ?? true)
      setWeeklyDigestEnabled(updated.weekly_digest_enabled ?? true)
    } catch {
      /* silently ignore */
    } finally {
      setSavingEmailPreferences(false)
    }
  }

  async function deleteAccount() {
    if (deleteConfirmText !== 'DELETE') return
    setIsDeleting(true)
    try {
      await authService.deleteAccount()
      navigate('/')
    } catch {
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
      setPasswordError(
        /same|different|old|giống|khác|cũ/i.test(msg) ? t('auth.passwordSameAsOld') : t('settings.passwordChangeError'),
      )
    } finally {
      setIsChangingPassword(false)
    }
  }

  const showPasswordSection = isSupabaseConfigured && user && profile?.password_set

  // Formatting options for Neobrutalist Select
  const formattedUiOptions = uiLanguageOptions.map((opt) => ({
    value: opt.code,
    label: t(`language.${opt.code}`),
  }))

  const formattedLangOptions = languageOptions.map((opt) => ({
    value: opt.code,
    label: t(`language.${opt.code}`),
  }))

  const userInitial = displayName ? displayName[0].toUpperCase() : 'U'

  return (
    <div className="w-full space-y-6 pb-24">
      {/* Modern Neobrutalist User Identity Banner Card */}
      <div className="neo-card border-3 border-border bg-gradient-to-r from-amber-100 via-amber-50 to-card p-5 shadow-[4px_4px_0_var(--border)] rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-3 border-border bg-primary text-primary-foreground font-black text-xl shadow-[3px_3px_0_var(--border)] shrink-0">
            {userInitial}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-foreground">{displayName || 'Người học MemoryLang'}</h2>
              {profile?.is_admin ? (
                <Badge className="bg-rose-100 text-rose-950 border-2 border-rose-400 font-black text-xs">
                  <ShieldAlert size={12} className="text-rose-700 inline mr-1" /> Admin
                </Badge>
              ) : (
                <Badge className="bg-emerald-100 text-emerald-950 border-2 border-emerald-400 font-black text-xs">
                  Learner
                </Badge>
              )}
            </div>
            <p className="text-xs font-bold text-muted-foreground mt-0.5">{user?.email || 'learner@example.com'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {profileSaved && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-100 text-emerald-950 border-2 border-emerald-400 text-xs font-black shadow-[2px_2px_0_var(--border)] animate-in fade-in duration-200">
              <Check className="h-4 w-4 text-emerald-700" /> {t('settings.saved')}
            </span>
          )}
          <div className="px-3.5 py-1.5 rounded-xl bg-white border-2 border-border text-xs font-black shadow-[2px_2px_0_var(--border)] flex items-center gap-1.5">
            <Globe size={14} className="text-primary" />
            <span className="uppercase">{nativeLanguage} → {targetLanguage}</span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Sidebar Navigation Layout */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Left Vertical Navigation Menu Sidebar (Spacious 288px Width, Zero Overflow Clipping) */}
        <aside className="w-full md:w-72 shrink-0">
          <div className="neo-card bg-card border-3 border-border p-3 shadow-[4px_4px_0_var(--border)] rounded-2xl flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible">
            {/* Sidebar Subheader */}
            <div className="hidden md:flex items-center justify-between px-2.5 py-1.5 border-b-2 border-border mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <SlidersHorizontal size={13} className="text-primary" />
                Danh mục Cài đặt
              </span>
            </div>

            {navTabs.map((tab) => {
              const isActive = activeTab === tab.id
              const Icon = tab.icon

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-black border-2 transition-all select-none ${
                    isActive
                      ? 'bg-[#fdc800] text-slate-900 border-slate-900 shadow-[3px_3px_0px_#000] translate-x-[-1px] translate-y-[-1px]'
                      : 'bg-white text-slate-800 border-border hover:border-slate-900 hover:bg-slate-50 hover:shadow-[2px_2px_0px_#000]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                    <Icon size={16} className="shrink-0 text-slate-900" />
                    <span className="truncate">{tab.label}</span>
                  </div>
                  {tab.badge && (
                    <span
                      className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md border shrink-0 shadow-[1px_1px_0px_#000] ${
                        tab.badgeColor || 'bg-amber-200 text-amber-950 border-slate-900'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </aside>

        {/* Right Settings Content Area */}
        <main className="flex-1 w-full space-y-6">
          {/* CARD 1: THÔNG TIN CÁ NHÂN (PROFILE) */}
          {(activeTab === 'all' || activeTab === 'profile') && (
            <section className="neo-card border-3 border-border bg-card p-6 shadow-[4px_4px_0_var(--border)] rounded-2xl flex flex-col justify-between space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div>
                <div className="flex items-center justify-between border-b-2 border-border pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-border bg-primary text-primary-foreground font-black shadow-[2px_2px_0_var(--border)]">
                      <User size={20} />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-foreground uppercase tracking-wide">{t('settings.profile')}</h2>
                      <p className="text-xs font-semibold text-muted-foreground">{t('settings.profileDescription')}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  <div>
                    <Label>{t('settings.displayName')}</Label>
                    <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <Label>{t('settings.email')}</Label>
                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 flex items-center gap-1">
                        <UserCheck size={11} /> Đã xác thực
                      </span>
                    </div>
                    <div className="relative mt-1">
                      <Input defaultValue={user?.email ?? 'learner@example.com'} type="email" disabled className="bg-muted pr-10" />
                      <Lock size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </div>

              {showPasswordSection && (
                <div className="border-t-2 border-border pt-4 mt-4">
                  <Button
                    variant="secondary"
                    onClick={() => setShowPasswordModal(true)}
                    className="w-full sm:w-auto font-black text-xs h-10 flex items-center justify-center gap-2"
                  >
                    <KeyRound size={16} />
                    {t('settings.changePassword')}
                  </Button>
                </div>
              )}
            </section>
          )}

          {/* CARD 2: CẤU HÌNH NGÔN NGỮ (LANGUAGES) */}
          {(activeTab === 'all' || activeTab === 'language') && (
            <section className="neo-card border-3 border-border bg-card p-6 shadow-[4px_4px_0_var(--border)] rounded-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-2.5 border-b-2 border-border pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-border bg-blue-400 text-blue-950 font-black shadow-[2px_2px_0_var(--border)]">
                  <Globe size={20} />
                </div>
                <div>
                  <h2 className="text-base font-black text-foreground uppercase tracking-wide">{t('settings.languages')}</h2>
                  <p className="text-xs font-semibold text-muted-foreground">Tùy chỉnh ngôn ngữ hiển thị và ngôn ngữ mục tiêu</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>{t('settings.interfaceLanguage')}</Label>
                  <div className="flex gap-2 mt-1">
                    <Select
                      className="flex-1"
                      value={uiLanguage}
                      onChange={(val) => setUiLanguage(val as UiLanguageCode)}
                      options={formattedUiOptions}
                    />
                    <Button
                      variant="primary"
                      className="min-h-10 shrink-0 font-black text-xs px-4"
                      onClick={() => void saveUiLanguage()}
                      disabled={uiLanguage === (profile?.ui_language ?? 'vi') || savingUiLanguage}
                    >
                      {savingUiLanguage ? '...' : t('actions.saveChanges')}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>{t('settings.nativeLanguage')}</Label>
                  <div className="mt-1">
                    <Select
                      value={nativeLanguage}
                      onChange={(val) => setNativeLanguage(val as LanguageCode)}
                      options={formattedLangOptions}
                    />
                  </div>
                </div>

                <div>
                  <Label>{t('settings.targetLanguage')}</Label>
                  <div className="mt-1">
                    <Select
                      value={targetLanguage}
                      onChange={(val) => setTargetLanguage(val as LanguageCode)}
                      options={formattedLangOptions}
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* CARD 3: BẢO MẬT 2 LỚP (MFA SETUP) */}
          {(activeTab === 'all' || activeTab === 'security') && isSupabaseConfigured && user ? (
            <div className="animate-in fade-in zoom-in-95 duration-150">
              <MfaSetupSection />
            </div>
          ) : null}

          {/* CARD 4: CẤU HÌNH EMAIL THÔNG BÁO */}
          {(activeTab === 'all' || activeTab === 'notifications') && (
            <section className="neo-card border-3 border-border bg-card p-6 shadow-[4px_4px_0_var(--border)] rounded-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-2.5 border-b-2 border-border pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-border bg-amber-400 text-amber-950 font-black shadow-[2px_2px_0_var(--border)]">
                  <Mail size={20} />
                </div>
                <div>
                  <h2 className="text-base font-black text-foreground uppercase tracking-wide">Cấu hình Email Thông báo</h2>
                  <p className="text-xs font-semibold text-muted-foreground">
                    Quản lý các email thông báo và nhắc nhở học tập gửi đến hòm thư của bạn
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between rounded-xl border-2 border-border p-4 bg-background shadow-[2px_2px_0_var(--border)]">
                  <div className="pr-4">
                    <p className="font-black text-sm text-foreground flex items-center gap-2">
                      <Bell size={16} className="text-amber-500" /> Email nhắc nhở ôn tập hàng ngày
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">
                      Nhận 1 email tổng hợp vào 8:00 AM khi có từ vựng đến hạn ôn tập SM-2
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    aria-label="Email nhắc nhở ôn tập hàng ngày"
                    className="h-6 w-6 rounded-md border-2 border-border accent-primary cursor-pointer shrink-0"
                    checked={emailRemindersEnabled}
                    onChange={(e) => {
                      const val = e.target.checked
                      setEmailRemindersEnabled(val)
                      void saveEmailPreferences(val, weeklyDigestEnabled)
                    }}
                    disabled={savingEmailPreferences}
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border-2 border-border p-4 bg-background shadow-[2px_2px_0_var(--border)]">
                  <div className="pr-4">
                    <p className="font-black text-sm text-foreground flex items-center gap-2">
                      <Crown size={16} className="text-purple-500" /> Báo cáo tiến độ học tập hàng tuần
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">
                      Nhận báo cáo tổng kết số từ vựng đã ghi nhớ vào cuối tuần
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    aria-label="Báo cáo tiến độ học tập hàng tuần"
                    className="h-6 w-6 rounded-md border-2 border-border accent-primary cursor-pointer shrink-0"
                    checked={weeklyDigestEnabled}
                    onChange={(e) => {
                      const val = e.target.checked
                      setWeeklyDigestEnabled(val)
                      void saveEmailPreferences(emailRemindersEnabled, val)
                    }}
                    disabled={savingEmailPreferences}
                  />
                </div>
              </div>
            </section>
          )}

          {/* CARD 5: DỮ LIỆU & TÀI KHOẢN (DATA & DANGER ZONE) */}
          {(activeTab === 'all' || activeTab === 'data') && (
            <section className="neo-card border-3 border-border bg-card p-6 shadow-[4px_4px_0_var(--border)] rounded-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-2.5 border-b-2 border-border pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-border bg-slate-900 text-white font-black shadow-[2px_2px_0_var(--border)]">
                  <Database size={20} />
                </div>
                <div>
                  <h2 className="text-base font-black text-foreground uppercase tracking-wide">{t('settings.dataAccount')}</h2>
                  <p className="text-xs font-semibold text-muted-foreground">{t('settings.dataAccountDescription')}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button variant="ghost" className="font-black text-xs h-9 flex items-center gap-2 border-2 border-border">
                  <Download size={15} /> {t('actions.exportCsv')}
                </Button>
                <Button variant="ghost" className="font-black text-xs h-9 flex items-center gap-2 border-2 border-border">
                  <Upload size={15} /> {t('actions.importCsv')}
                </Button>
                <Button variant="danger" className="font-black text-xs h-9 flex items-center gap-2">
                  <Trash2 size={15} /> {t('actions.deleteAllVocabulary')}
                </Button>
              </div>

              {isSupabaseConfigured && user ? (
                <div className="border-t-2 border-border pt-4">
                  <Button
                    variant="danger"
                    onClick={() => setShowDeleteModal(true)}
                    className="font-black text-xs h-10 w-full sm:w-auto flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} /> {t('actions.deleteAccount')}
                  </Button>
                </div>
              ) : null}
            </section>
          )}
        </main>
      </div>

      {/* MODAL ĐỔI MẬT KHẨU */}
      <ConfirmModal
        open={showPasswordModal}
        title={t('settings.changePassword')}
        description={t('settings.changePasswordDescription')}
        confirmLabel={isChangingPassword ? t('settings.passwordChanging') : t('settings.changePassword')}
        cancelLabel={t('actions.cancel')}
        variant="primary"
        confirmDisabled={isChangingPassword}
        onConfirm={() => void changePassword()}
        onCancel={() => {
          setShowPasswordModal(false)
          resetPasswordForm()
        }}
      >
        <input type="text" autoComplete="username" className="hidden" aria-hidden="true" tabIndex={-1} />
        <input type="password" className="hidden" aria-hidden="true" tabIndex={-1} />
        <div className="grid gap-4 mt-2">
          <div>
            <Label>{t('settings.newPassword')}</Label>
            <PasswordInput
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div>
            <Label>{t('settings.confirmNewPassword')}</Label>
            <PasswordInput
              value={confirmNewPassword}
              onChange={(event) => setConfirmNewPassword(event.target.value)}
              autoComplete="new-password"
            />
          </div>
          {passwordError ? <p className="text-xs font-black text-rose-700 bg-rose-100 p-2.5 rounded border border-rose-300">{passwordError}</p> : null}
          {passwordMessage ? <p className="text-xs font-black text-emerald-700 bg-emerald-100 p-2.5 rounded border border-emerald-300">{passwordMessage}</p> : null}
        </div>
      </ConfirmModal>

      {/* MODAL XÓA TÀI KHOẢN */}
      <ConfirmModal
        open={showDeleteModal}
        title={t('actions.deleteAccount')}
        description={t('settings.deleteAccountWarning')}
        confirmLabel={isDeleting ? t('settings.deleting') : t('settings.deleteAccountConfirm')}
        cancelLabel={t('actions.cancel')}
        variant="danger"
        confirmDisabled={deleteConfirmText !== 'DELETE' || isDeleting}
        onConfirm={() => void deleteAccount()}
        onCancel={() => {
          setShowDeleteModal(false)
          setDeleteConfirmText('')
        }}
      >
        <div className="grid gap-3 mt-2">
          <div>
            <Label>{t('settings.typeDeleteToConfirm')}</Label>
            <Input
              value={deleteConfirmText}
              onChange={(event) => setDeleteConfirmText(event.target.value)}
              placeholder="DELETE"
              className="mt-1"
            />
          </div>
        </div>
      </ConfirmModal>
    </div>
  )
}
