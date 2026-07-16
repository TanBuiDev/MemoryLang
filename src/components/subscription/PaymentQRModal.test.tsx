import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PaymentQRModal } from '@/components/subscription/PaymentQRModal'
import { subscriptionService } from '@/services/supabase/subscription.service'

vi.mock('@/services/supabase/subscription.service', () => ({
  subscriptionService: {
    createPayment: vi.fn(),
    checkPaymentStatus: vi.fn(),
    cancelPayment: vi.fn(),
  },
}))

vi.mock('@/stores/useSubscriptionStore', () => ({
  useSubscriptionStore: vi.fn((selector: (state: { loadSubscription: () => Promise<void> }) => unknown) =>
    selector({ loadSubscription: vi.fn().mockResolvedValue(undefined) })
  ),
}))

const mockedSubscriptionService = vi.mocked(subscriptionService)

describe('PaymentQRModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedSubscriptionService.createPayment.mockResolvedValue({
      checkoutUrl: 'https://pay.payos.vn/web/payment-link-id',
      qrCode:
        '00020101021238570010A000000727012700069704220113113366668888020899998888530370454061000005802VN62230819MEMLANG6304BE36',
      orderCode: '123456789',
      amount: 10000,
    })
  })

  it('renders a generated QR image from the PayOS VietQR payload', async () => {
    render(
      <PaymentQRModal
        open
        plan="pro"
        cycle="monthly"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    )

    const qrImage = await screen.findByRole('img', { name: 'VietQR Payment Code' })

    expect(qrImage).toHaveAttribute('src', expect.stringMatching(/^data:image\//))
    expect(qrImage).not.toHaveAttribute('src', expect.stringMatching(/^000201/))
  })

  it('uses the shared button styling for the cancel action', async () => {
    render(
      <PaymentQRModal
        open
        plan="pro"
        cycle="monthly"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    )

    const cancelButton = await screen.findByRole('button', { name: 'Hủy' })

    expect(cancelButton).toHaveClass('neo-button')
    expect(cancelButton).toHaveClass('min-h-10')
    expect(cancelButton).toHaveClass('font-black')
    expect(cancelButton).toHaveClass('bg-card')
  })
})
