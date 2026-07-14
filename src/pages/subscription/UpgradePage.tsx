import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { PricingCard } from '@/components/subscription/PricingCard'
import { PaymentQRModal } from '@/components/subscription/PaymentQRModal'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'
import { Crown } from 'lucide-react'
import {
  PRICING_PLANS,
  type PricingPlan,
  type BillingCycle,
} from '@/types/subscription.types'
import { useI18n } from '@/i18n'

export function UpgradePage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const subscription = useSubscriptionStore((s) => s.subscription)
  const isPro = useSubscriptionStore((s) => s.isPro)

  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly')
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null)
  const [showPayment, setShowPayment] = useState(false)

  const handleSelectPlan = useCallback((plan: PricingPlan) => {
    setSelectedPlan(plan)
    setShowPayment(true)
  }, [])

  const handlePaymentSuccess = useCallback(() => {
    setShowPayment(false)
    navigate('/app/upgrade/success')
  }, [navigate])

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <PageHeader
        title={t('subscription.upgradeTitle') || 'Nâng cấp MemoryLang'}
      />

      {/* Hero section */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-[#1c293c] mb-2">
          Đầu tư cho tương lai của bạn
        </h1>
        <p className="text-[#64748b] text-lg">
          Nâng cấp MemoryLang Pro để học không giới hạn
        </p>

        {/* Already Pro */}
        {isPro && (
          <div
            className="mt-4 inline-flex items-center gap-2 px-4 py-2
              rounded-lg border-2 border-[#22c55e] bg-[#f0fdf4] text-[#22c55e]
              font-semibold"
          >
            ✅ Bạn đang sử dụng gói Pro
            {subscription?.current_period_end && (
              <span className="text-sm font-normal text-[#64748b]">
                · Hết hạn:{' '}
                {new Date(subscription.current_period_end).toLocaleDateString(
                  'vi-VN'
                )}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Billing cycle toggle */}
      <div className="flex justify-center mb-8">
        <div
          className="inline-flex rounded-lg border-[3px] border-[#1c293c] overflow-hidden
            shadow-[3px_3px_0_#1c293c]"
        >
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-5 py-2 text-sm font-bold transition-colors
              ${billingCycle === 'monthly'
                ? 'bg-[#1c293c] text-white'
                : 'bg-white text-[#1c293c] hover:bg-[#f8fafc]'
              }
            `}
          >
            Tháng
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-5 py-2 text-sm font-bold transition-colors
              ${billingCycle === 'yearly'
                ? 'bg-[#1c293c] text-white'
                : 'bg-white text-[#1c293c] hover:bg-[#f8fafc]'
              }
            `}
          >
            Năm
            <span
              className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded bg-[#22c55e]
                text-white font-bold"
            >
              -27%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {PRICING_PLANS.map((plan) => (
          <PricingCard
            key={plan.type}
            plan={plan}
            billingCycle={billingCycle}
            currentPlan={subscription?.plan_type || 'free'}
            onSelect={handleSelectPlan}
          />
        ))}
      </div>

      {/* Feature comparison table */}
      <div
        className="neo-card p-6 border-[3px] border-[#1c293c] shadow-[4px_4px_0_#1c293c]
          rounded-lg mb-8"
      >
        <h2 className="text-xl font-bold text-[#1c293c] mb-4">
          So sánh chi tiết
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-[#1c293c]">
                <th className="text-left py-2 pr-4 font-bold">Tính năng</th>
                <th className="text-center py-2 px-4 font-bold">Free</th>
                <th className="text-center py-2 px-4 font-bold text-[#fdc800]">
                  <span className="inline-flex items-center gap-1 justify-center">
                    Pro <Crown size={14} className="fill-[#fdc800] text-[#fdc800]" />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {[
                ['Từ vựng', '100', '∞'],
                ['Bộ thẻ', '5', '∞'],
                ['Flashcard Study', '✓', '✓'],
                ['Translation Quiz', '✓', '✓'],
                ['SRS Review', '✓', '✓'],
                ['Listening', 'Cơ bản', 'Đầy đủ'],
                ['Grammar', 'Cơ bản', 'Đầy đủ'],
                ['Xuất dữ liệu', '✗', '✓'],
                [
                  'Badge Profile',
                  '✗',
                  <span className="inline-flex items-center gap-1 justify-center">
                    <Crown size={12} className="fill-[#fdc800] text-[#fdc800]" /> Pro
                  </span>
                ],
                ['Ưu tiên hỗ trợ', '✗', '✓'],
              ].map(([feature, free, pro], index) => (
                <tr key={index}>
                  <td className="py-2 pr-4">{feature as any}</td>
                  <td className="text-center py-2 px-4 text-[#64748b]">
                    {free as any}
                  </td>
                  <td className="text-center py-2 px-4 font-semibold">
                    {pro as any}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ section */}
      <div
        className="neo-card p-6 border-[3px] border-[#1c293c] shadow-[4px_4px_0_#1c293c]
          rounded-lg"
      >
        <h2 className="text-xl font-bold text-[#1c293c] mb-4">
          Câu hỏi thường gặp
        </h2>
        <div className="space-y-4">
          {[
            {
              q: 'Thanh toán bằng cách nào?',
              a: 'Quét mã VietQR bằng bất kỳ app ngân hàng nào (Vietcombank, MBBank, Techcombank...). Xác nhận tự động trong vài giây.',
            },
            {
              q: 'Có thể hủy bất cứ lúc nào không?',
              a: 'Có! Bạn có thể hủy subscription bất cứ lúc nào. Gói Pro sẽ duy trì đến hết kỳ thanh toán.',
            },
            {
              q: 'Dữ liệu của tôi có bị mất khi hạ xuống Free?',
              a: 'Không. Tất cả từ vựng và bộ thẻ đã tạo vẫn được giữ. Bạn chỉ không thể thêm mới khi vượt giới hạn Free.',
            },
            {
              q: 'Có chương trình giảm giá không?',
              a: 'Có! Thanh toán theo năm tiết kiệm 27%. Chúng tôi cũng có chương trình ưu đãi cho sinh viên và giáo viên.',
            },
          ].map(({ q, a }) => (
            <details key={q} className="group">
              <summary
                className="cursor-pointer font-semibold text-[#1c293c]
                  hover:text-[#432dd7] transition-colors list-none
                  flex items-center gap-2"
              >
                <span className="text-[#fdc800] group-open:rotate-90 transition-transform">
                  ▶
                </span>
                {q}
              </summary>
              <p className="mt-2 ml-6 text-sm text-[#64748b]">{a}</p>
            </details>
          ))}
        </div>
      </div>

      {/* Payment QR Modal */}
      {selectedPlan && selectedPlan.type !== 'team' && selectedPlan.type !== 'free' && (
        <PaymentQRModal
          open={showPayment}
          plan={selectedPlan.type}
          cycle={billingCycle}
          onClose={() => setShowPayment(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  )
}
