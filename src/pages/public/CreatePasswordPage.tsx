import { useState, type FormEvent } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { BrandLogo, BrandMark } from '@/components/common/BrandLogo'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { useI18n } from '@/i18n'
import { authService } from '@/services/supabase/auth.service'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'

export function CreatePasswordPage() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const user = useAuthStore((state) => state.user)
  const profile = useAuthStore((state) => state.profile)
  const setProfile = useAuthStore((state) => state.setProfile)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  if (!isSupabaseConfigured || !user) return <Navigate to="/login" replace />
  if (profile?.password_set && profile?.onboarding_completed) return <Navigate to="/app/dashboard" replace />
  if (profile?.password_set) return <Navigate to="/onboarding" replace />

  async function submit(event: FormEvent) {
    event.preventDefault()
    setMessage('')

    if (password.length < 6) {
      setMessage(t('auth.passwordMinLength'))
      setIsError(true)
      return
    }
    if (password !== confirmPassword) {
      setMessage(t('auth.passwordMismatch'))
      setIsError(true)
      return
    }

    try {
      await authService.setPassword(password)
      await authService.markPasswordSet(user!.id)
      const updated = await authService.getProfile(user!.id)
      if (updated) setProfile(updated)
      navigate(updated?.onboarding_completed ? '/app/dashboard' : '/onboarding')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to set password')
      setIsError(true)
    }
  }

  return (
    <main className="brand-grid-bg grid min-h-screen place-items-center bg-background px-4 py-8">
      <Card className="relative w-full max-w-md overflow-hidden p-6">
        <div className="absolute -right-10 -top-10 opacity-10">
          <BrandMark size="xl" label="" className="h-36 w-36" />
        </div>
        <BrandLogo variant="compact" size="lg" className="relative mb-6 h-12" />
        <CardTitle>{t('auth.createPasswordTitle')}</CardTitle>
        <CardDescription className="mt-2">{t('auth.createPasswordDescription')}</CardDescription>
        <form className="mt-6 grid gap-4" onSubmit={submit}>
          <div>
            <Label>{t('auth.password')}</Label>
            <Input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              minLength={6}
            />
          </div>
          <div>
            <Label>{t('auth.confirmPassword')}</Label>
            <Input
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              minLength={6}
            />
          </div>
          <Button type="submit">{t('auth.createPassword')}</Button>
        </form>
        {message ? (
          <p className={`mt-3 text-sm font-bold ${isError ? 'text-danger' : ''}`}>{message}</p>
        ) : null}
      </Card>
    </main>
  )
}
