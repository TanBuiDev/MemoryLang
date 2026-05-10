import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
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
    const { error } = await authService.signInWithPassword(email, password)
    setMessage(error?.message ?? t('auth.loggedIn'))
    if (!error) navigate('/app/dashboard')
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardTitle>{t('auth.loginTitle')}</CardTitle>
        <CardDescription className="mt-2">{t('auth.loginDescription')}</CardDescription>
        <form className="mt-6 grid gap-4" onSubmit={submit}>
          <div><Label>{t('settings.email')}</Label><Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" /></div>
          <div><Label>{t('auth.password')}</Label><Input value={password} onChange={(event) => setPassword(event.target.value)} type="password" /></div>
          <Button type="submit">{t('auth.login')}</Button>
          <Button type="button" variant="secondary" onClick={() => void authService.signInWithGoogle()}>{t('auth.googleLogin')}</Button>
        </form>
        {message ? <p className="mt-3 text-sm font-bold">{message}</p> : null}
        <p className="mt-4 text-sm font-semibold">
          <Link className="underline" to="/forgot-password">{t('auth.forgotPassword')}</Link> · <Link className="underline" to="/register">{t('auth.createAccount')}</Link>
        </p>
      </Card>
    </main>
  )
}
