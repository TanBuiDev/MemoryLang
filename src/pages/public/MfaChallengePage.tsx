import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { BrandLogo } from '@/components/common/BrandLogo'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { authService } from '@/services/supabase/auth.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { useMfaChallenge } from '@/hooks/useMfaChallenge'

export function MfaChallengePage() {
  const user = useAuthStore((state) => state.user)
  const { loading, requiresChallenge } = useMfaChallenge()
  const navigate = useNavigate()
  const location = useLocation()
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) return
    void authService.listTotpFactors()
      .then((factors) => setFactorId(factors[0]?.id ?? null))
      .catch(() => setError('Không thể tải ứng dụng xác thực của tài khoản.'))
  }, [user])

  if (!user) return <Navigate to="/login" replace />
  if (!loading && !requiresChallenge) return <Navigate to="/app/dashboard" replace />

  const verify = async () => {
    if (!factorId || !/^\d{6}$/.test(code)) {
      setError('Vui lòng nhập mã gồm 6 chữ số từ ứng dụng xác thực.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await authService.verifyTotp(factorId, code)
      const returnTo = (location.state as { returnTo?: string } | null)?.returnTo ?? '/app/dashboard'
      navigate(returnTo, { replace: true })
    } catch {
      setError('Mã xác thực không đúng hoặc đã hết hạn.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="brand-grid-bg grid min-h-screen place-items-center bg-background px-4 py-8">
    <Card className="w-full max-w-md p-6">
      <BrandLogo variant="compact" size="lg" className="mb-6 h-12" />
      <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />Xác thực hai lớp</CardTitle>
      <CardDescription className="mt-2">Nhập mã 6 chữ số từ Google Authenticator để tiếp tục đăng nhập an toàn.</CardDescription>
      <div className="mt-6 grid gap-3">
        <div><Label htmlFor="mfa-login-code">Mã xác thực</Label><Input id="mfa-login-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} /></div>
        {error ? <p role="alert" className="text-sm font-black text-destructive">{error}</p> : null}
        <Button disabled={busy || !factorId} onClick={() => void verify()}>{busy ? 'Đang xác minh...' : 'Xác minh và tiếp tục'}</Button>
      </div>
    </Card>
  </main>
}
