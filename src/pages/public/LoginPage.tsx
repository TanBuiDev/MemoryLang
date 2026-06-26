import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BrandLogo, BrandMark } from '@/components/common/BrandLogo'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { Input, Label, PasswordInput } from '@/components/ui/input'
import { useI18n } from '@/i18n'
import { authService } from '@/services/supabase/auth.service'
import { isSupabaseConfigured } from '@/services/supabase/client'

export function LoginPage() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!isSupabaseConfigured) {
      navigate('/app/dashboard')
      return
    }
    const isAdmin = await authService.isAdminEmail(email)
    if (isAdmin) {
      setMessage(t('auth.adminGoogleOnly'))
      return
    }
    const { error } = await authService.signInWithPassword(email, password)
    setMessage(error?.message ?? t('auth.loggedIn'))
    if (!error) navigate('/app/dashboard')
  }

  return (
    <main className="brand-grid-bg grid min-h-screen place-items-center bg-background px-4 py-8">
      <Card className="relative w-full max-w-md overflow-hidden p-6">
        <div className="absolute -right-10 -top-10 opacity-10">
          <BrandMark size="xl" label="" className="h-36 w-36" />
        </div>
        <Link to="/" className="relative mb-6 block">
          <BrandLogo variant="compact" size="lg" className="h-12" />
        </Link>
        <CardTitle>{t('auth.loginTitle')}</CardTitle>
        <form className="mt-6 grid gap-4" onSubmit={submit}>
          <div><Label>{t('settings.email')}</Label><Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" /></div>
          <div><Label>{t('auth.password')}</Label><PasswordInput value={password} onChange={(event) => setPassword(event.target.value)} /></div>
          <Button type="submit">{t('auth.login')}</Button>
          <Button type="button" variant="secondary" onClick={() => void authService.signInWithGoogle()}>{t('auth.googleLogin')}</Button>
        </form>
        {message ? <p className="mt-3 text-sm font-bold">{message}</p> : null}
        <p className="mt-4 text-sm font-semibold">
          <Link className="underline" to="/forgot-password">{t('auth.forgotPassword')}</Link>
        </p>
      </Card>
    </main>
  )
}
