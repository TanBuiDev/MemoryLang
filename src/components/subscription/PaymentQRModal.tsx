import { useState, useEffect, useRef, useCallback } from 'react'
import { subscriptionService } from '@/services/supabase/subscription.service'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'
import type { BillingCycle, PlanType } from '@/types/subscription.types'

interface PaymentQRModalProps {
  /** Modal có đang mở không */
  open: boolean
  /** Gói đã chọn */
  plan: PlanType
  /** Chu kỳ thanh toán */
  cycle: BillingCycle
  /** Callback khi đóng modal */
  onClose: () => void
  /** Callback khi thanh toán thành công */
  onSuccess: () => void
}

const POLL_INTERVAL = 5_000 // 5 giây

export function PaymentQRModal({
  open,
  plan,
  cycle,
  onClose,
  onSuccess,
}: PaymentQRModalProps) {
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null)
  const [orderCode, setOrderCode] = useState<string | null>(null)
  const [amount, setAmount] = useState(0)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'waiting' | 'succeeded' | 'failed'>('idle')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const loadSubscription = useSubscriptionStore((s) => s.loadSubscription)

  // Tạo payment link khi modal mở
  useEffect(() => {
    if (!open) return

    const createPayment = async () => {
      setIsCreating(true)
      setError(null)
      setStatus('idle')
      try {
        const result = await subscriptionService.createPayment(plan, cycle)
        setQrCode(result.qrCode)
        setCheckoutUrl(result.checkoutUrl)
        setOrderCode(result.orderCode)
        setAmount(result.amount)
        setStatus('waiting')
      } catch (err) {
        setError((err as Error).message || 'Không thể tạo thanh toán')
      } finally {
        setIsCreating(false)
      }
    }

    createPayment()
  }, [open, plan, cycle])

  // Polling kiểm tra thanh toán
  useEffect(() => {
    if (status !== 'waiting' || !orderCode) return

    pollRef.current = setInterval(async () => {
      try {
        const result = await subscriptionService.checkPaymentStatus(orderCode)
        if (result.status === 'succeeded') {
          setStatus('succeeded')
          await loadSubscription()
          onSuccess()
        } else if (result.status === 'failed') {
          setStatus('failed')
          setError('Thanh toán thất bại. Vui lòng thử lại.')
        }
      } catch {
        // Ignore polling errors
      }
    }, POLL_INTERVAL)

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [status, orderCode, loadSubscription, onSuccess])

  // Cleanup polling khi modal đóng
  useEffect(() => {
    if (!open && pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [open])

  const handleCancel = useCallback(async () => {
    if (orderCode) {
      try {
        await subscriptionService.cancelPayment(orderCode)
      } catch {
        // Ignore cancel errors
      }
    }
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    setQrCode(null)
    setOrderCode(null)
    setStatus('idle')
    onClose()
  }, [orderCode, onClose])

  if (!open) return null

  const formatPrice = (amt: number) =>
    amt === 0 ? '0đ' : amt.toLocaleString('vi-VN') + 'đ'

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="neo-card max-w-sm w-full p-6 bg-white border-[3px] border-[#1c293c]
            shadow-[8px_8px_0_#1c293c] rounded-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-xl font-bold text-[#1c293c] text-center mb-1">
            Xác nhận thanh toán
          </h3>
          <p className="text-sm text-[#64748b] text-center mb-4">
            Gói Pro — {formatPrice(amount)}/{cycle === 'monthly' ? 'tháng' : 'năm'}
          </p>

          {/* Loading */}
          {isCreating && (
            <div className="text-center py-8">
              <div
                className="inline-block w-8 h-8 border-4 border-[#fdc800]
                  border-t-transparent rounded-full animate-spin"
              />
              <p className="text-sm text-[#64748b] mt-2">
                Đang tạo mã thanh toán...
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              className="mb-4 p-3 rounded-md border-2 border-red-300 bg-red-50
                text-sm text-red-700 text-center"
            >
              {error}
            </div>
          )}

          {/* QR Code */}
          {qrCode && status === 'waiting' && (
            <>
              <div className="flex justify-center mb-3">
                <div
                  className="p-2 border-[3px] border-[#1c293c] rounded-lg
                    shadow-[4px_4px_0_#1c293c] bg-white"
                >
                  <img
                    src={qrCode}
                    alt="VietQR Payment Code"
                    className="w-56 h-56 object-contain"
                  />
                </div>
              </div>

              <p className="text-xs text-[#64748b] text-center mb-1">
                Quét mã QR bằng app ngân hàng để thanh toán
              </p>

              {checkoutUrl && (
                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-xs text-[#432dd7] hover:underline mb-4"
                >
                  Hoặc mở trang thanh toán →
                </a>
              )}

              <div
                className="flex items-center justify-center gap-2 text-sm
                  text-[#fdc800] font-semibold mb-4"
              >
                <div
                  className="w-3 h-3 border-2 border-[#fdc800] border-t-transparent
                    rounded-full animate-spin"
                />
                Đang chờ thanh toán...
              </div>
            </>
          )}

          {/* Success */}
          {status === 'succeeded' && (
            <div className="text-center py-6">
              <div className="text-4xl mb-2">✅</div>
              <p className="text-lg font-bold text-[#22c55e]">
                Thanh toán thành công!
              </p>
            </div>
          )}

          {/* Cancel button */}
          {status !== 'succeeded' && (
            <button
              onClick={handleCancel}
              className="neo-button w-full justify-center text-sm mt-2"
            >
              Hủy
            </button>
          )}
        </div>
      </div>
    </>
  )
}
