import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  Copy,
  KeyRound,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trash2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  const [copiedSecret, setCopiedSecret] = useState(false)

  const loadFactors = async () => {
    try {
      setFactors(await authService.listTotpFactors())
    } catch {
      setError('Không thể tải trạng thái xác thực hai lớp.')
    }
  }

  useEffect(() => {
    void loadFactors()
  }, [])

  // Auto dismiss error timer
  useEffect(() => {
    if (!error) return
    const timer = setTimeout(() => setError(null), 3000)
    return () => clearTimeout(timer)
  }, [error])

  const startEnrollment = async () => {
    setBusy(true)
    setError(null)
    try {
      setEnrollment(await authService.enrollTotp('MemoryLang'))
    } catch {
      setError('Không thể khởi tạo mã xác thực. Vui lòng thử lại.')
    } finally {
      setBusy(false)
    }
  }

  const verifyEnrollment = async () => {
    if (!enrollment || !/^\d{6}$/.test(code)) {
      setError('Vui lòng nhập đủ 6 chữ số từ ứng dụng xác thực.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await authService.verifyTotp(enrollment.id, code)
      setEnrollment(null)
      setCode('')
      await loadFactors()
    } catch {
      setError('Mã xác thực 6 chữ số không đúng hoặc đã hết hạn.')
    } finally {
      setBusy(false)
    }
  }

  const copySecretToClipboard = () => {
    if (!enrollment?.totp?.secret) return
    void navigator.clipboard.writeText(enrollment.totp.secret)
    setCopiedSecret(true)
    setTimeout(() => setCopiedSecret(false), 2000)
  }

  const isEnabled = factors.length > 0

  return (
    <section className="neo-card border-3 border-border bg-card p-6 shadow-[4px_4px_0_var(--border)] rounded-2xl space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-border pb-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-border bg-emerald-400 text-emerald-950 font-black shadow-[2px_2px_0_var(--border)]">
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-foreground uppercase tracking-wide">
                Xác thực 2 Lớp (MFA / 2FA)
              </h2>
              {isEnabled ? (
                <Badge className="bg-emerald-100 text-emerald-950 border-2 border-emerald-400 font-black text-xs">
                  <CheckCircle2 size={12} className="inline mr-1 text-emerald-700" /> Đã bật 2FA
                </Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-950 border-2 border-amber-400 font-black text-xs">
                  Chưa kích hoạt
                </Badge>
              )}
            </div>
            <p className="text-xs font-semibold text-muted-foreground mt-0.5">
              Bảo vệ tài khoản bằng ứng dụng Authenticator (Google Authenticator, Authy, 1Password)
            </p>
          </div>
        </div>

        {!enrollment && (
          <Button
            variant="primary"
            onClick={() => void startEnrollment()}
            disabled={busy}
            className="font-black text-xs shrink-0 h-10 px-4 flex items-center gap-2"
          >
            <Smartphone size={16} />
            {busy ? 'Đang chuẩn bị...' : isEnabled ? 'Thêm ứng dụng xác thực' : 'Thiết lập 2FA ngay'}
          </Button>
        )}
      </div>

      {/* Auto-Dismissing Error Alert Banner */}
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between border-2 border-rose-400 bg-rose-100 p-3.5 text-xs font-black text-rose-950 rounded-xl shadow-[2px_2px_0_var(--border)] animate-in fade-in duration-150"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="font-black hover:underline text-rose-900 text-[11px]"
          >
            Đóng
          </button>
        </div>
      )}

      {/* ENROLLMENT SETUP CARD (WHEN ACTIVE) */}
      {enrollment ? (
        <div className="border-3 border-border bg-gradient-to-r from-amber-50 to-card p-5 rounded-xl shadow-[3px_3px_0_var(--border)] space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-2 border-b-2 border-border pb-2.5">
            <QrCode size={18} className="text-primary" />
            <h3 className="text-sm font-black text-foreground uppercase tracking-wide">
              Bước 1: Quét mã QR & Nhập mã xác nhận
            </h3>
          </div>

          <div className="grid gap-6 md:grid-cols-[180px_1fr] items-start">
            {/* QR Code Column */}
            <div className="flex flex-col items-center gap-2">
              <div className="p-2.5 bg-white border-3 border-border rounded-2xl shadow-[3px_3px_0_var(--border)]">
                <img
                  className="h-36 w-36 object-contain"
                  alt="Mã QR ứng dụng xác thực"
                  src={enrollment.totp.qr_code}
                />
              </div>
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider text-center">
                Mã QR Google Authenticator
              </span>
            </div>

            {/* Verification Form Column */}
            <div className="space-y-4">
              <p className="text-xs font-bold text-foreground leading-relaxed">
                Mở ứng dụng <strong>Google Authenticator</strong> hoặc <strong>Authy</strong> trên điện thoại, chọn quét mã QR ở bên trái.
              </p>

              {/* Secret Key Box */}
              <div>
                <Label className="text-[11px] font-black uppercase text-muted-foreground">
                  Hoặc nhập khóa bí mật thủ công (Secret Key):
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 break-all rounded-lg border-2 border-border bg-card px-3 py-2 text-xs font-mono font-black text-foreground shadow-[1.5px_1.5px_0_var(--border)]">
                    {enrollment.totp.secret}
                  </code>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={copySecretToClipboard}
                    className="h-9 px-2.5 border-2 border-border text-xs font-black shrink-0"
                    title="Sao chép khóa bí mật"
                  >
                    {copiedSecret ? <CheckCircle2 size={15} className="text-emerald-600" /> : <Copy size={15} />}
                  </Button>
                </div>
              </div>

              {/* Code Input Step */}
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="mfa-code" className="text-xs font-black">
                  Bước 2: Nhập mã OTP 6 chữ số hiển thị trên ứng dụng:
                </Label>
                <Input
                  id="mfa-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-48 font-mono font-black tracking-widest text-lg text-center h-11 border-3 border-border bg-white"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="primary"
                  disabled={busy || code.length !== 6}
                  onClick={() => void verifyEnrollment()}
                  className="font-black text-xs h-10 px-5"
                >
                  {busy ? 'Đang xác minh...' : 'Xác minh & Kích hoạt 2FA'}
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    setEnrollment(null)
                    setCode('')
                    setError(null)
                  }}
                  className="font-black text-xs h-10 px-4 border-2 border-border"
                >
                  Hủy bỏ
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : isEnabled ? (
        /* ACTIVE FACTORS LIST */
        <div className="space-y-3">
          <p className="text-xs font-black text-muted-foreground uppercase tracking-wider">
            Các ứng dụng xác thực 2FA đã liên kết:
          </p>
          <div className="grid gap-3">
            {factors.map((factor) => (
              <div
                key={factor.id}
                className="flex items-center justify-between rounded-xl border-2 border-border p-4 bg-background shadow-[2px_2px_0_var(--border)]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-border bg-emerald-100 text-emerald-950 font-black">
                    <KeyRound size={18} />
                  </div>
                  <div>
                    <p className="font-black text-sm text-foreground">
                      {factor.friendly_name || 'Ứng dụng Authenticator'}
                    </p>
                    <p className="text-[11px] font-semibold text-muted-foreground">Mã OTP 6 chữ số theo thời gian (TOTP)</p>
                  </div>
                </div>

                <Button
                  variant="danger"
                  onClick={() => setPendingRemoveId(factor.id)}
                  className="font-black text-xs h-8 px-3 flex items-center gap-1.5"
                >
                  <Trash2 size={14} /> Gỡ bỏ
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* NO FACTORS EMPTY STATE */
        <div className="p-4 rounded-xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Smartphone size={24} className="text-muted-foreground shrink-0" />
            <div>
              <p className="font-black text-xs text-foreground">Tài khoản chưa được bảo vệ bằng 2FA</p>
              <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">
                Kích hoạt 2FA giúp bảo vệ tài khoản khỏi việc bị đánh cắp mật khẩu.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            onClick={() => void startEnrollment()}
            disabled={busy}
            className="font-black text-xs shrink-0 h-9 px-3.5"
          >
            Kích hoạt ngay
          </Button>
        </div>
      )}

      {/* CONFIRMATION DIALOG FOR UNENROLLMENT */}
      <ConfirmModal
        open={Boolean(pendingRemoveId)}
        title="Gỡ bỏ ứng dụng xác thực 2FA?"
        description="Sau khi gỡ bỏ, bạn sẽ không thể dùng ứng dụng này để tạo mã xác thực 2FA nữa. Bạn có thể thiết lập lại bất cứ lúc nào."
        confirmLabel="Xác nhận gỡ 2FA"
        cancelLabel="Hủy"
        variant="danger"
        onCancel={() => setPendingRemoveId(null)}
        onConfirm={() => {
          const id = pendingRemoveId
          setPendingRemoveId(null)
          if (!id) return
          void authService
            .unenrollTotp(id)
            .then(loadFactors)
            .catch(() => setError('Không thể gỡ ứng dụng xác thực.'))
        }}
      />
    </section>
  )
}
