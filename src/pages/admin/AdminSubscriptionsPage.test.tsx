import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminSubscriptionsPage from '@/pages/admin/AdminSubscriptionsPage'
import { adminService } from '@/services/supabase/admin.service'

vi.mock('@/services/supabase/admin.service', () => ({
  adminService: {
    listSubscriptionPlans: vi.fn(),
    updateSubscriptionPlanPrice: vi.fn(),
    listSubscriptionUsers: vi.fn(),
    getUserPaymentLogs: vi.fn(),
    setUserSubscription: vi.fn(),
  },
}))

vi.mock('@/components/ui/toast', () => ({
  showToast: vi.fn(),
}))

const mockedAdminService = vi.mocked(adminService)

const planRows = [
  {
    id: 'plan-pro-monthly',
    plan_type: 'pro',
    billing_cycle: 'monthly',
    display_name: 'Pro',
    amount: 49000,
    currency: 'VND',
    features: ['Không giới hạn'],
    is_active: true,
    updated_by: null,
    created_at: '2026-07-16T00:00:00.000Z',
    updated_at: '2026-07-16T00:00:00.000Z',
  },
  {
    id: 'plan-pro-yearly',
    plan_type: 'pro',
    billing_cycle: 'yearly',
    display_name: 'Pro',
    amount: 430000,
    currency: 'VND',
    features: ['Không giới hạn'],
    is_active: true,
    updated_by: null,
    created_at: '2026-07-16T00:00:00.000Z',
    updated_at: '2026-07-16T00:00:00.000Z',
  },
] as const

const userRows = [
  {
    id: 'user-1',
    email: 'pro@example.com',
    display_name: 'Pro Learner',
    is_admin: false,
    created_at: '2026-07-01T00:00:00.000Z',
    subscription: {
      id: 'sub-1',
      user_id: 'user-1',
      plan_type: 'pro',
      status: 'active',
      billing_cycle: 'monthly',
      payos_order_code: null,
      current_period_start: '2026-07-01T00:00:00.000Z',
      current_period_end: '2026-08-01T00:00:00.000Z',
      cancel_at_period_end: false,
      canceled_at: null,
      created_at: '2026-07-01T00:00:00.000Z',
      updated_at: '2026-07-01T00:00:00.000Z',
    },
    payment_count: 2,
    last_payment_at: '2026-07-15T00:00:00.000Z',
  },
  {
    id: 'user-2',
    email: 'free@example.com',
    display_name: 'Free Learner',
    is_admin: false,
    created_at: '2026-07-02T00:00:00.000Z',
    subscription: null,
    payment_count: 0,
    last_payment_at: null,
  },
] as const

describe('AdminSubscriptionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedAdminService.listSubscriptionPlans.mockResolvedValue([...planRows] as never)
    mockedAdminService.listSubscriptionUsers.mockResolvedValue([...userRows] as never)
    mockedAdminService.updateSubscriptionPlanPrice.mockResolvedValue(planRows[0] as never)
    mockedAdminService.setUserSubscription.mockResolvedValue(userRows[0].subscription as never)
    mockedAdminService.getUserPaymentLogs.mockResolvedValue([
      {
        id: 'pay-1',
        user_id: 'user-1',
        subscription_id: 'sub-1',
        amount: 49000,
        currency: 'VND',
        payment_method: 'payos',
        payos_order_code: '123456',
        status: 'succeeded',
        metadata: {},
        created_at: '2026-07-15T00:00:00.000Z',
      },
    ] as never)
  })

  it('renders editable Pro monthly and yearly prices', async () => {
    render(<AdminSubscriptionsPage />)

    expect(await screen.findByText('Quản lý giá gói')).toBeInTheDocument()
    expect(screen.getByText('49.000 ₫')).toBeInTheDocument()
    expect(screen.getByText('430.000 ₫')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Sửa giá/i })).toHaveLength(2)
  })

  it('opens a ConfirmModal before saving a price change and submits an audit reason', async () => {
    const user = userEvent.setup()
    render(<AdminSubscriptionsPage />)

    await user.click((await screen.findAllByRole('button', { name: /Sửa giá/i }))[0])
    await user.clear(screen.getByLabelText('Giá mới'))
    await user.type(screen.getByLabelText('Giá mới'), '59000')
    await user.type(screen.getByLabelText('Lý do đổi giá'), 'Điều chỉnh giá tháng')
    await user.click(screen.getByRole('button', { name: 'Lưu giá' }))

    expect(screen.getByRole('dialog', { name: 'Xác nhận đổi giá gói' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Xác nhận' }))

    expect(mockedAdminService.updateSubscriptionPlanPrice).toHaveBeenCalledWith({
      planType: 'pro',
      billingCycle: 'monthly',
      amount: 59000,
      currency: 'VND',
      isActive: true,
      reason: 'Điều chỉnh giá tháng',
    })
  })

  it('renders user subscription rows with plan, status, period end, and payment count', async () => {
    render(<AdminSubscriptionsPage />)

    const row = await screen.findByTestId('subscription-user-user-1')

    expect(within(row).getByText('Pro Learner')).toBeInTheDocument()
    expect(within(row).getByText('pro@example.com')).toBeInTheDocument()
    expect(within(row).getByText('Pro')).toBeInTheDocument()
    expect(within(row).getByText('active')).toBeInTheDocument()
    expect(within(row).getByText('01/08/2026')).toBeInTheDocument()
    expect(within(row).getByText('2 thanh toán')).toBeInTheDocument()
  })

  it('filters rows by search query and plan', async () => {
    const user = userEvent.setup()
    render(<AdminSubscriptionsPage />)

    expect(await screen.findByText('Free Learner')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('Tìm email hoặc tên...'), 'pro@')

    expect(screen.getByText('Pro Learner')).toBeInTheDocument()
    expect(screen.queryByText('Free Learner')).not.toBeInTheDocument()
  })

  it('opens a ConfirmModal before granting Pro and submits a reason', async () => {
    const user = userEvent.setup()
    render(<AdminSubscriptionsPage />)

    const row = await screen.findByTestId('subscription-user-user-2')
    await user.click(within(row).getByRole('button', { name: 'Cấp Pro' }))
    await user.type(screen.getByLabelText('Lý do thao tác'), 'Tặng dùng thử')
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))

    expect(screen.getByRole('dialog', { name: 'Xác nhận cập nhật gói' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Xác nhận' }))

    expect(mockedAdminService.setUserSubscription).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-2',
      planType: 'pro',
      status: 'active',
      billingCycle: 'monthly',
      reason: 'Tặng dùng thử',
    }))
  })

  it('shows payment history for the selected user', async () => {
    const user = userEvent.setup()
    render(<AdminSubscriptionsPage />)

    const row = await screen.findByTestId('subscription-user-user-1')
    await user.click(within(row).getByRole('button', { name: 'Lịch sử' }))

    expect(await screen.findByText('Lịch sử thanh toán')).toBeInTheDocument()
    const panel = screen.getByTestId('payment-history-panel')
    expect(within(panel).getByText('123456')).toBeInTheDocument()
    expect(within(panel).getByText('49.000 ₫')).toBeInTheDocument()
  })

  it('shows a custom error panel when loading fails', async () => {
    mockedAdminService.listSubscriptionPlans.mockRejectedValueOnce(new Error('network failed'))

    render(<AdminSubscriptionsPage />)

    expect(await screen.findByText('Không thể tải dữ liệu gói đăng ký')).toBeInTheDocument()
    expect(screen.getByText('network failed')).toBeInTheDocument()
  })
})
