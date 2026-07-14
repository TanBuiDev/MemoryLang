import { useI18n } from '@/i18n'
import { Crown, Star } from 'lucide-react'
import type { PricingPlan, BillingCycle } from '@/types/subscription.types'

interface PricingCardProps {
  plan: PricingPlan
  billingCycle: BillingCycle
  currentPlan?: string
  onSelect: (plan: PricingPlan) => void
}

export function PricingCard({
  plan,
  billingCycle,
  currentPlan,
  onSelect,
}: PricingCardProps) {
  const { t } = useI18n()
  const isCurrentPlan = currentPlan === plan.type
  const price =
    billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice
  const perMonth =
    billingCycle === 'yearly' && plan.yearlyPrice > 0
      ? Math.round(plan.yearlyPrice / 12)
      : plan.monthlyPrice

  const formatPrice = (amount: number) => {
    if (amount === 0) return '0đ'
    return amount.toLocaleString('vi-VN') + 'đ'
  }

  return (
    <div
      className={`
        relative rounded-lg p-6
        ${plan.isPopular
          ? 'border-[4px] border-[#1c293c] shadow-[8px_8px_0_#1c293c] bg-[#FFF9E5]'
          : plan.isComingSoon
            ? 'border-[2px] border-dashed border-[#1c293c] bg-[#f3f4f6] opacity-80'
            : 'border-[3px] border-[#1c293c] shadow-[4px_4px_0_#1c293c] bg-white'
        }
      `}
    >
      {/* Popular badge */}
      {plan.isPopular && (
        <div
          className="absolute -top-3 -right-3 bg-[#432dd7] text-white text-xs font-bold
            px-3 py-1 rounded-md border-2 border-[#1c293c] rotate-[5deg]
            shadow-[2px_2px_0_#1c293c] flex items-center gap-1"
        >
          <Star size={12} className="fill-[#fdc800] text-[#fdc800]" />
          <span>Phổ biến</span>
        </div>
      )}

      {/* Coming Soon badge */}
      {plan.isComingSoon && (
        <div
          className="absolute -top-3 -right-3 bg-[#94a3b8] text-white text-xs font-bold
            px-3 py-1 rounded-md border-2 border-[#1c293c]"
        >
          Sắp ra mắt
        </div>
      )}

      {/* Plan name */}
      <h3 className="text-lg font-bold text-[#1c293c] mb-1">{plan.name}</h3>

      {/* Price */}
      <div className="mb-4">
        {plan.isComingSoon ? (
          <p className="text-2xl font-bold font-mono text-[#94a3b8]">—</p>
        ) : (
          <>
            <p className="text-3xl font-bold font-mono text-[#1c293c]">
              {formatPrice(price)}
            </p>
            {plan.monthlyPrice > 0 && (
              <p className="text-sm text-[#64748b]">
                {billingCycle === 'yearly'
                  ? `~${formatPrice(perMonth)}/tháng`
                  : '/tháng'}
              </p>
            )}
            {billingCycle === 'yearly' && plan.yearlyPrice > 0 && (
              <p className="text-xs text-[#22c55e] font-semibold mt-1">
                Tiết kiệm{' '}
                {Math.round(
                  (1 - plan.yearlyPrice / (plan.monthlyPrice * 12)) * 100
                )}
                %
              </p>
            )}
          </>
        )}
      </div>

      {/* Features */}
      <ul className="space-y-2 mb-6">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span
              className={
                plan.isComingSoon ? 'text-[#94a3b8]' : 'text-[#22c55e]'
              }
            >
              ✓
            </span>
            <span
              className={
                plan.isComingSoon ? 'text-[#94a3b8]' : 'text-[#1c293c]'
              }
            >
              {feature}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      {plan.isComingSoon ? (
        <button
          disabled
          className="neo-button w-full justify-center opacity-50 cursor-not-allowed
            bg-[#e5e7eb] text-[#9ca3af]"
        >
          {t('subscription.comingSoon') || 'Sắp ra mắt'}
        </button>
      ) : isCurrentPlan ? (
        <button
          disabled
          className="neo-button w-full justify-center opacity-70 cursor-not-allowed"
        >
          {t('subscription.currentPlan') || 'Đang sử dụng'}
        </button>
      ) : plan.monthlyPrice === 0 ? (
        <button
          disabled
          className="neo-button w-full justify-center opacity-70 cursor-not-allowed"
        >
          {t('subscription.freePlan') || 'Miễn phí'}
        </button>
      ) : (
        <button
          onClick={() => onSelect(plan)}
          className={`neo-button neo-button-active w-full justify-center font-bold
            ${plan.isPopular
              ? 'bg-[#fdc800] hover:bg-[#e6b800] text-[#1c293c]'
              : 'bg-[#432dd7] hover:bg-[#3722b8] text-white'
            }
          `}
        >
          <span className="flex items-center justify-center gap-1.5">
            {t('subscription.upgradeNow') || 'Nâng cấp ngay'}
            <Crown size={14} />
          </span>
        </button>
      )}
    </div>
  )
}
