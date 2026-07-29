import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Input, Label } from '@/components/ui/input'
import { authService } from '@/services/supabase/auth.service'

type Enrollment = { id: string; totp: { qr_code: string; secret: string } }

export function MfaSetupSection() {
  const [factors, setFactors] = useState<Array<{ id: string; friendly_name?: string | null }>>([])
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null)

  const loadFactors = async () => {
    try { setFactors(await authService.listTotpFactors()) } catch { setError('Không thể tải trạng thái xác thực hai lớp.') }
  }

  useEffect(() => { void loadFactors() }, [])

  const startEnrollment = async () => {
    setBusy(true); setError(null)
    try { setEnrollment(await authService.enrollTotp('MemoryLang')) } catch { setError('Không thể khởi tạo mã xác thực. Vui lòng thử lại.') } finally { setBusy(false) }
  }

  const verifyEnrollment = async () => {
    if (!enrollment || !/^\d{6}$/.test(code)) { setError('Vui lòng nhập mã gồm 6 chữ số từ ứng dụng xác thực.'); return }
    setBusy(true); setError(null)
    try { await authService.verifyTotp(enrollment.id, code); setEnrollment(null); setCode(''); await loadFactors() } catch { setError('Mã xác thực không đúng hoặc đã hết hạn.') } finally { setBusy(false) }
  }

  return <Card className="lg:col-span-2">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />Xác thực hai lớp</CardTitle><CardDescription className="mt-2">Dùng ứng dụng xác thực để bảo vệ tài khoản và mở phiên quản trị an toàn.</CardDescription></div>
      {!enrollment && <Button variant="primary" onClick={() => void startEnrollment()} disabled={busy}>{busy ? 'Đang chuẩn bị...' : factors.length ? 'Thêm ứng dụng xác thực' : 'Thiết lập ứng dụng xác thực'}</Button>}
    </div>
    {error && <p role="alert" className="mt-4 text-sm font-black text-destructive">{error}</p>}
    {enrollment ? <div className="mt-5 grid gap-4 rounded-lg border-2 border-border bg-muted/40 p-4 md:grid-cols-[160px_1fr]">
      <img className="h-40 w-40 border-2 border-border bg-white p-2" alt="Mã QR ứng dụng xác thực" src={`data:image/svg+xml;base64,${btoa(enrollment.totp.qr_code)}`} />
      <div className="grid content-start gap-3"><p className="text-sm font-bold">Quét mã QR bằng ứng dụng xác thực. Nếu không quét được, hãy nhập khóa thiết lập tạm thời bên dưới.</p><code className="break-all rounded border-2 border-border bg-card p-2 text-xs font-bold">{enrollment.totp.secret}</code><div><Label htmlFor="mfa-code">Mã 6 chữ số</Label><Input id="mfa-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} /></div><div className="flex gap-2"><Button variant="primary" disabled={busy} onClick={() => void verifyEnrollment()}>{busy ? 'Đang xác minh...' : 'Xác minh và bật'}</Button><Button variant="ghost" disabled={busy} onClick={() => { setEnrollment(null); setCode(''); setError(null) }}>Hủy</Button></div></div>
    </div> : factors.length ? <div className="mt-4 grid gap-2">{factors.map((factor) => <div key={factor.id} className="flex items-center justify-between rounded-lg border-2 border-border p-3"><span className="text-sm font-black">{factor.friendly_name || 'Ứng dụng xác thực'}</span><Button variant="danger" onClick={() => setPendingRemoveId(factor.id)}>Gỡ</Button></div>)}</div> : <p className="mt-4 text-sm font-bold text-muted-foreground">Chưa có ứng dụng xác thực nào được thiết lập.</p>}
    <ConfirmModal open={Boolean(pendingRemoveId)} title="Gỡ ứng dụng xác thực?" description="Bạn sẽ không thể dùng ứng dụng này để xác thực cho đến khi thiết lập lại." confirmLabel="Gỡ ứng dụng" cancelLabel="Hủy" variant="danger" onCancel={() => setPendingRemoveId(null)} onConfirm={() => { const id = pendingRemoveId; setPendingRemoveId(null); if (!id) return; void authService.unenrollTotp(id).then(loadFactors).catch(() => setError('Không thể gỡ ứng dụng xác thực.')) }} />
  </Card>
}
