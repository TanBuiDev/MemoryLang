import { Link } from 'react-router-dom'
import { BrandLogo, BrandMark } from '@/components/common/BrandLogo'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { useI18n } from '@/i18n'
import { authService } from '@/services/supabase/auth.service'

export function ForgotPasswordPage() {
  const { t } = useI18n()

  return (
    <main className="brand-grid-bg grid min-h-screen place-items-center bg-background px-4 py-8">
      <Card className="relative w-full max-w-md overflow-hidden p-6">
        <div className="absolute -right-10 -top-10 opacity-10">
          <BrandMark size="xl" label="" className="h-36 w-36" />
        </div>
        <Link to="/" className="relative mb-6 block">
          <BrandLogo variant="compact" size="lg" className="h-12" />
        </Link>
        <CardTitle>{t('auth.forgotPasswordGoogleTitle')}</CardTitle>
        <CardDescription className="mt-2">{t('auth.forgotPasswordGoogleDescription')}</CardDescription>
        <div className="mt-6 grid gap-4">
          <Button variant="secondary" onClick={() => void authService.signInWithGoogle()}>{t('auth.googleLogin')}</Button>
        </div>
        <Link className="mt-4 block text-sm font-bold underline" to="/login">{t('auth.backToLogin')}</Link>
      </Card>
    </main>
  )
}
