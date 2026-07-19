import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { PricingCard } from '@/components/subscription/PricingCard'
import { PaymentQRModal } from '@/components/subscription/PaymentQRModal'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'
import { subscriptionService } from '@/services/supabase/subscription.service'
import { Crown, Sparkles } from 'lucide-react'
import {
  FALLBACK_PRICING_PLANS,
  type PricingPlan,
  type BillingCycle,
} from '@/types/subscription.types'
import { soundEffects } from '@/utils/soundEffects'

export function UpgradePage() {
  const navigate = useNavigate()
  const subscription = useSubscriptionStore((s) => s.subscription)
  const isPro = useSubscriptionStore((s) => s.isPro)

  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly')
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null)
  const [showPayment, setShowPayment] = useState(false)
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>(FALLBACK_PRICING_PLANS)
  const [pricingLoading, setPricingLoading] = useState(true)
  const [pricingError, setPricingError] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadPricing() {
      setPricingLoading(true)
      const plans = await subscriptionService.listPricingPlans()
      if (!isMounted) return
      setPricingPlans(plans)
      setPricingError(plans === FALLBACK_PRICING_PLANS)
      setPricingLoading(false)
    }

    void loadPricing()

    return () => {
      isMounted = false
    }
  }, [])

  const handleSelectPlan = useCallback((plan: PricingPlan) => {
    soundEffects.play('cardClick')
    setSelectedPlan(plan)
    setShowPayment(true)
  }, [])

  const handlePaymentSuccess = useCallback(() => {
    setShowPayment(false)
    soundEffects.play('roundComplete')
    navigate('/app/upgrade/success')
  }, [navigate])

  const handleToggleBilling = (cycle: BillingCycle) => {
    soundEffects.play('cardClick')
    setBillingCycle(cycle)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
      <PageHeader
        eyebrow="Nâng cấp Dịch vụ"
        title="MemoryLang Pro"
      />

      {/* Hero section */}
      <div className="text-center space-y-3">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-2">
          Mở khoá toàn bộ sức mạnh học tiếng Anh
          <Sparkles className="w-6 h-6 text-amber-500 animate-pulse" />
        </h1>
        <p className="text-slate-600 text-sm sm:text-base font-semibold max-w-xl mx-auto">
          Truy cập không giới hạn kho từ vựng, bài giảng Ngữ pháp, bài luyện Listening và Trợ lý Gia sư AI 24/7.
        </p>

        {/* Already Pro Status Badge */}
        {isPro && (
          <div className="pt-2">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-slate-900 bg-[#dcfce7] text-[#15803d] font-black shadow-[3px_3px_0px_0px_#000] text-sm">
              <Crown size={18} className="text-amber-500 fill-amber-400" />
              <span>Tài khoản Pro đang hoạt động</span>
              {subscription?.current_period_end && (
                <span className="text-xs font-bold text-slate-700 ml-1">
                  (Hạn dùng: {new Date(subscription.current_period_end).toLocaleDateString('vi-VN')})
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Billing cycle toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-xl border-3 border-slate-900 overflow-hidden shadow-[4px_4px_0px_0px_#000] bg-white p-1 gap-1">
          <button
            onClick={() => handleToggleBilling('monthly')}
            className={`px-5 py-2 text-sm font-black rounded-lg transition-all ${
              billingCycle === 'monthly'
                ? 'bg-slate-900 text-white shadow-[2px_2px_0px_0px_#000]'
                : 'bg-white text-slate-900 hover:bg-slate-100'
            }`}
          >
            Tháng
          </button>
          <button
            onClick={() => handleToggleBilling('yearly')}
            className={`px-5 py-2 text-sm font-black rounded-lg transition-all flex items-center gap-1.5 ${
              billingCycle === 'yearly'
                ? 'bg-[#432dd7] text-white shadow-[2px_2px_0px_0px_#000]'
                : 'bg-white text-slate-900 hover:bg-slate-100'
            }`}
          >
            Năm
            <span className="px-2 py-0.5 text-[10px] rounded-md bg-[#fdc800] text-slate-900 font-black border border-slate-900">
              Tiết kiệm 27%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {pricingError && (
          <div className="md:col-span-3 rounded-xl border-2 border-rose-500 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">
            Không tải được giá mới nhất. Đang hiển thị bảng giá dự phòng.
          </div>
        )}
        {pricingLoading && (
          <div className="md:col-span-3 text-center text-sm font-bold text-slate-500 py-8">
            Đang tải bảng giá...
          </div>
        )}
        {pricingPlans.map((plan) => (
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
      <div className="neo-card p-6 border-3 border-slate-900 shadow-[6px_6px_0px_0px_#000] rounded-xl bg-white">
        <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          So sánh chi tiết quyền lợi
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-900">
                <th className="text-left py-2.5 pr-4 font-black text-slate-900">Tính năng</th>
                <th className="text-center py-2.5 px-4 font-black text-slate-600">Gói Free</th>
                <th className="text-center py-2.5 px-4 font-black text-purple-700 bg-amber-50 rounded-t-lg">
                  <span className="inline-flex items-center gap-1 justify-center">
                    Gói Pro <Crown size={15} className="fill-[#fdc800] text-slate-900" />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {[
                ['Từ vựng tạo mới', 'Tối đa 100 từ', 'Không giới hạn (∞)'],
                ['Bộ thẻ ghi nhớ (Decks)', 'Tối đa 5 bộ', 'Không giới hạn (∞)'],
                ['Học Flashcards & SRS Spaced Repetition', '✓', '✓'],
                ['Translation & True/False Quiz', '✓', '✓'],
                ['Trợ lý Gia sư AI (AI Tutor 24/7)', 'Giới hạn tin nhắn', 'Không giới hạn + Tra cứu nhanh Ctrl+K'],
                ['Luyện kỹ năng Listening & Grammar', 'Cơ bản', 'Toàn bộ bài học & nâng cao'],
                ['Xuất dữ liệu từ vựng (CSV / JSON)', '✗', '✓'],
                [
                  'Badge Pro gắn hồ sơ cá nhân',
                  '✗',
                  <span key="badge" className="inline-flex items-center gap-1 justify-center text-xs font-black text-amber-600">
                    <Crown size={13} className="fill-[#fdc800] text-slate-900" /> Pro Member
                  </span>
                ],
                ['Ưu tiên hỗ trợ kỹ thuật', '✗', '✓'],
              ].map(([feature, free, pro], index) => (
                <tr key={index} className="hover:bg-slate-50">
                  <td className="py-2.5 pr-4 font-bold text-slate-800">{feature as string}</td>
                  <td className="text-center py-2.5 px-4 text-slate-500 font-semibold">
                    {free as string}
                  </td>
                  <td className="text-center py-2.5 px-4 font-black text-slate-900 bg-amber-50/50">
                    {pro}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ section */}
      <div className="neo-card p-6 border-3 border-slate-900 shadow-[6px_6px_0px_0px_#000] rounded-xl bg-white">
        <h2 className="text-lg font-black text-slate-900 mb-4">
          Câu hỏi thường gặp
        </h2>
        <div className="space-y-3">
          {[
            {
              q: 'Thanh toán bằng cách nào?',
              a: 'Bạn chỉ cần quét mã VietQR bằng bất kỳ app ngân hàng nào (Vietcombank, MBBank, Techcombank...). Hệ thống tự động xác nhận và kích hoạt gói Pro trong vài giây.',
            },
            {
              q: 'Có thể hủy bất cứ lúc nào không?',
              a: 'Có! Bạn có thể hủy gói Pro bất cứ lúc nào. Quyền lợi Pro sẽ duy trì cho đến hết kỳ hạn đã thanh toán.',
            },
            {
              q: 'Dữ liệu từ vựng của tôi có bị mất khi hết hạn Pro không?',
              a: 'Hoàn toàn không! Tất cả từ vựng và bộ thẻ bạn đã tạo vẫn được lưu giữ an toàn 100%.',
            },
            {
              q: 'Thanh toán gói Năm có ưu đãi gì?',
              a: 'Gói Năm giúp bạn tiết kiệm 27% chi phí so với thanh toán theo từng tháng.',
            },
          ].map(({ q, a }) => (
            <details key={q} className="group border-2 border-slate-900 rounded-lg p-3 bg-slate-50">
              <summary
                onClick={() => soundEffects.play('cardClick')}
                className="cursor-pointer font-bold text-slate-900 hover:text-purple-700 transition-colors list-none flex items-center gap-2 select-none text-sm"
              >
                <span className="text-[#fdc800] group-open:rotate-90 transition-transform font-black">
                  ▶
                </span>
                {q}
              </summary>
              <p className="mt-2 ml-6 text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">{a}</p>
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
