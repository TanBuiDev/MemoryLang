import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { useI18n } from '@/i18n'
import { authService } from '@/services/supabase/auth.service'
import { isSupabaseConfigured } from '@/services/supabase/client'

export function RegisterPage() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!isSupabaseConfigured) {
      navigate('/onboarding')
      return
    }
    const { error } = await authService.signUpWithPassword(email, password)
    setMessage(error?.message ?? t('auth.registerSuccess'))
    if (!error) navigate('/onboarding')
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardTitle>{t('auth.registerTitle')}</CardTitle>
        <CardDescription className="mt-2">{t('auth.registerDescription')}</CardDescription>
        <form className="mt-6 grid gap-4" onSubmit={submit}>
          <div><Label>{t('settings.email')}</Label><Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" /></div>
          <div><Label>{t('auth.password')}</Label><Input value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={6} /></div>
          <Button type="submit">{t('auth.register')}</Button>
          <Button type="button" variant="secondary" onClick={() => void authService.signInWithGoogle()}>{t('auth.googleRegister')}</Button>
        </form>
        {message ? <p className="mt-3 text-sm font-bold">{message}</p> : null}
        <p className="mt-4 text-sm font-semibold">{t('auth.alreadyHaveAccount')} <Link className="underline" to="/login">{t('auth.login')}</Link></p>
      </Card>
    </main>
  )
}
