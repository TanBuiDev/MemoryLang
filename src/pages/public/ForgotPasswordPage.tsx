import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { useI18n } from '@/i18n'
import { authService } from '@/services/supabase/auth.service'

export function ForgotPasswordPage() {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    const { error } = await authService.resetPassword(email)
    setMessage(error?.message ?? t('auth.resetSent'))
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardTitle>{t('auth.resetTitle')}</CardTitle>
        <CardDescription className="mt-2">{t('auth.resetDescription')}</CardDescription>
        <form className="mt-6 grid gap-4" onSubmit={submit}>
          <div><Label>{t('settings.email')}</Label><Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" /></div>
          <Button type="submit">{t('auth.sendReset')}</Button>
        </form>
        {message ? <p className="mt-3 text-sm font-bold">{message}</p> : null}
        <Link className="mt-4 block text-sm font-bold underline" to="/login">{t('auth.backToLogin')}</Link>
      </Card>
    </main>
  )
}
